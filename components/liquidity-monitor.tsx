"use client";

import * as React from "react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  getLiquidityMatrix,
  LQ_ORDER,
  MONITOR,
  type EcoCode,
  type EconomyLiquidity,
  type LiqValue,
} from "@/lib/liquidity";
import { buildExpertCommentary } from "@/lib/liquidity-expert";
import { getCountryEvents, type EventImpact } from "@/lib/liquidity-events";

const ASOF = "2026-09-29";

const FLAG: Record<string, string> = {
  CNY: "🇨🇳",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  JPY: "🇯🇵",
  HKD: "🇭🇰",
  CHF: "🇨🇭",
  GBP: "🇬🇧",
  AUD: "🇦🇺",
};

// 暗色主题下的各国配色（与站点 accent 协调）
const REGION_COLORS: Record<string, string> = {
  CNY: "#38BDF8",
  USD: "#F87171",
  EUR: "#34D399",
  JPY: "#FBBF24",
  HKD: "#A78BFA",
  CHF: "#22D3EE",
  GBP: "#F472B6",
  AUD: "#A3E635",
};

/* ----------------------------- 格式化 ----------------------------- */
function fmtVal(v: number, unit: string): string {
  if (unit === "%") return v.toFixed(2);
  if (unit === "bp") return v.toFixed(0);
  if (unit === "汇率") return v.toFixed(4);
  if (["万亿", "千亿", "十亿", "十亿USD"].some((u) => unit.includes(u))) return v.toFixed(1);
  return v.toFixed(1);
}

function fmtChg(v: number | null, mode: string): string {
  if (v === null) return "—";
  const s = v >= 0 ? "+" : "";
  if (mode === "bps") return `${s}${v.toFixed(0)}bp`;
  if (mode === "pct") return `${s}${v.toFixed(1)}%`;
  return `${s}${v.toFixed(1)}`;
}

function unitLabel(ind: LiqValue): string {
  if (ind.unit === "%") return "pp";
  if (ind.unit === "bp") return "bp";
  if (ind.unit === "汇率") return "";
  return ind.unit;
}

