"use client";

import * as React from "react";
import { PageHeader, ConclusionBlock, SectionLabel } from "@/components/research-ui";
import {
  BondYieldChart,
  BondEventLegend,
  BondDailyTable,
} from "@/components/bond-review-chart";

export default function BondReviewPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader
        question="最近 5 个交易日（2026-09-22 至 2026-09-29）利率债如何演绎？"
        title="利率债复盘"
        subtitle="Bond Market Review · 10Y 国债 / 国开活跃券收益率 + DR007 / GC007 资金面 · 主辅标的联动、关键事件与每日研判（Wind 数据）"
        onExport={() => {
          const rows = [
            "日期,10Y国债(%),国债bp,10Y国开(%),国开bp,DR007(%),DR007bp,GC007(%),GC007bp",
            "09-22,1.6720,-0.55,1.7585,_,1.3841,-1.12,1.446,_",
            "09-23,1.6710,-0.10,1.7555,-0.30,1.3841,0.00,1.465,+1.90",
            "09-24,1.6700,-0.10,1.7530,-0.25,1.3946,+1.05,1.472,+0.70",
            "09-28,1.6715,+0.15,1.7530,0.00,1.3911,-0.35,1.474,+0.20",
            "09-29,1.6715,盘中,1.7530,盘中,1.3900,0.00,1.474,0.00",
          ];
          const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "利率债复盘_20260922_0929.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      <ConclusionBlock
        items={[
          {
            title: "长端窄幅震荡、中枢微降",
            points: [
              "5 个交易日内 10Y 国债活跃券在 1.6700%–1.6720% 之间窄幅波动，累计仅下行约 0.5bp；",
              "10Y 国开由 1.7585% 降至 1.7530%，与国债利差压缩至约 8bp，配置盘向超长端倾斜。",
            ],
          },
          {
            title: "资金面跨季均衡偏松",
            points: [
              "DR007 围绕 1.38%–1.39% 低位，GC007 由 1.446% 升至 1.474%（季末摩擦）；",
              "央行 OMO+MLF 合计净投放逾 6800 亿，并新设隔夜逆回购（上限 1 万亿）跨季跨节呵护。",
            ],
          },
          {
            title: "事件驱动股债跷板与止盈",
            points: [
              "09-24 权益大跌触发股债跷板，30Y 国债下破 2.1% 创年内新低；",
              "货政委例会“关注长债收益率”与 09-28 止盈令长端回落，09-29 国常会稳增长定调下长端承压但可控。",
            ],
          },
        ]}
      />

      {/* 一、收益率走势图 */}
      <section className="space-y-3">
        <SectionLabel>一、收益率走势图（10Y 国债 / 国开活跃券）</SectionLabel>
        <BondYieldChart />
        <BondEventLegend />
      </section>

      {/* 二、按日复盘 */}
      <section className="space-y-3">
        <SectionLabel>二、按日复盘（资金走势 / 资金面 / 利率走势 / 债市研判）</SectionLabel>
        <BondDailyTable />
      </section>
    </div>
  );
}
