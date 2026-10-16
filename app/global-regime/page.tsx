"use client";

import Link from "next/link";
import { RegimeMatrix, WhatChanged } from "@/components/regime-modules";
import { Card, CardHead, Badge } from "@/components/ui";
import { INTL_MACRO_ECONOMIES } from "@/lib/intl-macro-mock";

export default function GlobalRegimePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">全球宏观态势</h1>
        <p className="text-2xs text-muted">
          8 个经济体（美国 / 欧元区 / 日本 / 中国 / 香港 / 瑞士 / 英国 / 澳大利亚）的当前状态与近期变化。
          仅展示状态与变化，无综合评分；增长/通胀为不确定性 Mock。
        </p>
      </div>
      <RegimeMatrix />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHead title="关联研究" subtitle="从宏观态势进入细分模块" />
          <div className="p-3 space-y-2 text-xs">
            <Link href="/money-market" className="block hover:underline text-accent">→ 全球货币市场（短端利率 / SOFR）</Link>
            <Link href="/fx-funding" className="block hover:underline text-accent">→ 外汇与相对利率矩阵</Link>
            <Link href="/liquidity-cycle" className="block hover:underline text-accent">→ 全球流动性周期（正弦/相位）</Link>
            <Link href="/china/overview" className="block hover:underline text-accent">→ 中国宏观（研究核心）</Link>
          </div>
        </Card>
        <Card>
          <CardHead title="各国宏观研究" subtitle="美 / 欧 / 日 / 港 / 瑞 / 英 / 澳 · 中国同款走势+预期差" />
          <div className="p-3 flex flex-wrap gap-2 text-xs">
            {INTL_MACRO_ECONOMIES.map((e) => (
              <Link
                key={e.code}
                href={`/macro/${e.code}`}
                className="px-2.5 py-1 rounded border border-border hover:bg-panel-2 text-accent"
              >
                {e.name}
              </Link>
            ))}
            <Link href="/china/overview" className="px-2.5 py-1 rounded border border-border hover:bg-panel-2 text-accent">
              中国
            </Link>
          </div>
        </Card>
        <WhatChanged />
      </div>
    </div>
  );
}
