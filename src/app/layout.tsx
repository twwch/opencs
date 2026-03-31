import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "野火客服工作台",
  description: "Customer service workbench powered by Wildfire IM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] antialiased">{children}</body>
    </html>
  );
}
