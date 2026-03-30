import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, targetAgentId } = body as {
    action: "assign" | "close" | "transfer";
    targetAgentId?: string;
  };

  const csSession = await prisma.session.findUnique({ where: { id } });
  if (!csSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (action === "assign") {
    const updated = await prisma.session.update({
      where: { id },
      data: { agentId: session.userId, status: "active" },
    });

    eventBus.emit("cs-event", {
      type: "session-updated",
      session: {
        id: updated.id,
        status: updated.status,
        agentId: updated.agentId,
      },
    });

    return NextResponse.json({ session: updated });
  }

  if (action === "close") {
    const updated = await prisma.session.update({
      where: { id },
      data: { status: "closed", closedAt: new Date() },
    });

    eventBus.emit("cs-event", {
      type: "session-updated",
      session: { id: updated.id, status: updated.status },
    });

    return NextResponse.json({ session: updated });
  }

  if (action === "transfer" && targetAgentId) {
    const updated = await prisma.session.update({
      where: { id },
      data: { agentId: targetAgentId },
    });

    eventBus.emit("cs-event", {
      type: "session-updated",
      targetAgentId,
      session: {
        id: updated.id,
        status: updated.status,
        agentId: updated.agentId,
        customerId: updated.customerId,
        customerName: updated.customerName,
      },
    });

    return NextResponse.json({ session: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
