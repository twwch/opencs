"use client";

import { useState } from "react";

/*
  Same "Command Center" layout, 3 different color palettes.
  User picks the one that looks best.
*/

type Palette = "slate" | "indigo" | "teal";

const palettes = {
  slate: {
    name: "冷钢蓝",
    desc: "Linear 风 · 冷灰白底 · 钴蓝强调 · 利落锐利",
    bg: "#F8FAFC",      // page bg
    surface: "#FFFFFF",  // cards, sidebar
    surfaceAlt: "#F1F5F9", // chat bg, input bg
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    textFaint: "#CBD5E1",
    primary: "#2563EB",
    primaryLight: "#DBEAFE",
    primaryText: "#1D4ED8",
    onPrimary: "#FFFFFF",
    accent: "#059669",  // online/success
    warning: "#D97706",
    warningBg: "#FEF3C7",
    warningText: "#92400E",
    danger: "#DC2626",
    dangerBg: "#FEE2E2",
    rail: "#0F172A",
    railText: "#94A3B8",
    railActive: "#FFFFFF",
    railIcon: "#FFFFFF",
  },
  indigo: {
    name: "雾紫薄荷",
    desc: "Figma 风 · 淡紫调底色 · 靛蓝主色 · 柔和高级",
    bg: "#F5F3FF",
    surface: "#FFFFFF",
    surfaceAlt: "#EEF2FF",
    border: "#E0E7FF",
    borderLight: "#EEF2FF",
    text: "#1E1B4B",
    textSecondary: "#4338CA",
    textMuted: "#6366F1",
    textFaint: "#C7D2FE",
    primary: "#6366F1",
    primaryLight: "#E0E7FF",
    primaryText: "#4F46E5",
    onPrimary: "#FFFFFF",
    accent: "#059669",
    warning: "#D97706",
    warningBg: "#FEF3C7",
    warningText: "#92400E",
    danger: "#DC2626",
    dangerBg: "#FEE2E2",
    rail: "#312E81",
    railText: "#818CF8",
    railActive: "#FFFFFF",
    railIcon: "#FFFFFF",
  },
  teal: {
    name: "海松青",
    desc: "清新自然 · 纯白底色 · 松石青主色 · 信赖温和",
    bg: "#F0FDFA",
    surface: "#FFFFFF",
    surfaceAlt: "#F0FDFA",
    border: "#CCFBF1",
    borderLight: "#F0FDFA",
    text: "#134E4A",
    textSecondary: "#0F766E",
    textMuted: "#5EEAD4",
    textFaint: "#99F6E4",
    primary: "#0F766E",
    primaryLight: "#CCFBF1",
    primaryText: "#0D9488",
    onPrimary: "#FFFFFF",
    accent: "#0F766E",
    warning: "#D97706",
    warningBg: "#FEF3C7",
    warningText: "#92400E",
    danger: "#DC2626",
    dangerBg: "#FEE2E2",
    rail: "#134E4A",
    railText: "#5EEAD4",
    railActive: "#FFFFFF",
    railIcon: "#FFFFFF",
  },
};

