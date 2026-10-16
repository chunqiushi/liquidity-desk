"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Download, Sun, Moon, Database, Menu } from "lucide-react";
import { useResearchContext } from "@/lib/store";
import {
  REGION_LABELS,
  INDICATORS,
  indicatorsToCSV,
  downloadCSV,
  type Region,
} from "@/lib/indicators";
import { cn } from "@/lib/utils";

const TIME_WINDOWS = ["1D", "1W", "1M"] as const;
const REGION_OPTIONS = ["ALL", ...Object.keys(REGION_LABELS)] as const;

export function TopGlobalBar() {
  const ctx = useResearchContext();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [refreshedAt, setRefreshedAt] = React.useState<string | null>(null);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/data-dictionary?q=${encodeURIComponent(q)}` : "/data-dictionary");
  };

  const onExport = () => {
    downloadCSV(`macro_indicators_${ctx.asOfDate}.csv`, indicatorsToCSV(INDICATORS));
  };

  const onRefresh = () => {
    setRefreshedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
  };

  return (
    <header className="sticky top-0 z-30 bg-panel border-b border-border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        {/* 移动端菜单 */}
        <button
          onClick={ctx.toggleSidebar}
          className="lg:hidden p-1.5 rounded-md border border-border text-muted hover:text-content hover:bg-panel-2"
          title="菜单"
        >
          <Menu size={16} />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-2 mr-2">
          <Database size={18} className="text-accent" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-content">全球宏观研究决策台</div>
            <div className="text-2xs text-muted">
              数据截止 {ctx.asOfDate} · CST (UTC+8)
            </div>
          </div>
        </div>

        {/* MOCK 标识 */}
        <span className="chip bg-warn/15 text-warn font-semibold">MOCK</span>

        {refreshedAt && (
          <span className="text-2xs text-muted">已刷新 · {refreshedAt}</span>
        )}

        {/* 时间窗口 */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => ctx.set({ timeWindow: w })}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                ctx.timeWindow === w
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:bg-panel-2",
              )}
            >
              {w}
            </button>
          ))}
        </div>

        {/* 地区筛选 */}
        <select
          value={ctx.region}
          onChange={(e) => ctx.set({ region: e.target.value })}
          className="text-xs border border-border rounded-md px-2 py-1 bg-panel text-content"
        >
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r === "ALL" ? "全部地区" : REGION_LABELS[r as Region]}
            </option>
          ))}
        </select>

        {/* 指标搜索 */}
        <form onSubmit={onSearch} className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索指标…"
            className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded-md bg-panel text-content placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </form>

        {/* 操作 */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onRefresh}
            title="刷新"
            className="p-1.5 rounded-md border border-border text-muted hover:text-content hover:bg-panel-2"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onExport}
            title="导出 CSV"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs text-muted hover:text-content hover:bg-panel-2"
          >
            <Download size={13} /> 导出
          </button>
          <button
            onClick={ctx.toggleTheme}
            title="切换主题"
            className="p-1.5 rounded-md border border-border text-muted hover:text-content hover:bg-panel-2"
          >
            {ctx.theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
}
