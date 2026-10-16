import { getCurrencyData, CURRENCY_MAP } from "./mock-data";
import { Observation } from "./types";
import { latestValue, changePct, calDelta, calPct } from "./series";
import { getCycle, ECO_ORDER, ECO_CONFIG } from "./cycle";
import { mmIsReal } from "./realdata";

/* ============================================================================
 * Global Regime + Global Money Market + What Changed
 * All values are derived from existing deterministic Mock series. Clearly
 * tagged Mock. No composite "global score" is produced.
 * ========================================================================== */

export type Period = "1D" | "1W" | "1M";
export const PERIOD_DAYS: Record<Period, number> = { "1D": 1, "1W": 7, "1M": 30 };

/* ---- deterministic mock generator for Growth / Inflation (no real series) ---- */
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
function genMock(seed: number, base: number, vol: number, drift: number, n: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    const rev = (base - v) * 0.02;
    v = v + rev + drift + (rnd() - 0.5) * 2 * vol;
    out.push(Number(v.toFixed(4)));
  }
  return out;
}
function mockObs(code: string, dim: string, base: number, vol: number, dates: string[]): Observation[] {
  const vals = genMock(hashStr(code + dim), base, vol, 0, dates.length);
  const d = getCurrencyData(code, dates[dates.length - 1]);
  return dates.map((dt, i) => ({
    seriesId: dim,
    value: vals[i],
    unit: "%",
    currency: code,
    observationDate: dt,
    releaseDate: dt,
    vintageDate: dt,
    source: d.config.centralBank,
    sourceKind: "Mock",
    frequency: "Monthly",
    status: "Actual",
    method: "deterministic-mock",
    methodVersion: "v0.1",
    dataQuality: "Mock Data",
  }));
}

function diff(series: Observation[] | undefined, days: number): number | null {
  if (!series || series.length <= days) return null;
  const last = series[series.length - 1].value;
  const prev = series[series.length - 1 - days].value;
  if (last === null || prev === null) return null;
  return last - prev;
}

/* ---- economies (China-core ordering) ---- */
export const ECONOMIES: { eco: string; name: string; code: string }[] = ECO_ORDER.map((eco) => ({
  eco,
  name:
    eco === "CNY" ? "中国" : eco === "USD" ? "美国" : eco === "EUR" ? "欧元区" : eco === "JPY" ? "日本" : eco === "HKD" ? "香港" : eco === "CHF" ? "瑞士" : eco === "GBP" ? "英国" : "澳大利亚",
  code: ECO_CONFIG[eco].code,
}));

const LIQ_ID: Record<string, string> = {
  CNH: "m2",
  USD: "reserves",
  EUR: "excess_liquidity",
  JPY: "current_account",
  HKD: "aggregate_balance",
  CHF: "snb_assets",
  GBP: "boe_assets",
  AUD: "housing_credit",
};
const LIQ_LABEL: Record<string, string> = {
  CNH: "M2 同比",
  USD: "准备金余额",
  EUR: "过剩流动性",
  JPY: "经常账户余额",
  HKD: "总结余",
  CHF: "SNB 总资产",
  GBP: "英银总资产",
  AUD: "住房信贷",
};
const FX_LABEL: Record<string, string> = {
  CNH: "USD/CNH",
  USD: "DXY",
  EUR: "EUR/USD",
  JPY: "USD/JPY",
  HKD: "USD/HKD",
  CHF: "USD/CHF",
  GBP: "GBP/USD",
  AUD: "AUD/USD",
};

export interface RegimeCell {
  value: number | null;
  unit: string;
  delta: number | null; // absolute change over selected period
  deltaMode: "bp" | "pp" | "pct";
}
export interface RegimeRow {
  eco: string;
  name: string;
  code: string;
  growth: RegimeCell;
  inflation: RegimeCell;
  policy: RegimeCell;
  liquidity: RegimeCell;
  rates: RegimeCell;
  fx: RegimeCell;
  phase: number | null;
  phaseLabel: string;
}

const PHASE_PHASES = ["起点", "高位", "转换", "低位"];
function phaseLabel(deg: number): string {
  if (deg < 45 || deg >= 315) return PHASE_PHASES[0];
  if (deg < 135) return PHASE_PHASES[1];
  if (deg < 225) return PHASE_PHASES[2];
  return PHASE_PHASES[3];
}

