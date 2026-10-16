"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import { usePathname } from "next/navigation";
import {   X,
  Sparkles,
} from "lucide-react";
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  Waves,
  LineChart,
  Repeat,
  ArrowLeftRight,
  Activity,
  CalendarClock,
  StickyNote,
  BookText,
  Database,
  BarChart3,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResearchContext } from "@/lib/store";

type NavItem = { href: string; label: string; icon: React.ElementType };

/** 左侧导航：分组组织（概览 / 市场 / 中国 / 研究） */
type NavGroup = { title: string; items: NavItem[] };
const NAV_GROUPS: NavGroup[] = [
  {
    title: "概览",
    items: [
      { href: "/", label: "研究枢纽", icon: LayoutDashboard },
      { href: "/macro-global", label: "全球宏观", icon: TrendingUp },
    ],
  },
  {
    title: "市场",
    items: [
      { href: "/yield-curve", label: "收益率曲线", icon: LineChart },
      { href: "/liquidity-grid", label: "各国流动性", icon: Waves },
      { href: "/charts", label: "图表中心", icon: BarChart3 },
      { href: "/liquidity-money", label: "货币市场", icon: Activity },
      { href: "/cross-country-spreads", label: "跨国利差", icon: Repeat },
    ],
  },
  {
    title: "中国",
    items: [
      { href: "/china/today", label: "今日概览（Alice）", icon: Sparkles },
      { href: "/china/stocks", label: "股市·龙虎榜", icon: TrendingUp },
      { href: "/china/futures", label: "期货·板块强弱", icon: Layers },
      { href: "/china/futures/strategy", label: "策略净值", icon: Activity },
      { href: "/china/idle-vs-real", label: "空转vs实体", icon: ArrowLeftRight },
      { href: "/data-detail", label: "明细数据", icon: Database },
      { href: "/china/overview", label: "中国总览", icon: Landmark },
      { href: "/bond-review", label: "利率债复盘", icon: BookText },
    ],
  },
  {
    title: "研究",
    items: [
      { href: "/growth-inflation", label: "增长与通胀", icon: TrendingUp },
      { href: "/central-banks", label: "央行与政策", icon: Landmark },
      { href: "/risk-cycle", label: "风险与周期", icon: Activity },
      { href: "/events", label: "事件日历", icon: CalendarClock },
      { href: "/notes", label: "研究笔记", icon: StickyNote },
      { href: "/data-dictionary", label: "数据字典", icon: BookText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const ctx = useResearchContext();
  const open = ctx.sidebarOpen;
  const norm = (p: string) => (p || "/").replace(/\/index\.html$/, "").replace(/\/+$/, "") || "/";
  const isActive = (href: string) =>
    norm(href) === "/" ? norm(pathname) === "/" : norm(pathname) === norm(href) || norm(pathname).startsWith(norm(href) + "/");

  return (
    <aside
      className={cn(
        "w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-panel flex flex-col z-40",
        "fixed inset-y-0 left-0 transform transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="text-accent" size={20} />
          <div>
            <div className="text-sm font-semibold leading-tight text-content">全球宏观研究决策台</div>
            <div className="text-2xs text-muted leading-tight">Macro · FX · Rates · Liquidity</div>
          </div>
        </div>
        <button
          className="lg:hidden text-muted hover:text-content"
          onClick={() => ctx.set({ sidebarOpen: false })}
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="space-y-1">
            <div className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted/70">
              {g.title}
            </div>
            {g.items.map((n) => {
              const active = isActive(n.href);
              const Icon = n.icon;
              return (
                <StaticLink
                  key={n.href}
                  href={n.href}
                  onClick={() => ctx.set({ sidebarOpen: false })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-content hover:bg-panel-2",
                  )}
                >
                  <Icon size={15} />
                  {n.label}
                </StaticLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-border text-2xs text-muted">
        Phase 3 · 模块化子页 · 深色主题
        <br />
        <span className="text-warn font-semibold">Mock Data — 仅供研究</span>
      </div>
    </aside>
  );
}
