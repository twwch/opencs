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

const quickReplies = ["活动", "欢迎语", "结束语", "稍等", "抱歉", "报单", "交互短信", "催拍"];

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
    <div className="flex h-full flex-col bg-[#F5F5F5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2E8F0] text-[12px] font-bold text-[#64748B]">
            {customerName[0]}
          </div>
          <div>
            <span className="text-[14px] font-semibold text-[#0F172A]">{customerName}</span>
            <div className="text-[10px] text-[#94A3B8]">来自：小程序</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] text-[#2563EB] transition hover:bg-[#EFF6FF] cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
            转接
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] text-[#EF4444] transition hover:bg-[#FEF2F2] cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            结束
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
        {messages.map((msg) => {
          const isAgent = msg.senderType === "agent";
          const isSystem = msg.senderType === "system";
          const time = new Date(msg.createdAt).toLocaleString("zh-CN", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center text-[10px] text-[#CBD5E1]">
                {msg.content}
              </div>
            );
          }

          if (isAgent) {
            return (
              <div key={msg.id} className="flex flex-col items-end">
                <div className="mb-1 text-[10px] text-[#94A3B8]">{time}</div>
                <div className="flex flex-row-reverse gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
                    客
                  </div>
                  <div className="max-w-[400px] rounded-lg rounded-tr-sm bg-[#95EC69] px-3 py-2 text-[13px] leading-relaxed text-[#0F172A] shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col items-start">
              <div className="mb-1 flex items-center gap-2 text-[10px] text-[#94A3B8]">
                <span>{customerName}</span>
                <span>{time}</span>
              </div>
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#64748B]">
                  {customerName[0]}
                </div>
                <div className="max-w-[400px] rounded-lg rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-[#334155] shadow-sm">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick reply toolbar + Input */}
      <div className="border-t border-[#E2E8F0] bg-white">
        {/* Toolbar icons */}
        <div className="flex items-center gap-1 border-b border-[#F1F5F9] px-4 py-1.5">
          {[
            <svg key="emoji" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
            <svg key="image" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
            <svg key="file" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
            <svg key="screen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
            <svg key="like" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>,
          ].map((icon, i) => (
            <button key={i} className="rounded p-1 transition hover:bg-[#F1F5F9] cursor-pointer">
              {icon}
            </button>
          ))}
        </div>

        {/* Quick replies */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2">
          {quickReplies.map((label) => (
            <button
              key={label}
              className="rounded-md border border-[#E2E8F0] px-2.5 py-1 text-[11px] text-[#64748B] transition hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="px-4 pb-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="输入消息…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]/40"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] cursor-pointer"
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
