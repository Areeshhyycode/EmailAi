import type { AnalyzedEmail } from "@/types";

export function slackEnabled(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export async function notifyUrgent(email: AnalyzedEmail): Promise<void> {
  if (!slackEnabled()) return;

  const text =
    `:rotating_light: *Urgent email* — urgency ${email.analysis.urgency}/10\n` +
    `*From:* ${email.from}\n` +
    `*Subject:* ${email.subject}\n` +
    `*Summary:* ${email.analysis.summary}`;

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
}
