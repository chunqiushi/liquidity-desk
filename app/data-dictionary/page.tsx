"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Minus, Download, Search } from "lucide-react";
import {
  INDICATORS,
  REGION_LABELS,
  CATEGORY_LABELS,
  indicatorsToCSV,
  downloadCSV,
  type Indicator,
  type Region,
  type Category,
  type Direction,
} from "@/lib/indicators";
import { cn } from "@/lib/utils";

const REGION_ORDER = Object.keys(REGION_LABELS) as Region[];
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as Category[];

const SCHEMA_FIELDS: { key: string; desc: string }[] = [
  { key: "code / name", desc: "指标代码 / 中文名称" },
  { key: "region / category", desc: "地区 / 维度（增长·通胀·政策·流动性·利率·外汇·融资·风险）" },
  { key: "value / previous", desc: "当前值 / 对照期值" },
  { key: "change", desc: "变化 = value − previous（随顶部时间窗口 1D/1W/1M 口径）" },
  { key: "unit", desc: "单位：% / bp / pp / level / 千人 / 十亿USD" },
  { key: "frequency", desc: "频率：日 / 周 / 月 / 季 / 年" },
  { key: "as_of", desc: "数据截止日（YYYY-MM-DD）" },
  { key: "source", desc: "数据来源（含 Mock 标注）" },
  { key: "is_mock", desc: "是否为 Mock 数据（本项目全部为 true）" },
  { key: "percentile", desc: "当前值的历史分位（0–100）" },
  { key: "zscore", desc: "标准化 Z 分数" },
  { key: "direction", desc: "相对 previous 的方向（up / down / flat）" },
  { key: "affected_assets", desc: "受影响资产" },
  { key: "definition", desc: "指标定义" },
];

type SortKey = "code" | "name" | "region" | "category" | "value" | "change" | "percentile" | "as_of";

function fmtValue(i: Indicator): string {
  if (i.unit === "level") return i.value.toFixed(i.value >= 100 ? 1 : 3);
  if (i.unit === "bp" || i.unit === "千人" || i.unit === "十亿USD") return `${i.value.toFixed(0)} ${i.unit}`;
  return `${i.value.toFixed(2)}${i.unit === "%" || i.unit === "pp" ? i.unit : " " + i.unit}`;
}

function fmtChange(i: Indicator): string {
  const sign = i.change > 0 ? "+" : "";
  if (i.unit === "bp" || i.unit === "千人" || i.unit === "十亿USD") return `${sign}${i.change.toFixed(0)} ${i.unit}`;
  if (i.unit === "level") return `${sign}${i.change.toFixed(i.value >= 100 ? 1 : 3)}`;
  return `${sign}${i.change.toFixed(2)}${i.unit === "%" ? "pp" : i.unit}`;
}

const DIR_ICON: Record<Direction, React.ElementType> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};
const DIR_COLOR: Record<Direction, string> = {
  up: "text-pos",
  down: "text-neg",
  flat: "text-muted",
};

