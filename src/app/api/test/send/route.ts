import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";

// Simulate a customer sending a message (like the webhook would)
export async function POST(request: Request) {
  const { customerId, customerName, botImId, content } = await request.json();

  if (!customerId || !botImId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({
    where: { imUserId: botImId },
  });

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  // Find or create session
  let session = await prisma.session.findFirst({
    where: {
      customerId,
      botId: bot.id,
      status: { in: ["waiting", "active"] },
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        customerId,
        customerName: customerName || customerId,
        botId: bot.id,
        status: "waiting",
      },
    });

    eventBus.emit("cs-event", {
      type: "new-session",
      session: {
        id: session.id,
        customerId: session.customerId,
        customerName: session.customerName,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      senderType: "customer",
      senderId: customerId,
      contentType: 1,
      content,
      imMessageId: Date.now().toString(),
    },
  });

  eventBus.emit("cs-event", {
    type: "new-message",
    targetAgentId: session.agentId || undefined,
    sessionId: session.id,
    message: {
      id: message.id,
      senderType: message.senderType,
      senderId: message.senderId,
      contentType: message.contentType,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, sessionId: session.id });
}
