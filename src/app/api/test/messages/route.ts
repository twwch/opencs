import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get messages for a customer (no auth required, test only)
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("customerId");
  const robotImId = request.nextUrl.searchParams.get("robotImId");

  if (!customerId || !robotImId) {
    return NextResponse.json({ error: "Missing customerId or robotImId" }, { status: 400 });
  }

  const robot = await prisma.robot.findUnique({
    where: { imUserId: robotImId },
  });

  if (!robot) {
    return NextResponse.json({ messages: [] });
  }

  const session = await prisma.session.findFirst({
    where: {
      customerId,
      robotId: robot.id,
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
