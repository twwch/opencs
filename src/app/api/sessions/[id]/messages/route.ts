import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { imProvider, MessageContentType } from "@/lib/im";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const messages = await prisma.message.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
  }

  const csSession = await prisma.session.findUnique({
    where: { id },
    include: { bot: true },
  });

  if (!csSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (csSession.status !== "active") {
    return NextResponse.json({ error: "会话未激活" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      sessionId: id,
      senderType: "agent",
      senderId: session.userId,
      contentType: 1,
      content,
    },
  });

  // Send via OpenIM
  try {
    await imProvider.sendMessage({
      fromBotId: csSession.bot.imUserId,
      toUserId: csSession.customerId,
      contentType: MessageContentType.Text,
      content,
    });
  } catch (err) {
    console.error("OpenIM send failed:", err);
  }

  eventBus.emit("cs-event", {
    type: "new-message",
    targetAgentId: session.userId,
    sessionId: id,
    message: {
      id: message.id,
      senderType: message.senderType,
      senderId: message.senderId,
      contentType: message.contentType,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
