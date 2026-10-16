"use client";

import * as React from "react";
import { GlobalMacroDashboard } from "@/components/home-modules";

export default function MacroGlobalPage() {
  return (
    <div className="space-y-4 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-lg font-semibold">全球宏观总览</h1>
        <p className="text-2xs text-muted">
          中国 + 7 国主要经济数据 · 走势一览 + 预期差（与中国图同款）。数据为确定性 Mock。
        </p>
      </div>
      <GlobalMacroDashboard />
    </div>
  );
}
