"use client";

import * as React from "react";
import Link from "next/link";
import { Globe2, ArrowUp, ArrowDown, Minus, Info } from "lucide-react";
import {
  macroGroups,
  CHINA_META,
  type MacroItem,
} from "@/lib/china-mock";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { MiniSpark } from "@/components/charts";
import { fmtNum, cn } from "@/lib/utils";

function Arrow({ d }: { d: "up" | "down" | "flat" }) {
  if (d === "up") return <ArrowUp size={12} className="text-pos" />;
  if (d === "down") return <ArrowDown size={12} className="text-neg" />;
  return <Minus size={12} className="text-muted" />;
}

function ItemCard({ it }: { it: MacroItem }) {
  const vals = it.series.observations.filter((o) => o.value !== null).slice(-24).map((o) => o.value as number);
  return (
    <div className="border border-border rounded p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-muted">{it.name}</span>
        <Arrow d={it.direction} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-lg font-semibold tnum">
          {fmtNum(it.latest, it.unit === "%" || it.unit === "" ? 1 : 0)}
          <span className="text-2xs text-muted ml-0.5">{it.unit}</span>
        </div>
        <MiniSpark values={vals} color={it.direction === "up" ? "#22c55e" : it.direction === "down" ? "#ef4444" : "#888"} />
      </div>
      <div className="text-2xs text-muted mt-1">
        前值 {fmtNum(it.prev, it.unit === "%" || it.unit === "" ? 1 : 0)} · {it.kind}
      </div>
    </div>
  );
}

export default function ChinaOverviewPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Globe2 size={18} className="text-accent" /> 中国宏观总览
          </h1>
          <p className="text-2xs text-muted">观察期 {CHINA_META.asOf} · 全部指标 Mock Data</p>
        </div>
        <Badge tone="mock">Mock Data</Badge>
      </div>

      {macroGroups.map((g) => (
        <div key={g.name}>
          <SectionLabel>{g.name}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {g.items.map((it) => (
              <ItemCard key={it.key} it={it} />
            ))}
          </div>
        </div>
      ))}

      <Card>
        <CardHead title="数据说明" />
        <div className="p-3 text-2xs text-muted flex items-start gap-1">
          <Info size={12} className="mt-0.5 shrink-0" />
          {CHINA_META.disclaimer}
        </div>
      </Card>
    </div>
  );
}
