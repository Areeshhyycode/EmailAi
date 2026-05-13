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

    const analyzed: AnalyzedEmail[] = await Promise.all(
      emails.map(async email => {
        try {
          const analysis = await analyzeEmail(email);
          return { ...email, analysis };
        } catch (err) {
          return {
            ...email,
            analysis: {
              category: "Other" as const,
              sentiment: "neutral" as const,
              urgency: 1,
              summary: "Analysis failed",
              needsReply: false,
              suggestedReply: null,
              actionItems: []
            }
          };
        }
      })
    );

    return NextResponse.json({ emails: analyzed, count: analyzed.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