export default function DataDictionaryPage() {
  const [query, setQuery] = React.useState("");
  const [region, setRegion] = React.useState<string>("ALL");
  const [category, setCategory] = React.useState<string>("ALL");
  const [coreOnly, setCoreOnly] = React.useState(false);
  const [groupMode, setGroupMode] = React.useState<"region" | "category">("region");
  const [sortKey, setSortKey] = React.useState<SortKey>("region");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // 支持从全局栏搜索跳转 ?q=...
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = p.get("q");
    if (q) setQuery(q);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDICATORS.filter((i) => {
      if (region !== "ALL" && i.region !== region) return false;
      if (category !== "ALL" && i.category !== category) return false;
      if (coreOnly && !i.core) return false;
      if (q && !(`${i.code} ${i.name} ${i.definition}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, region, category, coreOnly]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = a[sortKey] as string | number;
      let bv: string | number = b[sortKey] as string | number;
      if (sortKey === "value" || sortKey === "change" || sortKey === "percentile") {
        av = Number(av);
        bv = Number(bv);
      } else {
        av = String(av);
        bv = String(bv);
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const toggleExpand = (code: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  const exportCSV = () => downloadCSV(`data_dictionary_${region}_${category}.csv`, indicatorsToCSV(sorted));

  const coreCount = INDICATORS.filter((i) => i.core).length;

  return (
    <div className="space-y-6">
      {/* 概要 */}
      <div>
        <h1 className="text-xl font-semibold text-content">数据字典</h1>
        <p className="text-xs text-muted mt-1">
          统一指标 Schema（17 字段）· 共 {INDICATORS.length} 个指标，其中核心 {coreCount} 个 · 全部 is_mock = true
        </p>
      </div>

      {/* Schema 说明 */}
      <div className="card p-4">
        <div className="section-title mb-3">统一指标字段说明</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {SCHEMA_FIELDS.map((f) => (
            <div key={f.key} className="flex gap-2 text-xs">
              <span className="font-mono text-accent shrink-0 w-28">{f.key}</span>
              <span className="text-muted">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 控件 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索代码 / 名称 / 定义…"
            className="pl-7 pr-2 py-1.5 text-xs border border-border rounded-md bg-panel text-content placeholder:text-muted focus:outline-none focus:border-accent w-56"
          />
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-panel text-content"
        >
          <option value="ALL">全部地区</option>
          {REGION_ORDER.map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-panel text-content"
        >
          <option value="ALL">全部分类</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
          <input type="checkbox" checked={coreOnly} onChange={(e) => setCoreOnly(e.target.checked)} />
          仅核心指标
        </label>
        <select
          value={groupMode}
          onChange={(e) => setGroupMode(e.target.value as "region" | "category")}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-panel text-content"
        >
          <option value="region">按地区分组</option>
          <option value="category">按维度分组</option>
        </select>
        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted hover:text-content hover:bg-panel-2"
        >
          <Download size={13} /> 导出 CSV
        </button>
        <span className="text-2xs text-muted">显示 {sorted.length} / {INDICATORS.length}</span>
      </div>

      {/* 表格（冻结表头 + 按地区分组 + 排序） */}
      <div className="card overflow-hidden">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-panel-2">
              <tr className="text-left text-muted">
                <Th onClick={() => toggleSort("code")} active={sortKey === "code"}>代码</Th>
                <Th onClick={() => toggleSort("name")} active={sortKey === "name"}>指标</Th>
                <Th onClick={() => toggleSort("region")} active={sortKey === "region"}>地区</Th>
                <Th onClick={() => toggleSort("category")} active={sortKey === "category"}>维度</Th>
                <Th onClick={() => toggleSort("value")} active={sortKey === "value"} className="text-right">当前值</Th>
                <Th onClick={() => toggleSort("change")} active={sortKey === "change"} className="text-right">变化</Th>
                <Th onClick={() => toggleSort("percentile")} active={sortKey === "percentile"} className="text-right">分位</Th>
                <th className="px-2 py-2">方向</th>
                <Th onClick={() => toggleSort("as_of")} active={sortKey === "as_of"}>截止</Th>
              </tr>
            </thead>
            <tbody>
              {(groupMode === "region" ? REGION_ORDER : CATEGORY_ORDER).map((r) => {
                const rows = sorted.filter(
                  (i) => String(groupMode === "region" ? i.region : i.category) === String(r),
                );
                if (rows.length === 0) return null;
                const glabel =
                  groupMode === "region"
                    ? REGION_LABELS[r as Region]
                    : CATEGORY_LABELS[r as Category];
                return (
                  <React.Fragment key={r}>
                    <tr className="bg-accent/5">
                      <td colSpan={9} className="px-2 py-1 text-2xs font-semibold text-accent">
                        {glabel} · {r}
                      </td>
                    </tr>
                    {rows.map((i) => {
                      const open = expanded.has(i.code);
                      const Dir = DIR_ICON[i.direction];
                      return (
                        <React.Fragment key={i.code}>
                          <tr
                            onClick={() => toggleExpand(i.code)}
                            className="border-t border-border hover:bg-panel-2 cursor-pointer"
                          >
                            <td className="px-2 py-1.5 font-mono text-accent">{i.code}</td>
                            <td className="px-2 py-1.5 text-content">
                              {i.name}
                              {i.core && <span className="ml-1 text-[10px] text-warn">★</span>}
                            </td>
                            <td className="px-2 py-1.5 text-muted">{REGION_LABELS[i.region]}</td>
                            <td className="px-2 py-1.5 text-muted">{CATEGORY_LABELS[i.category]}</td>
                            <td className="px-2 py-1.5 text-right text-content tnum">{fmtValue(i)}</td>
                            <td className={cn("px-2 py-1.5 text-right tnum", DIR_COLOR[i.direction])}>
                              {fmtChange(i)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-muted tnum">{i.percentile}</td>
                            <td className="px-2 py-1.5">
                              <Dir size={13} className={DIR_COLOR[i.direction]} />
                            </td>
                            <td className="px-2 py-1.5 text-muted tnum">{i.as_of.slice(5)}</td>
                          </tr>
                          {open && (
                            <tr className="bg-panel-2/50">
                              <td colSpan={9} className="px-4 py-3 text-2xs text-muted space-y-1">
                                <div><span className="text-content font-medium">定义：</span>{i.definition}</div>
                                <div><span className="text-content font-medium">来源：</span>{i.source} · 频率 {i.frequency} · 单位 {i.unit} · is_mock {String(i.is_mock)} · zscore {i.zscore}</div>
                                <div><span className="text-content font-medium">受影响资产：</span>{i.affected_assets.join("、")}</div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-2 py-2 cursor-pointer select-none hover:text-content",
        active ? "text-accent" : "",
        className,
      )}
    >
      {children}
      {active && <span className="ml-0.5">▾</span>}
    </th>
  );
}
