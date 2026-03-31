import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserInfo } from "@/lib/wildfire";

// GET: List known IM users from our sessions + query their names from IM Server
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get unique customer IDs from our sessions (real IM users, not demo_*)
    const sessions = await prisma.session.findMany({
      select: { customerId: true, customerName: true },
      distinct: ["customerId"],
    });

    const realCustomerIds = sessions
      .map((s) => s.customerId)
      .filter((id) => !id.startsWith("demo_") && !id.startsWith("test_"));

    // Query each user's info from IM Server in parallel
    const userResults = await Promise.allSettled(
      realCustomerIds.map(async (userId) => {
        const info = await getUserInfo(userId);
        if (info.code === 0 && info.result) {
          return {
            userId: info.result.userId,
            displayName: info.result.displayName || info.result.name || userId,
            name: info.result.name || "",
          };
        }
        // Fallback to what we have in our DB
        const s = sessions.find((s) => s.customerId === userId);
        return { userId, displayName: s?.customerName || userId, name: "" };
      })
    );

    const users = userResults
      .filter((r): r is PromiseFulfilledResult<{ userId: string; displayName: string; name: string }> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
