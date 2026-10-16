"use client";

import * as React from "react";
import { ChartsLayer } from "@/components/home-modules";

export default function ChartsPage() {
  return (
    <div className="space-y-4 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-lg font-semibold">图表中心</h1>
        <p className="text-2xs text-muted">
          跨市场利率 / 利差矩阵 / 外汇热力 / 流动性时间序列。数据为确定性 Mock。
        </p>
      </div>
      <ChartsLayer />
    </div>
  );
}
