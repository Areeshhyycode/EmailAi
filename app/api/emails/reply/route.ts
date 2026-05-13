import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { markAsRead, sendReply } from "@/lib/gmail";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { to, subject, body, threadId, messageId } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 }
    );
  }

  try {
    await sendReply(session.accessToken, to, subject, body, threadId);
    if (messageId) {
      await markAsRead(session.accessToken, messageId);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to send reply" },
      { status: 500 }
    );
  }
}
