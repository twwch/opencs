import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { imProvider } from "@/lib/im";

export async function POST(request: Request) {
  const body = await request.json();

  // Only handle afterSendSingleMsg events
  const command = body.callbackCommand as string | undefined;
  if (command !== "callbackAfterSendSingleMsgCommand") {
    return NextResponse.json({ actionCode: 0 });
  }

  // Only handle single chat (sessionType === 1)
  if (body.sessionType !== 1) {
    return NextResponse.json({ actionCode: 0 });
  }

  const msg = imProvider.parseWebhook(body);
  const botImUserId = msg.recipientId;
  const customerId = msg.senderId;

  // Get customer display name from webhook payload or fallback to IM API
  let customerName = msg.senderName || "";
  if (!customerName) {
    try {
      const info = await imProvider.getUserInfo(customerId);
      customerName = info.displayName;
    } catch {
      customerName = customerId;
    }
  }

  // Find the bot in our database
  const bot = await prisma.bot.findUnique({
    where: { imUserId: botImUserId },
  });

  if (!bot) {
    console.warn(`Webhook: unknown bot ${botImUserId}`);
    return NextResponse.json({ actionCode: 0 });
  }

  // Find or create an active session for this customer + bot
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
        customerName,
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

  // Save message
  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      senderType: "customer",
      senderId: customerId,
      contentType: msg.contentType,
      content: msg.content,
      imMessageId: msg.messageId,
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

  return NextResponse.json({ actionCode: 0 });
}
