"use client";

import * as React from "react";
import { CURRENCIES, getCurrencyData } from "@/lib/mock-data";
import { useResearchContext } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, SectionLabel } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { toChartRows, zscore, latestValue, percentileRank } from "@/lib/series";
import { fmtNum, cn } from "@/lib/utils";

const METRICS: { id: string; label: string }[] = [
  { id: "policy_rate", label: "Policy" },
  { id: "ois_3m", label: "3M OIS" },
  { id: "ois_1y", label: "1Y OIS" },
  { id: "yield_2y", label: "2Y" },
  { id: "yield_5y", label: "5Y" },
  { id: "yield_10y", label: "10Y" },
  { id: "twos10s", label: "2s10s" },
  { id: "breakeven", label: "Breakeven" },
];

export default function RatesMatrixPage() {
  const ctx = useResearchContext();
  const [a, setA] = React.useState("USD");
  const [b, setB] = React.useState("EUR");

  const snap = CURRENCIES.map((c) => {
    const d = getCurrencyData(c.code, ctx.asOfDate);
    const pr = d.series["policy_rate"];
    const z = pr ? zscore(pr.map((o) => o.value ?? 0)).slice(-1)[0] : 0;
    const pct = pr ? percentileRank(pr.map((o) => o.value ?? 0), pr[pr.length - 1].value ?? 0) : 0.5;
    return {
      code: c.code,
      color: c.color,
      vals: Object.fromEntries(METRICS.map((m) => [m.id, latestValue(d.series[m.id])])),
      z,
      pct,
    };
  });

  // A vs B policy divergence
  const da = getCurrencyData(a, ctx.asOfDate);
  const db = getCurrencyData(b, ctx.asOfDate);
  const diffRows = toChartRows(
    { a: da.series["policy_rate"] ?? [], b: db.series["policy_rate"] ?? [] },
    ["a", "b"],
  ).map((r) => ({
    date: r.date,
    diff:
      typeof r.a === "number" && typeof r.b === "number" && !Number.isNaN(r.a) && !Number.isNaN(r.b)
        ? Number(((r.a as number) - (r.b as number)).toFixed(3))
        : NaN,
  }));
  const curDiff =
    latestValue(da.series["policy_rate"]) !== null && latestValue(db.series["policy_rate"]) !== null
      ? Number(
          (latestValue(da.series["policy_rate"])! - latestValue(db.series["policy_rate"])!).toFixed(2),
        )
      : null;

  // Yield curve overlay (2Y & 10Y) across currencies
  const ycRows = (() => {
    const first = getCurrencyData("USD", ctx.asOfDate);
    const dates = (first.series["yield_10y"] ?? []).map((o) => o.observationDate);
    return dates.map((date, i) => {
      const row: Record<string, number | string> = { date };
      CURRENCIES.forEach((c) => {
        const s = getCurrencyData(c.code, ctx.asOfDate).series["yield_10y"];
        row[c.code] = s ? (s[i]?.value ?? NaN) : NaN;
      });
      return row;
    });
  })();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Rates Matrix</h1>
        <p className="text-2xs text-muted">Cross-currency rate comparison · policy / OIS / curve / divergence</p>
      </div>

      <SectionLabel>Cross-Currency Comparison Matrix</SectionLabel>
      <Card>
        <CardHead title="Rate Levels" subtitle="Latest values (mock) · Z = 5Y z-score of policy rate" right={<Badge tone="mock">Mock Data</Badge>} />
        <div className="overflow-x-auto">
          <table className="w-full text-2xs tnum">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-3 py-2 font-medium">Ccy</th>
                {METRICS.map((m) => (
                  <th key={m.id} className="text-right px-3 py-2 font-medium">{m.label}</th>
                ))}
                <th className="text-right px-3 py-2 font-medium">Policy Z</th>
                <th className="text-right px-3 py-2 font-medium">Policy %ile</th>
              </tr>
            </thead>
            <tbody>
              {snap.map((r) => (
                <tr key={r.code} className="border-b border-border/60">
                  <td className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      {r.code}
                    </span>
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.id} className="px-3 py-2 text-right">
                      {r.vals[m.id] === null || r.vals[m.id] === undefined ? "—" : fmtNum(r.vals[m.id], 2)}
                    </td>
                  ))}
                  <td className={cn("px-3 py-2 text-right", r.z > 0 ? "text-pos" : "text-neg")}>
                    {fmtNum(r.z, 2)}
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(r.pct * 100, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionLabel>Policy Divergence — A vs B</SectionLabel>
      <Card>
        <CardHead
          title="Policy Rate Differential"
          subtitle="Implied policy rate of A minus B · current, history, percentile"
          right={
            <div className="flex items-center gap-2 text-2xs">
              <select value={a} onChange={(e) => setA(e.target.value)} className="bg-panel-2 border border-border rounded px-2 py-1">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <span className="text-muted">vs</span>
              <select value={b} onChange={(e) => setB(e.target.value)} className="bg-panel-2 border border-border rounded px-2 py-1">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          }
        />
        <div className="p-3">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <div className="text-2xs text-muted">Current differential</div>
              <div className="text-2xl font-semibold tnum">{curDiff === null ? "—" : `${fmtNum(curDiff, 2)} pp`}</div>
            </div>
            <div className="text-2xs text-muted max-w-md">
              Policy Divergence {a} vs {b} = implied policy rate of {a} − {b}. Standardized (z-score) and
              historical percentile views are reserved for the divergence module; this is a level differential only.
            </div>
          </div>
          <TimeSeriesChart
            id="poldiv"
            data={diffRows}
            series={[{ key: "diff", name: `${a}−${b} (pp)`, color: CURRENCIES.find((c) => c.code === a)!.color }]}
            height={220}
          />
        </div>
      </Card>

      <SectionLabel>Yield Curve Overlay (10Y)</SectionLabel>
      <Card>
        <CardHead title="10Y Sovereign / Agency Yields" subtitle="Comparison across tracked currencies" right={<Badge tone="mock">Mock Data</Badge>} />
        <div className="p-3">
          <TimeSeriesChart
            id="ycov"
            data={ycRows}
            series={CURRENCIES.map((c) => ({ key: c.code, name: c.code, color: c.color }))}
            unit="%"
            height={260}
          />
          <div className="text-2xs text-muted mt-2">
            Different monetary systems use different curve instruments (UST / Bund / JGB / Gilt / CGB / HKD / AGK / SGB).
            Levels are not directly additive — compare via standardized spreads or differentials.
          </div>
        </div>
      </Card>
    </div>
  );
}