/* ----------------------------- Sparkline（纯 SVG） ----------------------------- */
function Sparkline({
  values,
  color,
  w = 140,
  h = 30,
}: {
  values: number[];
  color: string;
  w?: number;
  h?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const x = (i: number) => 1 + (i * (w - 2)) / (values.length - 1);
  const y = (v: number) => h - 1 - ((v - yMin) / (yMax - yMin)) * (h - 2);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${d} L ${x(values.length - 1).toFixed(1)},${h - 1} L 1,${h - 1} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------- 单指标真实量纲走势（解决多线难读的核心） ----------------------------- */
function SingleScaleChart({ ind, color }: { ind: LiqValue; color: string }) {
  const W = 640, H = 200, ml = 52, mr = 12, mt = 12, mb = 26;
  const iw = W - ml - mr, ih = H - mt - mb;
  const vals = ind.history.map((h) => h.value).slice(-180);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.02 || 1;
  const yMin = min - pad, yMax = max + pad;
  const x = (i: number) => ml + (i * iw) / (vals.length - 1);
  const y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${d} L ${x(vals.length - 1).toFixed(1)},${mt + ih} L ${ml},${mt + ih} Z`;
  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  const fmt = (v: number) => (ind.mode === "bps" ? v.toFixed(0) : v.toFixed(2));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-muted">单独走势 · 真实量纲（近 180 日）</span>
        <span className="text-2xs tnum" style={{ color }}>{ind.label} · 当前 {fmt(ind.value)}{ind.unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={ml} y1={y(t)} x2={ml + iw} y2={y(t)} stroke="rgb(var(--border))" strokeDasharray="3 3" />
            <text x={ml - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">{fmt(t)}</text>
          </g>
        ))}
        <path d={area} fill={color} fillOpacity={0.1} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        <text x={ml} y={H - 8} fontSize={9} fill="rgb(var(--text-muted))">T-180</text>
        <text x={ml + iw} y={H - 8} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">当前</text>
      </svg>
    </div>
  );
}

/* ----------------------------- 交互式走势面板（点击图例增删线 / 单独查看真实量纲） ----------------------------- */
function TrendPanel({ inds, color }: { inds: LiqValue[]; color: string }) {
  const [visible, setVisible] = React.useState<Set<string>>(() => new Set(inds.map((i) => i.id)));
  const [solo, setSolo] = React.useState<string | null>(null);

  const palette = [color, "#F59E0B", "#A78BFA", "#34D399", "#F472B6", "#22D3EE"];
  const colorOf = (i: number) => palette[i % palette.length];
  const idIndex: Record<string, number> = {};
  inds.forEach((ind, i) => (idIndex[ind.id] = i));

  const toggle = (id: string) =>
    setVisible((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const shown = inds.filter((ind) => visible.has(ind.id));
  const soloInd = solo ? inds.find((i) => i.id === solo) ?? null : null;
  const unitDec = (ind: LiqValue) => (ind.mode === "bps" ? 0 : 2);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-2xs font-semibold text-muted mb-1.5">重点指标走势 · 交互（点击图例增删线条）</div>
        <div className="flex flex-wrap gap-1.5">
          {inds.map((ind) => {
            const on = visible.has(ind.id);
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => toggle(ind.id)}
                className={cn(
                  "text-2xs px-2 py-1 rounded-md border flex items-center gap-1.5 transition-colors",
                  on ? "border-border bg-card" : "border-border/50 opacity-50 hover:opacity-80",
                )}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colorOf(idIndex[ind.id]) }} />
                <span>{ind.label}</span>
                <span className="tnum opacity-70">{ind.value.toFixed(unitDec(ind))}{ind.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {soloInd ? (
        <SingleScaleChart ind={soloInd} color={colorOf(idIndex[soloInd.id])} />
      ) : shown.length ? (
        <IndexedChart
          series={shown.map((ind) => ({ name: ind.label, values: ind.history.map((h) => h.value) }))}
          palette={inds.map((_, i) => colorOf(i))}
        />
      ) : (
        <div className="text-2xs text-muted py-6 text-center">请至少选择一个指标</div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-2xs text-muted shrink-0">单独查看（真实量纲）：</span>
        <select
          value={solo ?? ""}
          onChange={(e) => setSolo(e.target.value || null)}
          className="text-2xs bg-card border border-border rounded-md px-2 py-1 tnum"
        >
          <option value="">— 关闭（对比视图）—</option>
          {inds.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ----------------------------- 基期=100 多线对比图（纯 SVG，可指定色板） ----------------------------- */
function IndexedChart({
  series,
  palette,
}: {
  series: { name: string; values: number[] }[];
  palette: string[];
}) {
  const W = 640;
  const H = 210;
  const ml = 38;
  const mr = 12;
  const mt = 12;
  const mb = 26;
  const iw = W - ml - mr;
  const ih = H - mt - mb;

  const rebased = series
    .map((s) => {
      const slice = s.values.slice(-180);
      const base = slice[0] || 1;
      return { name: s.name, vals: slice.map((v) => (v / base) * 100) };
    })
    .filter((s) => s.vals.length > 1);

  if (!rebased.length) return null;

  let yMin = Infinity;
  let yMax = -Infinity;
  rebased.forEach((s) => s.vals.forEach((v) => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  }));
  const pad = (yMax - yMin) * 0.1 || 1;
  yMin -= pad;
  yMax += pad;
  const x = (i: number) => ml + (i * iw) / (rebased[0].vals.length - 1);
  const y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const ticks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-muted">重点指标走势 · 基期=100（近 180 日 · 已选 {rebased.length} 项）</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {rebased.map((s, i) => (
            <span key={s.name} className="text-2xs flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: palette[i % palette.length] }}
              />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={ml} y1={y(t)} x2={ml + iw} y2={y(t)} stroke="rgb(var(--border))" strokeDasharray="3 3" />
            <text x={ml - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
              {t.toFixed(0)}
            </text>
          </g>
        ))}
        <line x1={ml} y1={y(100)} x2={ml + iw} y2={y(100)} stroke="rgb(var(--text-muted))" strokeOpacity={0.5} />
        <text x={ml + iw} y={y(100) - 3} textAnchor="end" fontSize={8} fill="rgb(var(--text-muted))">
          100
        </text>
        {rebased.map((s, si) => {
          const c = palette[si % palette.length];
          const d = s.vals
            .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)},${y(v).toFixed(1)}`)
            .join(" ");
          return <path key={s.name} d={d} fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />;
        })}
        <text x={ml} y={H - 8} fontSize={9} fill="rgb(var(--text-muted))">
          T-180
        </text>
        <text x={ml + iw} y={H - 8} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
          当前
        </text>
      </svg>
    </div>
  );
}

/* ----------------------------- 金融专家点评 ----------------------------- */
const TONE_HEX: Record<string, string> = {
  loose: "#34D399",
  neutral: "#F59E0B",
  tight: "#F87171",
};

