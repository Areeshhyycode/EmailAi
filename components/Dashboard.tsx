"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { RefreshCw, LogOut, Mail, Flame, Inbox, MessageSquare, Search, X } from "lucide-react";
import type { AnalyzedEmail, EmailCategory } from "@/types";
import { EmailCard } from "./EmailCard";

type FilterCategory = "All" | EmailCategory;

const FILTER_OPTIONS: FilterCategory[] = [
  "All",
  "Urgent",
  "Work",
  "Personal",
  "Newsletter",
  "Promotional",
  "Spam",
  "Other"
];

export function Dashboard() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<AnalyzedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("All");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emails.filter(e => {
      if (filter !== "All" && e.analysis.category !== filter) return false;
      if (!q) return true;
      return (
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.analysis.summary.toLowerCase().includes(q)
      );
    });
  }, [emails, search, filter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: emails.length };
    for (const e of emails) {
      counts[e.analysis.category] = (counts[e.analysis.category] ?? 0) + 1;
    }
    return counts;
  }, [emails]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
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
              <span className="hidden max-w-[160px] truncate sm:inline">{session?.user?.email}</span>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by subject, sender, or summary…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(opt => {
              const count = categoryCounts[opt] ?? 0;
              const active = filter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  disabled={opt !== "All" && count === 0}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {opt}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-slate-100"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

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

          {!loading && emails.length > 0 && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No emails match your filters.
            </div>
          )}

          {filtered.map(email => (
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
