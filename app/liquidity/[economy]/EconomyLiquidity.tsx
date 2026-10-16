"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHead, Badge } from "@/components/ui";
import { fmtNum } from "@/lib/utils";
import {
  LiquidityLayerTable,
  OperationsBlock,
  LiquidityChartPanel,
} from "@/components/liquidity-modules";
import { getEconomyLiquidity, LAYER_ORDER, LAYER_META } from "@/lib/liquidity";
import { useResearchContext } from "@/lib/store";

export default function EconomyLiquidityPage() {
  const params = useParams();
  const code = String(params.economy ?? "").toUpperCase();
  const ctx = useResearchContext();
  const eco = React.useMemo(
    () => getEconomyLiquidity(code, ctx.asOfDate),
    [code, ctx.asOfDate],
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (!eco) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">经济体未找到 · {code}</h1>
        <p className="text-2xs text-muted">
          支持：CNY / USD / EUR / JPY / HKD / CHF / GBP / AUD。
          <Link href="/liquidity" className="text-accent hover:underline"> 返回全球流动性 →</Link>
        </p>
      </div>
    );
  }

  const activeId = selectedId ?? eco.coreFunding.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{eco.code} · {eco.name}</h1>
          <p className="text-2xs text-muted">{eco.centralBank} · 货币 {eco.currency}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-2xs">
          {eco.researchChain.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="chip bg-panel-2 border border-border">{s}</span>
              {i < eco.researchChain.length - 1 ? <span className="text-accent">→</span> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <div className="p-3">
            <div className="text-2xs text-muted">政策利率 Policy</div>
            <div className="text-base font-semibold tnum">{fmtNum(eco.policyRate.value, 3)} {eco.policyRate.unit}</div>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <div className="text-2xs text-muted">核心融资利率 Core Funding</div>
            <div className="text-base font-semibold tnum text-accent">{fmtNum(eco.coreFunding.value, 3)} {eco.coreFunding.unit}</div>
            <div className="text-3xs text-muted">1M {eco.coreFunding.chg1m == null ? "—" : (eco.coreFunding.chg1m >= 0 ? "+" : "") + eco.coreFunding.chg1m.toFixed(1)} bp</div>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <div className="text-2xs text-muted">流动性数量 Quantity</div>
            <div className="text-base font-semibold tnum">
              {eco.liquidityQuantity ? `${fmtNum(eco.liquidityQuantity.value, 2)} ${eco.liquidityQuantity.unit}` : "—"}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <div className="text-2xs text-muted">央行资产负债表 CB Assets</div>
            <div className="text-base font-semibold tnum">
              {eco.centralBankAssets ? `${fmtNum(eco.centralBankAssets.value, 2)} ${eco.centralBankAssets.unit}` : "—"}
            </div>
          </div>
        </Card>
      </div>

      <LiquidityChartPanel eco={eco} selectedId={activeId} onSelect={setSelectedId} />

      {LAYER_ORDER.filter((l) => l !== "operations").map((layer) => (
        <LiquidityLayerTable
          key={layer}
          layer={layer}
          values={eco.layers[layer]}
          selectedId={activeId}
          onSelect={setSelectedId}
        />
      ))}

      {eco.layers.transmission.length > 0 && (
        <div className="px-3 py-2 text-2xs text-warn border border-warn/30 rounded bg-warn/5">
          注意：流动性 ≠ 信用。「流动性增加」不意味着「信用一定增加」。下方仅展示二者变化关系，不做因果结论。
        </div>
      )}

      <OperationsBlock values={eco.layers.operations} selectedId={activeId} onSelect={setSelectedId} />

      <Card>
        <CardHead title="Rates / FX 联动" subtitle="从本经济体出发，连接到利率曲线、外汇与货币详情" right={<Badge tone="accent">Cross-link</Badge>} />
        <div className="p-3 flex flex-wrap gap-2 text-2xs">
          {eco.fxLinks.map((l) => (
            <Link key={l.href} href={l.href} className="chip bg-panel-2 border border-border hover:border-accent">{l.label} →</Link>
          ))}
          <Link href="/liquidity" className="chip bg-panel-2 border border-border hover:border-accent">全球流动性总览 →</Link>
        </div>
      </Card>
    </div>
  );
}
