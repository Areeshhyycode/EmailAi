import { Client } from "@notionhq/client";
import type { AnalyzedEmail } from "@/types";

const notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null;

export function notionEnabled(): boolean {
  return Boolean(notion && process.env.NOTION_DATABASE_ID);
}

export async function createTask(email: AnalyzedEmail): Promise<string | null> {
  if (!notionEnabled() || !notion) return null;

  const databaseId = process.env.NOTION_DATABASE_ID!;
  const actionList = email.analysis.actionItems.length
    ? email.analysis.actionItems.join(" • ")
    : email.analysis.summary;

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      // Database is expected to have a Title property named "Name"
      Name: {
        title: [{ text: { content: `[${email.analysis.category}] ${email.subject}`.slice(0, 200) } }]
      }
    },
    children: [
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "Summary" } }] }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: email.analysis.summary } }] }
      },
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "Action items" } }] }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: actionList } }] }
      },
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "Email details" } }] }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content:
                  `From: ${email.from}\n` +
                  `Date: ${email.date}\n` +
                  `Urgency: ${email.analysis.urgency}/10 • Sentiment: ${email.analysis.sentiment}`
              }
            }
          ]
        }
      }
    ]
  });

  return page.id;
}
