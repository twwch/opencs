"use client";

import { useEffect, useState, useCallback } from "react";
import { SessionList } from "@/components/session-list";
import { ChatPanel } from "@/components/chat-panel";
import { useSSE } from "@/hooks/use-sse";

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

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  contentType: number;
  createdAt: string;
}

export default function WorkbenchPage() {
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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    }
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
    <div className="flex h-full overflow-hidden">
      {/* Session list panel */}
      <div className="w-[264px] border-r border-[#E2E8F0] bg-white">
        {/* Search bar */}
        <div className="border-b border-[#E2E8F0] px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-xs text-[#CBD5E1]">搜索会话…</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
            </div>
          </div>
        </div>

        <SessionList
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelect={setActiveSession}
          onAssign={handleAssign}
        />
      </div>

      {/* Chat area */}
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-50">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm">选择一个会话开始服务</span>
          </div>
        )}
      </div>
    </div>
  );
}
