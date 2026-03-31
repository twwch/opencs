"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface SidebarProps {
  user: { displayName: string; role: string };
}

const navItems = [
  {
    href: "/dashboard/demo",
    label: "测试",
    roles: ["admin"],
    badge: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/workbench",
    label: "工作台",
    roles: ["admin", "agent"],
    badge: true, // show unread badge on this item
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin/robots",
    label: "机器人",
    roles: ["admin"],
    badge: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect x="8" y="8" width="8" height="12" rx="4" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin/agents",
    label: "客服",
    roles: ["admin"],
    badge: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // ignore
    }
  }, []);

  // Poll unread count every 3s
  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 3000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex w-[56px] flex-col items-center border-r border-[#E2E8F0] bg-[#0F172A] py-4">
      {/* Logo */}
      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] shadow-md shadow-[#2563EB]/30">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col gap-1">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? "bg-white/[0.12] text-white"
                    : "text-[#94A3B8] hover:bg-white/[0.06] hover:text-white/70"
                }`}
              >
                {item.icon}
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold text-white shadow-sm shadow-[#EF4444]/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User + logout */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          onClick={handleLogout}
          title="退出登录"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-white/[0.06] hover:text-white/70 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <div
          title={`${user.displayName} (${user.role === "admin" ? "管理员" : "客服"})`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white"
        >
          {user.displayName[0]}
        </div>
      </div>
    </aside>
  );
}
