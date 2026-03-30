import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.user.findMany({
    where: { role: "agent" },
    select: { id: true, username: true, displayName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, displayName } = await request.json();

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "所有字段都不能为空" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const agent = await prisma.user.create({
    data: { username, passwordHash, displayName, role: "agent" },
    select: { id: true, username: true, displayName: true, role: true },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
