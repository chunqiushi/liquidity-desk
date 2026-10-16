"use client";

import * as React from "react";
import { CURRENCIES, getCurrencyData } from "@/lib/mock-data";
import { useResearchContext } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, SectionLabel, EmptyOrPending } from "@/components/ui";
import { TimeSeriesChart } from "@/components/charts";
import { toChartRows, changePct, latestValue } from "@/lib/series";
import { fmtNum, fmtPct } from "@/lib/utils";

const TOTAL_ASSET_ID: Record<string, string> = {
  USD: "fed_assets",
  EUR: "ecb_assets",
  JPY: "boj_assets",
  CHF: "snb_assets",
  GBP: "boe_assets",
};

export default function LiquidityMonitorPage() {
  const ctx = useResearchContext();

  const bsRows = CURRENCIES.map((c) => {
    const d = getCurrencyData(c.code, ctx.asOfDate);
    const id = TOTAL_ASSET_ID[c.code];
    const obs = id ? d.series[id] : undefined;
    return {
      code: c.code,
      color: c.color,
      label: d.config.indicators.find((i) => i.id === id)?.label ?? "Total Assets",
      value: obs ? latestValue(obs) : null,
      chg1m: obs ? changePct(obs, 30) : null,
      qt: "Runoff (mock)",
    };
  }).filter((r) => r.value !== null);

  const assetChartRows = (() => {
    const ids = Object.entries(TOTAL_ASSET_ID);
    const firstCode = ids[0][0];
    const first = getCurrencyData(firstCode, ctx.asOfDate);
    const base = first.series[TOTAL_ASSET_ID[firstCode]] ?? [];
    const dates = base.map((o) => o.observationDate);
    return dates.map((date, i) => {
      const row: Record<string, number | string> = { date };
      ids.forEach(([code, id]) => {
        const s = getCurrencyData(code, ctx.asOfDate).series[id];
        row[code] = s ? (s[i]?.value ?? NaN) : NaN;
      });
      return row;
    });
  })();

  const mmRows = CURRENCIES.map((c) => {
    const d = getCurrencyData(c.code, ctx.asOfDate);
    const v = latestValue(d.series["short_funding"] ?? d.series["estr"] ?? d.series["sofr"] ?? d.series["tonar"] ?? d.series["saron"] ?? d.series["sonia"] ?? d.series["hibor_3m"] ?? d.series["dr007"]);
    return { code: c.code, color: c.color, value: v };
  });

  const mmChartRows = (() => {
    const first = getCurrencyData("USD", ctx.asOfDate);
    const dates = (first.series["short_funding"] ?? []).map((o) => o.observationDate);
    return dates.map((date, i) => {
      const row: Record<string, number | string> = { date };
      CURRENCIES.forEach((c) => {
        const s = getCurrencyData(c.code, ctx.asOfDate).series["short_funding"];
        row[c.code] = s ? (s[i]?.value ?? NaN) : NaN;
      });
      return row;
    });
  })();

  const ccbRows = (() => {
    const first = getCurrencyData("USD", ctx.asOfDate);
    const dates = (first.series["basis_3m"] ?? []).map((o) => o.observationDate);
    return dates.map((date, i) => {
      const row: Record<string, number | string> = { date };
      CURRENCIES.forEach((c) => {
        const s = getCurrencyData(c.code, ctx.asOfDate).series["basis_3m"];
        row[c.code] = s ? (s[i]?.value ?? NaN) : NaN;
      });
      return row;
    });
  })();

  const usd = getCurrencyData("USD", ctx.asOfDate);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Liquidity Monitor</h1>
        <p className="text-2xs text-muted">Central-bank balance sheets, reserves, money market, repo, banking, fiscal, cross-currency</p>
      </div>

      <SectionLabel>Central Bank Balance Sheet Changes</SectionLabel>
      <Card>
        <CardHead title="Total Assets & QT Status" subtitle="Latest level + 1M change · QT/QE status" right={<Badge tone="mock">Mock Data</Badge>} />
        <div className="overflow-x-auto">
          <table className="w-full text-2xs tnum">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-3 py-2 font-medium">Ccy</th>
                <th className="text-left px-3 py-2 font-medium">Series</th>
                <th className="text-right px-3 py-2 font-medium">Level</th>
                <th className="text-right px-3 py-2 font-medium">1M %</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bsRows.map((r) => (
                <tr key={r.code} className="border-b border-border/60">
                  <td className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} /> {r.code}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{r.label}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(r.value, 0)}</td>
                  <td className={r.chg1m !== null && r.chg1m >= 0 ? "px-3 py-2 text-right text-pos" : "px-3 py-2 text-right text-neg"}>
                    {r.chg1m === null ? "—" : fmtPct(r.chg1m, 1)}
                  </td>
                  <td className="px-3 py-2"><Badge tone="warn">{r.qt}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <div className="text-2xs text-muted mb-1">Total assets overlay (levels, not normalized)</div>
          <TimeSeriesChart
            id="bsall"
            data={assetChartRows}
            series={bsRows.map((r) => ({ key: r.code, name: r.code, color: r.color }))}
            height={220}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionLabel className="lg:col-span-2">Money Market Rates</SectionLabel>
        <Card>
          <CardHead title="Short-End Funding Rates" subtitle="Overnight / effective rates by currency" />
          <div className="p-3 space-y-1">
            {mmRows.map((r) => (
              <div key={r.code} className="flex items-center justify-between text-2xs border-b border-border/40 pb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color }} /> {r.code}
                </span>
                <span className="tnum font-semibold">{r.value === null ? "—" : fmtNum(r.value, 2)} %</span>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3">
            <TimeSeriesChart id="mmall" data={mmChartRows} series={mmRows.map((r) => ({ key: r.code, name: r.code, color: r.color }))} unit="%" height={200} />
          </div>
        </Card>

        <Card>
          <CardHead title="Cross-Currency Basis" subtitle="3M USD basis (bp) · lower = tighter USD funding" />
          <div className="p-3">
            <TimeSeriesChart id="ccball" data={ccbRows} series={CURRENCIES.map((c) => ({ key: c.code, name: c.code, color: c.color }))} unit="bp" height={260} />
          </div>
        </Card>
      </div>

      <SectionLabel>Fiscal & Banking (USD focus)</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHead title="Treasury General Account" right={<DataStatusBadge status="Mock Data" />} />
          <div className="p-3">
            <div className="text-2xl font-semibold tnum">
              {fmtNum(latestValue(usd.series["tga"]), 0)}
              <span className="text-2xs text-muted ml-1">$bn</span>
            </div>
            <div className="text-2xs text-muted mt-1">TGA draw supports reserves; build drains them.</div>
          </div>
        </Card>
        <Card>
          <CardHead title="ON RRP" right={<DataStatusBadge status="Mock Data" />} />
          <div className="p-3">
            <div className="text-2xl font-semibold tnum">
              {fmtNum(latestValue(usd.series["on_rrp"]), 0)}
              <span className="text-2xs text-muted ml-1">$bn</span>
            </div>
            <div className="text-2xs text-muted mt-1">Primary marginal liquidity absorber.</div>
          </div>
        </Card>
        <Card>
          <CardHead title="Reserve Balances" right={<DataStatusBadge status="Mock Data" />} />
          <div className="p-3">
            <div className="text-2xl font-semibold tnum">
              {fmtNum(latestValue(usd.series["reserves"]), 0)}
              <span className="text-2xs text-muted ml-1">$bn</span>
            </div>
            <div className="text-2xs text-muted mt-1">Ample-reserves regime monitor.</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Banking & Credit" subtitle="Deposits / loans / money supply" />
        <div className="p-3"><EmptyOrPending label="Banking-flow feed (deposits, loans, credit) pending wiring for non-USD currencies" /></div>
      </Card>
    </div>
  );
}
