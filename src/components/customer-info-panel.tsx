"use client";

interface CustomerInfoPanelProps {
  customerName: string | null;
}

export function CustomerInfoPanel({ customerName }: CustomerInfoPanelProps) {
  const tabs = ["智能辅助", "工单工具", "聊天记录", "快捷语", "绩效"];

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-[#E2E8F0] bg-white">
      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0]">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`flex-1 py-2.5 text-[12px] font-medium transition cursor-pointer ${
              i === 0
                ? "border-b-2 border-[#2563EB] text-[#2563EB]"
                : "text-[#64748B] hover:text-[#334155]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Customer info */}
      <div className="flex-1 overflow-auto p-4">
        {!customerName ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[#CBD5E1]">
            选择会话查看客户信息
          </div>
        ) : (
        <>
        {/* Basic info */}
        <div className="mb-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[#0F172A]">客户信息</h3>
          <div className="space-y-2 text-[12px]">
            <div className="flex">
              <span className="w-20 shrink-0 text-[#94A3B8]">客户名称</span>
              <span className="text-[#334155]">{customerName}</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-[#94A3B8]">会员等级</span>
              <span className="text-[#334155]">普通会员</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-[#94A3B8]">用户等级</span>
              <span className="text-[#CBD5E1]">--</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-[#94A3B8]">会员类型</span>
              <span className="text-[#334155]">C端用户</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-[#94A3B8]">UIN</span>
              <span className="text-[#334155]">******</span>
            </div>
          </div>
        </div>

        {/* Tags/Notes */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#0F172A]">标签/备注</h3>
            <button className="rounded border border-[#E2E8F0] px-2 py-0.5 text-[11px] text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer">
              编组
            </button>
          </div>
          <div className="mt-2 text-center text-[12px] text-[#CBD5E1]">
            展开
          </div>
        </div>

        {/* Service summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#0F172A]">服务小结</h3>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Product search */}
        <div className="mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-[12px] text-[#CBD5E1]">请输入商品名称、商品ID搜索</span>
          </div>
        </div>

        {/* Focus product */}
        <div className="mb-4">
          <h3 className="mb-2 text-[13px] font-semibold text-[#0F172A]">焦点商品</h3>
          <div className="text-center text-[12px] text-[#CBD5E1]">暂无商品标签</div>
        </div>
        </>
        )}
      </div>

      {/* Bottom toggle */}
      <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-2.5">
        <span className="text-[12px] text-[#64748B]">智能客服</span>
        <label className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
          <span>对 {customerName || "客户"} 禁用自动回复</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-[#CBD5E1]" />
        </label>
      </div>
    </div>
  );
}
