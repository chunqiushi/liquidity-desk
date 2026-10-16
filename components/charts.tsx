"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResearchContext } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

const LOOKBACK_DAYS: Record<string, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "3Y": 756,
  "5Y": 1260,
};

function sliceByLookback<T>(rows: T[], lookback: string): T[] {
  const n = LOOKBACK_DAYS[lookback] ?? 132;
  return rows.slice(Math.max(0, rows.length - n));
}

export interface SeriesDef {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: "rgb(var(--panel))",
      border: "1px solid rgb(var(--border))",
      borderRadius: 8,
      fontSize: 11,
      color: "rgb(var(--text))",
    },
    labelStyle: { color: "rgb(var(--text-muted))" },
    itemStyle: { padding: 0 },
  } as const;
}

export function TimeSeriesChart({
  data,
  series,
  height = 240,
  unit,
  valueFormatter,
  id = "ts",
  lookback,
}: {
  data: Array<Record<string, number | string >>;
  series: SeriesDef[];
  height?: number;
  unit?: string;
  valueFormatter?: (v: number) => string;
  id?: string;
  lookback?: string;
}) {
  const ctx = useResearchContext();
  const effLookback = lookback ?? ctx.lookback;
  const rows = React.useMemo(
    () => sliceByLookback(data, effLookback),
    [data, effLookback],
  );
  const fmt = valueFormatter ?? ((v: number) => (unit ? `${v.toFixed(2)} ${unit}` : v.toFixed(2)));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          tickFormatter={(d) => fmtDate(d).slice(5)}
          minTickGap={40}
          stroke="rgb(var(--border))"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          width={48}
          stroke="rgb(var(--border))"
          domain={["auto", "auto"]}
          tickFormatter={(v) => (unit ? v.toFixed(2) : v)}
        />
        <Tooltip
          {...tooltipStyle()}
          labelFormatter={(d) => fmtDate(String(d))}
          formatter={(v: number, name: string) => [fmt(v), name]}
        />
        <ReferenceLine
          x={ctx.asOfDate}
          stroke="rgb(var(--accent))"
          strokeDasharray="4 3"
          label={{ value: "as-of", position: "insideTopRight", fontSize: 9, fill: "rgb(var(--accent))" }}
        />
        {series.map((s) => (
          <Line
            key={s.key + id}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={1.6}
            strokeDasharray={s.dashed ? "5 3" : undefined}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaSeriesChart({
  data,
  series,
  height = 220,
  unit,
  id = "area",
  lookback,
}: {
  data: Array<Record<string, number | string>>;
  series: SeriesDef[];
  height?: number;
  unit?: string;
  id?: string;
  lookback?: string;
}) {
  const ctx = useResearchContext();
  const effLookback = lookback ?? ctx.lookback;
  const rows = React.useMemo(() => sliceByLookback(data, effLookback), [data, effLookback]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          tickFormatter={(d) => fmtDate(d).slice(5)}
          minTickGap={40}
          stroke="rgb(var(--border))"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          width={48}
          stroke="rgb(var(--border))"
          tickFormatter={(v) => (unit ? v.toFixed(0) : v)}
        />
        <Tooltip {...tooltipStyle()} labelFormatter={(d) => fmtDate(String(d))} />
        <ReferenceLine x={ctx.asOfDate} stroke="rgb(var(--accent))" strokeDasharray="4 3" />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={1.4}
            fill={`url(#grad-${id}-${s.key})`}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedBarChart({
  data,
  series,
  labelKey = "label",
  height = 260,
  unit,
}: {
  data: Array<Record<string, number | string>>;
  series: { key: string; name: string; color: string }[];
  labelKey?: string;
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={labelKey}
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          stroke="rgb(var(--border))"
          interval={0}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          width={48}
          stroke="rgb(var(--border))"
          tickFormatter={(v) => (unit ? v.toFixed(1) : v)}
        />
        <Tooltip
          {...tooltipStyle()}
          formatter={(v: number, name: string) => [unit ? `${v.toFixed(2)} ${unit}` : v, name]}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniSpark({
  values,
  color = "rgb(var(--accent))",
  width = 72,
  height = 20,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / rng) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} />
    </svg>
  );
}

export function BarMini({
  data,
  color = "rgb(var(--accent))",
  height = 200,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
          stroke="rgb(var(--border))"
        />
        <YAxis tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }} width={44} stroke="rgb(var(--border))" />
        <Tooltip {...tooltipStyle()} />
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
