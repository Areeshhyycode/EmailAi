"use client";

import { useState } from "react";
import type { AnalyzedEmail } from "@/types";
import { CategoryBadge, SentimentBadge, UrgencyBadge } from "./CategoryBadge";
import { Send, ListPlus, Wand2, Loader2 } from "lucide-react";

interface Props {
  email: AnalyzedEmail;
  onSent?: (id: string) => void;
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}

export function EmailCard({ email, onSent }: Props) {
  const [draft, setDraft] = useState(email.analysis.suggestedReply ?? "");
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState<null | "send" | "refine" | "task">(null);
  const [status, setStatus] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState(false);

  async function handleRefine() {
    if (!refineText.trim()) return;
    setBusy("refine");
    setStatus(null);
    try {
      const res = await fetch("/api/emails/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          action: "refine",
          instruction: refineText,
          previousDraft: draft
        })
      });
      const data = await res.json();
      if (data.suggestedReply) {
        setDraft(data.suggestedReply);
        setRefineText("");
      } else {
        setStatus(data.error ?? "Refine failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!draft.trim()) return;
    setBusy("send");
    setStatus(null);
    try {
      const res = await fetch("/api/emails/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: extractEmail(email.from),
          subject: email.subject,
          body: draft,
          threadId: email.threadId,
          messageId: email.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Sent ✓");
        onSent?.(email.id);
      } else {
        setStatus(data.error ?? "Send failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateTask() {
    if (taskCreated || busy) return;
    setBusy("task");
    setStatus(null);
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Task created in Notion ✓");
        setTaskCreated(true);
      } else {
        setStatus(data.error ?? "Task creation failed");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">{email.subject || "(no subject)"}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">{email.from}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={email.analysis.category} />
          <SentimentBadge sentiment={email.analysis.sentiment} />
          <UrgencyBadge score={email.analysis.urgency} />
        </div>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        <span className="font-medium text-slate-900">Summary: </span>
        {email.analysis.summary}
      </p>

      {email.analysis.actionItems.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          {email.analysis.actionItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {email.analysis.needsReply && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Suggested reply
          </label>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={5}
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={refineText}
              onChange={e => setRefineText(e.target.value)}
              placeholder="Ask AI to refine (e.g. 'make it shorter and more formal')"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={handleRefine}
              disabled={busy !== null || !refineText.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy === "refine" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Refine
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleSend}
              disabled={busy !== null || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send reply
            </button>
            <button
              onClick={handleCreateTask}
              disabled={busy !== null || taskCreated}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "task" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
              {taskCreated ? "Task created ✓" : "Create Notion task"}
            </button>
          </div>

          {status && (
            <p className="mt-3 text-sm text-slate-600">{status}</p>
          )}
        </div>
      )}

      {!email.analysis.needsReply && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCreateTask}
            disabled={busy !== null || taskCreated}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "task" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
            {taskCreated ? "Task created ✓" : "Create task"}
          </button>
          {status && <span className="ml-3 self-center text-xs text-slate-600">{status}</span>}
        </div>
      )}
    </article>
  );
}
