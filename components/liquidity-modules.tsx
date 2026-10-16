"use client";

import * as React from "react";
import { Card, CardHead, Badge } from "@/components/ui";
import { TimeSeriesChart, MiniSpark } from "@/components/charts";
import { fmtNum, fmtBps, fmtPct, cn } from "@/lib/utils";
import {
  EconomyLiquidity,
  LiqValue,
  LiquidityLayer,
  LAYER_META,
  MonitorRow,
} from "@/lib/liquidity";

export function fmtChange(v: number | null, mode: LiqValue["mode"]): string {
  if (v === null) return "—";
  if (mode === "bps") return fmtBps(v, 1);
  if (mode === "pct") return fmtPct(v, 2);
  return fmtNum(v, 2);
}

function ChangeCell({ v, mode }: { v: number | null; mode: LiqValue["mode"] }) {
  const cls = v === null ? "text-muted" : v >= 0 ? "text-pos" : "text-neg";
  return <span className={cn("tnum font-medium", cls)}>{fmtChange(v, mode)}</span>;
}

/* ---------------- Global Liquidity Monitor table ---------------- */
export function LiquidityMonitorTable({ rows }: { rows: MonitorRow[] }) {
  return (
    <Card>
      <CardHead
        title="全球流动性监控 · Global Liquidity Monitor"
        subtitle="8 经济体横向比较 — 仅展示当前状态与变化，无流动性综合评分"
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">经济体</th>
              <th className="text-left px-3 py-2 font-medium">央行</th>
              <th className="text-right px-3 py-2 font-medium">核心融资利率</th>
              <th className="text-right px-3 py-2 font-medium">1D</th>
              <th className="text-right px-3 py-2 font-medium">1W</th>
              <th className="text-right px-3 py-2 font-medium">1M</th>
              <th className="text-right px-3 py-2 font-medium">政策利率</th>
              <th className="text-right px-3 py-2 font-medium">流动性数量</th>
              <th className="text-right px-3 py-2 font-medium">央行资产负债表</th>
              <th className="text-right px-3 py-2 font-medium">信用</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-b border-border/60 hover:bg-panel-2">
                <td className="px-3 py-2">
                  <a href={`/liquidity/${r.code}`} className="font-semibold text-accent hover:underline">
                    {r.code}
                  </a>
                  <div className="text-muted text-3xs">{r.name}</div>
                </td>
                <td className="px-3 py-2 text-muted">{r.centralBank}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {fmtNum(r.core.value, 3)}
                  <span className="text-muted font-normal"> {r.core.unit}</span>
                </td>
                <td className="px-3 py-2 text-right"><ChangeCell v={r.core.chg1d} mode="bps" /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={r.core.chg1w} mode="bps" /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={r.core.chg1m} mode="bps" /></td>
                <td className="px-3 py-2 text-right">{fmtNum(r.policy.value, 3)}</td>
                <td className="px-3 py-2 text-right">
                  {r.qty ? `${fmtNum(r.qty.value, 2)} ${r.qty.unit}` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.cbassets ? `${fmtNum(r.cbassets.value, 2)} ${r.cbassets.unit}` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.credit ? `${fmtNum(r.credit.value, 2)} ${r.credit.unit}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-2xs text-muted border-t border-border">
        核心融资利率变化以 bp 计；数量/信用指标变化见各经济体详情。不将不同经济体流动性简单加权，不做综合评分。
      </div>
    </Card>
  );
}

/* ---------------- Layer table (price / quantity / transmission / funding) ---------------- */
export function LiquidityLayerTable({
  layer,
  values,
  selectedId,
  onSelect,
}: {
  layer: LiquidityLayer;
  values: LiqValue[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const meta = LAYER_META[layer];
  return (
    <Card>
      <CardHead title={meta.label} subtitle={meta.sub} right={<Badge tone="mock">Mock</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">指标</th>
              <th className="text-right px-3 py-2 font-medium">当前</th>
              <th className="text-right px-3 py-2 font-medium">1D</th>
              <th className="text-right px-3 py-2 font-medium">1W</th>
              <th className="text-right px-3 py-2 font-medium">1M</th>
              <th className="text-center px-3 py-2 font-medium">走势</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v) => (
              <tr
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={cn(
                  "border-b border-border/50 cursor-pointer",
                  v.id === selectedId ? "bg-accent/10" : "hover:bg-panel-2",
                )}
              >
                <td className="px-3 py-2">
                  <div className="font-medium">{v.label}</div>
                  <div className="text-3xs text-muted">{v.unit} · {v.freq} · {v.source}</div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {fmtNum(v.value, v.unit === "bp" || v.unit === "%" || v.unit === "index" ? 3 : 2)}
                  {v.unit !== "%" && v.unit !== "bp" && v.unit !== "index" ? ` ${v.unit}` : ""}
                </td>
                <td className="px-3 py-2 text-right"><ChangeCell v={v.chg1d} mode={v.mode} /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={v.chg1w} mode={v.mode} /></td>
                <td className="px-3 py-2 text-right"><ChangeCell v={v.chg1m} mode={v.mode} /></td>
                <td className="px-3 py-2 text-center">
                  <MiniSpark values={v.history.map((h) => h.value)} color="rgb(var(--text-muted))" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------- Operations: Sources & Drains ---------------- */
export function OperationsBlock({
  values,
  selectedId,
  onSelect,
}: {
  values: LiqValue[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const sources = values.filter((v) => v.side === "source");
  const drains = values.filter((v) => v.side === "drain");
  const Row = ({ v }: { v: LiqValue }) => (
    <tr
      key={v.id}
      onClick={() => onSelect(v.id)}
      className={cn(
        "border-b border-border/50 cursor-pointer",
        v.id === selectedId ? "bg-accent/10" : "hover:bg-panel-2",
      )}
    >
      <td className="px-3 py-2">
        <div className="font-medium">{v.label}</div>
        <div className="text-3xs text-muted">{v.unit} · {v.freq}</div>
      </td>
      <td className="px-3 py-2 text-right font-semibold">{fmtNum(v.value, 2)}{v.unit !== "%" ? ` ${v.unit}` : ""}</td>
      <td className="px-3 py-2 text-right"><ChangeCell v={v.chg1m} mode={v.mode} /></td>
    </tr>
  );
  return (
    <Card>
      <CardHead
        title="③ 操作 / 来源与吸收 · Sources & Drains"
        subtitle="只展示：来源 + 吸收，不计算净流动性指数"
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        <div className="bg-panel p-1">
          <div className="px-3 py-1.5 text-2xs font-semibold text-pos">来源 Sources →</div>
          <table className="w-full text-2xs tnum">
            <tbody>{sources.map((v) => <Row key={v.id} v={v} />)}</tbody>
          </table>
        </div>
        <div className="bg-panel p-1">
          <div className="px-3 py-1.5 text-2xs font-semibold text-neg">吸收 Drains →</div>
          <table className="w-full text-2xs tnum">
            <tbody>{drains.map((v) => <Row key={v.id} v={v} />)}</tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Chart panel for selected indicator ---------------- */
export function LiquidityChartPanel({
  eco,
  selectedId,
  onSelect,
}: {
  eco: EconomyLiquidity;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const all = React.useMemo(() => {
    const out: LiqValue[] = [];
    (Object.keys(eco.layers) as LiquidityLayer[]).forEach((l) => out.push(...eco.layers[l]));
    return out;
  }, [eco]);
  const sel = all.find((v) => v.id === selectedId) ?? eco.coreFunding;
  const options = (Object.keys(eco.layers) as LiquidityLayer[]).map((l) => ({
    layer: l,
    label: LAYER_META[l].label,
    items: eco.layers[l],
  }));
  const chartData = sel.history.map((h) => ({ date: h.date, value: h.value }));
  return (
    <Card>
      <CardHead
        title={`走势 · ${sel.label}`}
        subtitle={`${sel.unit} · ${sel.source}`}
        right={
          <select
            value={sel.id}
            onChange={(e) => onSelect(e.target.value)}
            className="text-2xs bg-panel-2 border border-border rounded px-2 py-1"
          >
            {options.map((o) => (
              <optgroup key={o.layer} label={o.label}>
                {o.items.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        }
      />
      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-2xs">
          <div className="border border-border rounded p-1.5">
            <div className="text-muted">当前 Current</div>
            <div className="font-semibold tnum">{fmtNum(sel.value, 3)} {sel.unit}</div>
          </div>
          <div className="border border-border rounded p-1.5">
            <div className="text-muted">观测日 Obs</div>
            <div className="font-semibold tnum">{sel.observationDate}</div>
          </div>
          <div className="border border-border rounded p-1.5">
            <div className="text-muted">频率 Freq</div>
            <div className="font-semibold">{sel.freq}</div>
          </div>
          <div className="border border-border rounded p-1.5">
            <div className="text-muted">数据状态</div>
            <div className="font-semibold"><Badge tone="mock">{sel.dataStatus}</Badge></div>
          </div>
        </div>
        <TimeSeriesChart
          id={`lq-${sel.id}`}
          data={chartData}
          series={[{ key: "value", name: sel.label, color: "rgb(var(--accent))" }]}
          unit={sel.unit}
          height={240}
        />
        <div className="text-2xs text-muted mt-2">
          来源 Source：{sel.source} · 发布日 Release：{sel.releaseDate} · 性质：
          {sel.kind === "market" ? "市场实时数据" : sel.kind === "official" ? "官方政策数据" : sel.kind === "cbop" ? "央行操作数据" : sel.kind === "balance" ? "日频余额数据" : sel.kind === "banking" ? "银行/信贷数据" : "月度宏观数据"}
          。不同频率与口径不混用。
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Compact economy card for overview ---------------- */
export function EconomyLiquidityCard({ eco }: { eco: EconomyLiquidity }) {
  const mini = (v: LiqValue | null) =>
    v ? (
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-muted truncate">{v.label}</span>
        <span className="font-semibold tnum whitespace-nowrap">{fmtNum(v.value, 2)} {v.unit}</span>
      </div>
    ) : null;
  return (
    <Card>
      <CardHead
        title={
          <a href={`/liquidity/${eco.code}`} className="text-accent hover:underline">
            {eco.code} · {eco.name}
          </a>
        }
        subtitle={eco.centralBank}
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="p-3 space-y-2">
        <div className="text-2xs">
          {mini(eco.coreFunding)}
          {mini(eco.policyRate)}
          {mini(eco.liquidityQuantity)}
          {mini(eco.centralBankAssets)}
          {mini(eco.credit)}
        </div>
        <div className="text-2xs text-muted border-t border-border pt-2 leading-relaxed flex flex-wrap gap-1">
          {eco.researchChain.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="chip bg-panel-2 border border-border">{s}</span>
              {i < eco.researchChain.length - 1 ? <span className="text-accent">→</span> : null}
            </span>
          ))}
        </div>
        <div className="text-2xs text-muted">研究链：央行 → 货币市场 → 流动性 → 信用/融资 → 利率/汇率</div>
      </div>
    </Card>
  );
}
