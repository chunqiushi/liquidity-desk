"use client";

import * as React from "react";
import { ConclusionLayer, DetailLayer, ModuleGrid } from "@/components/home-modules";
import { ThisWeekFocus } from "@/components/this-week-focus";
import { EventSidebar } from "@/components/right-sidebar";

export default function DeskHomePage() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
      {/* 左：主内容区 */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* 本周重点关注（顶部醒目，借鉴 ResearchOS） */}
        <ThisWeekFocus />

        {/* 结论层 · 今日宏观结论（首页枢纽保留） */}
        <ConclusionLayer />

        {/* 明细数据一览 · 原 /data-detail 内容融入首页枢纽 */}
        <DetailLayer />

        {/* 模块入口 · 各研究子页 */}
        <ModuleGrid />

        <footer className="text-2xs text-muted border-t border-border pt-3 leading-relaxed">
          全部指标为确定性 Mock Data（is_mock=true），每个数据点均标注 source / frequency / as_of / unit / is_mock；
          自动摘要仅引用页面真实数值，不做交易信号与因果预测。时间窗口（1D/1W/1M）控制图表与迷你走势的可视化区间。
        </footer>
      </div>

      {/* 右：近期重要事件常驻边栏（借鉴 ResearchOS 右侧信息栏） */}
      <aside className="w-full lg:w-[320px] shrink-0">
        <EventSidebar />
      </aside>
    </div>
  );
}
