"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { RefreshCw, LogOut, Mail, Flame, Inbox, MessageSquare } from "lucide-react";
import type { AnalyzedEmail } from "@/types";
import { EmailCard } from "./EmailCard";

export function Dashboard() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<AnalyzedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/fetch?limit=5", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setEmails(data.emails);
      } else {
        setError(data.error ?? "Failed to load emails");
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = {
    total: emails.length,
    urgent: emails.filter(e => e.analysis.urgency >= 8).length,
    needsReply: emails.filter(e => e.analysis.needsReply).length,
    work: emails.filter(e => e.analysis.category === "Work").length
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Mail className="h-5 w-5 text-brand-600" />
            <span>InboxAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analyzing…" : "Refresh"}
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="hidden sm:inline">{session?.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg p-2 hover:bg-slate-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Unread" value={stats.total} icon={Inbox} tint="text-slate-700" />
          <StatCard label="Urgent" value={stats.urgent} icon={Flame} tint="text-red-600" />
          <StatCard label="Needs reply" value={stats.needsReply} icon={MessageSquare} tint="text-brand-600" />
          <StatCard label="Work" value={stats.work} icon={Mail} tint="text-blue-600" />
        </section>

        <section className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && emails.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-4 font-medium text-slate-700">Inbox zero!</p>
              <p className="mt-1 text-sm text-slate-500">No unread emails to triage right now.</p>
            </div>
          )}

          {emails.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              onSent={id => setEmails(prev => prev.filter(e => e.id !== id))}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${tint}`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
