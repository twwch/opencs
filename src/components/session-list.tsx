"use client";

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
}

export function SessionList({ sessions, activeSessionId, onSelect, onAssign }: SessionListProps) {
  const waiting = sessions.filter((s) => s.status === "waiting");
  const active = sessions.filter((s) => s.status === "active");

  return (
    <div className="flex h-full flex-col">
      {/* Waiting queue */}
      {waiting.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#F1F5F9]">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[#FEF3C7] px-1.5 text-[10px] font-bold text-[#92400E]">
              {waiting.length}
            </span>
            <span className="text-[11px] font-semibold text-[#94A3B8]">排队中</span>
          </div>
          {waiting.map((s) => (
            <div
              key={s.id}
              className="group flex cursor-pointer items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 transition hover:bg-[#F8FAFC]"
            >
              <div className="relative mt-0.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[11px] font-bold text-[#92400E]">
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
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-2 text-[11px] font-semibold text-[#94A3B8]">
          我的会话 · {active.length}
        </div>
        {active.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`flex cursor-pointer items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 transition ${
              activeSessionId === s.id
                ? "bg-[#2563EB]/[0.06]"
                : "hover:bg-[#F8FAFC]"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DBEAFE] text-[11px] font-bold text-[#1D4ED8]">
              {s.customerName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-[#0F172A]">{s.customerName}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#94A3B8]">
                <span>{s.bot?.displayName || "未知"}</span>
                <span>·</span>
                <span>{s._count?.messages || 0} 条消息</span>
              </div>
            </div>
          </div>
        ))}
        {active.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[#CBD5E1]">暂无会话</div>
        )}
      </div>
    </div>
  );
}
