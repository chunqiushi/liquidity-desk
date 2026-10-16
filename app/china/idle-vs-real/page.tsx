"use client";

import * as React from "react";
import Link from "next/link";
import { Scale, Info, Table2 } from "lucide-react";
import { EMPTY_REAL_POINTS, EMPTY_REAL_META } from "@/lib/empty-real-returns-series";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum, cn } from "@/lib/utils";

const RANGES = ["1Y", "3Y", "5Y"];

const srcAsOf = (k: string) => (EMPTY_REAL_META.sources as any)?.[k]?.asOf ?? "";

export default function IdleVsRealPage() {
  const [range, setRange] = React.useState("3Y");
  const [showRaw, setShowRaw] = React.useState(false);
  const [note, setNote] = React.useState("");

  const pts = EMPTY_REAL_POINTS;
  // 图表数据需为非空数值（null 在 Recharts 中按缺口处理）；null -> NaN 与 toRows 约定一致
  const rows = pts.map((p) => ({ date: p.date, idle: p.empty ?? NaN, real: p.real ?? NaN }));
  const idleVals = pts.map((p) => p.empty as number).filter((v) => v != null);
  const realVals = pts.map((p) => p.real as number).filter((v) => v != null);
  const rawRows = pts.slice(-24).map((p) => ({ date: p.date, idle: p.empty as number, real: p.real as number }));

  const srcLine = `美国10Y/中债10Y ${srcAsOf("us10y") || srcAsOf("china10y")} · CPI/M2 ${srcAsOf("cpi")} · GDP ${srcAsOf("gdp")}（Wind Alice · AKShare）`;

  React.useEffect(() => {
    const saved = localStorage.getItem("china_idle_note");
    if (saved) setNote(saved);
  }, []);
  const saveNote = (v: string) => {
    setNote(v);
    localStorage.setItem("china_idle_note", v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Scale size={18} className="text-accent" /> 空转收益与实体收益分配
          </h1>
          <p className="text-2xs text-muted">真实数据 · 百分比单位 · Wind / AKShare</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-border overflow-hidden text-2xs">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("px-2.5 py-1", range === r ? "bg-accent text-accent-fg" : "bg-panel-2 text-muted")}>
                {r}
              </button>
            ))}
          </div>
          <Badge tone="pos">真实数据</Badge>
        </div>
      </div>

      <Card>
        <CardHead
          title="空转收益 vs 实体收益"
          subtitle="金融部门空转收益（红） vs 实体部门收益（绿）"
          right={
            <button onClick={() => setShowRaw((s) => !s)} className="chip border border-border hover:border-accent text-accent text-2xs flex items-center gap-1">
              <Table2 size={11} /> 原始数据
            </button>
          }
        />
        <div className="p-3">
          <TimeSeriesChart
            id="idlereal"
            data={rows}
            lookback={range}
            unit="%"
            height={300}
            series={[
              { key: "idle", name: "空转收益", color: "#ef4444" },
              { key: "real", name: "实体收益", color: "#22c55e" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="text-2xs">
              <div className="text-muted">空转收益（最新）</div>
              <div className="text-lg font-semibold text-neg tnum">{fmtNum(idleVals[idleVals.length - 1], 2)}%</div>
            </div>
            <div className="text-2xs">
              <div className="text-muted">实体收益（最新）</div>
              <div className="text-lg font-semibold text-pos tnum">{fmtNum(realVals[realVals.length - 1], 2)}%</div>
            </div>
          </div>
          {showRaw ? (
            <div className="mt-3 max-h-64 overflow-auto border border-border rounded">
              <table className="w-full text-2xs tnum">
                <thead className="sticky top-0 bg-panel-2">
                  <tr className="text-muted border-b border-border">
                    <th className="text-left px-2 py-1">日期</th>
                    <th className="text-right px-2 py-1">空转</th>
                    <th className="text-right px-2 py-1">实体</th>
                  </tr>
                </thead>
                <tbody>
                  {rawRows.map((o) => (
                    <tr key={o.date} className="border-b border-border/40">
                      <td className="px-2 py-0.5">{o.date}</td>
                      <td className="px-2 py-0.5 text-right">{fmtNum(o.idle, 2)}</td>
                      <td className="px-2 py-0.5 text-right">{fmtNum(o.real, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHead title="研究注释" subtitle="可添加的简短文字注释（本地保存）" />
        <div className="p-3">
          <textarea
            value={note}
            onChange={(e) => saveNote(e.target.value)}
            placeholder="例如：空转收益近期抬升，实体收益低位，分配格局仍需观察…"
            className="w-full h-24 bg-panel-2 border border-border rounded text-2xs p-2 text-content focus:outline-none focus:border-accent"
          />
          <div className="text-2xs text-muted mt-2 flex items-center gap-1">
            <Info size={12} /> 实体收益 = 中债10Y − CPI；空转收益 = M2 − GDP(前置滞后70日) − 中美利差。高频项已更新至 {EMPTY_REAL_META.windowEnd}；CPI/M2 截至 {srcAsOf("cpi")}、GDP 截至 {srcAsOf("gdp")}（官方未发布更新），其后按最后真实锚点持平，未伪造。
          </div>
        </div>
      </Card>

      <div className="text-2xs text-muted">
        返回 <Link href="/china/overview" className="text-accent hover:underline">中国宏观总览</Link> · 数据来源 {srcLine}
      </div>
    </div>
  );
}
