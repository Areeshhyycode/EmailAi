import type { EmailCategory, Sentiment } from "@/types";

const CATEGORY_STYLE: Record<EmailCategory, string> = {
  Work: "bg-blue-100 text-blue-700",
  Personal: "bg-purple-100 text-purple-700",
  Newsletter: "bg-slate-100 text-slate-700",
  Promotional: "bg-amber-100 text-amber-700",
  Spam: "bg-red-100 text-red-700",
  Urgent: "bg-rose-100 text-rose-700",
  Other: "bg-slate-100 text-slate-600"
};

const SENTIMENT_STYLE: Record<Sentiment, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-orange-100 text-orange-700",
  angry: "bg-red-100 text-red-700"
};

export function CategoryBadge({ category }: { category: EmailCategory }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLE[category]}`}>
      {category}
    </span>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[sentiment]}`}>
      {sentiment}
    </span>
  );
}

export function UrgencyBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-red-100 text-red-700"
      : score >= 5
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      Urgency {score}/10
    </span>
  );
}

const PRIORITY_STYLE: Record<"High" | "Medium" | "Low", string> = {
  High: "bg-red-50 text-red-700 ring-1 ring-red-200",
  Medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
};

export function PriorityBadge({ priority }: { priority: "High" | "Medium" | "Low" }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLE[priority]}`}>
      {priority} priority
    </span>
  );
}
