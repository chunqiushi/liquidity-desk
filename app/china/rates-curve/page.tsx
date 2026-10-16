"use client";

import * as React from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LineChart as LineIcon, Info } from "lucide-react";
import { ratesCurve, toRows } from "@/lib/china-mock";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum, fmtBps, cn } from "@/lib/utils";

const tip = {
  contentStyle: { background: "rgb(var(--panel))", border: "1px solid rgb(var(--border))", borderRadius: 8, fontSize: 11, color: "rgb(var(--text))" },
  labelStyle: { color: "rgb(var(--text-muted))" },
};

export default function RatesCurvePage() {
  const rc = ratesCurve;
  const curveRows = rc.tenors.map((t, i) => ({
    tenor: t,
    current: rc.current[i],
    oneWeekAgo: rc.oneWeekAgo[i],
    oneMonthAgo: rc.oneMonthAgo[i],
  }));

  const spreadRows = rc.tenors.map((t, i) => ({
    tenor: t,
    change: Number((rc.current[i] - rc.oneMonthAgo[i]).toFixed(2)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <LineIcon size={18} className="text-accent" /> 中国利率曲线
          </h1>
          <p className="text-2xs text-muted">当前 / 1周前 / 1个月前国债收益率对比 · Mock Data</p>
        </div>
        <Badge tone="mock">Mock Data</Badge>
      </div>

      <Card>
        <CardHead title="国债收益率曲线对比" subtitle="CGB · 当前 vs 1W ago vs 1M ago" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curveRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tenor" tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }} stroke="rgb(var(--border))" />
              <YAxis tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }} width={44} stroke="rgb(var(--border))" unit="%" />
              <Tooltip {...tip} formatter={(v: number, n: string) => [`${fmtNum(v, 2)}%`, n]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="current" name="当前" stroke="#4f86f7" strokeWidth={1.8} dot={{ r: 2 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="oneWeekAgo" name="1周前" stroke="#eab308" strokeWidth={1.4} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="oneMonthAgo" name="1个月前" stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHead title="主要期限利差" subtitle="10Y−2Y / 10Y−1Y（bp）" />
          <div className="p-3 grid grid-cols-2 gap-2">
            {rc.spreads.map((s) => (
              <div key={s.label} className="border border-border rounded p-2.5">
                <div className="text-2xs text-muted">{s.label}</div>
                <div className="text-xl font-semibold tnum">{fmtBps(s.value * 100, 0)}</div>
                <div className={cn("text-2xs", s.change >= 0 ? "text-pos" : "text-neg")}>
                  较1月前 {fmtBps(s.change * 100, 0)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="政策利率 / 资金利率" subtitle="类型区分" />
          <div className="p-3 grid grid-cols-2 gap-2">
            {rc.policy.map((p) => (
              <div key={p.label} className="border border-border rounded p-2.5">
                <div className="text-2xs text-muted">{p.label}</div>
                <div className="text-xl font-semibold tnum">
                  {fmtNum(p.value, 2)}
                  <span className="text-2xs text-muted ml-0.5">{p.unit}</span>
                </div>
                <div className="text-2xs text-muted">{p.kind}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SectionLabel>10年期国债收益率（历史）</SectionLabel>
      <Card>
        <CardHead title="10Y CGB" subtitle="月度" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart
            id="cgb10y"
            data={toRows([rc.history10y], ["v"])}
            unit="%"
            series={[{ key: "v", name: "10Y CGB", color: "#4f86f7" }]}
            height={220}
          />
        </div>
      </Card>

      <Card>
        <CardHead title="曲线变化明细（当前 − 1个月前，bp）" />
        <div className="p-3">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={spreadRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tenor" tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }} stroke="rgb(var(--border))" />
              <YAxis tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }} width={44} stroke="rgb(var(--border))" unit="bp" />
              <Tooltip {...tip} formatter={(v: number) => [`${fmtBps(v * 100, 0)}`, "变化"]} />
              <Line type="monotone" dataKey="change" name="变化" stroke="#4f86f7" strokeWidth={1.6} dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="px-3 py-2 text-2xs text-muted border-t border-border flex items-center gap-1">
          <Info size={12} /> 区分资金利率 / 政策利率 / 国债收益率 / 国开债收益率；不自动生成交易建议。
        </div>
      </Card>

      <div className="text-2xs text-muted">
        返回 <Link href="/china/overview" className="text-accent hover:underline">中国宏观总览</Link> · 数据来源 {rc.history10y.source}
      </div>
    </div>
  );
}
