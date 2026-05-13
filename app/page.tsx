import Link from "next/link";
import { Mail, Sparkles, Bell, ListTodo } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-brand-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Mail className="h-6 w-6 text-brand-600" />
          <span>InboxAI</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> Powered by Groq + LLaMA 3.3
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900">
          Your AI inbox triage,
          <br />
          on autopilot.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          InboxAI reads your unread Gmail, categorizes each message, detects urgent
          threads, drafts replies, and pushes tasks to Notion — all in seconds.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-block rounded-xl bg-brand-600 px-8 py-3.5 font-semibold text-white shadow-md hover:bg-brand-700"
        >
          Connect Gmail to start
        </Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Sparkles, title: "AI categorization", body: "Work, Personal, Newsletter, Urgent — auto-tagged with sentiment." },
          { icon: Mail, title: "Smart replies", body: "Drafts polite, on-brand responses you can review and send in one click." },
          { icon: Bell, title: "Urgent alerts", body: "Slack pings the moment a high-priority email lands in your inbox." },
          { icon: ListTodo, title: "Notion tasks", body: "Action items extracted and pushed to your project database automatically." }
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Icon className="h-8 w-8 text-brand-600" />
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
