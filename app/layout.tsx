import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ThemeScript } from "@/components/theme-script";

export const metadata: Metadata = {
  title: "全球宏观研究决策台",
  description:
    "专业全球宏观研究决策台：增长、通胀、央行政策、流动性、收益率曲线、跨国利差、外汇、资金流与风险周期（Phase 1 原型，全部 Mock 数据）。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
