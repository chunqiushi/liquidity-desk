"use client";

import {
  CHINA_MACRO_MOCK,
  CHINA_MACRO_PERIOD,
  CHINA_MACRO_IS_MOCK,
  CHINA_MACRO_SOURCE,
} from "@/lib/china-macro-mock";
import { MacroResearchChart } from "@/components/macro-research-chart";

/* ============================================================
 * 中国宏观数据研究图表组件（包装通用 MacroResearchChart）
 * 上图：10 个指标各自独立的 mini 同比走势
 * 下图：预期(黄) / 实际(深蓝) 双柱 + 预期差(黑点)
 * 纯 SVG 绘制，通用组件已规避 Recharts 静态导出 Invariant failed。
 * ============================================================ */

export function ChinaMacroDashboard() {
  return (
    <MacroResearchChart
      indicators={CHINA_MACRO_MOCK}
      title="中国主要经济数据"
      period={CHINA_MACRO_PERIOD}
      isMock={CHINA_MACRO_IS_MOCK}
      sourceLabel={CHINA_MACRO_SOURCE}
      cardTitle="中国宏观数据监控"
    />
  );
}
