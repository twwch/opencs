"use client";

interface Session {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  agentId: string | null;
  createdAt: string;
  agent?: { displayName: string } | null;
  robot?: { displayName: string };
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
      {waiting.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
            等待接入 ({waiting.length})
          </div>
          {waiting.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
            >
              <div>
                <div className="text-sm font-medium">{s.customerName}</div>
                <div className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleTimeString("zh-CN")}
                </div>
              </div>
              <button
                onClick={() => onAssign(s.id)}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                接入
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
          我的会话 ({active.length})
        </div>
        {active.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`cursor-pointer border-b border-gray-100 px-3 py-2 hover:bg-gray-50 ${
              activeSessionId === s.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="text-sm font-medium">{s.customerName}</div>
            <div className="text-xs text-gray-400">
              {s._count?.messages || 0} 条消息
            </div>
          </div>
        ))}
        {active.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-gray-400">暂无会话</div>
        )}
      </div>
    </div>
  );
}
