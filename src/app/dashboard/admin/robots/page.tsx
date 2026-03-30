"use client";

import { useEffect, useState, useCallback } from "react";
import { RobotForm } from "@/components/robot-form";

interface Robot {
  id: string;
  imUserId: string;
  name: string;
  displayName: string;
  callbackUrl: string | null;
  createdAt: string;
  createdBy: { displayName: string };
}

export default function RobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([]);

  const loadRobots = useCallback(async () => {
    const res = await fetch("/api/admin/robots");
    const data = await res.json();
    setRobots(data.robots);
  }, []);

  useEffect(() => { loadRobots(); }, [loadRobots]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">机器人管理</h1>

      <RobotForm onCreated={loadRobots} />

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">显示名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">IM User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">回调地址</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">创建者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {robots.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.displayName}</td>
                <td className="px-4 py-3 text-gray-500">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.imUserId}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.callbackUrl || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{r.createdBy.displayName}</td>
              </tr>
            ))}
            {robots.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无机器人
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
