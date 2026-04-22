"use client";

import { useEffect, useState, useCallback } from "react";
import { BotForm } from "@/components/bot-form";

interface Bot {
  id: string;
  imUserId: string;
  name: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
  createdBy: { displayName: string };
}

interface IMUser {
  userId: string;
  displayName: string;
  name: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [imUsers, setImUsers] = useState<IMUser[]>([]);
  const [greetBotId, setGreetBotId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [greetMsg, setGreetMsg] = useState("");
  const [greetLoading, setGreetLoading] = useState(false);
  const [greetResult, setGreetResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadBots = useCallback(async () => {
    const res = await fetch("/api/admin/bots");
    const data = await res.json();
    setBots(data.bots);
  }, []);

  const loadImUsers = useCallback(async () => {
    const res = await fetch("/api/admin/im-users");
    const data = await res.json();
    setImUsers(data.users || []);
  }, []);

  useEffect(() => { loadBots(); }, [loadBots]);

  // Load IM users when greet panel opens
  useEffect(() => {
    if (greetBotId) loadImUsers();
  }, [greetBotId, loadImUsers]);

  async function handleGreet() {
    if (!greetBotId || !targetUserId) return;
    setGreetLoading(true);
    setGreetResult(null);

    const selectedUser = imUsers.find((u) => u.userId === targetUserId);
    const userName = selectedUser?.displayName || targetUserId;

    try {
      const res = await fetch("/api/admin/bots/greet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: greetBotId,
          targetUserId,
          message: greetMsg.trim() || undefined,
        }),
      });

      if (res.ok) {
        setGreetResult({ ok: true, msg: `已发送给「${userName}」，用户 App 中将出现此 Bot` });
        setTargetUserId("");
        setGreetMsg("");
      } else {
        const data = await res.json();
        setGreetResult({ ok: false, msg: data.error || "发送失败" });
      }
    } catch {
      setGreetResult({ ok: false, msg: "网络错误" });
    } finally {
      setGreetLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#0F172A]">Bot 管理</h1>
        <p className="mt-0.5 text-xs text-[#94A3B8]">创建客服 Bot，用户在 App 给 Bot 发消息即进入客服流程</p>
      </div>

      <BotForm onCreated={loadBots} />

      {/* Bot table */}
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">名称</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">IM User ID</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">操作</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9] transition hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium text-[#0F172A]">{r.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{r.imUserId}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setGreetBotId(greetBotId === r.id ? null : r.id); setGreetResult(null); }}
                    className="rounded-md bg-[#2563EB]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 cursor-pointer"
                  >
                    {greetBotId === r.id ? "收起" : "发送欢迎语"}
                  </button>
                </td>
              </tr>
            ))}
            {bots.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#CBD5E1]">暂无 Bot</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Greet panel */}
      {greetBotId && (
        <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <h3 className="mb-1 text-sm font-semibold text-[#1E40AF]">向用户发送欢迎语</h3>
          <p className="mb-3 text-xs text-[#60A5FA]">
            Bot 会主动给该用户发一条消息，用户的 App 聊天列表中就会出现此 Bot
          </p>
          {greetResult && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${greetResult.ok ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
              {greetResult.msg}
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#60A5FA]">目标用户</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="block w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] cursor-pointer"
              >
                <option value="">选择用户…</option>
                {imUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.displayName}（{u.userId.length > 16 ? u.userId.slice(0, 8) + "…" : u.userId}）
                  </option>
                ))}
              </select>
              {imUsers.length === 0 && (
                <p className="mt-1 text-[10px] text-[#F59E0B]">未找到在线用户，请确认有用户登录了 App</p>
              )}
            </div>
            <div className="flex-[2]">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#60A5FA]">欢迎语（可选）</label>
              <input
                placeholder="默认：你好！我是XX，有什么可以帮您的吗？"
                value={greetMsg}
                onChange={(e) => setGreetMsg(e.target.value)}
                className="block w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#93C5FD] focus:border-[#2563EB]"
              />
            </div>
            <button
              onClick={handleGreet}
              disabled={greetLoading || !targetUserId}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow shadow-[#2563EB]/15 disabled:opacity-50 cursor-pointer"
            >
              {greetLoading ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
