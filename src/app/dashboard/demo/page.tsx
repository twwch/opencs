"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { SessionList } from "@/components/session-list";
import { ChatPanel } from "@/components/chat-panel";
import { useSSE } from "@/hooks/use-sse";

// ============================================================
// Types
// ============================================================

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

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  contentType: number;
  createdAt: string;
}

interface Bot {
  id: string;
  imUserId: string;
  displayName: string;
}

// ============================================================
// Demo Page — Split View
// ============================================================

export default function DemoPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  useEffect(() => {
    fetch("/api/admin/bots").then((r) => r.json()).then((d) => {
      setBots(d.bots || []);
      if (d.bots?.length > 0) setSelectedBot(d.bots[0]);
    });
  }, []);

  if (bots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-[#0F172A]">请先创建 Bot</div>
          <p className="mt-1 text-sm text-[#94A3B8]">前往 Bot 管理页面创建一个客服 Bot 后再来测试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Customer Simulator */}
      <div className="flex w-[400px] flex-col border-r-2 border-[#2563EB]/20">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#2563EB] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            <span className="text-sm font-semibold text-white">客户端模拟器</span>
          </div>
          {bots.length > 1 && (
            <select
              value={selectedBot?.imUserId || ""}
              onChange={(e) => setSelectedBot(bots.find((r) => r.imUserId === e.target.value) || null)}
              className="rounded-md bg-white/20 px-2 py-1 text-xs text-white outline-none"
            >
              {bots.map((r) => (
                <option key={r.imUserId} value={r.imUserId} className="text-black">{r.displayName}</option>
              ))}
            </select>
          )}
        </div>
        {selectedBot && <CustomerSimulator bot={selectedBot} />}
      </div>

      {/* Right: Agent Workbench */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#0F172A] px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-semibold text-white">客服工作台</span>
        </div>
        <AgentWorkbench />
      </div>
    </div>
  );
}

// ============================================================
// Customer Simulator (Left Panel)
// ============================================================

function CustomerSimulator({ bot }: { bot: Bot }) {
  const [customerName, setCustomerName] = useState("测试客户小明");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const customerId = `demo_${customerName}`;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(() => {
    fetch(`/api/test/messages?customerId=${customerId}&botImId=${bot.imUserId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setSessionStatus(d.status || null);
      });
  }, [customerId, bot.imUserId]);

  // Poll for new messages every 2s
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");

    await fetch("/api/test/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        customerName,
        botImId: bot.imUserId,
        content: text,
      }),
    });

    // Refresh immediately
    setTimeout(loadMessages, 200);
  }

  if (!nameConfirmed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#EDEDED] px-6">
        <div className="w-full max-w-[280px] rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#07C160] text-lg text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="text-sm font-semibold text-[#333]">设置客户身份</div>
            <div className="mt-0.5 text-[11px] text-[#999]">不同名字会创建不同的会话</div>
          </div>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="输入客户名称"
            className="mb-3 block w-full rounded-lg border border-[#E5E5E5] bg-[#F7F7F7] px-3 py-2.5 text-center text-sm text-[#333] outline-none placeholder:text-[#CCC] focus:border-[#07C160]"
            onKeyDown={(e) => { if (e.key === "Enter" && customerName.trim()) setNameConfirmed(true); }}
          />
          <button
            onClick={() => { if (customerName.trim()) setNameConfirmed(true); }}
            disabled={!customerName.trim()}
            className="w-full rounded-lg bg-[#07C160] py-2.5 text-sm font-medium text-white disabled:opacity-40 cursor-pointer"
          >
            开始咨询
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#EDEDED]">
      {/* Chat header (phone style) */}
      <div className="flex items-center justify-between bg-[#EDEDED] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
            {bot.displayName[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#333]">{bot.displayName}</div>
            <div className="text-[10px] text-[#999]">
              {sessionStatus === "active" ? "客服已接入" : sessionStatus === "waiting" ? "等待接入中..." : "发送消息开始咨询"}
            </div>
          </div>
        </div>
        <button
          onClick={() => { setNameConfirmed(false); setMessages([]); setSessionStatus(null); }}
          className="rounded-md bg-white/80 px-2 py-1 text-[11px] text-[#666] hover:bg-white cursor-pointer"
          title="切换用户"
        >
          {customerName} ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="pt-20 text-center text-xs text-[#999]">
            以「{customerName}」身份给「{bot.displayName}」发消息
          </div>
        )}
        {messages.map((msg) => {
          const isCustomer = msg.senderType === "customer";
          const isSystem = msg.senderType === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="rounded-md bg-[#DADADA] px-2 py-0.5 text-[10px] text-[#666]">{msg.content}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isCustomer ? "flex-row-reverse" : "flex-row"} items-end gap-2`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                isCustomer ? "bg-[#95EC69] text-[#333]" : "bg-[#2563EB] text-white"
              }`}>
                {isCustomer ? "我" : bot.displayName[0]}
              </div>
              <div className={`relative max-w-[65%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                isCustomer ? "bg-[#95EC69] text-[#333]" : "bg-white text-[#333]"
              }`}>
                {/* Triangle */}
                <div className={`absolute top-2.5 h-0 w-0 border-y-[5px] border-y-transparent ${
                  isCustomer
                    ? "right-[-5px] border-l-[5px] border-l-[#95EC69]"
                    : "left-[-5px] border-r-[5px] border-r-white"
                }`} />
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-[#D9D9D9] bg-[#F7F7F7] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="发送消息..."
            className="flex-1 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#333] outline-none placeholder:text-[#CCC]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#07C160] px-4 py-2 text-sm font-medium text-white cursor-pointer"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// Agent Workbench (Right Panel) — reuse existing components
// ============================================================

function AgentWorkbench() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, []);

  const handleSSE = useCallback(
    (data: Record<string, unknown>) => {
      const eventType = data.type as string;

      if (eventType === "new-session" || eventType === "session-updated") {
        loadSessions();
      }

      if (eventType === "new-message") {
        const msgSessionId = data.sessionId as string;
        if (activeSession && msgSessionId === activeSession.id) {
          const msg = data.message as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
        loadSessions();
      }
    },
    [activeSession, loadSessions]
  );

  const { connected } = useSSE(handleSSE);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (activeSession) loadMessages(activeSession.id);
  }, [activeSession, loadMessages]);

  async function handleAssign(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign" }),
    });
    if (res.ok) {
      await loadSessions();
      const data = await res.json();
      setActiveSession(data.session);
    }
  }

  async function handleSend(content: string) {
    if (!activeSession) return;
    await fetch(`/api/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    loadMessages(activeSession.id);
  }

  async function handleClose() {
    if (!activeSession) return;
    await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    setActiveSession(null);
    setMessages([]);
    loadSessions();
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sessions */}
      <div className="w-[240px] border-r border-[#E2E8F0] bg-white">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-3 py-2.5">
          <span className="text-xs font-semibold text-[#94A3B8]">会话列表</span>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
        </div>
        <SessionList
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelect={setActiveSession}
          onAssign={handleAssign}
        />
      </div>

      {/* Chat */}
      <div className="flex-1">
        {activeSession ? (
          <ChatPanel
            sessionId={activeSession.id}
            customerName={activeSession.customerName}
            messages={messages}
            onSend={handleSend}
            onClose={handleClose}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[#CBD5E1]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-40">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm">接入会话后开始回复</span>
          </div>
        )}
      </div>
    </div>
  );
}
