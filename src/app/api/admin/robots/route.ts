import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRobot, setRobotCallback } from "@/lib/wildfire";

export async function GET() {
  const robots = await prisma.robot.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return NextResponse.json({ robots });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, displayName, callbackUrl } = await request.json();

  if (!name || !displayName) {
    return NextResponse.json({ error: "名称和显示名不能为空" }, { status: 400 });
  }

  // Call Wildfire Admin API to create robot on IM server
  const imResult = await createRobot({
    name,
    displayName,
    owner: session.userId,
    callback: callbackUrl,
  });

  if (imResult.code !== 0) {
    return NextResponse.json(
      { error: `野火 IM 创建机器人失败: ${imResult.msg}` },
      { status: 502 }
    );
  }

  const { userId: imUserId, secret } = imResult.result!;

  // Set callback URL if provided
  if (callbackUrl) {
    await setRobotCallback(imUserId, secret, callbackUrl);
  }

  // Save to our database
  const robot = await prisma.robot.create({
    data: {
      imUserId,
      name,
      displayName,
      secret,
      callbackUrl,
      createdById: session.userId,
    },
  });

  return NextResponse.json({ robot }, { status: 201 });
}
