"use client";

import { useState } from "react";

export function AgentForm({ onCreated }: { onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setUsername("");
      setPassword("");
      setDisplayName("");
      onCreated();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#334155]">创建客服</h3>
      {error && <div className="mb-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">{error}</div>}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">用户名</label>
          <input placeholder="登录用户名" value={username} onChange={(e) => setUsername(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">密码</label>
          <input type="password" placeholder="登录密码" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</label>
          <input placeholder="客服昵称" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow shadow-[#2563EB]/15 disabled:opacity-50 cursor-pointer">
          {loading ? "创建中…" : "创建"}
        </button>
      </div>
    </form>
  );
}
