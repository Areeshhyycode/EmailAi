import { NextResponse } from "next/server";
import { fetchUnreadEmails, starMessage } from "@/lib/gmail";
import { analyzeEmail } from "@/lib/groq";
import { createTask, notionEnabled } from "@/lib/notion";
import { notifyUrgent, slackEnabled } from "@/lib/slack";

export const dynamic = "force-dynamic";

/**
 * Scheduled background check.
 *
 * Auth model: this route is NOT user-session based. It accepts a `?token=`
 * query that must match CRON_SECRET, and an `accessToken` POST body or query
 * param that the caller supplies (in a real deployment, you would persist
 * refresh tokens server-side and rotate them here).
 *
 * For local dev, use scripts/cron-runner.js which signs in once and reuses
 * the access token across runs.
 */
async function runCron(accessToken: string, limit: number) {
  const emails = await fetchUnreadEmails(accessToken, limit);
  const results: Array<{ id: string; category: string; urgency: number; notion?: string }> = [];

  for (const email of emails) {
    try {
      const analysis = await analyzeEmail(email);
      const analyzed = { ...email, analysis };

      if (analysis.urgency >= 8) {
        if (slackEnabled()) await notifyUrgent(analyzed);
        try {
          await starMessage(accessToken, email.id);
        } catch {
          /* non-fatal */
        }
      }

      let notionId: string | null = null;
      if (notionEnabled() && (analysis.category === "Work" || analysis.urgency >= 7)) {
        notionId = await createTask(analyzed);
      }

      results.push({
        id: email.id,
        category: analysis.category,
        urgency: analysis.urgency,
        ...(notionId ? { notion: notionId } : {})
      });
    } catch (err) {
      results.push({ id: email.id, category: "ERROR", urgency: 0 });
    }
  }

  return results;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = url.searchParams.get("accessToken");
  if (!accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 25);

  try {
    const results = await runCron(accessToken, limit);
    return NextResponse.json({ processed: results.length, results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Cron failed" },
      { status: 500 }
    );
  }
}
