"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, Info } from "lucide-react";
import { cnus, toRows } from "@/lib/china-mock";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum, cn } from "@/lib/utils";

const RANGES = ["1M", "3M", "1Y", "3Y", "5Y"];

export default function CnUsSpreadPage() {
  const [range, setRange] = React.useState("1Y");
  const spreadRows = toRows([cnus.spread], ["spread"]);
  const yieldRows = toRows([cnus.china10y, cnus.us10y], ["cn", "us"]);
  const fxRows = toRows([cnus.usdcny, cnus.usdcnh], ["cny", "cnh"]);

  const lastSpread = cnus.spread.observations.filter((o) => o.value !== null).slice(-1)[0]?.value ?? 0;
  const lastCn = cnus.china10y.observations.filter((o) => o.value !== null).slice(-1)[0]?.value ?? 0;
  const lastUs = cnus.us10y.observations.filter((o) => o.value !== null).slice(-1)[0]?.value ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-accent" /> 中美10年期国债利差
          </h1>
          <p className="text-2xs text-muted">计算方向：中国10Y − 美国10Y · 仅展示数据，不做因果解释</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-border overflow-hidden text-2xs">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("px-2.5 py-1", range === r ? "bg-accent text-accent-fg" : "bg-panel-2 text-muted")}>
                {r}
              </button>
            ))}
          </div>
          <Badge tone="mock">Mock Data</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-2xs text-muted">中美10Y利差（中−美）</div>
          <div className="text-2xl font-semibold tnum">{fmtNum(lastSpread, 2)}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-muted">中国10Y</div>
          <div className="text-2xl font-semibold tnum">{fmtNum(lastCn, 2)}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-muted">美国10Y</div>
          <div className="text-2xl font-semibold tnum">{fmtNum(lastUs, 2)}%</div>
        </Card>
      </div>

      <SectionLabel>中美10Y国债利差</SectionLabel>
      <Card>
        <CardHead title="China 10Y − US 10Y" subtitle="利差历史变化" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart id="cnus" data={spreadRows} lookback={range} unit="%" height={260} series={[{ key: "spread", name: "中美10Y利差", color: "#4f86f7" }]} />
        </div>
      </Card>

      <Card>
        <CardHead title="中国 vs 美国 10Y 国债收益率" subtitle="叠加对比" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart
            id="yields"
            data={yieldRows}
            lookback={range}
            unit="%"
            height={260}
            series={[
              { key: "cn", name: "中国10Y", color: "#22c55e" },
              { key: "us", name: "美国10Y", color: "#ef4444" },
            ]}
          />
        </div>
      </Card>

      <SectionLabel>辅助图表 · 汇率</SectionLabel>
      <Card>
        <CardHead title="USD/CNY · USD/CNH" subtitle="仅展示数据变化" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart
            id="fx"
            data={fxRows}
            lookback={range}
            height={240}
            series={[
              { key: "cny", name: "USD/CNY", color: "#4f86f7" },
              { key: "cnh", name: "USD/CNH", color: "#eab308" },
            ]}
          />
          <div className="text-2xs text-muted mt-2 flex items-center gap-1">
            <Info size={12} /> 利差与汇率之间的关系不做因果解释，仅并列展示数据及其变化。
          </div>
        </div>
      </Card>

      <div className="text-2xs text-muted">
        返回 <Link href="/china/overview" className="text-accent hover:underline">中国宏观总览</Link> · 数据来源 {cnus.spread.source}
      </div>
    </div>
  );
}
