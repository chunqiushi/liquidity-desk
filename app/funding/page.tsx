"use client";

import * as React from "react";
import { Card, CardHead, Badge } from "@/components/ui";
import { getCurrencyData } from "@/lib/mock-data";
import { Observation } from "@/lib/types";
import { useResearchContext } from "@/lib/store";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum, cn } from "@/lib/utils";

const PAIRS = [
  { code: "EUR", label: "EUR/USD Basis", name: "欧元 / 美元" },
  { code: "JPY", label: "JPY/USD Basis", name: "日元 / 美元" },
  { code: "GBP", label: "GBP/USD Basis", name: "英镑 / 美元" },
  { code: "CHF", label: "CHF/USD Basis", name: "瑞郎 / 美元" },
];

function diff(s: Observation[] | undefined, days: number): number | null {
  if (!s || s.length <= days) return null;
  const last = s[s.length - 1].value;
  const prev = s[s.length - 1 - days].value;
  if (last === null || prev === null) return null;
  return Number((last - prev).toFixed(1));
}

export default function FundingPage() {
  const ctx = useResearchContext();
  const [sel, setSel] = React.useState("EUR");
  const rows = PAIRS.map((p) => {
    const s = getCurrencyData(p.code, ctx.asOfDate).series["basis_3m"];
    const cur = s.length ? s[s.length - 1].value : null;
    return { ...p, cur, d7: diff(s, 7), d30: diff(s, 30), d90: diff(s, 90), d365: diff(s, 365), series: s };
  });
  const active = rows.find((r) => r.code === sel) ?? rows[0];
  const chartData = active.series.filter((o) => o.value !== null).map((o) => ({ date: o.observationDate, value: o.value as number }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">跨币种融资</h1>
        <p className="text-2xs text-muted">
          美元融资压力与跨币种 Basis：EUR/USD、JPY/USD、GBP/USD、CHF/USD 的 3M 交叉货币基差，
          以及隐含融资成本。当前 / 1周 / 1月 / 3月 / 1年 变化（bp）。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHead title="跨币种 Basis" subtitle="3M CCB (bp) · 负值表示美元融资溢价" right={<Badge tone="mock">Mock</Badge>} />
          <div className="overflow-x-auto">
            <table className="w-full text-2xs tnum">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">货币对</th>
                  <th className="text-right px-3 py-2 font-medium">当前</th>
                  <th className="text-right px-3 py-2 font-medium">1周</th>
                  <th className="text-right px-3 py-2 font-medium">1月</th>
                  <th className="text-right px-3 py-2 font-medium">3月</th>
                  <th className="text-right px-3 py-2 font-medium">1年</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className={cn("border-b border-border/60 hover:bg-panel-2 cursor-pointer", r.code === sel ? "bg-accent/5" : "")} onClick={() => setSel(r.code)}>
                    <td className="px-3 py-2 font-semibold">{r.label}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.cur === null ? "—" : fmtNum(r.cur, 1)}</td>
                    <td className="px-3 py-2 text-right">{r.d7 === null ? "—" : fmtNum(r.d7, 1)}</td>
                    <td className="px-3 py-2 text-right">{r.d30 === null ? "—" : fmtNum(r.d30, 1)}</td>
                    <td className="px-3 py-2 text-right">{r.d90 === null ? "—" : fmtNum(r.d90, 1)}</td>
                    <td className="px-3 py-2 text-right">{r.d365 === null ? "—" : fmtNum(r.d365, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-2xs text-muted border-t border-border">仅展示美元融资相对各货币的成本偏离，不做因果解释。</div>
        </Card>

        <Card>
          <CardHead
            title="FX Swap 隐含融资成本"
            subtitle={`${active.name} · 3M Basis 历史`}
            right={
              <select value={sel} onChange={(e) => setSel(e.target.value)} className="text-2xs bg-panel-2 border border-border rounded px-2 py-1">
                {rows.map((r) => (<option key={r.code} value={r.code}>{r.label}</option>))}
              </select>
            }
          />
          <div className="p-3">
            <TimeSeriesChart id="basischart" data={chartData} series={[{ key: "value", name: active.label, color: "#d65db1" }]} unit="bp" height={220} />
            <div className="text-2xs text-muted mt-2">Basis 越负，表示该货币借入美元的成本越高（美元融资溢价）。全部为 Mock。</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
