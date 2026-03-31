import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left branding */}
      <div className="hidden w-[45%] flex-col justify-between bg-[#2563EB] p-12 lg:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div>
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white">
            野火客服<br />指挥中心
          </h2>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/50">
            高效接入 · 智能分配 · 实时协作
          </p>
          <div className="mt-8 space-y-2.5">
            {["实时消息 · 秒级响应", "智能路由 · 负载均衡", "全量记录 · 数据追溯"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-sm text-white/60">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/20">Wildfire IM · v1.0</div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center px-10">
        <div className="w-full max-w-[340px]">
          <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">登录</h1>
          <p className="mt-1.5 text-sm text-[#94A3B8]">输入你的账号以继续</p>
          <div className="mt-10">
            <LoginForm />
          </div>
          <p className="mt-8 text-center text-xs text-[#CBD5E1]">按 Enter 快速登录</p>
        </div>
      </div>
    </div>
  );
}
