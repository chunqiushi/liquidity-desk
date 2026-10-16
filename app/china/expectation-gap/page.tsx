"use client";

import * as React from "react";
import Link from "next/link";
import { Target, Info } from "lucide-react";
import { expectationTrends, expectationGap, toRows } from "@/lib/china-mock";
import { Card, CardHead, Badge, SectionLabel, DataStatusBadge } from "@/components/ui";
import { TimeSeriesChart, GroupedBarChart, MiniSpark } from "@/components/charts";
import { fmtNum, fmtPct, cn } from "@/lib/utils";

export default function ExpectationGapPage() {
  const gapRows = expectationGap.map((g) => ({
    label: g.indicator.replace("同比", "").replace("累计", "").replace("（中-美）", ""),
    actual: g.actual,
    consensus: g.consensus,
    previous: g.previous,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Target size={18} className="text-accent" /> 宏观数据与预期差
          </h1>
          <p className="text-2xs text-muted">实际 / 市场预期 / 前值 / 差异 · Mock Data</p>
        </div>
        <Badge tone="mock">Mock Data</Badge>
      </div>

      <SectionLabel>A · 主要经济数据趋势</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {expectationTrends.map((t) => {
          const vals = t.series.observations.filter((o) => o.value !== null).slice(-24).map((o) => o.value as number);
          const lt = vals[vals.length - 1];
          const pv = vals[vals.length - 2];
          const up = lt >= pv;
          return (
            <Card key={t.key} className="p-2.5">
              <div className="text-2xs text-muted truncate">{t.name}</div>
              <div className="flex items-end justify-between mt-1">
                <div className={cn("text-base font-semibold tnum", up ? "text-pos" : "text-neg")}>
                  {fmtNum(lt, 1)}
                  <span className="text-2xs text-muted ml-0.5">{t.unit}</span>
                </div>
                <MiniSpark values={vals} color={up ? "#22c55e" : "#ef4444"} />
              </div>
            </Card>
          );
        })}
      </div>

      <SectionLabel>B · 宏观数据预期差</SectionLabel>
      <Card>
        <CardHead title="实际 vs 预期 vs 前值" subtitle="分组柱状图 · 单位见各指标" right={<Badge tone="mock">Mock Data</Badge>} />
        <div className="p-3">
          <GroupedBarChart
            data={gapRows}
            unit=""
            height={300}
            series={[
              { key: "actual", name: "Actual", color: "#4f86f7" },
              { key: "consensus", name: "Consensus", color: "#eab308" },
              { key: "previous", name: "Previous", color: "#94a3b8" },
            ]}
          />
          <div className="flex gap-3 mt-2 text-2xs text-muted">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#4f86f7] mr-1" />Actual</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#eab308] mr-1" />Consensus</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#94a3b8] mr-1" />Previous</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="差异明细" subtitle="Actual − Consensus / Actual − Previous" />
        <div className="overflow-x-auto">
          <table className="w-full text-2xs tnum">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-3 py-2">指标</th>
                <th className="text-right px-3 py-2">Actual</th>
                <th className="text-right px-3 py-2">Consensus</th>
                <th className="text-right px-3 py-2">Previous</th>
                <th className="text-right px-3 py-2">A−C</th>
                <th className="text-right px-3 py-2">A−P</th>
                <th className="text-left px-3 py-2">发布</th>
              </tr>
            </thead>
            <tbody>
              {expectationGap.map((g) => (
                <tr key={g.indicator} className="border-b border-border/60">
                  <td className="px-3 py-2">{g.indicator}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(g.actual, 1)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(g.consensus, 1)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(g.previous, 1)}</td>
                  <td className={cn("px-3 py-2 text-right", g.actual - g.consensus >= 0 ? "text-pos" : "text-neg")}>
                    {fmtPct((g.actual - g.consensus) * 10, 1).replace("%", "pp")}
                  </td>
                  <td className={cn("px-3 py-2 text-right", g.actual - g.previous >= 0 ? "text-pos" : "text-neg")}>
                    {fmtPct((g.actual - g.previous) * 10, 1).replace("%", "pp")}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    <DataStatusBadge status="Actual" /> {g.releaseDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 text-2xs text-muted border-t border-border flex items-center gap-1">
          <Info size={12} /> 仅展示数据差异，不构建宏观情绪指数或自动判断。
        </div>
      </Card>

      <div className="text-2xs text-muted">
        返回 <Link href="/china/overview" className="text-accent hover:underline">中国宏观总览</Link>
      </div>
    </div>
  );
}
