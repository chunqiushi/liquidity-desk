"use client";

import * as React from "react";
import { DetailLayer } from "@/components/home-modules";

export default function DataDetailPage() {
  return (
    <div className="space-y-4 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-lg font-semibold">明细数据</h1>
        <p className="text-2xs text-muted">
          事件日历 / 研究笔记 / 关注清单 / 核心指标明细表。数据为确定性 Mock。
        </p>
      </div>
      <DetailLayer />
    </div>
  );
}
