"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  CURRENCIES,
  getCurrencyData,
  NEWS,
  UPCOMING_EVENTS,
} from "@/lib/mock-data";
import { mmIsReal } from "@/lib/realdata";
import { useResearchContext, useResearchData } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, Button, SectionLabel, EmptyOrPending } from "@/components/ui";
import { TimeSeriesChart, BarMini } from "@/components/charts";
import { toChartRows, latestValue, changePct } from "@/lib/series";
import { fmtDate, fmtDateTime, fmtNum, fmtPct, cn } from "@/lib/utils";

function Stat({
  label,
  value,
  unit,
  status = "Mock Data",
  sub,
}: {
  label: string;
  value: number | null;
  unit?: string;
  status?: string;
  sub?: string;
}) {
  return (
    <div className="border border-border rounded p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-muted">{label}</span>
        <DataStatusBadge status={status} />
      </div>
      <div className="text-xl font-semibold tnum mt-1">
        {value === null ? "—" : fmtNum(value, 2)}
        {unit ? <span className="text-2xs text-muted ml-1">{unit}</span> : null}
      </div>
      {sub ? <div className="text-2xs text-muted mt-0.5">{sub}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle} right={right} />
      <div className="p-3">{children}</div>
    </Card>
  );
}

export default function CurrencyDetailPage() {
  const params = useParams<{ slug: string }>();
  const code = String(params.slug).toUpperCase();
  const ctx = useResearchContext();
  const data = useResearchData();
  const cfg = CURRENCIES.find((c) => c.code === code);

  if (!cfg) {
    return (
      <div className="text-sm text-muted">
        Unknown currency <span className="font-semibold">{code}</span>.{" "}
        <Link href="/" className="text-accent hover:underline">
          Back to overview
        </Link>
      </div>
    );
  }

  const d = getCurrencyData(code, ctx.asOfDate);
  const has = (id: string) => Boolean(d.series[id]);
  const val = (id: string) => latestValue(d.series[id]);
  // 真实/模拟状态：优先数据源（Wind / FRED / akshare 等）已覆盖的序列标「真实」。
  const realId = (id: string) => mmIsReal(code, id);
  const statusFor = (...ids: string[]) => (ids.some(realId) ? "Real Data" : "Mock Data");

  const nextMeeting = UPCOMING_EVENTS.find(
    (e) => e.currency === code && e.kind === "CentralBank",
  );

  // Curve tenors
  const curveTenors = ["yield_2y", "yield_5y", "yield_10y", "yield_30y", "yield_40y"].filter(
    (t) => has(t),
  );
  const curveData = curveTenors.map((t) => ({
    label: t.replace("yield_", "").toUpperCase(),
    value: val(t) ?? 0,
  }));

  // Balance-sheet series available
  const bsIds = [
    "fed_assets",
    "ecb_assets",
    "boj_assets",
    "snb_assets",
    "boe_assets",
    "reserves",
    "aggregate_balance",
    "excess_liquidity",
    "fx_reserves",
    "tga",
    "on_rrp",
    "app_pepp",
    "tltro",
    "current_account",
    "monetary_base",
    "apf",
    "gilt_issuance",
  ].filter((id) => has(id));

  const news = NEWS.filter((n) => n.currency === code || n.currency === "GLOBAL");
  const tasks = data.tasks.filter((t) => t.currency === code);
  const notes = data.notes.filter((n) => n.currency === code);

  const [noteText, setNoteText] = React.useState("");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
            <h1 className="text-lg font-semibold">{code}</h1>
            <span className="text-muted text-sm">{cfg.name}</span>
            <Badge tone="accent">{cfg.centralBank}</Badge>
          </div>
          <p className="text-2xs text-muted mt-1 max-w-2xl">{cfg.regime}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {CURRENCIES.map((c) => (
            <Link
              key={c.code}
              href={`/currency/${c.code}`}
              className={cn(
                "text-2xs px-2 py-1 rounded border",
                c.code === code
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "border-border text-muted hover:text-content",
              )}
            >
              {c.code}
            </Link>
          ))}
        </div>
      </div>

      {/* Section 1 — Policy Dashboard */}
      <SectionLabel>1 · Policy Dashboard</SectionLabel>
      <SectionCard
        title="Policy Dashboard"
        subtitle="Policy rate, market-implied path, stance"
        right={
          <div className="flex items-center gap-2">
            <Badge tone="accent">{nextMeeting ? `Next: ${fmtDate(nextMeeting.date)}` : "Next: —"}</Badge>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="Policy Rate" value={val("policy_rate")} unit="%" status={statusFor("policy_rate")} />
          <Stat label="Market-Implied (3M OIS)" value={val("ois_3m")} unit="%" />
          <Stat
            label="Policy–Market Spread"
            value={
              val("policy_rate") !== null && val("ois_3m") !== null
                ? Number((val("policy_rate")! - val("ois_3m")!).toFixed(2))
                : null
            }
            unit="pp"
          />
          <Stat label="Policy Stance" value={null} status="Mock Data" sub="Hold / data-dependent" />
          {has("lpr_1y") || has("lpr_5y") ? (
            <>
              <Stat label="LPR 1Y" value={val("lpr_1y")} unit="%" status={statusFor("lpr_1y")} />
              <Stat label="LPR 5Y" value={val("lpr_5y")} unit="%" status={statusFor("lpr_5y")} />
            </>
          ) : null}
        </div>
        {has("policy_rate") ? (
          <TimeSeriesChart
            id={`pol-${code}`}
            data={toChartRows(d.series, ["policy_rate", "ois_3m"])}
            series={[
              { key: "policy_rate", name: "Policy Rate", color: cfg.color },
              { key: "ois_3m", name: "3M OIS", color: "#94a3b8", dashed: true },
            ]}
            unit="%"
            height={200}
          />
        ) : (
          <EmptyOrPending label="Policy rate history pending source wiring" />
        )}
      </SectionCard>

      {/* Section 2 — Short-End Rates */}
      <SectionLabel>2 · Short-End Rates</SectionLabel>
      <SectionCard title="Short-End Rates" subtitle="Overnight, OIS, policy–market gap, anomalies">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="Overnight" value={val("sofr") ?? val("estr") ?? val("tonar") ?? val("saron") ?? val("sonia") ?? val("honia") ?? val("dr007") ?? null} unit="%" status={statusFor("sofr", "estr", "tonar", "saron", "sonia", "honia", "dr007")} />
          <Stat label="3M OIS" value={val("ois_3m")} unit="%" />
          <Stat label="1Y OIS" value={val("ois_1y")} unit="%" />
          <Stat label="Funding Spread" value={val("funding_spread")} unit="pp" />
        </div>
        {has("short_funding") || has("ois_3m") ? (
          <TimeSeriesChart
            id={`se-${code}`}
            data={toChartRows(d.series, ["short_funding", "ois_3m", "policy_rate"].filter((id) => has(id)))}
            series={[
              { key: "short_funding", name: "Short Funding", color: cfg.color },
              { key: "ois_3m", name: "3M OIS", color: "#e0a458" },
              { key: "policy_rate", name: "Policy", color: "#94a3b8", dashed: true },
            ].filter((s) => has(s.key))}
            unit="%"
            height={200}
          />
        ) : (
          <EmptyOrPending />
        )}
      </SectionCard>

      {/* Section 3 — Yield Curve */}
      <SectionLabel>3 · Yield Curve</SectionLabel>
      <SectionCard title="Yield Curve" subtitle="Tenors, 2s10s, 5s30s, real & breakeven">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <Stat label="2Y" value={val("yield_2y")} unit="%" />
          <Stat label="10Y" value={val("yield_10y")} unit="%" />
          <Stat label="2s10s" value={val("twos10s")} unit="pp" />
          <Stat label="Real Yield" value={val("tips_real") ?? val("breakeven") ?? null} unit="%" sub={has("tips_real") ? "10Y TIPS" : "breakeven proxy"} />
          <Stat label="Breakeven" value={val("breakeven")} unit="%" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-2xs text-muted mb-1">Current curve</div>
            {curveData.length ? (
              <BarMini data={curveData} color={cfg.color} height={180} />
            ) : (
              <EmptyOrPending label="Curve tenors pending" />
            )}
          </div>
          <div>
            <div className="text-2xs text-muted mb-1">2Y vs 10Y history</div>
            {has("yield_2y") && has("yield_10y") ? (
              <TimeSeriesChart
                id={`yc-${code}`}
                data={toChartRows(d.series, ["yield_2y", "yield_10y"])}
                series={[
                  { key: "yield_2y", name: "2Y", color: cfg.color },
                  { key: "yield_10y", name: "10Y", color: "#94a3b8" },
                ]}
                unit="%"
                height={180}
              />
            ) : (
              <EmptyOrPending />
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 4 — Central Bank Balance Sheet */}
      <SectionLabel>4 · Central Bank Balance Sheet</SectionLabel>
      <SectionCard
        title="Central Bank Balance Sheet"
        subtitle="Holdings, reserves, FX reserves, QT/QE status"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="Total Assets" value={val(bsIds[0])} unit="" status={statusFor(bsIds[0])} />
          <Stat
            label="Reserves / Aggregate Bal."
            value={val("reserves") ?? val("aggregate_balance") ?? val("excess_liquidity") ?? null}
            status={statusFor("reserves", "aggregate_balance", "excess_liquidity")}
          />
          <Stat label="FX Reserves" value={val("fx_reserves")} />
          <Stat label="Gov Deposits / TGA" value={val("tga")} status={statusFor("tga")} />
        </div>
        <div className="text-2xs text-muted mb-1">QT / QE status: <span className="text-content">Active runoff (mock)</span></div>
        {bsIds.length ? (
          <TimeSeriesChart
            id={`bs-${code}`}
            data={toChartRows(d.series, bsIds.slice(0, 3))}
            series={bsIds.slice(0, 3).map((id) => ({
              key: id,
              name: d.config.indicators.find((i) => i.id === id)?.label ?? id,
              color: cfg.color,
            }))}
            height={200}
          />
        ) : (
          <EmptyOrPending label="Balance-sheet components pending source wiring" />
        )}
      </SectionCard>

      {/* Section 5 — Banking & Money Market Liquidity */}
      <SectionLabel>5 · Banking & Money Market Liquidity</SectionLabel>
      <SectionCard title="Banking & Money Market Liquidity" subtitle="Reserves, deposits, loans, money supply">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="Deposits" value={val("deposits") ?? val("hkd_deposits") ?? val("m2")} />
          <Stat label="Loans" value={val("hkd_loans") ?? val("bank_loans") ?? val("housing_credit")} />
          <Stat label="Money Supply (M2/M3)" value={val("m2") ?? val("m3")} unit="%" sub="YoY%" />
          <Stat label="Funding Spread" value={val("funding_spread")} unit="pp" />
        </div>
        {has("deposits") || has("m2") || has("hkd_deposits") ? (
          <TimeSeriesChart
            id={`bk-${code}`}
            data={toChartRows(d.series, ["deposits", "m2", "hkd_deposits"].filter((id) => has(id)))}
            series={["deposits", "m2", "hkd_deposits"]
              .filter((id) => has(id))
              .map((id) => ({
                key: id,
                name: d.config.indicators.find((i) => i.id === id)?.label ?? id,
                color: cfg.color,
              }))}
            height={180}
          />
        ) : (
          <EmptyOrPending label="Banking series pending (money-supply feed not wired)" />
        )}
      </SectionCard>

      {/* Section 6 — Funding Conditions */}
      <SectionLabel>6 · Funding Conditions</SectionLabel>
      <SectionCard title="Funding Conditions" subtitle="Cross-currency basis, FX swap, bank funding spread">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="3M CCB Basis" value={val("basis_3m")} unit="bp" sub="lower = tighter USD" />
          <Stat label="Bank Funding Spread" value={null} status="Data Pending" />
          <Stat label="Credit Spread" value={null} status="Data Pending" />
          <Stat label="Short Funding Pressure" value={val("funding_spread")} unit="pp" />
        </div>
        {has("basis_3m") ? (
          <TimeSeriesChart
            id={`fd-${code}`}
            data={toChartRows(d.series, ["basis_3m"])}
            series={[{ key: "basis_3m", name: "3M CCB (bp)", color: cfg.color }]}
            unit="bp"
            height={180}
          />
        ) : (
          <EmptyOrPending />
        )}
      </SectionCard>

      {/* Section 7 — FX Relative Value */}
      <SectionLabel>7 · FX Relative Value</SectionLabel>
      <SectionCard title="FX Relative Value" subtitle="Spot, crosses, REER, rate & real-rate diff, carry, vol">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Stat label="FX Spot" value={val("fx_spot") ?? val("usdcnh") ?? val("usdhkd")} />
          <Stat label="Cross" value={val("eurchf") ?? val("audjpy") ?? val("eurgbp") ?? val("usdcny")} />
          <Stat label="REER / NEER" value={val("chf_reer") ?? val("jpy_reer") ?? val("eur_eer")} unit="idx" />
          <Stat label="Carry / Vol" value={null} status="Data Pending" />
        </div>
        {has("fx_spot") ? (
          <TimeSeriesChart
            id={`fx-${code}`}
            data={toChartRows(d.series, ["fx_spot"])}
            series={[{ key: "fx_spot", name: `${code} FX`, color: cfg.color }]}
            height={180}
          />
        ) : (
          <EmptyOrPending />
        )}
      </SectionCard>

      {/* Section 8 — Key News */}
      <SectionLabel>8 · Key News</SectionLabel>
      <SectionCard title="Key News" subtitle={`${news.length} items · categorized`}>
        <div className="space-y-2">
          {news.length === 0 ? (
            <EmptyOrPending label="No news for this currency in mock set" />
          ) : (
            news.map((n) => (
              <div key={n.id} className="border border-border rounded p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-medium">{n.title}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone={n.priority === "P0" ? "neg" : n.priority === "P1" ? "warn" : "neutral"}>
                      {n.priority}
                    </Badge>
                    <Badge tone="accent">{n.category}</Badge>
                  </div>
                </div>
                <div className="text-2xs text-muted mt-1 flex flex-wrap gap-x-3">
                  <span>{n.source}</span>
                  <span>{fmtDateTime(n.publishedAt)}</span>
                  <span>rel: {n.marketRelevance}</span>
                  <span>ind: {n.relatedIndicators.join(", ")}</span>
                </div>
                <p className="text-2xs text-content/80 mt-1">{n.summary}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("text-2xs", n.read ? "text-muted" : "text-accent")}>
                    {n.read ? "read" : "unread"}
                  </span>
                  <span className={cn("text-2xs", n.inNotes ? "text-accent" : "text-muted")}>
                    {n.inNotes ? "in notes" : "not in notes"}
                  </span>
                  <a href={n.url} className="text-2xs text-accent hover:underline ml-auto inline-flex items-center gap-0.5">
                    source <ArrowUpRight size={10} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* Section 9 — Research Notes */}
      <SectionLabel>9 · Research Notes</SectionLabel>
      <SectionCard title="Research Notes" subtitle="Hypotheses, evidence, related tasks">
        <div className="flex gap-2 mb-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Add a research observation for ${code}…`}
            className="flex-1 bg-panel-2 border border-border rounded text-2xs p-2 text-content focus:outline-none focus:border-accent resize-none"
            rows={2}
          />
          <Button
            variant="primary"
            onClick={() => {
              if (noteText.trim()) {
                data.addNote(code, noteText.trim());
                setNoteText("");
              }
            }}
          >
            Add note
          </Button>
        </div>
        <div className="space-y-1 mb-3">
          {notes.length === 0 ? (
            <div className="text-2xs text-muted">No notes yet for {code}.</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="text-2xs border border-border rounded p-2">
                <span className="text-muted mr-2">{fmtDateTime(n.createdAt)}</span>
                {n.text}
              </div>
            ))
          )}
        </div>
        <div className="text-2xs text-muted mb-1">Linked research tasks ({tasks.length})</div>
        <div className="space-y-1">
          {tasks.map((t) => (
            <div key={t.id} className="text-2xs border border-border rounded p-2 flex items-center justify-between">
              <span className="font-medium text-content">{t.title}</span>
              <Badge tone="neutral">{t.status}</Badge>
            </div>
          ))}
          {tasks.length === 0 ? <div className="text-2xs text-muted">None.</div> : null}
        </div>
      </SectionCard>
    </div>
  );
}
