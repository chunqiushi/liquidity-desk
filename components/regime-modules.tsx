"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { fmtNum, fmtPct, cn } from "@/lib/utils";
import {
  getRegimeMatrix,
  getMoneyMarket,
  getSofrPanel,
  getWhatChanged,
  Period,
  RegimeCell,
} from "@/lib/regime";
import { getFxMatrix, fxMatrixByGroup, FxPair, FxGroup } from "@/lib/fx";
import { useResearchContext } from "@/lib/store";

type RegimeRowLite = ReturnType<typeof getRegimeMatrix>[number];

/* ---------------- shared helpers ---------------- */
function fmtFx(v: number): string {
  if (Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 100) return v.toFixed(2);
  if (Math.abs(v) >= 10) return v.toFixed(3);
  return v.toFixed(4);
}

function fmtCellDelta(cell: RegimeCell): { text: string; cls: string } {
  const d = cell.delta;
  if (d === null) return { text: "—", cls: "text-muted" };
  const up = d >= 0;
  const cls = up ? "text-pos" : "text-neg";
  let text: string;
  if (cell.deltaMode === "bp") text = `${up ? "+" : ""}${(d * 100).toFixed(1)}bp`;
  else if (cell.deltaMode === "pp") text = `${up ? "+" : ""}${d.toFixed(1)}pp`;
  else text = fmtPct(d, 1);
  return { text, cls };
}

function DeltaChip({ value, isRate, pct }: { value: number | null; isRate?: boolean; pct?: boolean }) {
  if (value === null) return <span className="text-muted">—</span>;
  const up = value >= 0;
  const cls = up ? "text-pos" : "text-neg";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const txt = isRate ? `${up ? "+" : ""}${value.toFixed(1)}bp` : pct ? `${up ? "+" : ""}${value.toFixed(2)}%` : `${up ? "+" : ""}${value.toFixed(2)}`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tnum", cls)}>
      <Icon size={11} />
      {txt}
    </span>
  );
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: Period[] = ["1D", "1W", "1M"];
  return (
    <div className="inline-flex rounded border border-border overflow-hidden">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "text-2xs px-2 py-1 transition-colors",
            value === o ? "bg-accent text-accent-fg" : "bg-panel-2 text-muted hover:text-content",
          )}
        >
          {o === "1D" ? "1日" : o === "1W" ? "1周" : "1月"}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 1. Global Regime Matrix ---------------- */
