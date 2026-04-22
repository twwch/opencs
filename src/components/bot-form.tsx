"use client";

import { useState } from "react";

export function BotForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setName("");
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
      <h3 className="mb-1 text-sm font-semibold text-[#334155]">创建 Bot</h3>
      <p className="mb-3 text-xs text-[#94A3B8]">Webhook 回调通过 OpenIM 全局配置</p>
      {error && <div className="mb-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">{error}</div>}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">名称</label>
          <input placeholder="英文标识，如 cs_bot" value={name} onChange={(e) => setName(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</label>
          <input placeholder="用户在 App 看到的名字" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow shadow-[#2563EB]/15 disabled:opacity-50 cursor-pointer">
          {loading ? "创建中…" : "创建"}
        </button>
      </div>
    </form>
  );
}
