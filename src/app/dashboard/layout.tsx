import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, displayName: true, role: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">
      <Sidebar user={{ displayName: user.displayName, role: user.role }} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
