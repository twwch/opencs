"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  contentType: number;
  createdAt: string;
}

interface ChatPanelProps {
  sessionId: string;
  customerName: string;
  messages: Message[];
  onSend: (content: string) => void;
  onClose: () => void;
}

export function ChatPanel({ sessionId, customerName, messages, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <span className="font-medium text-gray-900">{customerName}</span>
          <span className="ml-2 text-xs text-gray-400">{sessionId.slice(0, 8)}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          结束会话
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          const isAgent = msg.senderType === "agent";
          const isSystem = msg.senderType === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center text-xs text-gray-400">
                {msg.content}
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  isAgent
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.content}
                <div
                  className={`mt-1 text-xs ${
                    isAgent ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("zh-CN")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
