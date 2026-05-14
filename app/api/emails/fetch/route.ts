import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchUnreadEmails } from "@/lib/gmail";
import { analyzeEmail } from "@/lib/groq";
import type { AnalyzedEmail } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5), 20);
  const analyze = url.searchParams.get("analyze") !== "false";

  try {
    const emails = await fetchUnreadEmails(session.accessToken, limit);

    if (!analyze) {
      return NextResponse.json({ emails, count: emails.length });
    }

    // Sequential processing keeps us under Groq's TPM cap on the free tier.
    // The Groq client itself retries 429s with backoff (see lib/groq.ts).
    const analyzed: AnalyzedEmail[] = [];

    for (const email of emails) {
      try {
        const analysis = await analyzeEmail(email);
        analyzed.push({ ...email, analysis });
      } catch (err: any) {
        console.error(`[Groq] Failed for "${email.subject}":`, err?.message ?? err);
        analyzed.push({
          ...email,
          analysis: {
            category: "Other" as const,
            sentiment: "neutral" as const,
            urgency: 1,
            summary: `Analysis failed: ${String(err?.message ?? "unknown error").slice(0, 100)}`,
            needsReply: false,
            suggestedReply: null,
            actionItems: []
          }
        });
      }
    }

    return NextResponse.json({ emails: analyzed, count: analyzed.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
