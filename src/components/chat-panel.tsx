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
    <div className="flex h-full flex-col bg-[#F1F5F9]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DBEAFE] text-[11px] font-bold text-[#1D4ED8]">
            {customerName[0]}
          </div>
          <span className="text-sm font-semibold text-[#0F172A]">{customerName}</span>
          <span className="rounded-md bg-[#DBEAFE] px-1.5 py-0.5 text-[9px] font-semibold text-[#1D4ED8]">进行中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#F1F5F9] px-3 py-1 text-[11px] font-medium text-[#475569] transition hover:bg-[#E2E8F0] cursor-pointer"
          >
            结束会话
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
        {messages.map((msg) => {
          const isAgent = msg.senderType === "agent";
          const isSystem = msg.senderType === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center text-[10px] text-[#CBD5E1]">
                {msg.content}
              </div>
            );
          }

          if (isAgent) {
            return (
              <div key={msg.id} className="flex flex-row-reverse gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-[9px] font-bold text-white">
                  我
                </div>
                <div className="text-right">
                  <div className="inline-block rounded-2xl rounded-tr-lg bg-[#2563EB] px-4 py-2.5 text-left text-[13px] leading-relaxed text-white shadow-md shadow-[#2563EB]/10">
                    {msg.content}
                  </div>
                  <div className="mt-1 pr-1 text-[10px] text-[#CBD5E1]">
                    {new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E2E8F0] text-[9px] font-bold text-[#94A3B8]">
                {customerName[0]}
              </div>
              <div>
                <div className="inline-block rounded-2xl rounded-tl-lg bg-white px-4 py-2.5 text-[13px] leading-relaxed text-[#475569] shadow-sm shadow-black/[0.03]">
                  {msg.content}
                </div>
                <div className="mt-1 pl-1 text-[10px] text-[#CBD5E1]">
                  {new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-[#E2E8F0] bg-white px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 transition focus-within:border-[#2563EB]/40 focus-within:ring-2 focus-within:ring-[#2563EB]/10">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息…"
            className="flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#2563EB] px-4 py-1.5 text-xs font-semibold text-white shadow shadow-[#2563EB]/15 cursor-pointer"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
