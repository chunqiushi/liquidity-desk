"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Copy,
  ChevronDown,
  Search,
  Download,
  CalendarDays,
  Star,
} from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHead, Badge, SectionLabel, Button } from "@/components/ui";
export { SectionLabel };
import { TimeSeriesChart, MiniSpark } from "@/components/charts";
import { cn, fmtNum, fmtDate } from "@/lib/utils";
import { useResearchContext, useResearchData } from "@/lib/store";
import {
  INDICATORS,
  getIndicator,
  REGION_LABELS,
  CATEGORY_LABELS,
  DEFAULT_REGIONS,
  OPTIONAL_REGIONS,
  indicatorsToCSV,
  downloadCSV,
  type Indicator,
  type Region,
  type Category,
} from "@/lib/indicators";
import {
  windowSlice,
  windowValues,
  getSeries,
  fxMatrix,
  buildCurve,
  YIELD_CURVE_REGIONS,
  type TW,
} from "@/lib/mock-series";
import { EVENTS } from "@/lib/home-data";

/* ----------------------------- 通用格式化 ----------------------------- */

export function changeUnit(u: string): string {
  if (u === "%") return "pp";
  if (u === "pp") return "pp";
  if (u === "bp") return "bp";
  if (u === "level") return "";
  if (u === "十亿USD") return "十亿";
  if (u === "千人") return "千人";
  return u;
}

export function fmtChange(ind: Indicator): string {
  const u = changeUnit(ind.unit);
  const s = ind.change >= 0 ? "+" : "";
  return `${s}${ind.change.toFixed(2)}${u ? " " + u : ""}`;
}

export function dirMeta(d: Indicator["direction"]): { cls: string; arrow: string } {
  if (d === "up") return { cls: "text-neg", arrow: "▲" }; // 红涨
  if (d === "down") return { cls: "text-pos", arrow: "▼" }; // 绿跌
  return { cls: "text-muted", arrow: "■" };
}

export function dirColor(d: Indicator["direction"]): string {
  if (d === "up") return "rgb(var(--neg))";
  if (d === "down") return "rgb(var(--pos))";
  return "rgb(var(--text-muted))";
}

