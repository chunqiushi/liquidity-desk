"use client";

import * as React from "react";
import Link from "next/link";
import { Waves, Info } from "lucide-react";
import { liquidity, toRows, CHINA_META } from "@/lib/china-mock";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum } from "@/lib/utils";

export default function ChinaLiquidityPage() {
  const L = liquidity;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Waves size={18} className="text-accent" /> 中国流动性与资金市场
          </h1>
          <p className="text-2xs text-muted">银行间资金利率 / 公开市场 / 货币信用 · Mock Data</p>
        </div>
        <Badge tone="mock">Mock Data</Badge>
      </div>

      <Card>
        <CardHead title="政策与资金利率" subtitle="类型区分" />
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {L.policy.map((p) => (
            <div key={p.label} className="border border-border rounded p-2.5">
              <div className="text-2xs text-muted">{p.label}</div>
              <div className="text-xl font-semibold tnum">
                {fmtNum(p.value, 2)}
                <span className="text-2xs text-muted ml-0.5">{p.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionLabel>银行间资金利率</SectionLabel>
      <Card>
        <CardHead title="DR007 · R007 · SHIBOR 3M" subtitle="折线图" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart
            id="mm"
            data={toRows([L.dr007, L.r007, L.shibor3m], ["dr", "r", "sh"])}
            unit="%"
            series={[
              { key: "dr", name: "DR007", color: "#4f86f7" },
              { key: "r", name: "R007", color: "#ef4444" },
              { key: "sh", name: "SHIBOR 3M", color: "#eab308" },
            ]}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHead title="M2 同比" right={<Badge tone="mock">Mock</Badge>} />
          <div className="p-3">
            <TimeSeriesChart id="m2" data={toRows([L.m2], ["v"])} unit="%" series={[{ key: "v", name: "M2", color: "#4f86f7" }]} height={200} />
          </div>
        </Card>
        <Card>
          <CardHead title="新增社会融资规模" right={<Badge tone="mock">Mock</Badge>} />
          <div className="p-3">
            <TimeSeriesChart id="tsf" data={toRows([L.tsfNew], ["v"])} unit="亿元" series={[{ key: "v", name: "社融", color: "#22c55e" }]} height={200} />
          </div>
        </Card>
        <Card>
          <CardHead title="新增人民币贷款" right={<Badge tone="mock">Mock</Badge>} />
          <div className="p-3">
            <TimeSeriesChart id="loan" data={toRows([L.loanNew], ["v"])} unit="亿元" series={[{ key: "v", name: "贷款", color: "#a855f7" }]} height={200} />
          </div>
        </Card>
        <Card>
          <CardHead title="公开市场操作净投放" right={<Badge tone="mock">Mock</Badge>} />
          <div className="p-3">
            <TimeSeriesChart id="omo" data={toRows([L.omo], ["v"])} unit="亿元" series={[{ key: "v", name: "OMO净投放", color: "#eab308" }]} height={200} />
          </div>
        </Card>
      </div>

      <SectionLabel>国债收益率</SectionLabel>
      <Card>
        <CardHead title="10年期国债收益率" right={<Badge tone="mock">Mock</Badge>} />
        <div className="p-3">
          <TimeSeriesChart id="cgb" data={toRows([L.cgb10y], ["v"])} unit="%" series={[{ key: "v", name: "10Y CGB", color: "#4f86f7" }]} />
        </div>
        <div className="px-3 pb-3 text-2xs text-muted border-t border-border flex items-center gap-1">
          <Info size={12} /> {CHINA_META.disclaimer}
        </div>
      </Card>

      <div className="text-2xs text-muted">
        返回 <Link href="/china/overview" className="text-accent hover:underline">中国宏观总览</Link>
      </div>
    </div>
  );
}
