import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider } from "@/lib/im";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sessions = await prisma.session.findMany({
      select: { customerId: true, customerName: true },
      distinct: ["customerId"],
    });

    const realCustomerIds = sessions
      .map((s) => s.customerId)
      .filter((id) => !id.startsWith("demo_") && !id.startsWith("test_"));

    const userResults = await Promise.allSettled(
      realCustomerIds.map(async (userId) => {
        try {
          const info = await imProvider.getUserInfo(userId);
          return {
            userId: info.userId,
            displayName: info.displayName,
            name: info.userId,
          };
        } catch {
          const s = sessions.find((s) => s.customerId === userId);
          return { userId, displayName: s?.customerName || userId, name: "" };
        }
      })
    );

    const users = userResults
      .filter(
        (r): r is PromiseFulfilledResult<{ userId: string; displayName: string; name: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
