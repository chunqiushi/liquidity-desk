"use client";

import * as React from "react";
import { PageHeader, ConclusionBlock, MockBadge } from "@/components/research-ui";
import { YieldCurveModule } from "@/components/yield-curve-chart";
import { getYieldCurves } from "@/lib/yield-curve";

const ASOF = "2026-09-29";

export default function YieldCurvePage() {
  const curves = getYieldCurves(ASOF);
  const inv = curves.filter((c) => c.shape.label === "倒挂");
  const up = curves.filter((c) => c.move.dir === "up");
  const down = curves.filter((c) => c.move.dir === "down");
  const top = [...curves].sort((a, b) => Math.abs(b.parallelBps) - Math.abs(a.parallelBps))[0];
  const s = (v: number) => (v > 0.05 ? "+" + v.toFixed(1) : v.toFixed(1));

  return (
    <div className="space-y-6">
      <PageHeader
        question="八国主权/准主权收益率曲线的形态与每日重定价：哪些倒挂、哪些趋陡，当日利率整体上行还是下行？"
        title="收益率曲线"
        subtitle={`Yield Curve · 全期限 1M–30Y · 截至 ${ASOF}（Mock 形状，与各国流动性监测同口径）`}
      />
      <div className="flex items-center gap-2 text-2xs text-muted">
        <MockBadge /> 数据为模拟，仅用于研究展示
      </div>

      <ConclusionBlock
        items={[
          {
            title: `曲线形态：${inv.length} 国倒挂`,
            points: [
              inv.length
                ? `倒挂经济体：${inv.map((c) => c.flag + c.name).join("、")}（短端高于长端，反映紧缩/衰退定价）。`
                : "当前无倒挂曲线。",
              `其余 ${curves.length - inv.length} 国为正常 / 陡峭或平坦形态。`,
            ],
          },
          {
            title: "当日方向（利率整体）",
            points: [
              up.length
                ? `利率上行（熊市）：${up.map((c) => c.flag + c.name).join("、")}。`
                : "无国家利率整体上行。",
              down.length
                ? `利率下行（牛市）：${down.map((c) => c.flag + c.name).join("、")}。`
                : "无国家利率整体下行。",
            ],
          },
          {
            title: "最活跃市场",
            points: [
              `${top.flag}${top.name} 平行平移 ${s(top.parallelBps)} bp，斜率(10Y−2Y)变化 ${s(top.slopeBps)} bp，分类「${top.move.label}」。`,
            ],
          },
        ]}
      />

      <YieldCurveModule asOf={ASOF} />
    </div>
  );
}
