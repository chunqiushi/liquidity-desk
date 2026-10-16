"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Waves, Cpu, Link2 } from "lucide-react";
import {
  getEconomyDetail,
  getCycle,
  CYCLE_LABEL,
  ECO_CONFIG,
  type CycleId,
} from "@/lib/cycle";
import { useResearchContext } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { cn, fmtNum } from "@/lib/utils";

const CYCLES: CycleId[] = ["Short", "Medium", "Long"];
const TRANSFORMS = ["Raw", "Normalized", "Sine", "Phase"] as const;
type Transform = (typeof TRANSFORMS)[number];

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

export default function EconomyCycleDetail() {
  const params = useParams();
  const code = String(params.economy ?? "USD").toUpperCase();
  const ctx = useResearchContext();
  const [cycle, setCycle] = React.useState<CycleId>("Medium");
  const [transform, setTransform] = React.useState<Transform>("Sine");
  const [range, setRange] = React.useState<string>("1Y");

  const detail = getEconomyDetail(code, ctx.asOfDate, cycle);
  const c = detail.cycle;

  const transformData = () => {
    const keyMap: Record<Transform, number[]> = {
      Raw: c.raw,
      Normalized: c.normalized,
      Sine: c.sine,
      Phase: c.phase,
    };
    const arr = keyMap[transform];
    return c.dates.map((d, i) => ({ date: d, v: arr[i] }));
  };
  const unit = transform === "Phase" ? "°" : transform === "Sine" ? "" : detail.cfg.unit;
  const color =
    transform === "Sine"
      ? "#22c55e"
      : transform === "Phase"
        ? "#a855f7"
        : transform === "Normalized"
          ? "#eab308"
          : detail.cur?.color ?? "#4f86f7";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link href="/liquidity-cycle" className="text-muted hover:text-content">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Waves size={18} className="text-accent" />
              {code} Liquidity Cycle
            </h1>
            <p className="text-2xs text-muted">{detail.cfg.coreLabel} · derived Sine / Phase indicators</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={cycle} onChange={setCycle} options={CYCLES.map((x) => ({ value: x, label: CYCLE_LABEL[x] }))} />
          <Badge tone="mock">Mock Data</Badge>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xs text-muted">Sine</div>
          <div className={cn("text-2xl font-semibold tnum", c.latestSine > 0.05 ? "text-pos" : c.latestSine < -0.05 ? "text-neg" : "")}>
            {fmtNum(c.latestSine, 2)}
          </div>
          <div className="text-2xs text-muted">[-1 high · +1 low reversed]</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-muted">Phase</div>
          <div className="text-2xl font-semibold tnum">{fmtNum(c.latestPhase, 0)}°</div>
          <div className="text-2xs text-muted">0°→360° cycle position</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-muted">Amplitude</div>
          <div className="text-2xl font-semibold tnum">{fmtNum(c.amplitude, 2)}</div>
          <div className="text-2xs text-muted">signal strength {c.signalStrength}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xs text-muted">Cycle Length</div>
          <div className="text-2xl font-semibold tnum">{c.cycleLengthDays}d</div>
          <div className="text-2xs text-muted">{CYCLE_LABEL[cycle]}</div>
        </Card>
      </div>

      {/* Core indicators */}
      <SectionLabel>Core Liquidity Indicators</SectionLabel>
      <Card>
        <CardHead title={`${code} liquidity indicators`} subtitle="Localized per monetary regime (Mock)" right={<Badge tone="mock">Mock Data</Badge>} />
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {detail.context.map((ind) => (
            <div key={ind.label} className="border border-border rounded p-2">
              <div className="text-2xs text-muted truncate">{ind.label}</div>
              <div className="text-base font-semibold tnum mt-0.5">
                {ind.value === null ? "—" : fmtNum(ind.value, ind.unit === "%" ? 2 : 0)}
                <span className="text-2xs text-muted ml-1">{ind.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transform chart */}
      <SectionLabel>Raw → Normalized → Sine → Phase</SectionLabel>
      <Card>
        <CardHead
          title={`${detail.cfg.coreLabel} — ${transform}`}
          subtitle="Every Sine/Phase chart keeps the underlying data visible"
          right={
            <div className="flex items-center gap-2">
              <Segmented value={transform} onChange={setTransform} options={TRANSFORMS.map((t) => ({ value: t, label: t }))} />
              <Segmented value={range} onChange={setRange} options={["3M", "6M", "1Y", "3Y"].map((r) => ({ value: r, label: r }))} />
            </div>
          }
        />
        <div className="p-3">
          <TimeSeriesChart
            id="transform"
            data={transformData()}
            lookback={range}
            unit={unit}
            height={280}
            series={[{ key: "v", name: `${detail.cfg.coreLabel} ${transform}`, color }]}
          />
          <div className="text-2xs text-muted mt-2">
            Toggle between Raw data, Normalized (z-score of detrended), Sine and Phase. The cycle is extracted with a centered moving average of window = cycle length, then least-squares fitted to a sine.
          </div>
        </div>
      </Card>

      {/* Method transparency */}
      <Card>
        <CardHead title="Method & Source" subtitle="Derived Indicator (Research Indicator) — not official data" right={<Badge tone="warn">Derived</Badge>} />
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-2xs tnum">
          <Method k="Input Series" v={c.method.input} />
          <Method k="Source" v={c.method.source} />
          <Method k="Frequency" v={c.method.frequency} />
          <Method k="Lookback" v={`${c.method.lookbackDays} days`} />
          <Method k="Cycle Length" v={`${c.method.cycleDays} days`} />
          <Method k="Smoothing" v={c.method.smoothing} />
          <Method k="Normalization" v={c.method.normalization} />
          <Method k="Calculation Date" v={c.method.calculationDate} />
          <Method k="Method Version" v={c.method.methodVersion} />
        </div>
        <div className="px-3 pb-3 text-2xs text-muted flex items-center gap-1">
          <Cpu size={12} /> Sine & Phase are study aids for cycle positioning. They do not constitute trade signals.
        </div>
      </Card>

      {/* Linked views */}
      <Card>
        <CardHead title="Linked Research Views" subtitle="Liquidity ↔ Rates ↔ FX" />
        <div className="p-3 flex flex-wrap gap-2 text-2xs">
          <Link href={`/currency/${detail.cur?.code ?? code}`} className="chip border border-border hover:border-accent text-accent flex items-center gap-1">
            <Link2 size={11} /> {detail.cur?.code ?? code} Currency Detail
          </Link>
          <Link href="/rates-matrix" className="chip border border-border hover:border-accent text-accent">Rates Matrix</Link>
          <Link href="/fx-funding" className="chip border border-border hover:border-accent text-accent">FX & Funding</Link>
          {code === "CNH" ? (
            <>
              <Link href="/china/liquidity" className="chip border border-border hover:border-accent text-accent">China Liquidity</Link>
              <Link href="/china/cnus-spread" className="chip border border-border hover:border-accent text-accent">China-US 10Y Spread</Link>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Method({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 pb-1">
      <span className="text-muted">{k}</span>
      <span className="text-right text-content/90">{v}</span>
    </div>
  );
}
