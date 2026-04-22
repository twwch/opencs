import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider } from "@/lib/im";

export async function GET() {
  const bots = await prisma.bot.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return NextResponse.json({ bots });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, displayName, avatarUrl } = await request.json();

  if (!name || !displayName) {
    return NextResponse.json({ error: "名称和显示名不能为空" }, { status: 400 });
  }

  // Create notification account on OpenIM
  try {
    await imProvider.createBot({ userId: name, nickname: displayName, avatarUrl });
  } catch (err) {
    return NextResponse.json(
      { error: `OpenIM 创建 Bot 失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 }
    );
  }

  // Save to our database
  const bot = await prisma.bot.create({
    data: {
      imUserId: name,
      name,
      displayName,
      avatarUrl: avatarUrl || null,
      createdById: session.userId,
    },
  });

  return NextResponse.json({ bot }, { status: 201 });
}
