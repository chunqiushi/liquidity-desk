"use client";

import Link from "next/link";
import { MoneyMarketTable, SofrPanel } from "@/components/regime-modules";
import { LiquidityTrendPhase } from "@/components/liquidity-trend-phase";
import { Card, CardHead, Badge } from "@/components/ui";
import { getLiquidityMatrix } from "@/lib/liquidity";
import { useResearchContext } from "@/lib/store";
import * as React from "react";

export default function MoneyMarketPage() {
  const ctx = useResearchContext();
  const matrix = React.useMemo(() => getLiquidityMatrix(ctx.asOfDate), [ctx.asOfDate]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">全球货币市场</h1>
        <p className="text-2xs text-muted">
          主要经济体关键短端利率：当前 / 1日 / 1周 / 1月 变化。SOFR 作为美国流动性枢纽指标单独成栏。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><MoneyMarketTable /></div>
        <SofrPanel />
      </div>

      <Card>
        <CardHead
          title="研究入口"
          subtitle="从货币市场进入资金环境 / 收益率曲线"
        />
        <div className="p-3 space-y-2 text-xs">
          <Link href="/currency/USD" className="block hover:underline text-accent">→ 美元详情（SOFR / EFFR / IORB / 准备金 / TGA）</Link>
          <Link href="/currency/CNH" className="block hover:underline text-accent">→ 人民币详情（DR007 / R007 / Shibor / PBoC）</Link>
          <Link href="/rates-matrix" className="block hover:underline text-accent">→ 全球利率与收益率曲线</Link>
          <Link href="/funding" className="block hover:underline text-accent">→ 跨币种融资与 Basis</Link>
        </div>
      </Card>

      <div>
        <h2 className="text-base font-semibold mt-2">各国关键指标走势 · 正余弦与相位</h2>
        <p className="text-2xs text-muted mb-2">
          每个经济体的核心短端 / 政策 / 数量 / 央行资产 / 信用 指标走势，以及以核心短端利率为基准的周期分解（sin/cos + 相位）。
          正余弦/相位为衍生研究指标，非预测、非交易信号。
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {matrix.map((eco) => (
            <Card key={eco.code}>
              <CardHead
                title={eco.name}
                subtitle={`${eco.currency} · ${eco.centralBank}`}
                right={<Badge tone="mock">Mock</Badge>}
              />
              <div className="p-3">
                <LiquidityTrendPhase eco={eco} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
