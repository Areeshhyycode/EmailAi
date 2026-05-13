import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createTask, notionEnabled } from "@/lib/notion";
import type { AnalyzedEmail } from "@/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!notionEnabled()) {
    return NextResponse.json(
      { error: "Notion is not configured. Set NOTION_API_KEY and NOTION_DATABASE_ID." },
      { status: 400 }
    );
  }

  const { email } = (await req.json()) as { email: AnalyzedEmail };
  if (!email?.analysis) {
    return NextResponse.json({ error: "Missing analyzed email" }, { status: 400 });
  }

  try {
    const pageId = await createTask(email);
    return NextResponse.json({ pageId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create task" },
      { status: 500 }
    );
  }
}