const _growthCache: Record<string, Observation[]> = {};
function growthSeries(code: string, asOf: string): Observation[] {
  const key = `${code}@${asOf}`;
  if (_growthCache[key]) return _growthCache[key];
  const dates = getCurrencyData("USD", asOf).series["fx_spot"].map((o) => o.observationDate);
  const bases: Record<string, [number, number]> = {
    CNH: [4.8, 0.3], USD: [2.5, 0.2], EUR: [0.9, 0.15], JPY: [1.2, 0.12],
    HKD: [3.1, 0.2], CHF: [1.0, 0.1], GBP: [1.1, 0.15], AUD: [2.2, 0.2],
  };
  const [b, v] = bases[code] ?? [2, 0.2];
  const s = mockObs(code, "growth", b, v, dates);
  _growthCache[key] = s;
  return s;
}
const _inflCache: Record<string, Observation[]> = {};
function inflationSeries(code: string, asOf: string): Observation[] {
  const key = `${code}@${asOf}`;
  if (_inflCache[key]) return _inflCache[key];
  const dates = getCurrencyData("USD", asOf).series["fx_spot"].map((o) => o.observationDate);
  const bases: Record<string, [number, number]> = {
    CNH: [0.6, 0.15], USD: [3.1, 0.2], EUR: [2.4, 0.2], JPY: [2.6, 0.2],
    HKD: [1.9, 0.15], CHF: [1.3, 0.12], GBP: [3.4, 0.2], AUD: [3.6, 0.2],
  };
  const [b, v] = bases[code] ?? [2, 0.2];
  const s = mockObs(code, "inflation", b, v, dates);
  _inflCache[key] = s;
  return s;
}

export function getRegimeMatrix(asOf: string, period: Period = "1M"): RegimeRow[] {
  const days = PERIOD_DAYS[period];
  return ECONOMIES.map(({ eco, name, code }) => {
    const d = getCurrencyData(code, asOf);
    const ser = d.series;
    const g = growthSeries(code, asOf);
    const inf = inflationSeries(code, asOf);
    const liqId = LIQ_ID[code];
    const ph = getCycle(eco, "Medium", asOf).latestPhase ?? null;
    const cell = (s: Observation[] | undefined, unit: string, mode: RegimeCell["deltaMode"]): RegimeCell => ({
      value: latestValue(s),
      unit,
      delta: mode === "pct" ? changePct(s, days) : diff(s, days),
      deltaMode: mode,
    });
    return {
      eco,
      name,
      code,
      growth: cell(g, "%", "pp"),
      inflation: cell(inf, "%", "pp"),
      policy: cell(ser["policy_rate"], "%", "bp"),
      liquidity: cell(liqId ? ser[liqId] : undefined, liqId ? (CURRENCY_MAP[code]?.indicators.find((i) => i.id === liqId)?.unit ?? "") : "", "pct"),
      rates: cell(ser["yield_10y"], "%", "bp"),
      fx: cell(ser["fx_spot"], "", "pct"),
      phase: ph,
      phaseLabel: ph === null ? "—" : phaseLabel(ph),
    };
  });
}

/* ---- Global Money Market ---- */
const MM_DEFS: Record<string, { id: string; label: string }[]> = {
  CNH: [
    { id: "policy_rate", label: "7天逆回购" },
    { id: "mlf", label: "MLF" },
    { id: "dr007", label: "DR007" },
    { id: "r007", label: "R007" },
    { id: "shibor_3m", label: "Shibor 3M" },
    { id: "cnh_hibor", label: "CNH HIBOR 3M" },
  ],
  USD: [
    { id: "sofr", label: "SOFR" },
    { id: "effr", label: "EFFR" },
    { id: "iorb", label: "IORB" },
    { id: "on_rrp", label: "ON RRP" },
    { id: "reserves", label: "准备金余额" },
    { id: "tga", label: "TGA" },
    { id: "fed_assets", label: "美联储总资产" },
  ],
  EUR: [
    { id: "policy_rate", label: "存款便利利率" },
    { id: "mro", label: "主要再融资利率" },
    { id: "estr", label: "€STR" },
    { id: "excess_liquidity", label: "过剩流动性" },
    { id: "ecb_assets", label: "ECB 总资产" },
  ],
  JPY: [
    { id: "policy_rate", label: "政策利率" },
    { id: "tonar", label: "TONAR" },
    { id: "boj_assets", label: "日银总资产" },
    { id: "current_account", label: "经常账户余额" },
  ],
  HKD: [
    { id: "policy_rate", label: "贴现窗基率" },
    { id: "hibor_3m", label: "HIBOR 3M" },
    { id: "honia", label: "HONIA" },
    { id: "aggregate_balance", label: "总结余" },
  ],
  CHF: [
    { id: "policy_rate", label: "SNB 政策利率" },
    { id: "saron", label: "SARON" },
    { id: "snb_assets", label: "SNB 总资产" },
    { id: "fx_reserves", label: "外汇储备" },
  ],
  GBP: [
    { id: "policy_rate", label: "银行利率" },
    { id: "sonia", label: "SONIA" },
    { id: "boe_assets", label: "英银总资产" },
    { id: "apf", label: "APF 持仓" },
  ],
  AUD: [
    { id: "policy_rate", label: "现金利率" },
    { id: "ois_3m", label: "3M OIS" },
  ],
};

export interface MmRow {
  economy: string;
  code: string;
  label: string;
  unit: string;
  current: number | null;
  isRate: boolean;
  isReal: boolean;
  d1: number | null;
  d7: number | null;
  d30: number | null;
  pct1: number | null;
  pct7: number | null;
  pct30: number | null;
}

