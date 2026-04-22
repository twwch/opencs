import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider, MessageContentType } from "@/lib/im";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { botId, targetUserId, message } = await request.json();

  if (!botId || !targetUserId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    return NextResponse.json({ error: "Bot 不存在" }, { status: 404 });
  }

  const greeting = message || `你好！我是${bot.displayName}，有什么可以帮您的吗？`;

  try {
    await imProvider.sendMessage({
      fromBotId: bot.imUserId,
      toUserId: targetUserId,
      contentType: MessageContentType.Text,
      content: greeting,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `发送失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
