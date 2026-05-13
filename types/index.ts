export type EmailCategory =
  | "Work"
  | "Personal"
  | "Newsletter"
  | "Promotional"
  | "Spam"
  | "Urgent"
  | "Other";

export type Sentiment = "positive" | "neutral" | "negative" | "angry";

export interface RawEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  unread: boolean;
}

export interface EmailAnalysis {
  category: EmailCategory;
  sentiment: Sentiment;
  urgency: number; // 1-10
  summary: string;
  needsReply: boolean;
  suggestedReply: string | null;
  actionItems: string[];
}

export interface AnalyzedEmail extends RawEmail {
  analysis: EmailAnalysis;
}
