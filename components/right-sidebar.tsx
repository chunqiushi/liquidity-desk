"use client";

import * as React from "react";
import { CalendarClock, CheckCircle2, Hourglass } from "lucide-react";
import { Card, CardHead, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { REGION_LABELS, type Region } from "@/lib/indicators";
import {
  getUpcomingEvents,
  getRecentEvents,
  dayDiff,
} from "@/lib/home-data";

function fmtShort(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;
}

function impTone(imp: "高" | "中" | "低"): "neg" | "warn" | "neutral" {
  if (imp === "高") return "neg";
  if (imp === "中") return "warn";
  return "neutral";
}

function EventRow({ date, title, region, importance }: {
  date: string;
  title: string;
  region: string;
  importance: "高" | "中" | "低";
}) {
  const r = REGION_LABELS[region as Region] ?? region;
  return (
    <div className="flex items-center gap-2 text-2xs border-b border-border/50 pb-1.5 last:border-0">
      <span className="tnum text-muted w-12 shrink-0">{fmtShort(date)}</span>
      <span className="font-medium text-content flex-1 leading-snug">{title}</span>
      <Badge tone={impTone(importance)}>{importance}</Badge>
      <span className="chip bg-accent/10 text-accent shrink-0">{r}</span>
    </div>
  );
}

export function EventSidebar() {
  const upcoming = getUpcomingEvents(21);
  const recent = getRecentEvents(7);

  return (
    <div className="lg:sticky lg:top-4 space-y-4">
      <Card>
        <CardHead
          title={
            <span className="flex items-center gap-1.5">
              <CalendarClock size={15} className="text-accent" />
              近期重要事件
            </span>
          }
          subtitle="倒计时 · 已发生（Mock）"
          right={<Badge tone="mock">Mock</Badge>}
        />
        <div className="p-3 space-y-4">
          <div>
            <div className="text-2xs font-semibold text-accent mb-2 flex items-center gap-1">
              <Hourglass size={12} /> 待发生 · 未来 21 天
            </div>
            <div className="space-y-1.5">
              {upcoming.length === 0 ? (
                <div className="text-2xs text-muted py-2">未来 21 天暂无事件</div>
              ) : (
                upcoming.map((e, i) => {
                  const diff = dayDiff(e.date);
                  return (
                    <div key={i} className="space-y-0.5">
                      <EventRow
                        date={e.date}
                        title={e.title}
                        region={e.region}
                        importance={e.importance}
                      />
                      <div className="text-right text-2xs tnum font-medium text-accent -mt-1">
                        {diff === 0 ? "今天" : `还有 ${diff} 天`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="text-2xs font-semibold text-muted mb-2 flex items-center gap-1">
              <CheckCircle2 size={12} /> 近期已发生
            </div>
            <div className="space-y-1.5">
              {recent.length === 0 ? (
                <div className="text-2xs text-muted py-2">近 7 天暂无事件</div>
              ) : (
                recent.map((e, i) => (
                  <div key={i} className="space-y-0.5">
                    <EventRow
                      date={e.date}
                      title={e.title}
                      region={e.region}
                      importance={e.importance}
                    />
                    <div className="text-right text-2xs tnum text-muted -mt-1">
                      已发生 {Math.abs(dayDiff(e.date))} 天
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
