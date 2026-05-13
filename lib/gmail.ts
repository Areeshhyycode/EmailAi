import { google, gmail_v1 } from "googleapis";
import type { RawEmail } from "@/types";

function gmailClient(accessToken: string): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    const plain = payload.parts.find(p => p.mimeType === "text/plain");
    if (plain?.body?.data) {
      return Buffer.from(plain.body.data, "base64url").toString("utf-8");
    }
    const html = payload.parts.find(p => p.mimeType === "text/html");
    if (html?.body?.data) {
      return Buffer.from(html.body.data, "base64url")
        .toString("utf-8")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    for (const part of payload.parts) {
      const nested = decodeBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

export async function fetchUnreadEmails(
  accessToken: string,
  maxResults = 10
): Promise<RawEmail[]> {
  const gmail = gmailClient(accessToken);

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread in:inbox",
    maxResults
  });

  const messages = list.data.messages ?? [];
  if (messages.length === 0) return [];

  const detailed = await Promise.all(
    messages.map(m =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full"
      })
    )
  );

  return detailed.map(({ data: msg }) => {
    const headers = msg.payload?.headers;
    const body = decodeBody(msg.payload ?? undefined);
    return {
      id: msg.id!,
      threadId: msg.threadId!,
      from: header(headers, "From"),
      to: header(headers, "To"),
      subject: header(headers, "Subject"),
      snippet: msg.snippet ?? "",
      body: body.slice(0, 4000), // cap for LLM context
      date: header(headers, "Date"),
      unread: msg.labelIds?.includes("UNREAD") ?? false
    };
  });
}

export async function sendReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  const gmail = gmailClient(accessToken);

  const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;

  const raw = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\r\n");

  const encoded = Buffer.from(raw).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      ...(threadId ? { threadId } : {})
    }
  });
}

export async function markAsRead(accessToken: string, messageId: string): Promise<void> {
  const gmail = gmailClient(accessToken);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] }
  });
}

export async function starMessage(accessToken: string, messageId: string): Promise<void> {
  const gmail = gmailClient(accessToken);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: ["STARRED"] }
  });
}