export function ttStyle() {
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

export function MockBadge() {
  return <Badge tone="mock">MOCK</Badge>;
}

export const REGION_COLORS: Record<string, string> = {
  CN: "#1F4E79",
  US: "#DC2626",
  EU: "#059669",
  JP: "#F59E0B",
  HK: "#7C3AED",
  CH: "#0EA5E9",
  GB: "#DB2777",
  AU: "#65A30D",
};

export function divergeColor(
  v: number,
  maxAbs: number,
  pos: string,
  neg: string,
): string {
  if (maxAbs <= 0) return "transparent";
  const a = Math.min(0.62, (Math.abs(v) / maxAbs) * 0.62);
  return v >= 0 ? `rgba(${pos},${a.toFixed(3)})` : `rgba(${neg},${a.toFixed(3)})`;
}

/* ===================================================================
 * 页面头部：研究问题 + 标题 + MOCK 标识 + 导出
 * =================================================================== */

export function PageHeader({
  question,
  title,
  subtitle,
  onExport,
  exportLabel = "导出 CSV",
}: {
  question: string;
  title: string;
  subtitle?: string;
  onExport?: () => void;
  exportLabel?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xs text-accent font-medium mb-1 flex items-center gap-1">
            研究问题
            <span className="text-muted">·</span>
            <span className="text-muted font-normal">本页回答</span>
          </div>
          <h1 className="text-xl font-bold text-content leading-snug">{title}</h1>
          {subtitle ? (
            <div className="text-2xs text-muted mt-1">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <MockBadge />
          {onExport ? (
            <Button size="xs" variant="ghost" onClick={onExport}>
              <Download size={12} /> {exportLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 card bg-accent/5 border-accent/30 p-2.5 text-2xs text-content leading-relaxed">
        {question}
      </div>
    </div>
  );
}

/* ===================================================================
 * 结论层：结论卡片 + 风险提示
 * =================================================================== */

export function ConclusionBlock({
  title = "结论层 · 今日结论",
  items,
}: {
  title?: string;
  items: { title: string; points: string[] }[];
}) {
  return (
    <section className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {items.map((c, i) => (
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
    </section>
  );
}

export function RiskBlock({ items }: { items: { title: string; detail: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <SectionLabel>风险提示</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((r, i) => (
          <div key={i} className="card border-neg/40 bg-neg/5 p-3 flex gap-2">
            <AlertTriangle size={16} className="text-neg shrink-0 mt-0.5" />
            <div>
              <div className="text-2xs font-semibold text-neg">{r.title}</div>
              <div className="text-2xs text-muted mt-0.5 leading-relaxed">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
 * 图表卡片 wrapper
 * =================================================================== */

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHead title={title} subtitle={subtitle} right={right} />
      <div className="p-3">{children}</div>
    </Card>
  );
}

/* ===================================================================
 * 收益率曲线（多地区，锚定注册 10Y / 2Y / 政策利率）
 * =================================================================== */

export function YieldCurveChart() {
  const tenors = buildCurve(1.5, 2.15).map((d) => d.tenor);
  const data = tenors.map((t, i) => {
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

  return (
    <ChartCard title="收益率曲线" subtitle="Mock 形状，锚定注册 10Y / 2Y / 政策利率">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="tenor"
            tick={{ fontSize: 10, fill: "rgb(var(--text-muted))" }}
            stroke="rgb(var(--border))"
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
              strokeWidth={1.6}
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
    </ChartCard>
  );
}

/* ===================================================================
 * 10Y 利差矩阵（行 − 列，bp）
 * =================================================================== */

export function SpreadMatrix({ caption = "10Y 收益率之差（bp，行 − 列）" }: { caption?: string }) {
  const ccy = ["US", "EU", "JP", "CN", "HK", "GB", "AU"];
  const map: Record<string, string> = {
    US: "US_10Y",
    EU: "EU_10Y",
    JP: "JP_10Y",
    CN: "CN_10Y",
    HK: "HK_10Y",
    GB: "GB_10Y",
    AU: "AU_10Y",
  };
  const y10: Record<string, number> = {};
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
    <ChartCard title="利差矩阵" subtitle={caption}>
      <div className="overflow-x-auto">
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
                  const bg =
                    a === b
                      ? "rgb(var(--panel-2))"
                      : divergeColor(v, maxAbs, "220,38,38", "5,150,105");
                  return (
                    <td key={b} className="px-2 py-1.5 text-center" style={{ background: bg }}>
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
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "rgba(220,38,38,0.5)" }}
            />
            行利率更高
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "rgba(5,150,105,0.5)" }}
            />
            列利率更高
          </span>
        </div>
      </div>
    </ChartCard>
  );
}

/* ===================================================================
 * 外汇热力图（跨币种 % 变化，窗口联动）
 * =================================================================== */

export function FxHeatmap() {
  const ctx = useResearchContext();
  const tw = ctx.timeWindow as TW;
  const { currencies, matrix } = fxMatrix(tw);
  let maxAbs = 0;
  currencies.forEach((a) =>
    currencies.forEach((b) => {
      if (a !== b) maxAbs = Math.max(maxAbs, Math.abs(matrix[a][b]));
    }),
  );

  return (
    <ChartCard
      title="外汇热力图"
      subtitle={`跨币种变动 %（${tw} 窗口 · Mock 序列）`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse">
          <thead>
            <tr className="text-muted">
              <th className="text-left px-2 py-1.5 font-medium sticky left-0 bg-panel">
                ↑升值 / ↓贬值
              </th>
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
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "rgba(5,150,105,0.5)" }}
            />
            绿=升值
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: "rgba(220,38,38,0.5)" }}
            />
            红=贬值
          </span>
        </div>
      </div>
    </ChartCard>
  );
}

/* ===================================================================
 * 流动性时间序列（隔夜利率，窗口联动）
 * =================================================================== */

export function LiquidityTs({
  codes = ["US_SOFR", "CN_DR007", "EU_ESTR", "JP_TONA"],
}: {
  codes?: string[];
}) {
  const ctx = useResearchContext();
  const tw = ctx.timeWindow as TW;
  const series4 = codes
    .map((code) => {
      const ind = getIndicator(code);
      if (!ind) return null;
      const reg = ind.region as keyof typeof REGION_COLORS;
      return {
        ind,
        key: code,
        name: ind.name,
        color: REGION_COLORS[reg] ?? "rgb(var(--accent))",
      };
    })
    .filter(Boolean) as { ind: Indicator; key: string; name: string; color: string }[];

  const slices = series4.map((s) => windowSlice(s.ind, tw));
  const len = slices[0]?.length ?? 0;
  const data = Array.from({ length: len }, (_, i) => {
    const row: Record<string, string | number> = { date: slices[0][i].date };
    series4.forEach((s, k) => (row[s.key] = slices[k][i].v));
    return row;
  });

  return (
    <ChartCard title="流动性时间序列" subtitle={`隔夜利率 · ${tw} 窗口（Mock 序列）`}>
      <TimeSeriesChart
        data={data}
        series={series4.map((s) => ({ key: s.key, name: s.name, color: s.color }))}
        height={240}
        unit="%"
      />
    </ChartCard>
  );
}

/* ===================================================================
 * 通用多指标趋势图（消费 getSeries，终点=注册值）
 * =================================================================== */

export function MultiTrendChart({
  codes,
  unit,
  title,
  subtitle,
  height = 260,
}: {
  codes: string[];
  unit?: string;
  title: string;
  subtitle?: string;
  height?: number;
}) {
  const defs = codes
    .map((code) => {
      const ind = getIndicator(code);
      if (!ind) return null;
      const reg = ind.region as keyof typeof REGION_COLORS;
      const color = REGION_COLORS[reg] ?? "rgb(var(--accent))";
      const series = getSeries(ind);
      return { ind, color, series };
    })
    .filter(Boolean) as {
    ind: Indicator;
    color: string;
    series: { date: string; v: number }[];
  }[];

  const len = defs[0]?.series.length ?? 0;
  const data = Array.from({ length: len }, (_, i) => {
    const row: Record<string, string | number> = { date: defs[0].series[i].date };
    defs.forEach((d, k) => (row[`s${k}`] = d.series[i].v));
    return row;
  });

  return (
    <ChartCard title={title} subtitle={subtitle ?? "Mock 序列，终点=注册值"}>
      <TimeSeriesChart
        data={data}
        series={defs.map((d, k) => ({ key: `s${k}`, name: d.ind.name, color: d.color }))}
        height={height}
        unit={unit}
      />
    </ChartCard>
  );
}

/* ===================================================================
 * 关键变化卡片（迷你走势 + 分位 + 链接）
 * =================================================================== */

export function KeyCard({ code }: { code: string }) {
  const ctx = useResearchContext();
  const ind = getIndicator(code);
  if (!ind) return null;
  const dm = dirMeta(ind.direction);
  const vals = windowValues(ind, ctx.timeWindow as TW);
  return (
    <Link
      href={`/data-dictionary?q=${encodeURIComponent(ind.code)}`}
      className="card p-3 flex flex-col gap-1 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs text-muted leading-tight line-clamp-2">{ind.name}</span>
        <MockBadge />
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
        分位 {ind.percentile}% · as_of {ind.as_of}
      </div>
    </Link>
  );
}

/* ===================================================================
 * 导出按钮
 * =================================================================== */

export function ExportButton({
  csv,
  filename,
  label = "导出 CSV",
}: {
  csv: string;
  filename: string;
  label?: string;
}) {
  return (
    <Button
      size="xs"
      variant="ghost"
      onClick={() => {
        if (typeof window !== "undefined") downloadCSV(filename, csv);
      }}
    >
      <Download size={12} /> {label}
    </Button>
  );
}

/* ===================================================================
 * 指标明细表：冻结表头/首列 · 分组表头 · 排序/搜索 · 行展开看 17 字段
 * =================================================================== */

type GroupKey = "none" | "region" | "category";
type SortKey = "name" | "region" | "category" | "value" | "change" | "percentile" | "zscore";

export function IndicatorTable({
  indicators,
  title = "指标明细",
  subtitle,
  groupBy = "none",
  defaultShowAll = false,
  showSearch = true,
}: {
  indicators: Indicator[];
  title?: string;
  subtitle?: string;
  groupBy?: GroupKey;
  defaultShowAll?: boolean;
  showSearch?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(defaultShowAll);
  const [sortKey, setSortKey] = React.useState<SortKey>("category");
  const [asc, setAsc] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const rows = React.useMemo(() => {
    let list = indicators.filter((i) => (showAll ? true : i.core ?? false));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          REGION_LABELS[i.region].toLowerCase().includes(q) ||
          (i.definition ?? "").toLowerCase().includes(q),
      );
    }
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (typeof av === "string") return (av as string).localeCompare(bv as string) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [indicators, query, showAll, sortKey, asc]);

  const groups = React.useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", items: rows }];
    const map = new Map<string, Indicator[]>();
    rows.forEach((i) => {
      const k = groupBy === "region" ? i.region : i.category;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return Array.from(map.entries())
      .map(([k, items]) => ({
        key: k,
        label: groupBy === "region" ? REGION_LABELS[k as Region] : CATEGORY_LABELS[k as Category],
        items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, groupBy]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };
  const sortIcon = (k: SortKey) => (sortKey === k ? (asc ? " ▲" : " ▼") : "");

  const csv = indicatorsToCSV(rows);

  return (
    <Card>
      <CardHead
        title={title}
        subtitle={subtitle ?? "冻结表头/首列 · 可排序/搜索 · 默认仅核心指标 · 点击行展开字段"}
        right={
          <div className="flex items-center gap-2">
            {showSearch ? (
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索指标…"
                  className="pl-6 pr-2 py-1 text-2xs border border-border rounded bg-panel text-content placeholder:text-muted focus:outline-none focus:border-accent w-32"
                />
              </div>
            ) : null}
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-2xs text-accent hover:underline"
            >
              {showAll ? "仅核心" : "全部"}
            </button>
            <ExportButton csv={csv} filename={`${title}.csv`} />
          </div>
        }
      />
      <div className="p-0 overflow-x-auto max-h-[520px]">
        <table className="w-full text-2xs tnum border-collapse">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="text-muted border-b border-border">
              <th
                className="text-left px-3 py-2 font-medium sticky left-0 bg-panel cursor-pointer whitespace-nowrap"
                onClick={() => onSort("name")}
              >
                指标{sortIcon("name")}
              </th>
              {groupBy === "region" ? null : (
                <th
                  className="text-left px-3 py-2 font-medium cursor-pointer whitespace-nowrap"
                  onClick={() => onSort("region")}
                >
                  地区{sortIcon("region")}
                </th>
              )}
              {groupBy === "category" ? null : (
                <th
                  className="text-left px-3 py-2 font-medium cursor-pointer whitespace-nowrap"
                  onClick={() => onSort("category")}
                >
                  维度{sortIcon("category")}
                </th>
              )}
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap"
                onClick={() => onSort("value")}
              >
                当前值{sortIcon("value")}
              </th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap"
                onClick={() => onSort("change")}
              >
                变化{sortIcon("change")}
              </th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer whitespace-nowrap"
                onClick={() => onSort("percentile")}
              >
                分位{sortIcon("percentile")}
              </th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">频率/来源</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <React.Fragment key={g.key}>
                {g.label ? (
                  <tr className="bg-panel-2/60">
                    <td
                      colSpan={groupBy === "region" ? 6 : groupBy === "category" ? 6 : 7}
                      className="px-3 py-1.5 text-2xs font-semibold text-accent sticky left-0 bg-panel-2/60"
                    >
                      {g.label}
                      <span className="text-muted font-normal ml-1">· {g.items.length}</span>
                    </td>
                  </tr>
                ) : null}
                {g.items.map((i) => {
                  const dm = dirMeta(i.direction);
                  const isOpen = expanded === i.code;
                  return (
                    <React.Fragment key={i.code}>
                      <tr
                        className="border-b border-border/50 hover:bg-panel-2/50 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : i.code)}
                      >
                        <td className="text-left px-3 py-1.5 sticky left-0 bg-panel whitespace-nowrap">
                          <Link
                            href={`/data-dictionary?q=${encodeURIComponent(i.code)}`}
                            className="hover:underline text-content"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {i.name}
                          </Link>
                          <span className="text-muted ml-1">{i.code}</span>
                          <ChevronDown
                            size={11}
                            className={cn(
                              "inline ml-1 text-muted transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </td>
                        {groupBy === "region" ? null : (
                          <td className="px-3 py-1.5 whitespace-nowrap">{REGION_LABELS[i.region]}</td>
                        )}
                        {groupBy === "category" ? null : (
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            {CATEGORY_LABELS[i.category]}
                          </td>
                        )}
                        <td className="text-right px-3 py-1.5 font-semibold whitespace-nowrap">
                          {fmtNum(i.value, 2)} {i.unit}
                        </td>
                        <td
                          className={cn(
                            "text-right px-3 py-1.5 whitespace-nowrap font-medium",
                            dm.cls,
                          )}
                        >
                          {dm.arrow} {fmtChange(i)}
                        </td>
                        <td className="text-right px-3 py-1.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded",
                              i.percentile >= 75
                                ? "bg-neg/10 text-neg"
                                : i.percentile <= 25
                                  ? "bg-pos/10 text-pos"
                                  : "bg-panel-2 text-muted",
                            )}
                          >
                            {i.percentile}%
                          </span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted">
                          {i.frequency} · {i.source}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-border/50 bg-panel-2/30">
                          <td colSpan={7} className="px-3 py-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-2xs">
                              <Field k="code" v={i.code} />
                              <Field k="region" v={REGION_LABELS[i.region]} />
                              <Field k="category" v={CATEGORY_LABELS[i.category]} />
                              <Field k="value" v={`${i.value} ${i.unit}`} />
                              <Field k="previous" v={`${i.previous} ${i.unit}`} />
                              <Field k="change" v={fmtChange(i)} />
                              <Field k="frequency" v={i.frequency} />
                              <Field k="as_of" v={i.as_of} />
                              <Field k="source" v={i.source} />
                              <Field k="is_mock" v={String(i.is_mock)} />
                              <Field k="percentile" v={`${i.percentile}%`} />
                              <Field k="zscore" v={i.zscore.toFixed(2)} />
                              <Field k="direction" v={i.direction} />
                              <Field
                                k="affected_assets"
                                v={i.affected_assets.join(" / ")}
                                span={2}
                              />
                              <Field k="definition" v={i.definition} span={3} />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Field({ k, v, span }: { k: string; v: string; span?: number }) {
  return (
    <div className={cn("flex gap-1", span === 2 && "col-span-2", span === 3 && "col-span-3")}>
      <span className="text-muted shrink-0">{k}:</span>
      <span className="text-content">{v}</span>
    </div>
  );
}

/* ===================================================================
 * 事件日历列表（复用 EVENTS）
 * =================================================================== */

export function EventsList({ title = "事件日历", subtitle = "未来宏观事件（Mock）" }: { title?: string; subtitle?: string }) {
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle} />
      <div className="p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
        {EVENTS.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-2xs border-b border-border/60 pb-1.5"
          >
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

/* ===================================================================
 * 研究笔记面板（持久化增删）
 * =================================================================== */

export function NotesPanel({ title = "研究笔记", subtitle }: { title?: string; subtitle?: string }) {
  const { notes, addNote } = useResearchData();
  const [text, setText] = React.useState("");
  const [ccy, setCcy] = React.useState("CN");
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle ?? `${notes.length} 条 · 本地持久化`} />
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
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-2xs text-muted py-4 text-center border border-dashed border-border rounded">
              暂无笔记，上面添加一条
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="text-2xs border border-border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="chip bg-accent/10 text-accent">
                    {REGION_LABELS[n.currency as Region] ?? n.currency}
                  </span>
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

/* ===================================================================
 * 关注清单面板（持久化移除）
 * =================================================================== */

export function WatchlistPanel({ title = "关注清单", subtitle }: { title?: string; subtitle?: string }) {
  const { watchlist, toggleWatch } = useResearchData();
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle ?? `${watchlist.length} 个指标`} />
      <div className="p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
        {watchlist.map((code) => {
          const ind = getIndicator(code);
          if (!ind) return null;
          const dm = dirMeta(ind.direction);
          return (
            <div
              key={code}
              className="flex items-center gap-2 text-2xs border-b border-border/60 pb-1.5"
            >
              <button
                onClick={() => toggleWatch(code)}
                title="移除关注"
                className="text-warn hover:opacity-70 shrink-0"
              >
                <Star size={13} />
              </button>
              <span className="flex-1 truncate">
                <Link
                  href={`/data-dictionary?q=${encodeURIComponent(code)}`}
                  className="hover:underline"
                >
                  {ind.name}
                </Link>
              </span>
              <span className="tnum font-semibold">{fmtNum(ind.value, 2)}</span>
              <span className={cn("tnum font-medium w-16 text-right", dm.cls)}>{fmtChange(ind)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ===================================================================
 * 地区筛选（默认 CN/US/EU/JP，可展开其他）
 * =================================================================== */

export function useRegions(): [Region[], () => void] {
  const [showMore, setShowMore] = React.useState(false);
  const regions = showMore
    ? [...DEFAULT_REGIONS, ...OPTIONAL_REGIONS]
    : DEFAULT_REGIONS;
  return [regions, () => setShowMore((v) => !v)];
}
