import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { robotSendMessage } from "@/lib/wildfire";

// POST: Make a robot send a greeting to a user (so the robot appears in their chat list)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { robotId, targetUserId, message } = await request.json();

  if (!robotId || !targetUserId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const robot = await prisma.robot.findUnique({ where: { id: robotId } });
  if (!robot) {
    return NextResponse.json({ error: "机器人不存在" }, { status: 404 });
  }

  const greeting = message || `你好！我是${robot.displayName}，有什么可以帮您的吗？`;

  const result = await robotSendMessage(
    robot.imUserId,
    robot.secret,
    targetUserId,
    { type: 1, searchableContent: greeting }
  );

  if (result?.code !== undefined && result.code !== 0) {
    return NextResponse.json(
      { error: `发送失败: ${result.msg || "未知错误"}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
