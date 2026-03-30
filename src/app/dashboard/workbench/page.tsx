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
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
          <span className="text-sm font-medium text-gray-900">会话列表</span>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        </div>
        <SessionList
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelect={setActiveSession}
          onAssign={handleAssign}
        />
      </div>

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
          <div className="flex h-full items-center justify-center text-gray-400">
            选择一个会话开始服务
          </div>
        )}
      </div>
    </div>
  );
}
