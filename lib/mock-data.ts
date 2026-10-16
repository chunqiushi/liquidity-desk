import {
  CurrencyConfig,
  IndicatorDef,
  NewsItem,
  Observation,
  PolicyEvent,
  ResearchHypothesis,
  ResearchTask,
  WeeklyBrief,
} from "./types";
import { fmtDate } from "./utils";
import { getRealMmObs, MM_OVERRIDE } from "./realdata";

/* ============================================================================
 * Deterministic mock-data engine
 * ----------------------------------------------------------------------------
 * All series are generated from a fixed seed so the prototype is reproducible.
 * Every observation is explicitly tagged sourceKind: "Mock" and dataQuality:
 * "Mock Data". No live market / policy data is fabricated as real.
 * ========================================================================== */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_DAYS = 1300; // ~5Y of daily points

function buildDates(asOf: string): string[] {
  const end = new Date(asOf + "T00:00:00Z");
  const out: string[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Random walk with mild mean reversion toward `base`. */
function genPath(
  seed: number,
  base: number,
  vol: number,
  drift: number,
  floor?: number,
  ceil?: number,
): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const reversion = (base - v) * 0.02;
    v = v + reversion + drift + (rnd() - 0.5) * 2 * vol;
    if (floor !== undefined) v = Math.max(floor, v);
    if (ceil !== undefined) v = Math.min(ceil, v);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

function makeObs(
  seriesId: string,
  currency: string,
  dates: string[],
  values: number[],
  unit: string,
  source: string,
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly",
): Observation[] {
  return dates.map((d, i) => ({
    seriesId,
    value: values[i],
    unit,
    currency,
    observationDate: d,
    releaseDate: d,
    vintageDate: d,
    source,
    sourceKind: "Mock",
    frequency,
    status: "Actual",
    method: "deterministic-mock",
    methodVersion: "v0.1",
    dataQuality: "Mock Data",
  }));
}

/* ----------------------------------------------------------------------------
 * Per-currency base levels (used only to seed the mock random walk)
 * ------------------------------------------------------------------------- */

type BaseMap = Record<string, { base: number; vol: number; drift: number; floor?: number; ceil?: number }>;

const RATE_BASES: Record<string, BaseMap> = {
  USD: {
    policy_rate: { base: 5.375, vol: 0.01, drift: 0 },
    ois_3m: { base: 5.3, vol: 0.02, drift: -0.0008 },
    ois_1y: { base: 4.9, vol: 0.03, drift: -0.0012 },
    yield_2y: { base: 4.6, vol: 0.03, drift: -0.001 },
    yield_5y: { base: 4.25, vol: 0.035, drift: -0.0008 },
    yield_10y: { base: 4.3, vol: 0.04, drift: -0.0006 },
    yield_30y: { base: 4.5, vol: 0.045, drift: -0.0004 },
    twos10s: { base: -0.3, vol: 0.05, drift: 0.0004 },
    short_funding: { base: 5.33, vol: 0.02, drift: 0 },
    funding_spread: { base: -0.045, vol: 0.02, drift: 0 },
    fx_spot: { base: 103.2, vol: 0.15, drift: 0.0002 },
    basis_3m: { base: -8, vol: 0.4, drift: 0.002 },
  },
  EUR: {
    policy_rate: { base: 3.75, vol: 0.01, drift: 0 },
    ois_3m: { base: 3.65, vol: 0.02, drift: -0.001 },
    ois_1y: { base: 3.2, vol: 0.03, drift: -0.0015 },
    yield_2y: { base: 2.9, vol: 0.03, drift: -0.001 },
    yield_5y: { base: 2.6, vol: 0.035, drift: -0.0008 },
    yield_10y: { base: 2.7, vol: 0.04, drift: -0.0006 },
    yield_30y: { base: 3.0, vol: 0.045, drift: -0.0004 },
    twos10s: { base: -0.2, vol: 0.05, drift: 0.0004 },
    short_funding: { base: 3.66, vol: 0.02, drift: 0 },
    funding_spread: { base: -0.01, vol: 0.02, drift: 0 },
    fx_spot: { base: 1.085, vol: 0.004, drift: 0 },
    basis_3m: { base: 12, vol: 0.4, drift: -0.002 },
  },
  HKD: {
    policy_rate: { base: 5.25, vol: 0.01, drift: 0 },
    ois_3m: { base: 5.2, vol: 0.03, drift: 0 },
    ois_1y: { base: 5.0, vol: 0.04, drift: 0 },
    yield_2y: { base: 4.5, vol: 0.04, drift: 0 },
    yield_5y: { base: 4.3, vol: 0.045, drift: 0 },
    yield_10y: { base: 4.4, vol: 0.05, drift: 0 },
    yield_30y: { base: 4.5, vol: 0.06, drift: 0 },
    twos10s: { base: -0.1, vol: 0.06, drift: 0 },
    short_funding: { base: 5.1, vol: 0.05, drift: 0 },
    funding_spread: { base: -0.15, vol: 0.05, drift: 0 },
    fx_spot: { base: 7.81, vol: 0.005, drift: 0 },
    basis_3m: { base: -3, vol: 0.5, drift: 0 },
  },
  JPY: {
    policy_rate: { base: 0.25, vol: 0.005, drift: 0.0004 },
    ois_3m: { base: 0.3, vol: 0.01, drift: 0.0004 },
    ois_1y: { base: 0.55, vol: 0.015, drift: 0.0008 },
    yield_2y: { base: 0.6, vol: 0.015, drift: 0.0008 },
    yield_5y: { base: 0.9, vol: 0.02, drift: 0.001 },
    yield_10y: { base: 1.1, vol: 0.025, drift: 0.0012 },
    yield_30y: { base: 2.1, vol: 0.04, drift: 0.0015 },
    twos10s: { base: 0.5, vol: 0.04, drift: 0.0004 },
    short_funding: { base: 0.28, vol: 0.01, drift: 0.0003 },
    funding_spread: { base: -0.02, vol: 0.01, drift: 0 },
    fx_spot: { base: 143.5, vol: 0.2, drift: 0.0006 },
    basis_3m: { base: -22, vol: 0.6, drift: -0.003 },
  },
  CNH: {
    policy_rate: { base: 1.7, vol: 0.005, drift: 0 },
    ois_3m: { base: 2.1, vol: 0.02, drift: 0 },
    ois_1y: { base: 2.0, vol: 0.03, drift: 0 },
    yield_2y: { base: 1.9, vol: 0.02, drift: 0 },
    yield_5y: { base: 2.1, vol: 0.025, drift: 0 },
    yield_10y: { base: 2.3, vol: 0.03, drift: 0 },
    yield_30y: { base: 2.6, vol: 0.04, drift: 0 },
    twos10s: { base: 0.4, vol: 0.04, drift: 0 },
    short_funding: { base: 1.9, vol: 0.02, drift: 0 },
    funding_spread: { base: 0.2, vol: 0.02, drift: 0 },
    fx_spot: { base: 7.12, vol: 0.01, drift: 0 },
    basis_3m: { base: -15, vol: 0.6, drift: 0 },
  },
  CHF: {
    policy_rate: { base: 1.25, vol: 0.005, drift: 0 },
    ois_3m: { base: 1.2, vol: 0.01, drift: 0 },
    ois_1y: { base: 1.1, vol: 0.015, drift: 0 },
    yield_2y: { base: 0.9, vol: 0.015, drift: 0 },
    yield_5y: { base: 0.7, vol: 0.02, drift: 0 },
    yield_10y: { base: 0.8, vol: 0.025, drift: 0 },
    yield_30y: { base: 1.1, vol: 0.035, drift: 0 },
    twos10s: { base: -0.1, vol: 0.04, drift: 0 },
    short_funding: { base: 1.18, vol: 0.01, drift: 0 },
    funding_spread: { base: -0.02, vol: 0.01, drift: 0 },
    fx_spot: { base: 0.88, vol: 0.004, drift: 0 },
    basis_3m: { base: 5, vol: 0.4, drift: 0 },
  },
  GBP: {
    policy_rate: { base: 5.0, vol: 0.01, drift: 0 },
    ois_3m: { base: 4.9, vol: 0.02, drift: -0.0006 },
    ois_1y: { base: 4.4, vol: 0.03, drift: -0.001 },
    yield_2y: { base: 4.3, vol: 0.03, drift: -0.0008 },
    yield_5y: { base: 4.1, vol: 0.035, drift: -0.0006 },
    yield_10y: { base: 4.2, vol: 0.04, drift: -0.0005 },
    yield_30y: { base: 4.7, vol: 0.045, drift: -0.0003 },
    twos10s: { base: -0.1, vol: 0.05, drift: 0.0003 },
    short_funding: { base: 4.92, vol: 0.02, drift: 0 },
    funding_spread: { base: -0.03, vol: 0.02, drift: 0 },
    fx_spot: { base: 1.295, vol: 0.005, drift: 0 },
    basis_3m: { base: -6, vol: 0.4, drift: 0 },
  },
  AUD: {
    policy_rate: { base: 4.35, vol: 0.01, drift: 0 },
    ois_3m: { base: 4.3, vol: 0.02, drift: 0 },
    ois_1y: { base: 4.1, vol: 0.03, drift: 0 },
    yield_2y: { base: 4.0, vol: 0.03, drift: 0 },
    yield_5y: { base: 4.1, vol: 0.035, drift: 0 },
    yield_10y: { base: 4.3, vol: 0.04, drift: 0 },
    yield_30y: { base: 4.6, vol: 0.05, drift: 0 },
    twos10s: { base: 0.3, vol: 0.05, drift: 0 },
    short_funding: { base: 4.32, vol: 0.02, drift: 0 },
    funding_spread: { base: -0.03, vol: 0.02, drift: 0 },
    fx_spot: { base: 0.67, vol: 0.004, drift: 0 },
    basis_3m: { base: -4, vol: 0.5, drift: 0 },
  },
};

/* ----------------------------------------------------------------------------
 * Currency configuration (localized)
 * ------------------------------------------------------------------------- */

function ind(
  id: string,
  label: string,
  unit: string,
  category: IndicatorDef["category"],
  extra?: Partial<IndicatorDef>,
): IndicatorDef {
  return { id, label, unit, category, ...extra };
}

export const CURRENCIES: CurrencyConfig[] = [
  {
    code: "USD",
    name: "US Dollar",
    centralBank: "Federal Reserve",
    region: "North America",
    regime:
      "Global dollar funding, ample-reserves regime. Watch SOFR, ON RRP, TGA and reserve balances as liquidity drivers.",
    color: "#4f86f7",
    focus: [
      "Fed Funds Target / EFFR / IORB",
      "SOFR & repo market",
      "ON RRP & reserve balances",
      "Treasury General Account & issuance",
      "Cross-currency basis & USD funding stress",
    ],
    indicators: [
      ind("policy_rate", "Fed Funds Target (mid)", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("effr", "EFFR", "%", "Policy", { mockSeries: true }),
      ind("iorb", "IORB", "%", "Policy", { mockSeries: true }),
      ind("sofr", "SOFR", "%", "ShortEnd", { mockSeries: true }),
      ind("on_rrp", "ON RRP Balance", "$bn", "BalanceSheet", { mockSeries: true }),
      ind("reserves", "Reserve Balances", "$bn", "BalanceSheet", { snapshot: true, mockSeries: true }),
      ind("tga", "Treasury General Account", "$bn", "BalanceSheet", { mockSeries: true }),
      ind("fed_assets", "Fed Total Assets", "$bn", "BalanceSheet", { mockSeries: true }),
      ind("ois_3m", "3M OIS", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("ois_1y", "1Y OIS", "%", "ShortEnd", { mockSeries: true }),
      ind("yield_2y", "UST 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_5y", "UST 5Y", "%", "Curve", { mockSeries: true }),
      ind("yield_10y", "UST 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_30y", "UST 30Y", "%", "Curve", { mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("tips_real", "10Y TIPS Real Yield", "%", "Curve", { mockSeries: true }),
      ind("breakeven", "10Y Breakeven", "%", "Curve", { mockSeries: true }),
      ind("fx_spot", "DXY", "idx", "FX", { snapshot: true, mockSeries: true }),
      ind("basis_3m", "USD 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
      ind("bank_credit", "Bank Credit", "$bn", "Banking", { mockSeries: true }),
      ind("deposits", "Deposits", "$bn", "Banking", { mockSeries: true }),
      ind("treasury_issuance", "Net Treasury Issuance", "$bn", "BalanceSheet", { mockSeries: true }),
    ],
  },
  {
    code: "EUR",
    name: "Euro",
    centralBank: "ECB",
    region: "Eurozone",
    regime:
      "Excess-liquidity regime post-APP/PEPP. €STR anchors short end; watch excess liquidity and sovereign spreads.",
    color: "#6a5acd",
    focus: [
      "Deposit Facility Rate / MRO / €STR",
      "Excess Liquidity",
      "APP / PEPP holdings & reinvestment",
      "Bank lending survey",
      "Periphery (IT/FR) vs Germany spreads",
    ],
    indicators: [
      ind("policy_rate", "Deposit Facility Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("mro", "MRO Rate", "%", "Policy", { mockSeries: true }),
      ind("estr", "€STR", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("excess_liquidity", "Excess Liquidity", "€bn", "BalanceSheet", { snapshot: true, mockSeries: true }),
      ind("ecb_assets", "ECB Total Assets", "€bn", "BalanceSheet", { mockSeries: true }),
      ind("app_pepp", "APP+PEPP Holdings", "€bn", "BalanceSheet", { mockSeries: true }),
      ind("tltro", "TLTRO Outstanding", "€bn", "BalanceSheet", { mockSeries: true }),
      ind("m1", "M1", "YoY%", "Banking", { mockSeries: true }),
      ind("m3", "M3", "YoY%", "Banking", { snapshot: true, mockSeries: true }),
      ind("bank_loans", "Bank Loans to HH", "YoY%", "Banking", { mockSeries: true }),
      ind("ois_3m", "3M OIS", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("ois_1y", "1Y OIS", "%", "ShortEnd", { mockSeries: true }),
      ind("yield_2y", "Bund 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_10y", "Bund 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_30y", "Bund 30Y", "%", "Curve", { mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("it_de_spread", "Italy-Germany 10Y", "bp", "Curve", { mockSeries: true }),
      ind("fr_de_spread", "France-Germany 10Y", "bp", "Curve", { mockSeries: true }),
      ind("fx_spot", "EUR/USD", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("eur_eer", "EUR EER", "idx", "FX", { mockSeries: true }),
      ind("basis_3m", "EUR 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
  {
    code: "HKD",
    name: "Hong Kong Dollar",
    centralBank: "HKMA",
    region: "Asia",
    regime:
      "Currency board linked to USD (7.75–7.85). HIBOR/HONIA vs USD rates, Aggregate Balance is the key liquidity gauge.",
    color: "#e07b39",
    focus: [
      "USD/HKD within 7.75–7.85 band",
      "HIBOR vs HONIA",
      "Aggregate Balance & monetary base",
      "HKMA operations",
      "HKD funding stress & capital flows",
    ],
    indicators: [
      ind("policy_rate", "Base Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("usdhkd", "USD/HKD", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("hibor_3m", "HIBOR 3M", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("honia", "HONIA", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("aggregate_balance", "Aggregate Balance", "HK$bn", "BalanceSheet", { snapshot: true, mockSeries: true }),
      ind("monetary_base", "Monetary Base", "HK$bn", "BalanceSheet", { mockSeries: true }),
      ind("hkma_ops", "HKMA Operations", "HK$bn", "BalanceSheet", { mockSeries: true }),
      ind("hkd_deposits", "HKD Deposits", "HK$bn", "Banking", { mockSeries: true }),
      ind("hkd_loans", "HKD Loans", "HK$bn", "Banking", { mockSeries: true }),
      ind("mortgage_rate", "Mortgage Rate", "%", "Banking", { mockSeries: true }),
      ind("yield_2y", "HKD 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_10y", "HKD 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("basis_3m", "HKD 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
      ind("capital_flows", "Capital Flows", "HK$bn", "Macro", { mockSeries: true }),
    ],
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    centralBank: "BoJ",
    region: "Asia",
    regime:
      "Policy normalization underway. TONAR anchors short end; JGB curve steepening and BoJ JGB purchases are key.",
    color: "#d65db1",
    focus: [
      "BoJ Policy Rate & TONAR",
      "JGB 2Y–40Y curve & BoJ purchases",
      "CPI / core CPI & wage (Shunto)",
      "USD/JPY & FX intervention risk",
      "JPY REER & safe-haven flows",
    ],
    indicators: [
      ind("policy_rate", "BoJ Policy Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("tonar", "TONAR", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("boj_assets", "BoJ Total Assets", "¥tn", "BalanceSheet", { mockSeries: true }),
      ind("current_account", "Current Account Balances", "¥tn", "BalanceSheet", { snapshot: true, mockSeries: true }),
      ind("jgb_purchases", "BoJ JGB Purchases", "¥bn", "BalanceSheet", { mockSeries: true }),
      ind("yield_2y", "JGB 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_5y", "JGB 5Y", "%", "Curve", { mockSeries: true }),
      ind("yield_10y", "JGB 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_30y", "JGB 30Y", "%", "Curve", { mockSeries: true }),
      ind("yield_40y", "JGB 40Y", "%", "Curve", { mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("cpi", "CPI", "YoY%", "Macro", { mockSeries: true }),
      ind("core_cpi", "Core CPI", "YoY%", "Macro", { snapshot: true, mockSeries: true }),
      ind("wage_growth", "Wage Growth", "YoY%", "Macro", { mockSeries: true }),
      ind("fx_spot", "USD/JPY", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("jpy_reer", "JPY REER", "idx", "FX", { mockSeries: true }),
      ind("basis_3m", "JPY 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
  {
    code: "CNH",
    name: "Offshore RMB",
    centralBank: "PBoC",
    region: "Asia",
    regime:
      "Managed float. Onshore DR007/R007 vs offshore CNH HIBOR; CNH-CNY spread signals offshore liquidity.",
    color: "#3aa657",
    focus: [
      "PBoC 7D Reverse Repo / MLF",
      "DR007 / R007 / Shibor",
      "CNH HIBOR & CNH-CNY spread",
      "PBoC fixing & FX reserves",
      "Social financing & cross-border flows",
    ],
    indicators: [
      ind("policy_rate", "7D Reverse Repo", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("mlf", "MLF Rate", "%", "Policy", { mockSeries: true }),
      ind("dr007", "DR007", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("r007", "R007", "%", "ShortEnd", { mockSeries: true }),
      ind("shibor_3m", "Shibor 3M", "%", "ShortEnd", { mockSeries: true }),
      ind("cnh_hibor", "CNH HIBOR 3M", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("lpr_1y", "LPR 1Y", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("lpr_5y", "LPR 5Y", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("usdcnh", "USD/CNH", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("usdcny", "USD/CNY", "x", "FX", { mockSeries: true }),
      ind("cnh_cny_spread", "CNH-CNY Spread", "bp", "FX", { snapshot: true, mockSeries: true }),
      ind("pbc_fixing", "PBoC Fixing", "x", "FX", { mockSeries: true }),
      ind("fx_reserves", "FX Reserves", "$bn", "BalanceSheet", { mockSeries: true }),
      ind("m2", "M2", "YoY%", "Banking", { mockSeries: true }),
      ind("social_financing", "Social Financing", "¥tn", "Banking", { snapshot: true, mockSeries: true }),
      ind("rmb_loans", "RMB Loans", "YoY%", "Banking", { mockSeries: true }),
      ind("cross_border", "Cross-Border Flows", "¥bn", "Macro", { mockSeries: true }),
      ind("basis_3m", "CNH 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    centralBank: "SNB",
    region: "Europe",
    regime:
      "SNB uses policy rate + FX interventions. SARON anchors short end; safe-haven flows drive CHF strength.",
    color: "#b08444",
    focus: [
      "SNB Policy Rate & SARON",
      "FX interventions & FX reserves",
      "USD/CHF & EUR/CHF",
      "CHF REER & safe-haven flows",
      "Swiss inflation",
    ],
    indicators: [
      ind("policy_rate", "SNB Policy Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("saron", "SARON", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("snb_assets", "SNB Total Assets", "CHFbn", "BalanceSheet", { mockSeries: true }),
      ind("fx_reserves", "FX Reserves", "CHFbn", "BalanceSheet", { snapshot: true, mockSeries: true }),
      ind("ois_3m", "3M OIS", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("yield_2y", "SGB 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_10y", "SGB 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("fx_spot", "USD/CHF", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("eurchf", "EUR/CHF", "x", "FX", { mockSeries: true }),
      ind("chf_reer", "CHF REER", "idx", "FX", { mockSeries: true }),
      ind("inflation", "CPI", "YoY%", "Macro", { snapshot: true, mockSeries: true }),
      ind("basis_3m", "CHF 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
  {
    code: "GBP",
    name: "British Pound",
    centralBank: "BoE",
    region: "Europe",
    regime:
      "Bank Rate + active QT. SONIA anchors short end; gilt curve, wage & services inflation are key watch.",
    color: "#8e7cc3",
    focus: [
      "Bank Rate & SONIA",
      "APF / QT & gilt issuance",
      "UK CPI / services CPI / wages",
      "Gilt 2Y/10Y/30Y curve",
      "LDI / pension funding risk",
    ],
    indicators: [
      ind("policy_rate", "Bank Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("sonia", "SONIA", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("boe_assets", "BoE Total Assets", "£bn", "BalanceSheet", { mockSeries: true }),
      ind("apf", "APF Holdings", "£bn", "BalanceSheet", { mockSeries: true }),
      ind("gilt_issuance", "Gilt Issuance", "£bn", "BalanceSheet", { mockSeries: true }),
      ind("ois_3m", "3M OIS", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("yield_2y", "Gilt 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_10y", "Gilt 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_30y", "Gilt 30Y", "%", "Curve", { mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("uk_cpi", "CPI", "YoY%", "Macro", { mockSeries: true }),
      ind("services_cpi", "Services CPI", "YoY%", "Macro", { snapshot: true, mockSeries: true }),
      ind("wage_growth", "Wage Growth", "YoY%", "Macro", { mockSeries: true }),
      ind("fx_spot", "GBP/USD", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("eurgbp", "EUR/GBP", "x", "FX", { mockSeries: true }),
      ind("mortgage_rate", "Mortgage Rate", "%", "Banking", { mockSeries: true }),
      ind("basis_3m", "GBP 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    centralBank: "RBA",
    region: "Asia-Pacific",
    regime:
      "Cash rate + OIS. AUD sensitive to China demand, commodity cycle and global carry trades.",
    color: "#c0504d",
    focus: [
      "RBA Cash Rate & AUD OIS",
      "Australian government bond yields",
      "CPI / trimmed-mean / wages",
      "China demand & commodity cycle",
      "Global carry trade & AUD/JPY",
    ],
    indicators: [
      ind("policy_rate", "Cash Rate", "%", "Policy", { snapshot: true, mockSeries: true }),
      ind("ois_3m", "3M OIS", "%", "ShortEnd", { snapshot: true, mockSeries: true }),
      ind("yield_2y", "AGB 2Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_10y", "AGB 10Y", "%", "Curve", { snapshot: true, mockSeries: true }),
      ind("yield_30y", "AGB 30Y", "%", "Curve", { mockSeries: true }),
      ind("twos10s", "2s10s", "pp", "Curve", { snapshot: true, mockSeries: true }),
      ind("cpi", "CPI", "YoY%", "Macro", { mockSeries: true }),
      ind("trimmed_mean", "Trimmed Mean CPI", "YoY%", "Macro", { snapshot: true, mockSeries: true }),
      ind("wage_price", "Wage Price Index", "YoY%", "Macro", { mockSeries: true }),
      ind("employment", "Employment (chg)", "k", "Macro", { mockSeries: true }),
      ind("unemployment", "Unemployment", "%", "Macro", { mockSeries: true }),
      ind("housing_credit", "Housing Credit", "YoY%", "Banking", { mockSeries: true }),
      ind("fx_spot", "AUD/USD", "x", "FX", { snapshot: true, mockSeries: true }),
      ind("audjpy", "AUD/JPY", "x", "FX", { mockSeries: true }),
      ind("iron_ore", "Iron Ore", "$/t", "Macro", { mockSeries: true }),
      ind("china_demand", "China Demand Index", "idx", "Macro", { mockSeries: true }),
      ind("basis_3m", "AUD 3M CCB", "bp", "Funding", { snapshot: true, mockSeries: true }),
    ],
  },
];

export const CURRENCY_MAP: Record<string, CurrencyConfig> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export interface CurrencyData {
  config: CurrencyConfig;
  series: Record<string, Observation[]>;
  snapshot: Record<string, number>;
}

const dataCache: Record<string, CurrencyData> = {};

export function getCurrencyData(code: string, asOf: string): CurrencyData {
  const key = `${code}@${asOf}`;
  if (dataCache[key]) return dataCache[key];
  const config = CURRENCY_MAP[code];
  const dates = buildDates(asOf);
  const series: Record<string, Observation[]> = {};
  const snapshot: Record<string, number> = {};
  const bases = RATE_BASES[code];

  for (const def of config.indicators) {
    if (!def.mockSeries) continue;
    const b = bases?.[def.id];
    if (!b) continue;
    const values = genPath(hashStr(code + def.id), b.base, b.vol, b.drift, b.floor, b.ceil);
    series[def.id] = makeObs(
      def.id,
      code,
      dates,
      values,
      def.unit,
      config.centralBank,
      def.category === "Policy" || def.category === "ShortEnd" || def.category === "Curve" || def.category === "Funding"
        ? "Daily"
        : "Monthly",
    );
    if (def.snapshot) snapshot[def.id] = values[values.length - 1];
  }

  const data: CurrencyData = { config, series, snapshot };

  // 真实数据注入：对存在免费公开源覆盖的货币市场序列，用真实 Observation[] 替换
  // 确定性 Mock（DR007/R007/Shibor3M 来自 CFETS/Shibor；SOFR/EFFR/IORB/ON-RRP/
  // 准备金/TGA/美联储资产来自 FRED）。无真实源的项（如 CN 政策利率、MLF、CNH
  // HIBOR）保持 Mock 并由 UI 标注，绝不以 Mock 冒充真实。
  const overrides = MM_OVERRIDE[code];
  if (overrides) {
    for (const id of Object.keys(overrides)) {
      const obs = getRealMmObs(code, id);
      if (obs && obs.length) {
        series[id] = obs;
        if (obs[obs.length - 1].value !== null) snapshot[id] = obs[obs.length - 1].value as number;
      }
    }
  }

  dataCache[key] = data;
  return data;
}

/* ----------------------------------------------------------------------------
 * Global Monetary Regime (Module A) — shown as Mock Data where generated
 * ------------------------------------------------------------------------- */

export interface RegimeIndicator {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  change: number | null;
  status: "Mock Data" | "N/A" | "Data Pending";
  note: string;
}

export function getGlobalRegime(): RegimeIndicator[] {
  return [
    {
      id: "policy_pricing",
      label: "Global Policy Pricing",
      value: 3.9,
      unit: "avg%",
      change: -0.05,
      status: "Mock Data",
      note: "Simple average of G8 policy rates (mock).",
    },
    {
      id: "funding_stress",
      label: "Global Funding Stress",
      value: 0.18,
      unit: "idx",
      change: 0.02,
      status: "Mock Data",
      note: "Composite of money-market spreads & CCB (mock).",
    },
    {
      id: "liquidity_impulse",
      label: "Global Liquidity Impulse",
      value: null,
      unit: "idx",
      change: null,
      status: "N/A",
      note: "Requires CB balance-sheet & reserve data; not yet wired.",
    },
    {
      id: "usd_funding",
      label: "USD Funding Pressure",
      value: -9.5,
      unit: "bp",
      change: -1.2,
      status: "Mock Data",
      note: "3M USD cross-currency basis (mock).",
    },
    {
      id: "rate_vol",
      label: "Rate Volatility",
      value: 42.0,
      unit: "idx",
      change: 3.1,
      status: "Mock Data",
      note: "Rate volatility proxy (mock).",
    },
    {
      id: "fx_vol",
      label: "FX Volatility",
      value: null,
      unit: "idx",
      change: null,
      status: "Data Pending",
      note: "FX implied volatility feed pending.",
    },
  ];
}

/* ----------------------------------------------------------------------------
 * Currency Monitor snapshot (Module B)
 * ------------------------------------------------------------------------- */

export interface MonitorRow {
  code: string;
  name: string;
  centralBank: string;
  policyRate: number | null;
  marketImplied: number | null;
  y2: number | null;
  y10: number | null;
  twos10s: number | null;
  shortFunding: number | null;
  fundingSpread: number | null;
  fxSpot: number | null;
  chg1w: number | null;
  chg1m: number | null;
  liquidityStatus: string;
  latestEvent: string;
  dataStatus: string;
}

function pctChange(vals: number[] | undefined, days: number): number | null {
  if (!vals || vals.length <= days) return null;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 1 - days];
  if (last === null || prev === null) return null;
  if (prev === 0) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

export function getCurrencyMonitor(asOf: string): MonitorRow[] {
  return CURRENCIES.map((c) => {
    const d = getCurrencyData(c.code, asOf);
    const s = d.series;
    const fx = s["fx_spot"]?.map((o) => o.value ?? 0);
    return {
      code: c.code,
      name: c.name,
      centralBank: c.centralBank,
      policyRate: d.snapshot["policy_rate"] ?? null,
      marketImplied: d.snapshot["ois_3m"] ?? null,
      y2: d.snapshot["yield_2y"] ?? null,
      y10: d.snapshot["yield_10y"] ?? null,
      twos10s: d.snapshot["twos10s"] ?? null,
      shortFunding: d.snapshot["short_funding"] ?? d.snapshot["estr"] ?? d.snapshot["sofr"] ?? d.snapshot["tonar"] ?? d.snapshot["saron"] ?? d.snapshot["sonia"] ?? d.snapshot["hibor_3m"] ?? d.snapshot["dr007"] ?? null,
      fundingSpread: d.snapshot["funding_spread"] ?? null,
      fxSpot: d.snapshot["fx_spot"] ?? null,
      chg1w: pctChange(fx, 7),
      chg1m: pctChange(fx, 30),
      liquidityStatus: "Mock",
      latestEvent: "—",
      dataStatus: "Mock Data",
    };
  });
}

/* ----------------------------------------------------------------------------
 * Upcoming Events (Module D) & News (Currency Detail Section 8)
 * ------------------------------------------------------------------------- */

export const UPCOMING_EVENTS: PolicyEvent[] = [
  { id: "e1", title: "FOMC Meeting", date: "2026-09-29", currency: "USD", priority: "P0", kind: "CentralBank", note: "Decision + SEP. Markets pricing a hold." },
  { id: "e2", title: "BoJ Policy Rate Decision", date: "2026-09-30", currency: "JPY", priority: "P0", kind: "CentralBank", note: "Normalization pace under scrutiny." },
  { id: "e3", title: "ECB Deposit Rate Decision", date: "2026-10-15", currency: "EUR", priority: "P0", kind: "CentralBank", note: "Cut expectations building." },
  { id: "e4", title: "US Treasury Quarterly Refunding", date: "2026-10-01", currency: "USD", priority: "P1", kind: "Fiscal", note: "Issuance guidance; TGA implications." },
  { id: "e5", title: "UK CPI Release", date: "2026-10-08", currency: "GBP", priority: "P1", kind: "Macro", note: "Services CPI key for BoE path." },
  { id: "e6", title: "HKMA Aggregate Balance Watch", date: "2026-09-25", currency: "HKD", priority: "P1", kind: "Liquidity", note: "HIBOR tightness monitor." },
  { id: "e7", title: "PBoC MLF Operation", date: "2026-09-28", currency: "CNH", priority: "P1", kind: "CentralBank", note: "Liquidity injection signal." },
  { id: "e8", title: "SNB FX Intervention Watch", date: "2026-10-12", currency: "CHF", priority: "P2", kind: "CentralBank", note: "CHF strength monitor." },
  { id: "e9", title: "RBA Board Meeting", date: "2026-10-06", currency: "AUD", priority: "P0", kind: "CentralBank", note: "Cash rate decision." },
  { id: "e10", title: "Weekly Research Review", date: "2026-09-25", currency: "GLOBAL", priority: "P2", kind: "Research", note: "Weekly brief draft due." },
];

export const NEWS: NewsItem[] = [
  { id: "n1", title: "Fed officials signal patience on first cut", source: "Reuters", publishedAt: "2026-09-22T14:10:00Z", currency: "USD", category: "Central Bank", priority: "P0", summary: "Speakers emphasized data dependency; labor still firm.", marketRelevance: "High — reprices front-end", relatedIndicators: ["policy_rate", "ois_3m", "yield_2y"], url: "#", read: false, inNotes: false },
  { id: "n2", title: "SOFR spikes on quarter-end funding demand", source: "Bloomberg", publishedAt: "2026-09-22T18:30:00Z", currency: "USD", category: "Funding", priority: "P1", summary: "SOFR printed above IORB; ON RRP uptake rose.", marketRelevance: "Medium — liquidity", relatedIndicators: ["sofr", "on_rrp", "reserves"], url: "#", read: false, inNotes: false },
  { id: "n3", title: "ECB cuts deposit rate by 25bp", source: "ECB", publishedAt: "2026-09-11T12:15:00Z", currency: "EUR", priority: "P0", category: "Central Bank", summary: "Deposit facility to 3.50%; guidance data-dependent.", marketRelevance: "High — front-end", relatedIndicators: ["policy_rate", "estr", "yield_2y"], url: "#", read: true, inNotes: false },
  { id: "n4", title: "Bund yields edge higher on fiscal concerns", source: "FT", publishedAt: "2026-09-20T09:00:00Z", currency: "EUR", priority: "P1", category: "Macro Data", summary: "France-Germany spread widens to 78bp.", marketRelevance: "Medium", relatedIndicators: ["fr_de_spread", "yield_10y"], url: "#", read: false, inNotes: false },
  { id: "n5", title: "HKMA withdraws liquidity as HIBOR jumps", source: "SCMP", publishedAt: "2026-09-21T03:30:00Z", currency: "HKD", priority: "P1", category: "Liquidity", summary: "Aggregate balance fell; HIBOR 3M +40bp.", marketRelevance: "Medium — HKD funding", relatedIndicators: ["aggregate_balance", "hibor_3m", "usdhkd"], url: "#", read: false, inNotes: false },
  { id: "n6", title: "BoJ trims JGB purchases, yen volatile", source: "Nikkei", publishedAt: "2026-09-19T01:00:00Z", currency: "JPY", priority: "P0", category: "Central Bank", summary: "USD/JPY back above 143; intervention risk flagged.", marketRelevance: "High — FX", relatedIndicators: ["yield_10y", "fx_spot", "basis_3m"], url: "#", read: false, inNotes: true },
  { id: "n7", title: "PBoC fixes stronger, CNH liquidity eases", source: "Reuters", publishedAt: "2026-09-22T01:30:00Z", currency: "CNH", priority: "P1", category: "FX Policy", summary: "CNH HIBOR normalizes; CNH-CNY spread narrows.", marketRelevance: "Medium", relatedIndicators: ["cnh_hibor", "cnh_cny_spread", "usdcnh"], url: "#", read: false, inNotes: false },
  { id: "n8", title: "SNB flags readiness to intervene on CHF", source: "SNB", publishedAt: "2026-09-18T08:00:00Z", currency: "CHF", priority: "P2", category: "FX Policy", summary: "CHF REER elevated; safe-haven inflows.", marketRelevance: "Low-Medium", relatedIndicators: ["fx_reserves", "chf_reer", "eurchf"], url: "#", read: true, inNotes: false },
  { id: "n9", title: "BoE holds; wage growth still sticky", source: "BoE", publishedAt: "2026-09-18T11:00:00Z", currency: "GBP", priority: "P0", category: "Central Bank", summary: "Bank Rate 5.00%; services CPI 5.6%.", marketRelevance: "High — front-end", relatedIndicators: ["policy_rate", "sonia", "services_cpi"], url: "#", read: false, inNotes: false },
  { id: "n10", title: "RBA flags China demand risks to AUD", source: "RBA", publishedAt: "2026-09-17T02:30:00Z", currency: "AUD", priority: "P1", category: "Macro Data", summary: "Iron ore soft; carry trade positioning heavy.", marketRelevance: "Medium — AUD", relatedIndicators: ["fx_spot", "iron_ore", "china_demand"], url: "#", read: false, inNotes: false },
  { id: "n11", title: "Cross-currency basis widens for USD", source: "Bloomberg", publishedAt: "2026-09-22T16:00:00Z", currency: "GLOBAL", priority: "P1", category: "Funding", summary: "3M USD CCB to -10bp; quarter-end pressure.", marketRelevance: "Medium — global funding", relatedIndicators: ["basis_3m"], url: "#", read: false, inNotes: false },
  { id: "n12", title: "Global risk appetite stabilizes", source: "Reuters", publishedAt: "2026-09-23T07:00:00Z", currency: "GLOBAL", priority: "P2", category: "Global Risk", summary: "VIX off lows; carry unwind paused.", marketRelevance: "Low", relatedIndicators: ["fx_spot"], url: "#", read: false, inNotes: false },
];

/* ----------------------------------------------------------------------------
 * Research focus prompts (Module E)
 * ------------------------------------------------------------------------- */

export const RESEARCH_FOCUS: string[] = [
  "Is the global rate path diverging (USD hold vs EUR/GBP cuts)?",
  "Has USD funding pressure changed into quarter-end?",
  "Are central-bank balance-sheet changes transmitting to money markets?",
  "Are CNH and HKD showing abnormal offshore liquidity shifts?",
  "Do rate differentials explain recent FX moves?",
];

/* ----------------------------------------------------------------------------
 * Seed research items (spec §12)
 * ------------------------------------------------------------------------- */

export const SEED_TASKS: ResearchTask[] = [
  {
    id: "t1",
    title: "USD funding stress into quarter-end",
    researchQuestion: "Is the 3M USD CCB widening a liquidity signal or idiosyncratic?",
    hypothesis: "Quarter-end balance-sheet effects dominate; should normalize in October.",
    currency: "USD",
    assetClass: "Funding",
    priority: "P1",
    status: "In Progress",
    evidence: ["basis_3m at -10bp", "SOFR>IORB print"],
    relatedIndicators: ["basis_3m", "sofr", "on_rrp"],
    relatedNews: ["n2", "n11"],
    nextAction: "Track CCB daily through Sep-30; compare to prior quarter-ends.",
    reviewDate: "2026-09-30",
    conclusion: "",
    confidence: 0.45,
    openQuestions: ["Will TGA draw support reserves?"],
    createdAt: "2026-09-22",
  },
  {
    id: "t2",
    title: "BoJ normalization & JPY carry",
    researchQuestion: "How sensitive is AUD/JPY carry to further BoJ hikes?",
    hypothesis: "A 25bp hike + JGB purchase trim pushes USD/JPY toward 140.",
    currency: "JPY",
    assetClass: "FX",
    priority: "P0",
    status: "Hypothesis",
    evidence: ["USD/JPY > 143", "BoJ purchase trim"],
    relatedIndicators: ["policy_rate", "fx_spot", "yield_10y"],
    relatedNews: ["n6"],
    nextAction: "Build JPY OIS path vs USD; map to AUD/JPY.",
    reviewDate: "2026-09-30",
    conclusion: "",
    confidence: 0.4,
    openQuestions: ["Intervention threshold?"],
    createdAt: "2026-09-19",
  },
];

export const SEED_HYPOTHESES: ResearchHypothesis[] = [
  {
    id: "h1",
    statement: "ECB cuts will steepen the EUR 2s10s via front-end repricing.",
    currency: "EUR",
    assetClass: "Curve",
    linkedTasks: ["t1"],
    status: "Testing",
    evidenceFor: ["Deposit rate cut priced", "Bund 2Y lower"],
    evidenceAgainst: ["Supply pressure on long end"],
  },
];

export const SEED_BRIEF: WeeklyBrief = {
  id: "wb1",
  weekOf: "2026-09-22",
  status: "Draft",
  version: 1,
  sections: [
    "Executive Summary",
    "Global Monetary Regime",
    "Policy Divergence",
    "Liquidity & Funding Conditions",
    "Currency-Specific Developments",
    "FX Relative Value",
    "Key Risks",
    "Upcoming Events",
    "Research Conclusions",
    "Open Questions for Next Week",
  ],
  blocks: [],
};

export const DATA_COVERAGE = {
  currencies: CURRENCIES.length,
  indicators: CURRENCIES.reduce((a, c) => a + c.indicators.length, 0),
  events: UPCOMING_EVENTS.length,
  news: NEWS.length,
};
