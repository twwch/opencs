import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get messages for a customer (no auth required, test only)
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("customerId");
  const botImId = request.nextUrl.searchParams.get("botImId");

  if (!customerId || !botImId) {
    return NextResponse.json({ error: "Missing customerId or botImId" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({
    where: { imUserId: botImId },
  });

  if (!bot) {
    return NextResponse.json({ messages: [] });
  }

  const session = await prisma.session.findFirst({
    where: {
      customerId,
      botId: bot.id,
      status: { in: ["waiting", "active"] },
    },
  });

  if (!session) {
    return NextResponse.json({ messages: [], sessionId: null });
  }

  const messages = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages, sessionId: session.id, status: session.status });
}
