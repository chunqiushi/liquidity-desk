"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import {
  LiquidityMonitorTable,
  EconomyLiquidityCard,
} from "@/components/liquidity-modules";
import { getLiquidityMonitor, getLiquidityMatrix } from "@/lib/liquidity";
import { useResearchContext } from "@/lib/store";

const FRAMEWORK = [
  { n: "①", t: "流动性价格 Liquidity Price", d: "现在钱的价格是多少？核心短端市场利率" },
  { n: "②", t: "流动性数量 Liquidity Quantity", d: "体系里到底有多少流动性？" },
  { n: "③", t: "来源与吸收 Sources & Drains", d: "流动性从哪里来，又被什么吸收？" },
  { n: "④", t: "传导 Transmission", d: "流动性 → 银行 → 信用 → 实体（流动性 ≠ 信用）" },
  { n: "⑤", t: "融资条件 Funding Conditions", d: "流动性如何反映到市场融资条件？" },
];

export default function GlobalLiquidityPage() {
  const ctx = useResearchContext();
  const monitor = React.useMemo(() => getLiquidityMonitor(ctx.asOfDate), [ctx.asOfDate]);
  const matrix = React.useMemo(() => getLiquidityMatrix(ctx.asOfDate), [ctx.asOfDate]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">全球流动性 · Global Liquidity</h1>
        <p className="text-2xs text-muted">
          统一研究框架观察 8 大经济体流动性：中国为核心，但 US / EUR / JPY / HKD / CHF / GBP / AUD 同框架。
          五层结构统一的是「研究问题」，而非统一原始变量。全部为 Mock Data，仅用于研究原型。
        </p>
      </div>

      <Card>
        <CardHead title="五层流动性研究框架" subtitle="Liquidity Price → Quantity → Sources & Drains → Transmission → Funding" right={<Badge tone="warn">无综合评分</Badge>} />
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-px bg-border">
          {FRAMEWORK.map((f) => (
            <div key={f.n} className="bg-panel p-3">
              <div className="text-sm font-semibold text-accent">{f.n}</div>
              <div className="text-2xs font-medium mt-1">{f.t}</div>
              <div className="text-3xs text-muted mt-1 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </Card>

      <LiquidityMonitorTable rows={monitor} />

      <SectionLabel>各经济体流动性概览 · 点击进入详细五层页面</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {matrix.map((eco) => (
          <EconomyLiquidityCard key={eco.code} eco={eco} />
        ))}
      </div>

      <Card>
        <CardHead title="与现有研究模块联动" subtitle="流动性是连接 Macro / Rates / FX 的中枢" right={<Badge tone="accent">Cross-link</Badge>} />
        <div className="p-3 flex flex-wrap gap-2 text-2xs">
          <Link href="/global-regime" className="chip bg-panel-2 border border-border hover:border-accent">全球宏观态势 →</Link>
          <Link href="/money-market" className="chip bg-panel-2 border border-border hover:border-accent">全球货币市场 →</Link>
          <Link href="/rates-matrix" className="chip bg-panel-2 border border-border hover:border-accent">利率与收益率曲线 →</Link>
          <Link href="/fx-funding" className="chip bg-panel-2 border border-border hover:border-accent">外汇与相对利率 →</Link>
          <Link href="/funding" className="chip bg-panel-2 border border-border hover:border-accent">跨币种融资 →</Link>
          <Link href="/liquidity-cycle" className="chip bg-panel-2 border border-border hover:border-accent">流动性周期(Sine/Phase) →</Link>
          <Link href="/china/overview" className="chip bg-panel-2 border border-border hover:border-accent">中国宏观 →</Link>
        </div>
      </Card>
    </div>
  );
}
