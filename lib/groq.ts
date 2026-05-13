import Groq from "groq-sdk";
import type { EmailAnalysis, RawEmail } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

export async function analyzeEmail(email: RawEmail): Promise<EmailAnalysis> {
  const userPrompt = `From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}

Body:
${email.body || email.snippet}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

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
