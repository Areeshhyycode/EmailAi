"use client";

import { useState } from "react";
import type { AnalyzedEmail } from "@/types";
import { CategoryBadge, SentimentBadge, UrgencyBadge, PriorityBadge } from "./CategoryBadge";
import { Send, ListPlus, Wand2, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  email: AnalyzedEmail;
  onSent?: (id: string) => void;
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}

function urgencyToPriority(score: number): "High" | "Medium" | "Low" {
  if (score >= 8) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export function EmailCard({ email, onSent }: Props) {
  const [draft, setDraft] = useState(email.analysis.suggestedReply ?? "");
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState<null | "send" | "refine" | "task">(null);
  const [status, setStatus] = useState<string | null>(null);
  const [taskCreated, setTaskCreated] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const priority = urgencyToPriority(email.analysis.urgency);

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
        setStatus("Synced to Notion ✓");
        setTaskCreated(true);
        if (data.pageUrl) setNotionUrl(data.pageUrl);
      } else {
        setStatus(data.error ?? "Task creation failed");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-slate-900 line-clamp-2">
            {email.subject || "(no subject)"}
          </h3>
          <p className="mt-0.5 break-all text-sm text-slate-500">{email.from}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
          <CategoryBadge category={email.analysis.category} />
          <SentimentBadge sentiment={email.analysis.sentiment} />
          <UrgencyBadge score={email.analysis.urgency} />
          <PriorityBadge priority={priority} />
        </div>
      </header>

      <p className="mt-4 break-words text-sm leading-relaxed text-slate-700">
        <span className="font-medium text-slate-900">Summary: </span>
        {email.analysis.summary}
      </p>

      {email.analysis.actionItems.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          {email.analysis.actionItems.map((item, i) => (
            <li key={i} className="break-words">{item}</li>
          ))}
        </ul>
      )}

      {email.snippet && (
        <div className="mt-3">
          <button
            onClick={() => setShowOriginal(s => !s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showOriginal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showOriginal ? "Hide original" : "Show original"}
          </button>
          {showOriginal && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <p className="whitespace-pre-wrap break-words">{email.snippet}</p>
            </div>
          )}
        </div>
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
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={handleRefine}
              disabled={busy !== null || !refineText.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy === "refine" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Refine
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
            {notionUrl && (
              <a
                href={notionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                View in Notion <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {status && (
            <p className="mt-3 break-words text-sm text-slate-600">{status}</p>
          )}
        </div>
      )}

      {!email.analysis.needsReply && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {notionUrl && (
            <a
              href={notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              View in Notion <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={handleCreateTask}
            disabled={busy !== null || taskCreated}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "task" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
            {taskCreated ? "Task created ✓" : "Create task"}
          </button>
          {status && <span className="w-full break-words text-right text-xs text-slate-600">{status}</span>}
        </div>
      )}
    </article>
  );
}