export function getMoneyMarket(asOf: string): { economy: string; code: string; rows: MmRow[] }[] {
  return ECONOMIES.map(({ name, code }) => ({
    economy: name,
    code,
    rows: (MM_DEFS[code] ?? []).map((m) => {
      const s = getCurrencyData(code, asOf).series[m.id];
      const unit = CURRENCY_MAP[code]?.indicators.find((i) => i.id === m.id)?.unit ?? "";
      const isRate = unit === "%";
      const cur = latestValue(s);
      const real = mmIsReal(code, m.id);
      // 真实序列（日度/周度混杂）用日历感知 delta；Mock 序列保持原定位 delta。
      const dAbs = real ? (days: number) => calDelta(s, days) : (days: number) => diff(s, days);
      const dPct = real ? (days: number) => calPct(s, days) : (days: number) => changePct(s, days);
      return {
        economy: name,
        code,
        label: m.label,
        unit,
        current: cur,
        isRate,
        isReal: real,
        d1: dAbs(1),
        d7: dAbs(7),
        d30: dAbs(30),
        pct1: dPct(1),
        pct7: dPct(7),
        pct30: dPct(30),
      };
    }),
  }));
}

/* ---- SOFR special panel (US liquidity core) ---- */
export interface SofrPanel {
  sofr: number | null;
  effr: number | null;
  iorb: number | null;
  sofrEffr: number | null; // bp
  sofrIorb: number | null; // bp
  onRrp: number | null;
  reserves: number | null;
  tga: number | null;
  fedAssets: number | null;
  isReal: boolean;
  fieldsReal: Record<string, boolean>;
  chg: Record<string, { d1: number | null; d7: number | null; d30: number | null }>;
}
export function getSofrPanel(asOf: string): SofrPanel {
  const d = getCurrencyData("USD", asOf);
  const s = d.series;
  const pick = (id: string) => latestValue(s[id]);
  const chgOf = (id: string) => ({ d1: calDelta(s[id], 1), d7: calDelta(s[id], 7), d30: calDelta(s[id], 30) });
  const real = (id: string) => mmIsReal("USD", id);
  const sofr = pick("sofr");
  const effr = pick("effr");
  const iorb = pick("iorb");
  const fieldsReal = {
    sofr: real("sofr"),
    effr: real("effr"),
    iorb: real("iorb"),
    onRrp: real("on_rrp"),
    reserves: real("reserves"),
    tga: real("tga"),
    fedAssets: real("fed_assets"),
  };
  return {
    sofr,
    effr,
    iorb,
    sofrEffr: sofr !== null && effr !== null ? Number(((sofr - effr) * 100).toFixed(1)) : null,
    sofrIorb: sofr !== null && iorb !== null ? Number(((sofr - iorb) * 100).toFixed(1)) : null,
    onRrp: pick("on_rrp"),
    reserves: pick("reserves"),
    tga: pick("tga"),
    fedAssets: pick("fed_assets"),
    isReal: Object.values(fieldsReal).every(Boolean),
    fieldsReal,
    chg: {
      sofr: chgOf("sofr"),
      effr: chgOf("effr"),
      iorb: chgOf("iorb"),
      onRrp: chgOf("on_rrp"),
      reserves: chgOf("reserves"),
      tga: chgOf("tga"),
      fedAssets: chgOf("fed_assets"),
    },
  };
}

/* ---- What Changed ---- */
export interface WhatChangedItem {
  label: string;
  current: number | null;
  change: number | null; // for rates: bp; for fx: %
  previous: number | null;
  isRate: boolean;
  href?: string;
}
export function getWhatChanged(asOf: string, period: Period = "1M"): WhatChangedItem[] {
  const days = PERIOD_DAYS[period];
  const u = getCurrencyData("USD", asOf).series;
  const c = getCurrencyData("CNH", asOf).series;
  const eur = getCurrencyData("EUR", asOf).series;
  const jpy = getCurrencyData("JPY", asOf).series;
  const item = (label: string, s: Observation[] | undefined, isRate: boolean, href?: string): WhatChangedItem => {
    const cur = latestValue(s);
    const d = diff(s, days);
    const chg = isRate ? (d !== null ? Number((d * 100).toFixed(1)) : null) : d !== null ? null : null;
    // for fx we use pct change
    const pct = changePct(s, days);
    const change = isRate ? chg : pct;
    const prev = cur !== null && change !== null ? (isRate ? cur - change / 100 : cur / (1 + change / 100)) : null;
    return { label, current: cur, change, previous: prev === null ? null : Number(prev.toFixed(4)), isRate, href };
  };
  return [
    item("美元 SOFR", u["sofr"], true, "/money-market"),
    item("美国 10Y", u["yield_10y"], true, "/money-market"),
    item("中国 10Y", c["yield_10y"], true, "/china/rates-curve"),
    item("DR007", c["dr007"], true, "/china/liquidity"),
    item("USD/CNY", c["usdcny"], false, "/fx-funding"),
    item("USD/CNH", c["usdcnh"], false, "/fx-funding"),
    item("EUR/USD", eur["fx_spot"], false, "/fx-funding"),
    item("USD/JPY", jpy["fx_spot"], false, "/fx-funding"),
  ];
}
