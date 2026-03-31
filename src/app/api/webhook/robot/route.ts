import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { getUserInfo } from "@/lib/wildfire";

interface WildfireMessage {
  messageId: number;
  sender: string;
  conv: { type: number; target: string; line: number };
  payload: {
    type: number;
    searchableContent?: string;
    content?: string;
  };
  senderUserInfo?: {
    userId: string;
    displayName?: string;
    portrait?: string;
  };
  timestamp: number;
}

export async function POST(request: Request) {
  const msg: WildfireMessage = await request.json();

  // Only handle private messages (conv.type === 0)
  if (msg.conv.type !== 0) {
    return NextResponse.json({ ok: true });
  }

  const robotImUserId = msg.conv.target;
  const customerId = msg.sender;
  const content = msg.payload.searchableContent || msg.payload.content || "";

  // Get customer display name — from callback payload or fallback to Admin API
  let customerName = msg.senderUserInfo?.displayName || "";
  if (!customerName) {
    try {
      const info = await getUserInfo(customerId);
      customerName = info.result?.displayName || customerId;
    } catch {
      customerName = customerId;
    }
  }

  // Find the robot in our database
  const robot = await prisma.robot.findUnique({
    where: { imUserId: robotImUserId },
  });

  if (!robot) {
    console.warn(`Webhook: unknown robot ${robotImUserId}`);
    return NextResponse.json({ ok: true });
  }

  // Find or create an active session for this customer + robot
  let session = await prisma.session.findFirst({
    where: {
      customerId,
      robotId: robot.id,
      status: { in: ["waiting", "active"] },
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        customerId,
        customerName,
        robotId: robot.id,
        status: "waiting",
      },
    });

    // Broadcast new session to all agents
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
      contentType: msg.payload.type,
      content,
      imMessageId: msg.messageId.toString(),
    },
  });

  // Push message to assigned agent (or broadcast if waiting)
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

  return NextResponse.json({ ok: true });
}
