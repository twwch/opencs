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
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">客服管理</h1>

      <AgentForm onCreated={loadAgents} />

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">显示名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">用户名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">{a.displayName}</td>
                <td className="px-4 py-3 text-gray-500">{a.username}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(a.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
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
