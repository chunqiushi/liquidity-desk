"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import {
  AlertTriangle,
  Copy,
  Star,
  StarOff,
  CalendarDays,
  StickyNote,
  ArrowUp,
  ArrowDown,
  Search,
  ArrowLeftRight,
} from "lucide-react";
import { TrendingUp, Waves, LineChart as LineChartIcon, BarChart3, ArrowRight, Sparkles, Layers } from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardHead, Badge, SectionLabel, Button } from "@/components/ui";
import { TimeSeriesChart, MiniSpark } from "@/components/charts";
import { cn, fmtNum, fmtDate } from "@/lib/utils";
import { useResearchContext, useResearchData } from "@/lib/store";
import {
  INDICATORS,
  getIndicator,
  resolveIndicator,
  realWindowSlice,
  REGION_LABELS,
  CATEGORY_LABELS,
  type Indicator,
  type Region,
} from "@/lib/indicators";
import {
  windowSlice,
  windowValues,
  fxMatrix,
  buildCurve,
  YIELD_CURVE_REGIONS,
  type TW,
} from "@/lib/mock-series";
import { isReal } from "@/lib/realdata";
import {
  KEY_CARDS,
  buildConclusions,
  buildRisks,
  EVENTS,
  buildSummary,
} from "@/lib/home-data";
import EmptyRealReturnsChart from "@/components/empty-real-returns-chart";
import { MacroResearchChart } from "@/components/macro-research-chart";
import { LiquidityTrendPhase } from "@/components/liquidity-trend-phase";
import { getLiquidityMatrix } from "@/lib/liquidity";
import {
  CHINA_MACRO_MOCK,
  CHINA_MACRO_PERIOD,
  CHINA_MACRO_IS_MOCK,
  CHINA_MACRO_SOURCE,
  type ChinaMacroPoint,
} from "@/lib/china-macro-mock";
import {
  INTL_MACRO,
  INTL_MACRO_ECONOMIES,
  INTL_MACRO_PERIOD,
  INTL_MACRO_IS_MOCK,
} from "@/lib/intl-macro-mock";

/* ----------------------------- 通用格式化 ----------------------------- */

function changeUnit(u: string): string {
  if (u === "%") return "pp";
  if (u === "pp") return "pp";
  if (u === "bp") return "bp";
  if (u === "level") return "";
  if (u === "十亿USD") return "十亿";
  if (u === "千人") return "千人";
  return u;
}

function fmtChange(ind: Indicator): string {
  const u = changeUnit(ind.unit);
  const s = ind.change >= 0 ? "+" : "";
  return `${s}${ind.change.toFixed(2)}${u ? " " + u : ""}`;
}

function dirMeta(d: Indicator["direction"]): { cls: string; arrow: string } {
  if (d === "up") return { cls: "text-neg", arrow: "▲" }; // 红涨
  if (d === "down") return { cls: "text-pos", arrow: "▼" }; // 绿跌
  return { cls: "text-muted", arrow: "■" };
}

function dirColor(d: Indicator["direction"]): string {
  if (d === "up") return "rgb(var(--neg))";
  if (d === "down") return "rgb(var(--pos))";
  return "rgb(var(--text-muted))";
}

function ttStyle() {
  return {
    contentStyle: {
      background: "rgb(var(--panel))",
      border: "1px solid rgb(var(--border))",
      borderRadius: 8,
      fontSize: 11,
      color: "rgb(var(--text))",
    },
    labelStyle: { color: "rgb(var(--text-muted))" },
  } as const;
}

function MockBadge() {
  return <Badge tone="mock">MOCK</Badge>;
}

const REGION_COLORS: Record<string, string> = {
  CN: "#1F4E79",
  US: "#DC2626",
  EU: "#059669",
  JP: "#F59E0B",
  HK: "#7C3AED",
  CH: "#0EA5E9",
  GB: "#DB2777",
  AU: "#65A30D",
};

function divergeColor(v: number, maxAbs: number, pos: string, neg: string): string {
  if (maxAbs <= 0) return "transparent";
  const a = Math.min(0.62, Math.abs(v) / maxAbs * 0.62);
  return v >= 0 ? `rgba(${pos},${a.toFixed(3)})` : `rgba(${neg},${a.toFixed(3)})`;
}

/* ===================================================================
 * 第一屏 · 结论层
 * =================================================================== */

