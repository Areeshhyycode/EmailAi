import { Client } from "@notionhq/client";
import type { AnalyzedEmail } from "@/types";

const notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null;

export function notionEnabled(): boolean {
  return Boolean(notion && process.env.NOTION_DATABASE_ID);
}

type PropMap = Record<string, { type: string }>;
let schemaCache: { props: PropMap; titleKey: string } | null = null;

async function getSchema(): Promise<{ props: PropMap; titleKey: string } | null> {
  if (!notion || !process.env.NOTION_DATABASE_ID) return null;
  if (schemaCache) return schemaCache;
  try {
    const db: any = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    const props: PropMap = {};
    let titleKey = "Name";
    for (const [key, val] of Object.entries<any>(db.properties)) {
      props[key] = { type: val.type };
      if (val.type === "title") titleKey = key;
    }
    schemaCache = { props, titleKey };
    return schemaCache;
  } catch (err) {
    console.error("[Notion] Schema fetch failed:", err);
    return null;
  }
}

function urgencyToPriority(score: number): "High" | "Medium" | "Low" {
  if (score >= 8) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function urgencyToDueDate(score: number): string {
  const now = new Date();
  const daysAhead = score >= 9 ? 0 : score >= 7 ? 1 : score >= 5 ? 3 : 7;
  now.setDate(now.getDate() + daysAhead);
  return now.toISOString().slice(0, 10);
}

function findKey(props: PropMap, expectedType: string, ...candidates: string[]): string | null {
  const lowerProps = Object.keys(props).reduce<Record<string, string>>((acc, k) => {
    acc[k.toLowerCase()] = k;
    return acc;
  }, {});
  for (const name of candidates) {
    const real = lowerProps[name.toLowerCase()];
    if (real && props[real].type === expectedType) return real;
  }
  return null;
}

export async function createTask(email: AnalyzedEmail): Promise<{ pageId: string; pageUrl: string } | null> {
  if (!notionEnabled() || !notion) return null;

  const databaseId = process.env.NOTION_DATABASE_ID!;
  const schema = await getSchema();
  const props = schema?.props ?? {};
  const titleKey = schema?.titleKey ?? "Name";

  const priority = urgencyToPriority(email.analysis.urgency);
  const due = urgencyToDueDate(email.analysis.urgency);
  const actionList = email.analysis.actionItems.length
    ? email.analysis.actionItems.join(" • ")
    : email.analysis.summary;

  const properties: Record<string, any> = {
    [titleKey]: {
      title: [{ text: { content: `[${email.analysis.category}] ${email.subject}`.slice(0, 200) } }]
    }
  };

  const priorityKey = findKey(props, "select", "Priority");
  if (priorityKey) properties[priorityKey] = { select: { name: priority } };

  const statusKey = findKey(props, "status", "Status");
  if (statusKey) {
    properties[statusKey] = { status: { name: "Not started" } };
  } else {
    const statusSelectKey = findKey(props, "select", "Status");
    if (statusSelectKey) properties[statusSelectKey] = { select: { name: "Not started" } };
  }

  const dueKey = findKey(props, "date", "Due", "Due Date", "Deadline");
  if (dueKey) properties[dueKey] = { date: { start: due } };

  const categoryKey = findKey(props, "select", "Category");
  if (categoryKey) properties[categoryKey] = { select: { name: email.analysis.category } };

  const sentimentKey = findKey(props, "select", "Sentiment");
  if (sentimentKey) properties[sentimentKey] = { select: { name: email.analysis.sentiment } };

  const urgencyKey = findKey(props, "number", "Urgency", "Urgency Score");
  if (urgencyKey) properties[urgencyKey] = { number: email.analysis.urgency };

  const senderKey = findKey(props, "rich_text", "From", "Sender");
  if (senderKey) {
    properties[senderKey] = {
      rich_text: [{ type: "text", text: { content: email.from.slice(0, 200) } }]
    };
  }

  try {
    const page: any = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
      children: buildChildren(email, priority, due) as any
    });
    return { pageId: page.id, pageUrl: page.url ?? `https://www.notion.so/${String(page.id).replace(/-/g, "")}` };
  } catch (err: any) {
    // Fallback: schema mismatch — retry with title-only so the user isn't blocked.
    console.error("[Notion] Full-property create failed, retrying title-only:", err?.body ?? err?.message);
    schemaCache = null;
    const page: any = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        [titleKey]: {
          title: [{ text: { content: `[${email.analysis.category}] ${email.subject}`.slice(0, 200) } }]
        }
      },
      children: buildChildren(email, priority, due) as any
    });
    return { pageId: page.id, pageUrl: page.url ?? `https://www.notion.so/${String(page.id).replace(/-/g, "")}` };
  }
}

function buildChildren(email: AnalyzedEmail, priority: string, due: string) {
  const bullets = email.analysis.actionItems.length
    ? email.analysis.actionItems
    : [email.analysis.summary];

  return [
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
    ...bullets.map(item => ({
      object: "block" as const,
      type: "to_do" as const,
      to_do: {
        rich_text: [{ type: "text" as const, text: { content: item.slice(0, 2000) } }],
        checked: false
      }
    })),
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ type: "text", text: { content: "Details" } }] }
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
                `Priority: ${priority} (urgency ${email.analysis.urgency}/10)\n` +
                `Suggested due: ${due}\n` +
                `Sentiment: ${email.analysis.sentiment}`
            }
          }
        ]
      }
    }
  ];
}
