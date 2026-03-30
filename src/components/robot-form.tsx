"use client";

import { useState } from "react";

export function RobotForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/robots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, callbackUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setName("");
      setDisplayName("");
      setCallbackUrl("");
      onCreated();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-medium text-gray-900">创建机器人</h3>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <input
        placeholder="名称 (英文标识)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="显示名称"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Webhook 回调地址 (可选)"
        value={callbackUrl}
        onChange={(e) => setCallbackUrl(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "创建中..." : "创建"}
      </button>
    </form>
  );
}
