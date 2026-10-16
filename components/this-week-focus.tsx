"use client";

import * as React from "react";
import { Flame, CalendarDays } from "lucide-react";
import { Card, CardHead, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { REGION_LABELS, type Region } from "@/lib/indicators";
import {
  getThisWeekEvents,
  getWeekLabel,
  dayDiff,
} from "@/lib/home-data";

const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function weekday(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return WD[new Date(y, m - 1, d).getDay()];
}

function fmtShort(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;
}

function impTone(imp: "高" | "中" | "低"): "neg" | "warn" | "neutral" {
  if (imp === "高") return "neg";
  if (imp === "中") return "warn";
  return "neutral";
}

export function ThisWeekFocus() {
  const events = getThisWeekEvents();
  if (!events.length) return null;

  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            <Flame size={15} className="text-warn" />
            本周重点关注
            <span className="text-2xs text-muted font-normal">· {getWeekLabel()}</span>
          </span>
        }
        subtitle="未来 7 天需重点跟踪的宏观事件（Mock）"
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {events.map((e, i) => {
          const diff = dayDiff(e.date);
          const region = REGION_LABELS[e.region as Region] ?? e.region;
          return (
            <div
              key={i}
              className="border border-border rounded-lg p-3 flex flex-col gap-1.5 bg-panel-2/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs tnum text-muted flex items-center gap-1">
                  <CalendarDays size={11} className="text-muted" />
                  {fmtShort(e.date)} · {weekday(e.date)}
                </span>
                <Badge tone={impTone(e.importance)}>{e.importance}</Badge>
              </div>
              <div className="text-xs font-medium text-content leading-snug">{e.title}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-2xs chip bg-accent/10 text-accent">{region}</span>
                <span
                  className={cn(
                    "text-2xs tnum font-medium",
                    diff < 0 ? "text-muted" : diff === 0 ? "text-neg" : "text-accent",
                  )}
                >
                  {diff < 0 ? `已发生 ${-diff} 天` : diff === 0 ? "今天" : `还有 ${diff} 天`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
