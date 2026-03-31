"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      router.push("/dashboard/workbench");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-[#FEE2E2] px-4 py-2.5 text-sm text-[#DC2626]">{error}</div>
      )}
      <div>
        <label htmlFor="username" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          用户名
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="admin"
          className="block w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#CBD5E1] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••"
          className="block w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#CBD5E1] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {loading ? "登录中..." : "登 录"}
      </button>
    </form>
  );
}
