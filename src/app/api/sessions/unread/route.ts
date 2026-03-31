import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: count of waiting sessions (unread indicator)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  const waitingCount = await prisma.session.count({
    where: { status: "waiting" },
  });

  return NextResponse.json({ count: waitingCount });
}