export default function PreviewPage() {
  const [p, setP] = useState<Palette>("slate");
  const c = palettes[p];

  return (
    <div className="min-h-screen" style={{ background: c.bg }}>
      {/* Palette switcher */}
      <div className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: c.border, background: `${c.surface}ee` }}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-3">
          <h1 className="text-sm font-semibold" style={{ color: c.text }}>指挥中心 · 配色方案</h1>
          <div className="flex gap-2">
            {(Object.keys(palettes) as Palette[]).map((k) => (
              <button
                key={k}
                onClick={() => setP(k)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition cursor-pointer"
                style={{
                  background: p === k ? c.primary : "transparent",
                  color: p === k ? c.onPrimary : c.textSecondary,
                  border: p === k ? "none" : `1px solid ${c.border}`,
                }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: palettes[k].primary }} />
                {palettes[k].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-10 px-8 py-8">
        {/* Palette info */}
        <div className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: c.text }}>{c.name}</h2>
              <p className="mt-0.5 text-sm" style={{ color: c.textMuted }}>{c.desc}</p>
            </div>
            <div className="flex gap-1.5">
              {[c.bg, c.surface, c.primary, c.primaryLight, c.text, c.textMuted, c.warning, c.accent].map((hex, i) => (
                <div key={i} className="h-6 w-6 rounded-lg border" style={{ background: hex, borderColor: c.border }} title={hex} />
              ))}
            </div>
          </div>
        </div>

        {/* LOGIN */}
        <Sec title="登录页" border={c.border}>
          <div className="flex min-h-[520px]" style={{ background: c.surface }}>
            <div className="hidden w-[44%] flex-col justify-between p-12 lg:flex" style={{ background: c.primary }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.2)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div>
                <h2 className="text-[32px] font-bold leading-tight text-white">野火客服<br/>指挥中心</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/50">高效接入 · 智能分配 · 实时协作</p>
                <div className="mt-8 space-y-2.5">
                  {["实时消息 · 秒级响应", "智能路由 · 负载均衡", "全量记录 · 数据追溯"].map((t) => (
                    <div key={t} className="flex items-center gap-2.5 text-sm text-white/60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">✓</span>{t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-white/20">OpenIM · v1.0</div>
            </div>
            <div className="flex flex-1 items-center justify-center px-10">
              <div className="w-full max-w-[340px]">
                <h1 className="text-[26px] font-bold" style={{ color: c.text }}>登录</h1>
                <p className="mt-1.5 text-sm" style={{ color: c.textMuted }}>输入你的账号以继续</p>
                <div className="mt-10 space-y-5">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>用户名</label>
                    <input className="block w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.text }} placeholder="admin" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>密码</label>
                    <input type="password" className="block w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.text }} placeholder="••••••" />
                  </div>
                  <button className="w-full rounded-xl py-3 text-sm font-semibold text-white transition cursor-pointer" style={{ background: c.primary, boxShadow: `0 8px 20px ${c.primary}30` }}>登 录</button>
                </div>
              </div>
            </div>
          </div>
        </Sec>

        {/* DASHBOARD */}
        <Sec title="工作台" border={c.border}>
          <div className="flex h-[620px]" style={{ background: c.bg }}>
            {/* Icon rail */}
            <div className="flex w-[56px] flex-col items-center py-4" style={{ background: c.rail, borderRight: `1px solid ${c.rail}` }}>
              <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: c.primary }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.railIcon} strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              {[true, false, false, false].map((active, i) => (
                <div key={i} className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer transition" style={{ background: active ? "rgba(255,255,255,0.12)" : "transparent", color: active ? c.railActive : c.railText }}>
                  {[
                    <svg key="0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                    <svg key="1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="4"/></svg>,
                    <svg key="2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
                    <svg key="3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
                  ][i]}
                </div>
              ))}
              <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: c.primary, color: c.onPrimary }}>管</div>
            </div>

            {/* Session list */}
            <div className="flex w-[264px] flex-col" style={{ background: c.surface, borderRight: `1px solid ${c.border}` }}>
              <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: c.surfaceAlt }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textFaint} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <span className="text-xs" style={{ color: c.textFaint }}>搜索会话…</span>
                  <span className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-medium" style={{ border: `1px solid ${c.border}`, color: c.textFaint }}>⌘K</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${c.border}` }}>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold" style={{ background: c.warningBg, color: c.warningText }}>2</span>
                <span className="text-[11px] font-semibold" style={{ color: c.textMuted }}>排队中</span>
              </div>
              <div className="flex-1 overflow-auto">
                {[
                  { name: "张小明", msg: "你好我有个问题", time: "2分钟前", waiting: true, unread: 3 },
                  { name: "李小红", msg: "订单什么时候发", time: "5分钟前", waiting: true, unread: 1 },
                  { name: "王大伟", msg: "好的我查一下", time: "1分钟前", waiting: false, unread: 0, active: true },
                  { name: "赵明", msg: "已收到谢谢", time: "12分钟前", waiting: false, unread: 0 },
                ].map((s, i) => (
                  <div key={i} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition" style={{ borderBottom: `1px solid ${c.borderLight}`, background: s.active ? `${c.primary}08` : "transparent" }}>
                    <div className="relative mt-0.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold" style={{ background: s.waiting ? c.warningBg : c.primaryLight, color: s.waiting ? c.warningText : c.primaryText }}>{s.name[0]}</div>
                      {s.waiting && <div className="absolute -left-1 top-0 h-full w-[3px] rounded-full" style={{ background: c.warning }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium" style={{ color: s.active ? c.primaryText : c.text }}>{s.name}</span>
                        <span className="text-[10px]" style={{ color: c.textFaint }}>{s.time}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="truncate text-xs" style={{ color: c.textMuted }}>{s.msg}</span>
                        {s.unread > 0 && <span className="ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold" style={{ background: c.primary, color: c.onPrimary }}>{s.unread}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex flex-1 flex-col" style={{ background: c.surfaceAlt }}>
              <div className="flex items-center justify-between px-5 py-2.5" style={{ background: c.surface, borderBottom: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold" style={{ background: c.primaryLight, color: c.primaryText }}>王</div>
                  <span className="text-sm font-semibold" style={{ color: c.text }}>王大伟</span>
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: c.primaryLight, color: c.primaryText }}>进行中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="rounded-lg px-2.5 py-1 text-[11px] cursor-pointer" style={{ color: c.textMuted }}>转接</button>
                  <button className="rounded-lg px-3 py-1 text-[11px] font-medium cursor-pointer" style={{ background: c.surfaceAlt, color: c.textSecondary }}>结束会话</button>
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
                <div className="text-center text-[10px]" style={{ color: c.textFaint }}>— 今天 14:30 —</div>
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold" style={{ background: c.border, color: c.textMuted }}>王</div>
                  <div>
                    <div className="inline-block rounded-2xl rounded-tl-lg px-4 py-2.5 text-[13px] leading-relaxed" style={{ background: c.surface, color: c.textSecondary, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>你好，我想咨询一下订单问题</div>
                    <div className="mt-1 pl-1 text-[10px]" style={{ color: c.textFaint }}>14:30</div>
                  </div>
                </div>
                <div className="flex flex-row-reverse gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold" style={{ background: c.primary, color: c.onPrimary }}>我</div>
                  <div className="text-right">
                    <div className="inline-block rounded-2xl rounded-tr-lg px-4 py-2.5 text-left text-[13px] leading-relaxed text-white" style={{ background: c.primary, boxShadow: `0 4px 12px ${c.primary}20` }}>您好！请提供您的订单号，我来帮您查询</div>
                    <div className="mt-1 pr-1 text-[10px]" style={{ color: c.textFaint }}>14:31</div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold" style={{ background: c.border, color: c.textMuted }}>王</div>
                  <div>
                    <div className="inline-block rounded-2xl rounded-tl-lg px-4 py-2.5 text-[13px] leading-relaxed" style={{ background: c.surface, color: c.textSecondary, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      订单号是 <span className="font-mono font-medium" style={{ color: c.primaryText }}>WF20260330001</span>
                    </div>
                    <div className="mt-1 pl-1 text-[10px]" style={{ color: c.textFaint }}>14:32</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3" style={{ background: c.surface, borderTop: `1px solid ${c.border}` }}>
                <div className="flex items-end gap-2 rounded-xl px-4 py-2.5" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
                  <input placeholder="输入消息… (⌘ Enter 发送)" className="flex-1 bg-transparent text-sm outline-none" style={{ color: c.text }} />
                  <button className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white cursor-pointer" style={{ background: c.primary }}>发送</button>
                </div>
              </div>
            </div>

            {/* Info panel */}
            <div className="w-[224px] p-4" style={{ background: c.surface, borderLeft: `1px solid ${c.border}` }}>
              <div className="mb-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold" style={{ background: c.primaryLight, color: c.primaryText }}>王</div>
                <div className="mt-2.5 text-sm font-semibold" style={{ color: c.text }}>王大伟</div>
                <div className="mt-0.5 text-[11px]" style={{ color: c.textMuted }}>customer_001</div>
              </div>
              <div className="space-y-3">
                {[{ k: "来源", v: "客服小助手" }, { k: "首次咨询", v: "2026-03-30" }, { k: "历史会话", v: "3 次" }, { k: "等待时长", v: "1分23秒" }].map((r) => (
                  <div key={r.k} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: c.textMuted }}>{r.k}</span>
                    <span className="text-[11px] font-medium" style={{ color: c.textSecondary }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${c.borderLight}` }}>
                <div className="mb-2 text-[11px] font-semibold" style={{ color: c.textMuted }}>快捷回复</div>
                <div className="space-y-1.5">
                  {["您好，有什么可以帮您？", "请稍等，正在查询中", "问题已解决，感谢反馈"].map((t) => (
                    <button key={t} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] transition cursor-pointer" style={{ background: c.surfaceAlt, color: c.textMuted }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Sec>

        {/* ADMIN */}
        <Sec title="管理页面" border={c.border}>
          <div className="p-6" style={{ background: c.bg }}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold" style={{ color: c.text }}>机器人管理</h1>
                <p className="mt-0.5 text-xs" style={{ color: c.textMuted }}>管理客服机器人和 Webhook 配置</p>
              </div>
              <button className="rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer" style={{ background: c.primary }}>+ 创建机器人</button>
            </div>
            <div className="mb-5 rounded-xl p-4" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>名称</label>
                  <input placeholder="英文标识" className="block w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>显示名称</label>
                  <input placeholder="用户可见名称" className="block w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <div className="flex-[2]">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>Webhook URL</label>
                  <input placeholder="https://… (可选)" className="block w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.text }} />
                </div>
                <button className="rounded-lg px-5 py-2 text-sm font-semibold text-white cursor-pointer" style={{ background: c.primary }}>创建</button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              <table className="w-full text-sm">
                <thead><tr style={{ background: c.surfaceAlt, borderBottom: `1px solid ${c.border}` }}>
                  {["显示名称", "名称", "IM User ID", "回调地址", "状态"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    { d: "客服小助手", n: "cs_bot", id: "robot_abc123", cb: "https://cs.example.com/hook", ok: true },
                    { d: "售后机器人", n: "after_sale", id: "robot_def456", cb: "—", ok: false },
                  ].map((r) => (
                    <tr key={r.n} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                      <td className="px-4 py-3 font-medium" style={{ color: c.text }}>{r.d}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: c.textMuted }}>{r.n}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: c.textFaint }}>{r.id}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: c.textFaint }}>{r.cb}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ background: r.ok ? "#DCFCE7" : c.surfaceAlt, color: r.ok ? "#16A34A" : c.textFaint }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.ok ? "#22C55E" : c.textFaint }} />{r.ok ? "运行中" : "未配置"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Sec>
      </div>
    </div>
  );
}

function Sec({ title, border, children }: { title: string; border: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "#999" }}>{title}</h3>
      <div className="overflow-hidden rounded-2xl shadow-xl shadow-black/[0.04]" style={{ border: `1px solid ${border}` }}>{children}</div>
    </div>
  );
}