function ExpertCol({ title, items, tone }: { title: string; items: string[]; tone?: "neg" }) {
  const dot = tone === "neg" ? "#F87171" : "#38BDF8";
  return (
    <div className="card-soft p-2.5 space-y-1.5">
      <div className="text-2xs font-semibold text-muted">{title}</div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-2xs leading-snug flex gap-1.5">
            <span className="mt-0.5 shrink-0" style={{ color: dot }}>•</span>
            <span className="text-content/85">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpertBox({ eco }: { eco: EconomyLiquidity }) {
  const ex = React.useMemo(() => buildExpertCommentary(eco), [eco]);
  const tone = TONE_HEX[ex.tone];
  return (
    <div className="border-t border-border/60 pt-3">
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <span className="text-2xs font-semibold text-muted">金融专家点评</span>
        <span
          className="text-2xs px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium"
        >
          Expert
        </span>
        <span
          className="text-2xs px-2 py-0.5 rounded-full font-semibold"
          style={{ color: tone, border: `1px solid ${tone}`, background: `${tone}1a` }}
        >
          流动性态势 · {ex.stance}
        </span>
      </div>
      <p className="text-2xs leading-relaxed text-content/90 mb-2.5">{ex.summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ExpertCol title="关键信号" items={ex.signals} />
        <ExpertCol title="风险关注" items={ex.risks} tone="neg" />
        <ExpertCol title="后续关注" items={ex.watch} />
      </div>
    </div>
  );
}

/* ----------------------------- 关键事件（近一周 / 未来一周） ----------------------------- */
const IMPACT_HEX: Record<EventImpact, string> = {
  high: "#F87171",
  med: "#F59E0B",
  low: "#94A3B8",
};
const IMPACT_LABEL: Record<EventImpact, string> = {
  high: "高冲击",
  med: "中冲击",
  low: "低冲击",
};

function EventRow({ ev }: { ev: { date: string; title: string; detail: string; impact: EventImpact; tag: string } }) {
  const c = IMPACT_HEX[ev.impact];
  return (
    <li className="text-2xs leading-snug flex gap-2">
      <span
        className="mt-1 shrink-0 w-1 h-1 rounded-full"
        style={{ background: c }}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="tnum font-semibold text-content/90">{ev.date}</span>
          <span className="text-content/90 font-medium">{ev.title}</span>
          <span
            className="text-[10px] px-1 py-px rounded-sm"
            style={{ color: c, background: `${c}1a`, border: `1px solid ${c}55` }}
          >
            {ev.tag} · {IMPACT_LABEL[ev.impact]}
          </span>
        </div>
        <p className="text-content/65 mt-0.5">{ev.detail}</p>
      </div>
    </li>
  );
}

function EventsBox({ code }: { code: string }) {
  const ev = getCountryEvents(code);
  if (!ev) return null;
  return (
    <div className="border-t border-border/60 pt-3">
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <span className="text-2xs font-semibold text-muted">关键事件 · 近一周 / 未来一周</span>
        <span className="text-2xs px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
          Calendar
        </span>
        <span className="text-[10px] text-muted/70">截至 2026-09-29 · Mock</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card-soft p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-2xs font-semibold text-muted">最近一周（已发生）</span>
            <span className="text-[10px] text-muted/60 ml-auto">{ev.recent.length} 件</span>
          </div>
          <ul className="space-y-2">
            {ev.recent.map((e, i) => (
              <EventRow key={i} ev={e} />
            ))}
          </ul>
        </div>
        <div className="card-soft p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-2xs font-semibold text-muted">未来一周（待发生）</span>
            <span className="text-[10px] text-muted/60 ml-auto">{ev.upcoming.length} 件</span>
          </div>
          <ul className="space-y-2">
            {ev.upcoming.map((e, i) => (
              <EventRow key={i} ev={e} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- 指标单元格 ----------------------------- */
function IndicatorCell({ ind, color }: { ind: LiqValue; color: string }) {
  const hist = ind.history.map((h) => h.value);
  return (
    <div className="card-soft p-2.5 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs text-muted leading-tight">{ind.label}</span>
        <span className="text-2xs tnum text-muted/70 shrink-0">{unitLabel(ind)}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-semibold tnum">{fmtVal(ind.value, ind.unit)}</span>
      </div>
      <div className="text-2xs tnum text-muted">
        {fmtChg(ind.chg1m, ind.mode)}
        <span className="opacity-60 ml-1">1M</span>
      </div>
      <div className="h-7 mt-0.5">
        <Sparkline values={hist.slice(-90)} color={color} />
      </div>
    </div>
  );
}

/* ----------------------------- 头条指标小条 ----------------------------- */
function Headline({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="card-soft px-3 py-2 flex flex-col gap-0.5">
      <span className="text-2xs text-muted">{label}</span>
      <span className="text-sm font-semibold tnum">
        {value}
        <span className="text-2xs text-muted font-normal ml-1">{unit}</span>
      </span>
    </div>
  );
}

/* ----------------------------- 分国别卡片 ----------------------------- */
function CountryCard({ eco, idx }: { eco: EconomyLiquidity; idx: number }) {
  const color = REGION_COLORS[eco.code] ?? "#38BDF8";
  const all = Object.values(eco.layers).flat();
  const ids = MONITOR[eco.code] ?? [];
  const inds = ids
    .map((id) => all.find((d) => d.id === id))
    .filter((d): d is LiqValue => Boolean(d));

  const headline = (v: LiqValue | null, label: string) =>
    v ? (
      <Headline
        label={label}
        value={fmtVal(v.value, v.unit)}
        unit={v.unit === "%" ? "%" : v.unit === "bp" ? "bp" : v.unit}
      />
    ) : null;

  return (
    <section id={`eco-${eco.code}`} className="scroll-mt-20">
      <Card>
        <CardHead
          title={
            <span className="flex items-center gap-2">
              <span className="text-base">{FLAG[eco.code]}</span>
              {eco.name}
            </span>
          }
          subtitle={`${eco.currency} · ${eco.centralBank}`}
          right={<Badge tone="mock">Mock</Badge>}
        />
        <div className="p-3 space-y-3">
          {/* 头条：核心利率 / 政策 / 净流动性 / 央行资产 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {headline(eco.coreFunding, "核心短端利率")}
            {headline(eco.policyRate, "政策利率")}
            {headline(eco.liquidityQuantity, "净流动性/数量")}
            {headline(eco.centralBankAssets, "央行资产/负债")}
          </div>

          {/* 监测重点指标卡片 */}
          <div>
            <div className="text-2xs font-semibold text-muted mb-1.5">监测重点指标</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {inds.map((ind) => (
                <IndicatorCell key={ind.id} ind={ind} color={color} />
              ))}
            </div>
          </div>

          {/* 重点指标走势：交互面板 + 金融专家点评 + 关键事件 */}
          <div className="border-t border-border/60 pt-3 space-y-3">
            <TrendPanel inds={inds} color={color} />
            <ExpertBox eco={eco} />
            <EventsBox code={eco.code} />
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ----------------------------- 总览 tile ----------------------------- */
function OverviewTile({ eco, idx }: { eco: EconomyLiquidity; idx: number }) {
  const color = REGION_COLORS[eco.code] ?? "#38BDF8";
  const coreHist = eco.coreFunding.history.map((h) => h.value).slice(-90);
  return (
    <a
      href={`#eco-${eco.code}`}
      className="card p-3 flex flex-col gap-2 hover:border-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <span>{FLAG[eco.code]}</span>
          <span className="truncate">{eco.name.replace(/^.*?\s/, "")}</span>
        </span>
        <Badge tone="mock" className="shrink-0">
          Mock
        </Badge>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tnum">{fmtVal(eco.coreFunding.value, eco.coreFunding.unit)}</span>
        <span className="text-2xs text-muted">{eco.coreFunding.unit}</span>
        <span className="text-2xs tnum ml-auto" style={{ color }}>
          {eco.coreFunding.label}
        </span>
      </div>
      <div className="h-7">
        <Sparkline values={coreHist} color={color} />
      </div>
      <div className="text-2xs text-muted tnum flex justify-between">
        <span>政策 {fmtVal(eco.policyRate.value, eco.policyRate.unit)}%</span>
        {eco.liquidityQuantity && (
          <span>净量 {fmtVal(eco.liquidityQuantity.value, eco.liquidityQuantity.unit)}</span>
        )}
      </div>
    </a>
  );
}

/* ----------------------------- 总出口 ----------------------------- */
export function LiquidityMonitor() {
  const matrix = React.useMemo(() => getLiquidityMatrix(ASOF), []);
  return (
    <div className="space-y-5 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-lg font-semibold">各国流动性监测</h1>
        <p className="text-2xs text-muted mt-0.5">
          8 国关键流动性指标 · 按你给定的监测框架逐项呈现（净值 / 成交量 / 基差 / 利差 / 持仓）。每张卡含指标近期走势
          sparkline 与「重点指标基期=100」对比图。数据为确定性 Mock，仅供研究。
        </p>
      </div>

      <div>
        <SectionLabel>监测总览 · 点击进入分国别</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {matrix.map((eco, i) => (
            <OverviewTile key={eco.code} eco={eco} idx={i} />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>分国别监测</SectionLabel>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {matrix.map((eco, i) => (
            <CountryCard key={eco.code} eco={eco} idx={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
