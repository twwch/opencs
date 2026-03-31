"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentForm } from "@/components/agent-form";

interface Agent {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  const loadAgents = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    setAgents(data.agents);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#0F172A]">客服管理</h1>
        <p className="mt-0.5 text-xs text-[#94A3B8]">管理客服人员账号</p>
      </div>

      <AgentForm onCreated={loadAgents} />

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">用户名</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b border-[#F1F5F9] transition hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium text-[#0F172A]">{a.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{a.username}</td>
                <td className="px-4 py-3 text-xs text-[#94A3B8]">
                  {new Date(a.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-[#CBD5E1]">
                  暂无客服
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
