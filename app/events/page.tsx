"use client";

import * as React from "react";
import { PageHeader, SectionLabel } from "@/components/research-ui";
import { EVENTS } from "@/lib/home-data";
import { REGION_LABELS, type Region } from "@/lib/indicators";
import { Card, CardHead, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export default function EventsPage() {
  const [region, setRegion] = React.useState<string>("ALL");
  const list = region === "ALL" ? EVENTS : EVENTS.filter((e) => e.region === region);

  return (
    <div className="space-y-6">
      <PageHeader
        question="未来有哪些关键催化剂？央行会议、数据发布、政治与地缘事件，对哪些资产有潜在影响？"
        title="事件日历"
        subtitle="Events Calendar · 未来宏观事件（Mock）"
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <SectionLabel>未来事件</SectionLabel>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="text-2xs border border-border rounded px-2 py-1 bg-panel text-content"
          >
            <option value="ALL">全部地区</option>
            {Object.entries(REGION_LABELS)
              .filter(([k]) => k !== "GLOBAL")
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </div>
        <Card>
          <CardHead title="事件列表" subtitle={`${list.length} 项 · 高重要性已标红`} />
          <div className="p-3 space-y-1.5 max-h-[560px] overflow-y-auto">
            {list.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-2xs border-b border-border/60 pb-1.5"
              >
                <CalendarDays size={13} className="text-accent shrink-0" />
                <span className="tnum text-muted w-20 shrink-0">{e.date}</span>
                <span className="font-medium text-content flex-1">{e.title}</span>
                <Badge
                  tone={
                    e.importance === "高"
                      ? "neg"
                      : e.importance === "中"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {e.importance}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
