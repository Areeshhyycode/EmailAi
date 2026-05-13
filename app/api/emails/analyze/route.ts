import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { analyzeEmail, refineReply } from "@/lib/groq";
import type { RawEmail } from "@/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as {
    email: RawEmail;
    action?: "analyze" | "refine";
    instruction?: string;
    previousDraft?: string;
  };

  if (!body?.email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  try {
    if (body.action === "refine" && body.instruction && body.previousDraft) {
      const reply = await refineReply(body.email, body.instruction, body.previousDraft);
      return NextResponse.json({ suggestedReply: reply });
    }

    const analysis = await analyzeEmail(body.email);
    return NextResponse.json({ analysis });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Analysis failed" },
      { status: 500 }
    );
  }
}
