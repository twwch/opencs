"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface SidebarProps {
  user: { displayName: string; role: string };
}

const navItems = [
  { href: "/dashboard/workbench", label: "工作台", roles: ["admin", "agent"] },
  { href: "/dashboard/admin/robots", label: "机器人管理", roles: ["admin"] },
  { href: "/dashboard/admin/agents", label: "客服管理", roles: ["admin"] },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-900">野火客服</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
        <p className="text-xs text-gray-500">{user.role === "admin" ? "管理员" : "客服"}</p>
        <button
          onClick={handleLogout}
          className="mt-2 text-sm text-red-600 hover:text-red-700"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