function KeyChangeCard({ code }: { code: string }) {
  const ctx = useResearchContext();
  const ind = resolveIndicator(code) ?? getIndicator(code);
  if (!ind) return null;
  const dm = dirMeta(ind.direction);
  const vals = windowValues(ind, ctx.timeWindow as TW);
  return (
    <StaticLink
      href={`/data-dictionary?q=${encodeURIComponent(ind.code)}`}
      className="card p-3 flex flex-col gap-1 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs text-muted leading-tight line-clamp-2">{ind.name}</span>
        {ind.is_mock ? <MockBadge /> : <Badge tone="pos">真实</Badge>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold tnum">{fmtNum(ind.value, 2)}</span>
        <span className="text-2xs text-muted">{ind.unit}</span>
      </div>
      <div className={cn("text-2xs tnum font-medium", dm.cls)}>
        {dm.arrow} {fmtChange(ind)}
      </div>
      <div className="mt-1">
        <MiniSpark values={vals} color={dirColor(ind.direction)} width={150} height={22} />
      </div>
      <div className="text-2xs text-muted tnum">
        {ind.is_mock
          ? `分位 ${ind.percentile}% · as_of ${ind.as_of}`
          : `真实序列 · as_of ${ind.as_of} · 分位为模型推导`}
      </div>
    </StaticLink>
  );
}

function ConclusionLayer() {
  const ctx = useResearchContext();
  const conclusions = buildConclusions();
  const risks = buildRisks();

  const onCopy = () => {
    const text = buildSummary(ctx.timeWindow as TW);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>结论层 · 今日宏观结论</SectionLabel>
        <Button size="xs" variant="ghost" onClick={onCopy}>
          <Copy size={12} /> 复制摘要
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {conclusions.map((c, i) => (
          <Card key={i}>
            <CardHead title={`结论 ${i + 1}`} />
            <div className="p-3 space-y-2">
              <div className="text-sm font-semibold text-content">{c.title}</div>
              <ul className="space-y-1.5">
                {c.points.map((p, j) => (
                  <li key={j} className="text-2xs text-muted leading-relaxed">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {risks.map((r, i) => (
          <div
            key={i}
            className="card border-neg/40 bg-neg/5 p-3 flex gap-2"
          >
            <AlertTriangle size={16} className="text-neg shrink-0 mt-0.5" />
            <div>
              <div className="text-2xs font-semibold text-neg">{r.title}</div>
              <div className="text-2xs text-muted mt-0.5 leading-relaxed">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-2xs font-semibold text-muted mb-2">关键变化卡片</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {KEY_CARDS.map((c) => (
            <KeyChangeCard key={c} code={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
 * 第二屏 · 全球宏观仪表盘（地区 × 维度）
 * =================================================================== */

function IdleRealReturnsSection() {
  return (
    <section className="space-y-3">
      <SectionLabel>研究焦点 · 空转收益 vs 实体收益分配</SectionLabel>
      <EmptyRealReturnsChart />
    </section>
  );
}

function GlobalMacroDashboard() {
  // 中国 + 7 个非中国经济体，统一用与中国同款的 MacroResearchChart（走势一览 + 预期差）
  const economies: {
    code: string;
    name: string;
    title: string;
    period: string;
    isMock: boolean;
    sourceLabel: string;
    indicators: ChinaMacroPoint[];
  }[] = [
    {
      code: "CN",
      name: "中国",
      title: "中国主要经济数据",
      period: CHINA_MACRO_PERIOD,
      isMock: CHINA_MACRO_IS_MOCK,
      sourceLabel: CHINA_MACRO_SOURCE,
      indicators: CHINA_MACRO_MOCK,
    },
    ...INTL_MACRO_ECONOMIES.map((e) => ({
      code: e.code,
      name: e.name,
      title: `${e.name}主要经济数据`,
      period: INTL_MACRO_PERIOD,
      isMock: INTL_MACRO_IS_MOCK,
      sourceLabel: e.source,
      indicators: INTL_MACRO[e.code],
    })),
  ];

  return (
    <section className="space-y-3">
      <SectionLabel>证据层 · 全球宏观仪表盘（中国同款：主要经济数据走势一览 + 预期差）</SectionLabel>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {economies.map((eco) => (
          <MacroResearchChart
            key={eco.code}
            indicators={eco.indicators}
            title={eco.title}
            period={eco.period}
            isMock={eco.isMock}
            sourceLabel={eco.sourceLabel}
            cardTitle={eco.name}
          />
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
 * 各国流动性监测（8 国关键指标走势 + 正余弦/相位）
 * 复用 LiquidityTrendPhase，与 /money-market 同款；纯 SVG 规避静态导出崩溃。
 * =================================================================== */

function LiquidityMonitorSection() {
  const ctx = useResearchContext();
  const asOf = ctx.asOfDate ?? "2026-09-29";
  const matrix = React.useMemo(() => getLiquidityMatrix(asOf), [asOf]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionLabel>证据层 · 各国流动性监测（8 国关键指标走势 & 正余弦/相位）</SectionLabel>
        <StaticLink
          href="/money-market"
          className="text-2xs text-accent hover:underline"
        >
          查看完整货币市场页 →
        </StaticLink>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {matrix.map((eco) => (
          <Card key={eco.code}>
            <CardHead
              title={eco.name}
              subtitle={`${eco.currency} · ${eco.centralBank}`}
              right={<Badge tone="mock">Mock</Badge>}
            />
            <div className="p-3">
              <LiquidityTrendPhase eco={eco} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
 * 第三屏 · 图表区
 * =================================================================== */

function YieldCurveCard() {
  const data = (() => {
    const tenors = buildCurve(1.5, 2.15).map((d) => d.tenor);
    return tenors.map((t, i) => {
      const row: Record<string, string | number> = { tenor: t };
      YIELD_CURVE_REGIONS.forEach((r) => {
        const c = buildCurve(
          getIndicator(r.short)!.value,
          getIndicator(r.tenY)!.value,
          r.twoY ? getIndicator(r.twoY)!.value : undefined,
        );
        row[r.region] = c[i].yield;
      });
      return row;
    });
  })();

  return (
    <Card>
      <CardHead
        title="收益率曲线"
        subtitle="Mock 形状，期限 1D→30Y（短端锚定政策/隔夜利率，10Y 严格对齐注册值）"
      />
      <div className="p-3">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="tenor"
              tick={{ fontSize: 9, fill: "rgb(var(--text-muted))" }}
              stroke="rgb(var(--border))"
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
              width={42}
              stroke="rgb(var(--border))"
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip {...ttStyle()} />
            {YIELD_CURVE_REGIONS.map((r) => (
              <Line
                key={r.region}
                type="monotone"
                dataKey={r.region}
                name={r.label}
                stroke={REGION_COLORS[r.region]}
                strokeWidth={1.4}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-1 flex-wrap">
          {YIELD_CURVE_REGIONS.map((r) => (
            <span key={r.region} className="text-2xs flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: REGION_COLORS[r.region] }}
              />
              {r.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SpreadMatrixCard() {
  const ccy = ["US", "EU", "JP", "CN", "HK", "GB", "AU"];
  const y10: Record<string, number> = {};
  const map: Record<string, string> = {
    US: "US_10Y",
    EU: "EU_10Y",
    JP: "JP_10Y",
    CN: "CN_10Y",
    HK: "HK_10Y",
    GB: "GB_10Y",
    AU: "AU_10Y",
  };
  ccy.forEach((c) => (y10[c] = getIndicator(map[c])!.value));

  let maxAbs = 0;
  const m: Record<string, Record<string, number>> = {};
  ccy.forEach((a) => {
    m[a] = {};
    ccy.forEach((b) => {
      const v = (y10[a] - y10[b]) * 100;
      m[a][b] = Math.round(v * 10) / 10;
      if (a !== b) maxAbs = Math.max(maxAbs, Math.abs(v));
    });
  });

  return (
    <Card>
      <CardHead title="利差矩阵" subtitle="10Y 收益率之差（bp，行 − 列）" />
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse">
          <thead>
            <tr className="text-muted">
              <th className="text-left px-2 py-1.5 font-medium sticky left-0 bg-panel">—</th>
              {ccy.map((c) => (
                <th key={c} className="px-2 py-1.5 font-medium text-center">
                  {REGION_LABELS[c as Region]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ccy.map((a) => (
              <tr key={a}>
                <td className="px-2 py-1.5 font-semibold text-left sticky left-0 bg-panel">
                  {REGION_LABELS[a as Region]}
                </td>
                {ccy.map((b) => {
                  const v = m[a][b];
                  const bg = a === b ? "rgb(var(--panel-2))" : divergeColor(v, maxAbs, "220,38,38", "5,150,105");
                  return (
                    <td
                      key={b}
                      className="px-2 py-1.5 text-center"
                      style={{ background: bg }}
                    >
                      {a === b ? "—" : v.toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-2xs text-muted mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(220,38,38,0.5)" }} />
            行利率更高
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(5,150,105,0.5)" }} />
            列利率更高
          </span>
        </div>
      </div>
    </Card>
  );
}

function FxHeatmapCard() {
  const ctx = useResearchContext();
  const { currencies, matrix } = fxMatrix(ctx.timeWindow as TW);
  let maxAbs = 0;
  currencies.forEach((a) =>
    currencies.forEach((b) => {
      if (a !== b) maxAbs = Math.max(maxAbs, Math.abs(matrix[a][b]));
    }),
  );

  return (
    <Card>
      <CardHead title="外汇热力图" subtitle={`跨币种周变动 %（${ctx.timeWindow} 窗口 · Mock 序列）`} />
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse">
          <thead>
            <tr className="text-muted">
              <th className="text-left px-2 py-1.5 font-medium sticky left-0 bg-panel">↑升值 / ↓贬值</th>
              {currencies.map((c) => (
                <th key={c} className="px-2 py-1.5 font-medium text-center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currencies.map((a) => (
              <tr key={a}>
                <td className="px-2 py-1.5 font-semibold text-left sticky left-0 bg-panel">{a}</td>
                {currencies.map((b) => {
                  const v = matrix[a][b];
                  const bg =
                    a === b
                      ? "rgb(var(--panel-2))"
                      : divergeColor(v, maxAbs, "5,150,105", "220,38,38");
                  return (
                    <td
                      key={b}
                      className="px-2 py-1.5 text-center"
                      style={{ background: bg, color: "rgb(var(--text))" }}
                    >
                      {a === b ? "—" : v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-2xs text-muted mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(5,150,105,0.5)" }} />
            绿=升值
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(220,38,38,0.5)" }} />
            红=贬值
          </span>
        </div>
      </div>
    </Card>
  );
}

function LiquidityTsCard() {
  const ctx = useResearchContext();
  const tw = ctx.timeWindow as TW;
  const series4 = [
    { code: "US_SOFR", key: "SOFR", name: "SOFR", color: REGION_COLORS.US },
    { code: "US_EFFR", key: "EFFR", name: "EFFR", color: "#7C3AED" },
    { code: "CN_DR007", key: "DR007", name: "DR007", color: REGION_COLORS.CN },
    { code: "CN_SHIBOR_3M", key: "SHIBOR3M", name: "Shibor3M", color: REGION_COLORS.JP },
  ];
  const slices = series4.map((s) => realWindowSlice(s.code, tw));
  const len = slices[0]?.length ?? 0;
  const data = Array.from({ length: len }, (_, i) => {
    const row: Record<string, string | number> = { date: slices[0][i]?.date ?? "" };
    series4.forEach((s, k) => {
      const sl = slices[k];
      row[s.key] = sl[i]?.v ?? null;
    });
    return row;
  });
  const allReal = series4.every((s) => isReal(s.code));

  return (
    <Card>
      <CardHead
        title="流动性时间序列"
        subtitle={`隔夜/短端利率 · ${tw} 窗口 · ${allReal ? "真实序列（FRED / CFETS）" : "混合序列"}`}
      />
      <div className="p-3">
        <TimeSeriesChart
          data={data}
          series={series4.map((s) => ({ key: s.key, name: s.name, color: s.color }))}
          height={240}
          unit="%"
        />
      </div>
    </Card>
  );
}

function ChartsLayer() {
  return (
    <section className="space-y-3">
      <SectionLabel>证据层 · 图表区（跨市场利率 / 利差 / 外汇 / 流动性）</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <YieldCurveCard />
        <SpreadMatrixCard />
        <FxHeatmapCard />
        <LiquidityTsCard />
      </div>
    </section>
  );
}

/* ===================================================================
 * 第四屏 · 明细层（事件 / 笔记 / 关注清单 / 核心指标表）
 * =================================================================== */

function EventsCard() {
  return (
    <Card>
      <CardHead title="事件日历" subtitle="未来宏观事件（Mock）" />
      <div className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
        {EVENTS.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-2xs border-b border-border/60 pb-1.5">
            <CalendarDays size={13} className="text-accent shrink-0" />
            <span className="tnum text-muted w-20 shrink-0">{e.date}</span>
            <span className="font-medium text-content flex-1">{e.title}</span>
            <span
              className={cn(
                "chip shrink-0",
                e.importance === "高"
                  ? "bg-neg/10 text-neg"
                  : e.importance === "中"
                    ? "bg-warn/10 text-warn"
                    : "bg-panel-2 text-muted",
              )}
            >
              {e.importance}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotesCard() {
  const { notes, addNote } = useResearchData();
  const [text, setText] = React.useState("");
  const [ccy, setCcy] = React.useState("CN");
  return (
    <Card>
      <CardHead title="研究笔记" subtitle={`${notes.length} 条`} />
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <select
            value={ccy}
            onChange={(e) => setCcy(e.target.value)}
            className="text-2xs border border-border rounded px-1.5 py-1 bg-panel text-content"
          >
            {(["CN", "US", "EU", "JP", "GLOBAL"] as const).map((c) => (
              <option key={c} value={c}>
                {REGION_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="记录你的研究判断…"
            className="flex-1 text-2xs border border-border rounded px-2 py-1 bg-panel text-content placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <Button
            size="xs"
            variant="primary"
            onClick={() => {
              if (text.trim()) {
                addNote(ccy, text.trim());
                setText("");
              }
            }}
          >
            添加
          </Button>
        </div>
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-2xs text-muted py-4 text-center border border-dashed border-border rounded">
              暂无笔记，上面添加一条
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="text-2xs border border-border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="chip bg-accent/10 text-accent">{REGION_LABELS[n.currency as Region] ?? n.currency}</span>
                  <span className="text-muted tnum">{fmtDate(n.createdAt)}</span>
                </div>
                <div className="text-content leading-relaxed">{n.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function WatchlistCard() {
  const { watchlist, toggleWatch } = useResearchData();
  return (
    <Card>
      <CardHead title="关注清单" subtitle={`${watchlist.length} 个指标`} />
      <div className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
        {watchlist.map((code) => {
          const ind = resolveIndicator(code) ?? getIndicator(code);
          if (!ind) return null;
          const dm = dirMeta(ind.direction);
          return (
            <div key={code} className="flex items-center gap-2 text-2xs border-b border-border/60 pb-1.5">
              <button
                onClick={() => toggleWatch(code)}
                title="移除关注"
                className="text-warn hover:opacity-70 shrink-0"
              >
                <Star size={13} />
              </button>
              <span className="flex-1 truncate">
                <StaticLink href={`/data-dictionary?q=${encodeURIComponent(code)}`} className="hover:underline">
                  {ind.name}
                </StaticLink>
              </span>
              {!ind.is_mock && <Badge tone="pos">真实</Badge>}
              <span className="tnum font-semibold">{fmtNum(ind.value, 2)}</span>
              <span className={cn("tnum font-medium w-16 text-right", dm.cls)}>{fmtChange(ind)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ----------------------------- 核心指标明细表（冻结表头/首列） ----------------------------- */

type SortKey = "name" | "region" | "category" | "value" | "change" | "percentile";

function CoreIndicatorTable() {
  const [query, setQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("category");
  const [asc, setAsc] = React.useState(true);

  const rows = React.useMemo(() => {
    let list = INDICATORS.map((i) => resolveIndicator(i.code) ?? i).filter((i) =>
      showAll ? true : i.core,
    );
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          REGION_LABELS[i.region].toLowerCase().includes(q),
      );
    }
    const dir = asc ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortKey] as string | number;
      let bv: string | number = b[sortKey] as string | number;
      if (typeof av === "string") return (av as string).localeCompare(bv as string) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return list;
  }, [query, showAll, sortKey, asc]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };

  const sortIcon = (k: SortKey) => (sortKey === k ? (asc ? " ▲" : " ▼") : "");

  return (
    <Card>
      <CardHead
        title="核心指标明细"
        subtitle="冻结表头/首列 · 可排序/搜索 · 默认仅核心指标"
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索指标…"
                className="pl-6 pr-2 py-1 text-2xs border border-border rounded bg-panel text-content placeholder:text-muted focus:outline-none focus:border-accent w-32"
              />
            </div>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-2xs text-accent hover:underline"
            >
              {showAll ? "仅核心" : "全部"}
            </button>
          </div>
        }
      />
      <div className="p-0 overflow-x-auto max-h-[460px]">
        <table className="w-full text-2xs tnum border-collapse">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="text-muted border-b border-border">
              <th
                className="text-left px-3 py-2 font-medium sticky left-0 bg-panel cursor-pointer whitespace-nowrap"
                onClick={() => onSort("name")}
              >
                指标{sortIcon("name")}
              </th>
              <th className="text-left px-3 py-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => onSort("region")}>
                地区{sortIcon("region")}
              </th>
              <th className="text-left px-3 py-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => onSort("category")}>
                维度{sortIcon("category")}
              </th>
              <th className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => onSort("value")}>
                当前值{sortIcon("value")}
              </th>
              <th className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => onSort("change")}>
                变化{sortIcon("change")}
              </th>
              <th className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap" onClick={() => onSort("percentile")}>
                分位{sortIcon("percentile")}
              </th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">频率/来源</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const dm = dirMeta(i.direction);
              return (
                <tr key={i.code} className="border-b border-border/50 hover:bg-panel-2/50">
                  <td className="text-left px-3 py-1.5 sticky left-0 bg-panel whitespace-nowrap">
                    <StaticLink
                      href={`/data-dictionary?q=${encodeURIComponent(i.code)}`}
                      className="hover:underline text-content"
                    >
                      {i.name}
                    </StaticLink>
                    <span className="text-muted ml-1">{i.code}</span>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{REGION_LABELS[i.region]}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{CATEGORY_LABELS[i.category]}</td>
                  <td className="text-right px-3 py-1.5 font-semibold whitespace-nowrap">
                    {fmtNum(i.value, 2)} {i.unit}
                  </td>
                  <td className={cn("text-right px-3 py-1.5 whitespace-nowrap font-medium", dm.cls)}>
                    {dm.arrow} {fmtChange(i)}
                  </td>
                  <td className="text-right px-3 py-1.5 whitespace-nowrap">
                    {isNaN(i.percentile) ? "模型推导" : `${i.percentile}%`}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-muted">
                    {i.frequency} · {i.source}
                    {!i.is_mock && <Badge tone="pos">真实</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DetailLayer() {
  return (
    <section className="space-y-3">
      <SectionLabel>明细层 · 事件 / 笔记 / 关注清单 / 指标明细</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <EventsCard />
        <NotesCard />
        <WatchlistCard />
      </div>
      <CoreIndicatorTable />
    </section>
  );
}

/* ----------------------------- 导出 ----------------------------- */

/* ===================================================================
 * 首页枢纽 · 模块入口网格（首页瘦身：点击进入各研究子页）
 * =================================================================== */

type ModuleEntry = { href: string; title: string; desc: string; icon: React.ElementType };

const MODULES: ModuleEntry[] = [
  { href: "/china/today", title: "中国流动性·今日概览", desc: "Wind Alice 生成的货币总结 · 真实数据", icon: Sparkles },
  { href: "/china/stocks", title: "中国股市·龙虎榜", desc: "真实龙虎榜净买卖 + 资金流 3D", icon: TrendingUp },
  { href: "/china/futures", title: "中国期货·板块强弱", desc: "65 品种 3D 地形 + 板块强弱", icon: Layers },
  { href: "/macro-global", title: "全球宏观总览", desc: "中国 + 7 国 · 走势一览 + 预期差", icon: TrendingUp },
  { href: "/liquidity-grid", title: "各国流动性监测", desc: "8 国 · 指标走势 + 正余弦/相位", icon: Waves },
  { href: "/yield-curve", title: "收益率曲线", desc: "13 期限 · 7 国 · 牛陡熊平", icon: LineChartIcon },
  { href: "/china/idle-vs-real", title: "空转 vs 实体收益", desc: "空转与实体收益对比图", icon: ArrowRight },
  { href: "/charts", title: "图表中心", desc: "利差矩阵 / 外汇热力 / 流动性序列", icon: BarChart3 },
];

function ModuleGrid() {
  return (
    <section className="space-y-3">
      <SectionLabel>模块入口 · 点击进入各研究子页</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <StaticLink
              key={m.href}
              href={m.href}
              className="card p-4 flex flex-col gap-2 hover:border-accent transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-accent/10 text-accent">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-semibold text-content">{m.title}</span>
                <ArrowRight
                  size={14}
                  className="ml-auto text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                />
              </div>
              <div className="text-2xs text-muted leading-relaxed">{m.desc}</div>
            </StaticLink>
          );
        })}
      </div>
    </section>
  );
}

export { ConclusionLayer, GlobalMacroDashboard, IdleRealReturnsSection, LiquidityMonitorSection, ChartsLayer, DetailLayer, ModuleGrid };
