"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Database, ListChecks } from "lucide-react";
import {
  CURRENCIES,
  DATA_COVERAGE,
  getCurrencyData,
  getCurrencyMonitor,
  getGlobalRegime,
  RESEARCH_FOCUS,
  UPCOMING_EVENTS,
} from "@/lib/mock-data";
import { useResearchContext, useResearchData } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { fmtDate, fmtNum, fmtPct, cn } from "@/lib/utils";
import { Priority } from "@/lib/types";

function StatusStrip() {
  const ctx = useResearchContext();
  const data = useResearchData();
  const items = [
    { icon: CalendarClock, label: "Research date", value: fmtDate(ctx.asOfDate) },
    { icon: Database, label: "Data update", value: fmtDate(ctx.vintageDate) },
    { icon: Database, label: "Coverage", value: `${DATA_COVERAGE.currencies} ccy / ${DATA_COVERAGE.indicators} ind` },
    { icon: AlertTriangle, label: "Events", value: String(UPCOMING_EVENTS.length) },
    { icon: AlertTriangle, label: "Data anomalies", value: "0 (mock)" },
    { icon: ListChecks, label: "Open tasks", value: String(data.tasks.filter((t) => t.status !== "Closed").length) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="px-3 py-2 flex items-center gap-2">
          <it.icon size={16} className="text-accent shrink-0" />
          <div>
            <div className="text-2xs text-muted">{it.label}</div>
            <div className="text-sm font-semibold tnum">{it.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  change,
  status,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  change: number | null;
  status: string;
  note: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-muted">{label}</span>
        <DataStatusBadge status={status} />
      </div>
      <div className="mt-1 text-2xl font-semibold tnum">
        {value === null ? "—" : fmtNum(value, 2)}
        <span className="text-xs text-muted ml-1">{unit}</span>
      </div>
      {change !== null ? (
        <div className={cn("text-2xs tnum", change >= 0 ? "text-pos" : "text-neg")}>
          {fmtPct(change, 1)} vs prior
        </div>
      ) : (
        <div className="text-2xs text-muted">—</div>
      )}
      <div className="text-2xs text-muted mt-1 leading-snug">{note}</div>
    </Card>
  );
}

function MonitorTable() {
  const ctx = useResearchContext();
  const rows = getCurrencyMonitor(ctx.asOfDate);
  const cols: { key: string; label: string; fmt?: (v: number | null) => string; tone?: boolean }[] = [
    { key: "policyRate", label: "Policy" },
    { key: "marketImplied", label: "Mkt-Implied" },
    { key: "y2", label: "2Y" },
    { key: "y10", label: "10Y" },
    { key: "twos10s", label: "2s10s" },
    { key: "shortFunding", label: "Short Funding" },
    { key: "fundingSpread", label: "Fund Spread" },
    { key: "fxSpot", label: "FX Spot" },
    { key: "chg1w", label: "1W %", fmt: (v) => (v === null ? "—" : fmtPct(v, 2)) },
    { key: "chg1m", label: "1M %", fmt: (v) => (v === null ? "—" : fmtPct(v, 2)) },
  ];
  return (
    <Card>
      <CardHead
        title="Currency Monitor"
        subtitle="14-field cross-currency comparison · click a row for detail"
        right={<Badge tone="mock">Mock Data</Badge>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-2xs tnum">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-3 py-2 font-medium">Ccy</th>
              <th className="text-left px-3 py-2 font-medium">Central Bank</th>
              {cols.map((c) => (
                <th key={c.key} className="text-right px-3 py-2 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-medium">Liquidity</th>
              <th className="text-left px-3 py-2 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.code}
                className="border-b border-border/60 hover:bg-panel-2 transition-colors"
              >
                <td className="px-3 py-2">
                  <Link href={`/currency/${r.code}`} className="font-semibold text-accent hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{r.centralBank}</td>
                {cols.map((c) => {
                  const v = (r as unknown as Record<string, number | null>)[c.key];
                  return (
                    <td key={c.key} className="px-3 py-2 text-right">
                      {c.fmt ? c.fmt(v) : fmtNum(v, 2)}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  <Badge tone="accent">{r.liquidityStatus}</Badge>
                </td>
                <td className="px-3 py-2">
                  <DataStatusBadge status={r.dataStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LiquidityFunding() {
  const ctx = useResearchContext();
  const blocks = [
    { code: "USD", title: "USD Funding", ind: "basis_3m" },
    { code: "EUR", title: "EUR Money Market", ind: "estr" },
    { code: "JPY", title: "JPY Funding", ind: "tonar" },
    { code: "CNH", title: "CNH Offshore Liq.", ind: "cnh_hibor" },
    { code: "HKD", title: "HKD Liquidity", ind: "hibor_3m" },
    { code: "CHF", title: "CHF Funding", ind: "saron" },
    { code: "GBP", title: "GBP Funding", ind: "sonia" },
    { code: "AUD", title: "AUD Funding", ind: "ois_3m" },
  ];
  const cards = blocks.map((b) => {
    const d = getCurrencyData(b.code, ctx.asOfDate);
    const obs = d.series[b.ind];
    const v = obs ? obs[obs.length - 1].value : null;
    return { ...b, value: v, unit: d.config.indicators.find((i) => i.id === b.ind)?.unit ?? "" };
  });

  // Cross-currency basis comparison chart
  const basisIds = ["USD", "EUR", "JPY", "CNH", "HKD", "CHF", "GBP", "AUD"];
  const first = getCurrencyData("USD", ctx.asOfDate);
  const dates = (first.series["basis_3m"] ?? []).map((o) => o.observationDate);
  const rows = dates.map((date, i) => {
    const row: Record<string, number | string> = { date };
    basisIds.forEach((code) => {
      const s = getCurrencyData(code, ctx.asOfDate).series["basis_3m"];
      row[code] = s ? (s[i]?.value ?? NaN) : NaN;
    });
    return row;
  });

  return (
    <Card>
      <CardHead
        title="Liquidity & Funding Monitor"
        subtitle="Headline gauges per currency + cross-currency basis"
        right={<Badge tone="mock">Mock Data</Badge>}
      />
      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        {cards.map((c) => (
          <div key={c.code} className="border border-border rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted">{c.title}</span>
              <span className="text-2xs font-semibold">{c.code}</span>
            </div>
            <div className="text-lg font-semibold tnum mt-1">
              {c.value === null ? "—" : fmtNum(c.value, 2)}
              <span className="text-2xs text-muted ml-1">{c.unit}</span>
            </div>
            <Link href={`/currency/${c.code}`} className="text-2xs text-accent hover:underline">
              open detail →
            </Link>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="text-2xs text-muted mb-1">3M Cross-Currency Basis (bp) — lower = tighter USD funding</div>
        <TimeSeriesChart
          data={rows}
          id="ccb"
          unit="bp"
          series={basisIds.map((code) => ({
            key: code,
            name: code,
            color: CURRENCIES.find((c) => c.code === code)!.color,
          }))}
          height={200}
        />
      </div>
    </Card>
  );
}

function EventsModule() {
  const groups: Priority[] = ["P0", "P1", "P2"];
  const tone: Record<Priority, "neg" | "warn" | "neutral"> = {
    P0: "neg",
    P1: "warn",
    P2: "neutral",
  };
  return (
    <Card>
      <CardHead title="Upcoming Events" subtitle="Prioritized research calendar" />
      <div className="p-3 space-y-3">
        {groups.map((g) => {
          const evs = UPCOMING_EVENTS.filter((e) => e.priority === g);
          if (!evs.length) return null;
          return (
            <div key={g}>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={tone[g]}>{g}</Badge>
                <span className="text-2xs text-muted">
                  {g === "P0" ? "Central-bank / major liquidity" : g === "P1" ? "Macro / fiscal / issuance" : "General"}
                </span>
              </div>
              <div className="space-y-1">
                {evs.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-2xs border-b border-border/40 pb-1">
                    <span>
                      <Link href={`/currency/${e.currency}`} className="text-accent hover:underline font-medium">
                        {e.currency}
                      </Link>{" "}
                      {e.title}
                    </span>
                    <span className="text-muted tnum">{fmtDate(e.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FocusModule() {
  return (
    <Card>
      <CardHead title="Research Focus" subtitle="Open questions — reminders, not conclusions" />
      <div className="p-3 space-y-2">
        {RESEARCH_FOCUS.map((q, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-accent font-semibold mt-0.5">Q{i + 1}.</span>
            <span className="text-content/90">{q}</span>
          </div>
        ))}
        <div className="text-2xs text-muted pt-1 border-t border-border">
          These are study prompts. The desk does not auto-generate trade conclusions.
        </div>
      </div>
    </Card>
  );
}

export default function MonetaryOverviewPage() {
  const regime = getGlobalRegime();
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">Monetary Overview</h1>
          <p className="text-2xs text-muted">
            Global monetary, rates & liquidity regime — Phase 1 prototype with mock data
          </p>
        </div>
      </div>

      <StatusStrip />

      <SectionLabel>Module A · Global Monetary Regime</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {regime.map((r) => (
          <StatCard key={r.id} {...r} />
        ))}
      </div>

      <SectionLabel>Module B · Currency Monitor</SectionLabel>
      <MonitorTable />

      <SectionLabel>Module C · Liquidity & Funding Monitor</SectionLabel>
      <LiquidityFunding />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventsModule />
        <FocusModule />
      </div>
    </div>
  );
}
