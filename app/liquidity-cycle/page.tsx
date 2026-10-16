"use client";

import * as React from "react";
import Link from "next/link";
import {
  Waves,
  Info,
  GitCompareArrows,
} from "lucide-react";
import {
  getLiquidityMonitor,
  getSineMatrix,
  getPhaseMatrix,
  getPhaseComparison,
  phaseChartRows,
  sineChartRows,
  getCycle,
  CYCLE_LABEL,
  ECO_CONFIG,
  ECO_ORDER,
  type CycleId,
} from "@/lib/cycle";
import { CURRENCY_MAP } from "@/lib/mock-data";
import { useResearchContext } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtNum, fmtPct, cn } from "@/lib/utils";

const CYCLES: CycleId[] = ["Short", "Medium", "Long"];
const SINE_RANGE: Record<string, string> = { "3M": "3M", "6M": "6M", "1Y": "1Y", "3Y": "3Y" };

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded border border-border overflow-hidden text-2xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1 transition-colors",
            value === o.value ? "bg-accent text-accent-fg" : "bg-panel-2 text-muted hover:text-content",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 72;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / rng) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} />
    </svg>
  );
}

function sineColor(sine: number): string {
  const a = 0.15 + 0.55 * Math.min(1, Math.abs(sine));
  if (sine > 0.05) return `rgba(34,197,94,${a})`;
  if (sine < -0.05) return `rgba(239,68,68,${a})`;
  return `rgba(148,163,184,0.18)`;
}
function phaseLabel(deg: number): string {
  if (deg < 45 || deg >= 315) return "Cycle start";
  if (deg < 135) return "High";
  if (deg < 225) return "Transition";
  return "Low";
}

