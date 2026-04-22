import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  // Agents see their assigned sessions + waiting sessions
  // Admins see all sessions
  if (session.role === "agent") {
    where.OR = [
      { agentId: session.userId },
      { status: "waiting" },
    ];
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { displayName: true } },
      bot: { select: { displayName: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ sessions });
}
