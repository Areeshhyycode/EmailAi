import Groq from "groq-sdk";
import type { EmailAnalysis, RawEmail } from "@/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 20_000
});
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are an email triage assistant. Analyze an incoming email and return a STRICT JSON object with these exact fields:

{
  "category": "Work" | "Personal" | "Newsletter" | "Promotional" | "Spam" | "Urgent" | "Other",
  "sentiment": "positive" | "neutral" | "negative" | "angry",
  "urgency": <integer 1-10, where 10 = immediate action required>,
  "summary": "<1-2 sentence summary of what the email is about>",
  "needsReply": <boolean - true if a human reply is genuinely expected>,
  "suggestedReply": "<a polite, professional draft reply, or null if needsReply is false>",
  "actionItems": ["<short action item>", ...]  // empty array if none
}

Rules:
- Mark "Urgent" only when there is a clear deadline, escalation, or time-sensitive request.
- Newsletters and marketing always have needsReply=false.
- Keep suggestedReply under 120 words and in the same language as the email.
- Return ONLY the JSON object — no markdown fences, no commentary.`;

function parseRetryAfter(err: any): number {
  // Groq returns "Please try again in X.XXs" in the error message
  const msg = String(err?.message ?? err?.error?.message ?? "");
  const match = msg.match(/try again in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  // Fallback: use Retry-After header if present
  const header = err?.headers?.["retry-after"];
  if (header) return Number(header) * 1000;
  return 0;
}

async function callGroqWithRetry(payload: any, maxRetries = 2): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await groq.chat.completions.create(payload);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 429 && attempt < maxRetries) {
        const wait = parseRetryAfter(err) || 1500 * (attempt + 1);
        console.warn(`[Groq] 429 hit, waiting ${wait}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

export async function analyzeEmail(email: RawEmail): Promise<EmailAnalysis> {
  // Aggressively truncate body — many promo/newsletter emails are massive
  const body = (email.body || email.snippet || "").slice(0, 1000);

  const userPrompt = `From: ${email.from}
Subject: ${email.subject}

Body:
${body}`;

  const completion = await callGroqWithRetry({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some models occasionally wrap JSON in markdown fences
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  return {
    category: parsed.category ?? "Other",
    sentiment: parsed.sentiment ?? "neutral",
    urgency: Math.max(1, Math.min(10, Number(parsed.urgency) || 1)),
    summary: parsed.summary ?? "",
    needsReply: Boolean(parsed.needsReply),
    suggestedReply: parsed.suggestedReply ?? null,
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : []
  };
}

export async function refineReply(
  email: RawEmail,
  instruction: string,
  previousDraft: string
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You revise email reply drafts. Output only the revised reply text — no preamble, no markdown."
      },
      {
        role: "user",
        content: `Original email from ${email.from}:\nSubject: ${email.subject}\n\n${email.body || email.snippet}\n\nCurrent draft:\n${previousDraft}\n\nUser instruction: ${instruction}`
      }
    ],
    temperature: 0.4
  });

  return completion.choices[0]?.message?.content?.trim() ?? previousDraft;
}
