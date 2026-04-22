"use client";

import { useState } from "react";

interface Session {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  agentId: string | null;
  createdAt: string;
  agent?: { displayName: string } | null;
  bot?: { displayName: string };
  _count?: { messages: number };
}

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (session: Session) => void;
  onAssign: (sessionId: string) => void;
  agentName?: string;
  connected?: boolean;
}

export function SessionList({ sessions, activeSessionId, onSelect, onAssign, agentName = "客服", connected = true }: SessionListProps) {
  const [activeTab, setActiveTab] = useState<"mine" | "bot" | "history">("mine");
  const waiting = sessions.filter((s) => s.status === "waiting");
  const active = sessions.filter((s) => s.status === "active");

  const tabs = [
    { key: "mine" as const, label: "我的接待" },
    { key: "bot" as const, label: "机器人接待" },
    { key: "history" as const, label: "历史" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Agent status bar */}
      <div className="border-b border-[#E2E8F0] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#0F172A]">{agentName}</span>
        </div>
        <div className="mt-1 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
            <span className="text-[11px] text-[#64748B]">{connected ? "在线" : "离线"}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
            <span>{waiting.length} <span className="text-[10px]">排队</span></span>
            <span>{active.length} <span className="text-[10px]">接线</span></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-[12px] font-medium transition cursor-pointer ${
              activeTab === tab.key
                ? "border-b-2 border-[#2563EB] text-[#2563EB]"
                : "text-[#94A3B8] hover:text-[#64748B]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="border-b border-[#E2E8F0] px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#F1F5F9] px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[11px] text-[#CBD5E1]">搜索客户昵称</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#94A3B8]">
          <span className="flex items-center gap-1">
            所有渠道
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
          <span className="flex items-center gap-1">
            最新消息
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-auto">
        {/* Waiting queue */}
        {waiting.length > 0 && activeTab === "mine" && (
          <div>
            {waiting.map((s) => (
              <div
                key={s.id}
                className="group flex cursor-pointer items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 transition hover:bg-[#F8FAFC]"
              >
                <div className="relative mt-0.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7] text-[12px] font-bold text-[#92400E]">
                    {s.customerName[0]}
                  </div>
                  <div className="absolute -left-1 top-0 h-full w-[3px] rounded-full bg-[#F59E0B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#0F172A]">{s.customerName}</span>
                    <span className="text-[10px] text-[#CBD5E1]">
                      {new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-[#94A3B8]">来自 {s.bot?.displayName || "未知"}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAssign(s.id); }}
                      className="rounded-md bg-[#2563EB] px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100 cursor-pointer"
                    >
                      接入
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active sessions */}
        {activeTab === "mine" && active.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`flex cursor-pointer items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 transition ${
              activeSessionId === s.id
                ? "bg-[#2563EB]/[0.06]"
                : "hover:bg-[#F8FAFC]"
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E2E8F0] text-[12px] font-bold text-[#64748B]">
              {s.customerName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#0F172A]">{s.customerName}</span>
                <span className="text-[10px] text-[#CBD5E1]">
                  {new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#94A3B8] truncate">
                {s._count?.messages || 0} 条消息
              </div>
            </div>
          </div>
        ))}

        {activeTab === "mine" && active.length === 0 && waiting.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[#CBD5E1]">暂无会话</div>
        )}

        {activeTab !== "mine" && (
          <div className="px-4 py-8 text-center text-xs text-[#CBD5E1]">
            {activeTab === "bot" ? "暂无机器人接待" : "暂无历史记录"}
          </div>
        )}
      </div>
    </div>
  );
}
