"use client";

import * as React from "react";
import { LiquidityMonitor } from "@/components/liquidity-monitor";
import { LiquidityMesaChart } from "@/components/liquidity-mesa-chart";
import { Card, CardHead, Badge, SectionLabel, Button } from "@/components/ui";
import { getLiqValue } from "@/lib/liquidity";

const ASOF = "2026-09-29";

type RateKey = { code: string; id: string; tag: string };

// 关键日线利率选择器（默认 DR007）。mesa 算法直接作用于各指标的确定性 history。
const MESA_RATES: RateKey[] = [
  { code: "CNY", id: "dr007", tag: "中国 DR007" },
  { code: "USD", id: "sofr", tag: "美国 SOFR" },
  { code: "USD", id: "sofr_ois", tag: "美国 SOFR−OIS" },
  { code: "EUR", id: "estr", tag: "欧元区 €STR" },
  { code: "JPY", id: "tonar", tag: "日本 TONAR" },
  { code: "HKD", id: "hibor_3m", tag: "香港 HIBOR 3M" },
  { code: "CHF", id: "saron", tag: "瑞士 SARON" },
  { code: "GBP", id: "sonia", tag: "英国 SONIA" },
  { code: "AUD", id: "aud_ovn", tag: "澳洲 隔夜/OIS" },
  { code: "JPY", id: "usdjpy_basis", tag: "USD/JPY 基差" },
];

function MesaSection() {
  const [sel, setSel] = React.useState(0);
  const key = MESA_RATES[sel];
  const ind = getLiqValue(key.code, key.id, ASOF);
  if (!ind) return null;
  return (
    <Card>
      <CardHead
        title="流动性日线 · MESA 周期分析（相位 / 正余弦）"
        subtitle="Ehlers MESA / 希尔伯特变换：自相关周期图估计主导周期 → 相位角 → 正弦/余弦/超前正弦副图"
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="p-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {MESA_RATES.map((r, i) => (
            <Button
              key={`${r.code}:${r.id}`}
              size="xs"
              variant={i === sel ? "primary" : "default"}
              onClick={() => setSel(i)}
            >
              {r.tag}
            </Button>
          ))}
        </div>
        <LiquidityMesaChart history={ind.history} label={ind.label} unit={ind.unit} />
        <p className="text-2xs text-muted leading-relaxed">
          说明：主图为该日线指标的确定性 Mock 走势；副图由 <span className="text-content">相位指标 + 正余弦指标</span> 实时计算——
          正弦（青）/ 余弦（黄）/ 超前正弦（粉，= sin(相位+45°)）。当<strong className="text-pos">超前正弦上穿正弦</strong>视为周期转向偏多、
          <strong className="text-neg">下穿</strong>偏空（图中三角）。相位带显示 0°–360° 当前相位角，右上角为实时相位盘。
          数据为模拟，算法与真实行情一致，接入真实日线序列后同图可直接复用。
        </p>
      </div>
    </Card>
  );
}

export default function LiquidityGridPage() {
  return (
    <div className="space-y-5 max-w-[1440px] mx-auto">
      <LiquidityMonitor />
      <MesaSection />
    </div>
  );
}