export function RegimeMatrix() {
  const ctx = useResearchContext();
  const [period, setPeriod] = React.useState<Period>("1M");
  const rows = React.useMemo(() => getRegimeMatrix(ctx.asOfDate, period), [ctx.asOfDate, period]);

  const cols: { key: keyof Omit<RegimeRowLite, "eco" | "name" | "code" | "phase" | "phaseLabel">; label: string }[] = [
    { key: "growth", label: "增长" },
    { key: "inflation", label: "通胀" },
    { key: "policy", label: "政策" },
    { key: "liquidity", label: "流动性" },
    { key: "rates", label: "利率" },
    { key: "fx", label: "汇率" },
  ];

  return (
    <Card>
      <CardHead
        title="全球宏观态势"
        subtitle="各经济体当前状态与近期变化 · 1日/1周/1月可切换 · 全部为模型推导（Mock）"
        right={<PeriodToggle value={period} onChange={setPeriod} />}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">经济体</th>
              {cols.map((c) => (
                <th key={c.key} className="text-right px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th className="text-right px-3 py-2 font-medium">相位</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.eco} className="border-b border-border/60 hover:bg-panel-2 transition-colors">
                <td className="px-3 py-2 font-semibold">
                  <Link href={`/liquidity-cycle/${r.code}`} className="hover:underline">{r.name}</Link>
                </td>
                {cols.map((c) => {
                  const cell = r[c.key];
                  const dv = fmtCellDelta(cell);
                  return (
                    <td key={c.key} className="px-3 py-2 text-right">
                      <div className="font-medium">{cell.value === null ? "—" : fmtNum(cell.value, 2)}{cell.unit && cell.unit !== "%" ? "" : "%"}</div>
                      <div className={cn("text-2xs", dv.cls)}>{dv.text}</div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <div className="font-medium">{r.phase === null ? "—" : `${fmtNum(r.phase, 0)}°`}</div>
                  <div className="text-2xs text-muted">{r.phaseLabel}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-2xs text-muted border-t border-border flex items-center gap-1.5">
        <Info size={12} /> 仅展示当前状态与变化，无综合评分；增长/通胀为模型推导（确定性 Mock），不代表真实数据。
      </div>
    </Card>
  );
}

/* ---------------- 2. Global Money Market ---------------- */
export function MoneyMarketTable() {
  const ctx = useResearchContext();
  const [period, setPeriod] = React.useState<Period>("1M");
  const data = React.useMemo(() => getMoneyMarket(ctx.asOfDate), [ctx.asOfDate]);

  return (
    <Card>
      <CardHead
        title="全球货币市场"
        subtitle="主要经济体关键短端利率 · 当前 / 1日 / 1周 / 1月 变化 · 真实覆盖：CN DR007/Shibor3M/7天逆回购/CNH HIBOR/LPR、US SOFR/EFFR/IORB/ON-RRP/准备金/TGA/美联储资产、EUR €STR、JPY TONAR、GBP SONIA、CHF SARON（其余为 Mock；优先源 Wind）"
        right={
          <div className="flex items-center gap-2">
            <Badge tone="pos">真实覆盖</Badge>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">经济体</th>
              <th className="text-left px-3 py-2 font-medium">短端指标</th>
              <th className="text-right px-3 py-2 font-medium">当前</th>
              <th className="text-right px-3 py-2 font-medium">1日</th>
              <th className="text-right px-3 py-2 font-medium">1周</th>
              <th className="text-right px-3 py-2 font-medium">1月</th>
            </tr>
          </thead>
          <tbody>
            {data.map((grp) =>
              grp.rows.map((row, i) => {
                const c1 = row.isRate ? row.d1 : null;
                const p1 = row.isRate ? null : row.pct1;
                const c7 = row.isRate ? row.d7 : null;
                const p7 = row.isRate ? null : row.pct7;
                const c30 = row.isRate ? row.d30 : null;
                const p30 = row.isRate ? null : row.pct30;
                return (
                  <tr key={grp.code + row.label} className="border-b border-border/60 hover:bg-panel-2">
                    {i === 0 ? (
                      <td className="px-3 py-2 font-semibold align-top" rowSpan={grp.rows.length}>
                        <Link href={`/currency/${grp.code}`} className="hover:underline">{grp.economy}</Link>
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-muted">
                      <span className="inline-flex items-center gap-1">
                        {row.label}
                        <Badge tone={row.isReal ? "pos" : "mock"} className="text-[9px] px-1 py-0 leading-none">{row.isReal ? "真实" : "Mock"}</Badge>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {row.current === null ? "—" : fmtNum(row.current, 2)}
                      <span className="text-2xs text-muted ml-0.5">{row.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right"><DeltaChip value={c1} isRate={row.isRate} pct={p1 !== null ? true : false} /></td>
                    <td className="px-3 py-2 text-right"><DeltaChip value={c7} isRate={row.isRate} pct={p7 !== null ? true : false} /></td>
                    <td className="px-3 py-2 text-right"><DeltaChip value={c30} isRate={row.isRate} pct={p30 !== null ? true : false} /></td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------- 3. SOFR special panel ---------------- */
export function SofrPanel() {
  const ctx = useResearchContext();
  const p = React.useMemo(() => getSofrPanel(ctx.asOfDate), [ctx.asOfDate]);
  // 变化量按单位格式化：利率(%)→bp；余额($bn)→$bn 绝对变化（不再误乘 100）。
  const fmtChg = (d30: number | null, unit: string): string => {
    if (d30 === null) return "—";
    if (unit === "%") return `${d30 >= 0 ? "+" : ""}${(d30 * 100).toFixed(1)}bp`;
    return `${d30 >= 0 ? "+" : ""}${d30.toFixed(1)} ${unit}`;
  };
  const row = (label: string, val: number | null, unit: string, chg?: { d1: number | null; d7: number | null; d30: number | null }) => (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5">
      <span className="text-2xs text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-semibold tnum">{val === null ? "—" : fmtNum(val, 2)}<span className="text-2xs text-muted ml-0.5">{unit}</span></span>
        {chg ? (
          <span className="text-2xs tnum text-muted">
            1M {fmtChg(chg.d30, unit)}
          </span>
        ) : null}
      </span>
    </div>
  );
  return (
    <Card>
      <CardHead
        title="美国流动性核心 · SOFR"
        subtitle="SOFR 是美国资金环境的枢纽指标，非普通利率"
        right={<Badge tone={p.isReal ? "pos" : "mock"}>{p.isReal ? "FRED 真实" : "Mock"}</Badge>}
      />
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            {row("SOFR", p.sofr, "%", p.chg.sofr)}
            {row("EFFR", p.effr, "%", p.chg.effr)}
            {row("IORB", p.iorb, "%", p.chg.iorb)}
            {row("SOFR − EFFR", p.sofrEffr, "bp")}
            {row("SOFR − IORB", p.sofrIorb, "bp")}
          </div>
          <div>
            {row("ON RRP", p.onRrp, "$bn", p.chg.onRrp)}
            {row("准备金余额", p.reserves, "$bn", p.chg.reserves)}
            {row("TGA", p.tga, "$bn", p.chg.tga)}
            {row("美联储总资产", p.fedAssets, "$bn", p.chg.fedAssets)}
          </div>
        </div>
        <div className="text-2xs text-muted mt-2 pt-2 border-t border-border">
          配合 ON RRP / 准备金 / TGA / 美联储资产观察美元资金环境。全部来自 FRED 真实序列（静态快照，截至 {ctx.asOfDate}，非实时行情）。
        </div>
      </div>
    </Card>
  );
}

/* ---------------- 4. FX Matrix ---------------- */
function FxTable({ title, pairs, subtitle }: { title: string; pairs: FxPair[]; subtitle?: string }) {
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle} right={<Badge tone="mock">Mock</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">货币对</th>
              <th className="text-right px-3 py-2 font-medium">当前</th>
              <th className="text-right px-3 py-2 font-medium">1日</th>
              <th className="text-right px-3 py-2 font-medium">1周</th>
              <th className="text-right px-3 py-2 font-medium">1月</th>
              <th className="text-right px-3 py-2 font-medium">YTD</th>
              <th className="text-right px-3 py-2 font-medium">1年</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.id} className="border-b border-border/60 hover:bg-panel-2">
                <td className="px-3 py-2 font-semibold">{p.id}<span className="text-2xs text-muted ml-1">{p.base}→{p.quote}</span></td>
                <td className="px-3 py-2 text-right font-medium">{fmtFx(p.current)}</td>
                <td className="px-3 py-2 text-right"><DeltaChip value={p.chg1d} pct /></td>
                <td className="px-3 py-2 text-right"><DeltaChip value={p.chg1w} pct /></td>
                <td className="px-3 py-2 text-right"><DeltaChip value={p.chg1m} pct /></td>
                <td className="px-3 py-2 text-right"><DeltaChip value={p.ytd} pct /></td>
                <td className="px-3 py-2 text-right"><DeltaChip value={p.yoy} pct /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function FxMatrix() {
  const ctx = useResearchContext();
  const groups = React.useMemo(() => fxMatrixByGroup(ctx.asOfDate), [ctx.asOfDate]);
  const [tab, setTab] = React.useState<FxGroup>("major");
  const tabs: { id: FxGroup; label: string }[] = [
    { id: "major", label: "主要货币对" },
    { id: "cross", label: "交叉汇率" },
    { id: "vsCNY", label: "相对人民币(CNY)" },
    { id: "vsCNH", label: "相对离岸人民币(CNH)" },
  ];
  return (
    <Card>
      <CardHead
        title="外汇与相对利率"
        subtitle="主要货币对 / 交叉汇率 / 相对人民币 · 当前 / 1日 / 1周 / 1月 / YTD / 1年"
        right={
          <div className="inline-flex rounded border border-border overflow-hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn("text-2xs px-2 py-1", tab === t.id ? "bg-accent text-accent-fg" : "bg-panel-2 text-muted hover:text-content")}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="p-3">
        <FxTable
          title={tabs.find((t) => t.id === tab)!.label}
          pairs={groups[tab]}
        />
      </div>
    </Card>
  );
}

/* ---------------- 5. What Changed ---------------- */
export function WhatChanged() {
  const ctx = useResearchContext();
  const [period, setPeriod] = React.useState<Period>("1M");
  const items = React.useMemo(() => getWhatChanged(ctx.asOfDate, period), [ctx.asOfDate, period]);
  return (
    <Card>
      <CardHead
        title="发生了什么变化"
        subtitle="数据变化而非新闻摘要 · 1日/1周/1月可切换"
        right={<PeriodToggle value={period} onChange={setPeriod} />}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">指标</th>
              <th className="text-right px-3 py-2 font-medium">当前</th>
              <th className="text-right px-3 py-2 font-medium">变化</th>
              <th className="text-right px-3 py-2 font-medium">前期</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.label} className="border-b border-border/60 hover:bg-panel-2">
                <td className="px-3 py-2">
                  {it.href ? <Link href={it.href} className="hover:underline font-medium">{it.label}</Link> : <span className="font-medium">{it.label}</span>}
                </td>
                <td className="px-3 py-2 text-right font-medium">{it.current === null ? "—" : fmtNum(it.current, 3)}</td>
                <td className="px-3 py-2 text-right"><DeltaChip value={it.change} isRate={it.isRate} pct={!it.isRate} /></td>
                <td className="px-3 py-2 text-right text-muted">{it.previous === null ? "—" : fmtNum(it.previous, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