export default function LiquidityCyclePage() {
  const ctx = useResearchContext();
  const [cycle, setCycle] = React.useState<CycleId>("Medium");
  const [sineRange, setSineRange] = React.useState<string>("1Y");
  const [selected, setSelected] = React.useState<string[]>(["CNY", "USD", "EUR", "JPY", "HKD", "CHF", "GBP", "AUD"]);

  const monitor = getLiquidityMonitor(ctx.asOfDate, cycle);
  const sineMat = getSineMatrix(ctx.asOfDate, cycle);
  const phaseMat = getPhaseMatrix(ctx.asOfDate, cycle);
  const comparison = getPhaseComparison(ctx.asOfDate, cycle);

  const toggleEco = (eco: string) =>
    setSelected((s) => (s.includes(eco) ? s.filter((x) => x !== eco) : [...s, eco]));

  const selCodes = selected.map((e) => ECO_CONFIG[e].code);
  const phaseRows = phaseChartRows(ctx.asOfDate, selCodes, cycle);
  const sineRows = sineChartRows(ctx.asOfDate, selCodes, cycle);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Waves size={18} className="text-accent" /> Global Liquidity Monitor
          </h1>
          <p className="text-2xs text-muted">
            Macro → Liquidity → Sine → Phase · 8 economies · derived cycle indicators (Mock)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted">Cycle</span>
          <Segmented value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c, label: CYCLE_LABEL[c] }))} />
          <Badge tone="mock">Mock Data</Badge>
        </div>
      </div>

      {/* Module: Global Liquidity Monitor */}
      <SectionLabel>Global Liquidity Monitor · 8 Economies</SectionLabel>
      <Card>
        <CardHead
          title="Liquidity Monitor"
          subtitle="Core funding rate · policy · liquidity balance · CB assets · money/credit · changes · Sine · Phase"
          right={<Badge tone="mock">Mock Data</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-2xs tnum">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-3 py-2 font-medium">Economy</th>
                <th className="text-right px-3 py-2 font-medium">Core Funding</th>
                <th className="text-right px-3 py-2 font-medium">Policy</th>
                <th className="text-right px-3 py-2 font-medium">Liq. Balance</th>
                <th className="text-right px-3 py-2 font-medium">CB Assets</th>
                <th className="text-right px-3 py-2 font-medium">Money/Credit</th>
                <th className="text-right px-3 py-2 font-medium">1D%</th>
                <th className="text-right px-3 py-2 font-medium">1W%</th>
                <th className="text-right px-3 py-2 font-medium">1M%</th>
                <th className="text-center px-3 py-2 font-medium">Trend</th>
                <th className="text-right px-3 py-2 font-medium">Sine <span className="text-muted">†</span></th>
                <th className="text-right px-3 py-2 font-medium">Phase <span className="text-muted">†</span></th>
              </tr>
            </thead>
            <tbody>
              {monitor.map((r) => (
                <tr key={r.code} className="border-b border-border/60 hover:bg-panel-2 transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/liquidity-cycle/${r.code}`} className="font-semibold text-accent hover:underline flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      {r.code}
                    </Link>
                    <div className="text-2xs text-muted">{r.coreLabel}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/currency/${r.code}`} className="hover:underline">{fmtNum(r.coreValue, 2)}</Link>
                    <span className="text-muted"> {r.coreUnit}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(r.policyRate, 2)}</td>
                  <td className="px-3 py-2 text-right" title={r.liquidityLabel}>{r.liquidityBalance === null ? "—" : fmtNum(r.liquidityBalance, 0)}</td>
                  <td className="px-3 py-2 text-right">{r.cbAssets === null ? "—" : fmtNum(r.cbAssets, 0)}</td>
                  <td className="px-3 py-2 text-right" title={r.moneyCreditLabel}>{r.moneyCredit === null ? "—" : fmtNum(r.moneyCredit, 0)}</td>
                  <td className={cn("px-3 py-2 text-right", (r.chg1d ?? 0) >= 0 ? "text-pos" : "text-neg")}>{r.chg1d === null ? "—" : fmtPct(r.chg1d, 2)}</td>
                  <td className={cn("px-3 py-2 text-right", (r.chg1w ?? 0) >= 0 ? "text-pos" : "text-neg")}>{r.chg1w === null ? "—" : fmtPct(r.chg1w, 2)}</td>
                  <td className={cn("px-3 py-2 text-right", (r.chg1m ?? 0) >= 0 ? "text-pos" : "text-neg")}>{r.chg1m === null ? "—" : fmtPct(r.chg1m, 2)}</td>
                  <td className="px-3 py-2 flex justify-center">
                    <Spark values={getCycle(r.ecoCode, cycle, ctx.asOfDate).raw.slice(-60)} color={r.color} />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ color: r.sine !== null && r.sine > 0.05 ? "#22c55e" : r.sine !== null && r.sine < -0.05 ? "#ef4444" : undefined }}>
                    {r.sine === null ? "—" : fmtNum(r.sine, 2)}
                  </td>
                  <td className="px-3 py-2 text-right">{r.phase === null ? "—" : `${fmtNum(r.phase, 0)}°`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 text-2xs text-muted border-t border-border flex items-center gap-1">
          <Info size={12} /> Sine ∈ [-1,+1] (cycle position, not good/bad). Phase ∈ [0°,360°]. Amplitude shown in detail pages. Sine & Phase are Derived Indicators (Research Indicators), not official data — all Mock. † marks derived columns.
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A. Sine Matrix */}
        <Card>
          <CardHead title="A · Sine Indicator Matrix" subtitle="Derived Indicator (Research Indicator) — cycle position per economy" right={<Badge tone="mock">Mock</Badge>} />
          <div className="p-3 grid grid-cols-2 gap-2">
            {sineMat.map((m) => (
              <div key={m.eco} className="flex items-center justify-between rounded px-2 py-1.5 border border-border" style={{ background: sineColor(m.sine) }}>
                <span className="font-semibold">{m.code}</span>
                <span className="tnum">{fmtNum(m.sine, 2)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* B. Phase Matrix */}
        <Card>
          <CardHead title="B · Phase Matrix" subtitle="Derived Indicator (Research Indicator) — 0°–360° unified rule" right={<Badge tone="mock">Mock</Badge>} />
          <div className="overflow-x-auto">
            <table className="w-full text-2xs tnum">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left px-3 py-2">Eco</th>
                  <th className="text-right px-3 py-2">Phase</th>
                  <th className="text-left px-3 py-2">Position</th>
                  <th className="text-right px-3 py-2">Amplitude</th>
                </tr>
              </thead>
              <tbody>
                {phaseMat.map((m) => (
                  <tr key={m.eco} className="border-b border-border/60">
                    <td className="px-3 py-2 font-semibold">{m.code}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtNum(m.phase, 0)}°</td>
                    <td className="px-3 py-2 text-muted">{phaseLabel(m.phase)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(m.amplitude, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* C. Liquidity Cycle Chart (phase) */}
      <SectionLabel>C · Liquidity Cycle Chart — Phase</SectionLabel>
      <Card>
        <CardHead
          title="Phase Time Series"
          subtitle="Derived Indicator (Research Indicator) — compare cycle positions across economies (select to toggle)"
          right={
            <div className="flex flex-wrap gap-1">
              {ECO_ORDER.map((e) => (
                <button
                  key={e}
                  onClick={() => toggleEco(e)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-2xs border",
                    selected.includes(e) ? "border-accent text-accent" : "border-border text-muted",
                  )}
                >
                  {ECO_CONFIG[e].code}
                </button>
              ))}
            </div>
          }
        />
        <div className="p-3">
          <TimeSeriesChart
            id="phasechart"
            data={phaseRows}
            unit="°"
            height={280}
            series={selCodes.map((code) => ({ key: code, name: code, color: CURRENCY_MAP[code]?.color ?? "#888" }))}
          />
          <div className="text-2xs text-muted mt-2">
            Phase is an angular position on a unified [0°,360°] scale. Differences between lines indicate lead/lag; do not infer causation.
          </div>
        </div>
      </Card>

      {/* D. Sine Chart */}
      <SectionLabel>D · Sine Chart</SectionLabel>
      <Card>
        <CardHead
          title="Sine Indicator"
          subtitle="Derived Indicator (Research Indicator) — [-1,+1] cyclical position"
          right={
            <div className="flex items-center gap-2">
              <Segmented value={sineRange} onChange={setSineRange} options={Object.keys(SINE_RANGE).map((k) => ({ value: k, label: k }))} />
            </div>
          }
        />
        <div className="p-3">
          <TimeSeriesChart
            id="sinechart"
            data={sineRows}
            lookback={sineRange}
            height={260}
            series={selCodes.map((code) => ({ key: code, name: code, color: CURRENCY_MAP[code]?.color ?? "#888" }))}
          />
          <div className="text-2xs text-muted mt-2">+1 = cycle high, 0 = transition, -1 = cycle low.</div>
        </div>
      </Card>

      {/* Phase Comparison */}
      <SectionLabel>Phase Difference — China vs</SectionLabel>
      <Card>
        <CardHead
          title="Phase Comparison"
          subtitle="Derived Indicator (Research Indicator) — China phase − target phase, normalized to (-180°,+180°]"
          right={<Link href="/liquidity-cycle/CNH" className="text-2xs text-accent hover:underline">China detail →</Link>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-2xs tnum">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-3 py-2">China vs</th>
                <th className="text-right px-3 py-2">China Phase</th>
                <th className="text-right px-3 py-2">Target Phase</th>
                <th className="text-right px-3 py-2">Δ Phase</th>
                <th className="text-left px-3 py-2">Relation</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.target} className="border-b border-border/60">
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/liquidity-cycle/${c.target}`} className="text-accent hover:underline">{c.target}</Link>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(c.chinaPhase, 0)}°</td>
                  <td className="px-3 py-2 text-right">{fmtNum(c.targetPhase, 0)}°</td>
                  <td className={cn("px-3 py-2 text-right", c.diff >= 0 ? "text-pos" : "text-neg")}>
                    {c.diff >= 0 ? "+" : ""}
                    {fmtNum(c.diff, 0)}°
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={c.relation === "In phase" ? "accent" : c.relation === "China leads" ? "pos" : "warn"}>{c.relation}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 text-2xs text-muted border-t border-border flex items-center gap-1">
          <GitCompareArrows size={12} /> Phase difference is a positional comparison only — no economic-causality interpretation is attached.
        </div>
      </Card>

      <Card>
        <CardHead title="Cross-links · FX / Rates" subtitle="From liquidity to rates & currency" />
        <div className="p-3 flex flex-wrap gap-2 text-2xs">
          <Link href="/rates-matrix" className="chip border border-border hover:border-accent text-accent">Rates Matrix →</Link>
          <Link href="/fx-funding" className="chip border border-border hover:border-accent text-accent">FX & Funding →</Link>
          <Link href="/currency/USD" className="chip border border-border hover:border-accent text-accent">USD detail →</Link>
          <Link href="/currency/CNH" className="chip border border-border hover:border-accent text-accent">CNH detail →</Link>
          <Link href="/china/cnus-spread" className="chip border border-border hover:border-accent text-accent">China-US 10Y Spread →</Link>
        </div>
      </Card>
    </div>
  );
}
