import { CURRENCY_MAP } from "./mock-data";

/* ============================================================================
 * Global Liquidity Cycle — Sine & Phase research layer
 * ----------------------------------------------------------------------------
 * A transparent, reproducible DERIVED indicator. Not an official macro series.
 *
 * Pipeline per spec §4–§5:
 *   1. raw time series            (mock core liquidity funding rate)
 *   2. unify frequency            (daily grid)
 *   3. standardize                (z-score of the detrended series)
 *   4. remove trend               (centered moving average of window = cycle)
 *   5. extract cyclical component (least-squares fit to sin/cos of cycle length)
 *   6. map to [-1,+1]             (Sine) and [0°,360°] (Phase)
 *
 * Amplitude = sqrt(a^2 + b^2) in normalized units → stronger cyclical signal.
 * Phase Difference = normalize(A - B) to (-180°, +180°], no causal interpretation.
 * ========================================================================== */

export type CycleId = "Short" | "Medium" | "Long";

/** Cycle length in trading/business days. Frequency-adaptive (daily basis here). */
export const CYCLE_DAYS: Record<CycleId, number> = {
  Short: 42, // ~2 months
  Medium: 126, // ~6 months
  Long: 504, // ~2 years
};

export const CYCLE_LABEL: Record<CycleId, string> = {
  Short: "Short (~2m)",
  Medium: "Medium (~6m)",
  Long: "Long (~2y)",
};

/* ----------------------------------------------------------------------------
 * Deterministic RNG (mirrors lib/mock-data)
 * ------------------------------------------------------------------------- */
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

const HISTORY_DAYS = 800; // ~3.2Y, enough for the 3Y sine chart

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

/* ----------------------------------------------------------------------------
 * Per-economy liquidity cycle configuration (localized core funding rate)
 * ------------------------------------------------------------------------- */

interface EcoCfg {
  code: string;
  coreLabel: string; // core funding rate used as the cycle input
  unit: string;
  base: number; // base level of the funding rate
  vol: number; // noise vol
  slope: number; // slow drift per day
  medAmp: number; // dominant (medium) cycle amplitude, in rate units
  longAmp: number; // long cycle amplitude
  phaseDeg: number; // embedded phase offset → creates lead/lag across economies
  // context indicator ids pulled from existing mock-data snapshots:
  liquidityId?: string; // "Liquidity Balance"
  cbAssetsId?: string; // "Central Bank Assets"
  moneyCreditId?: string; // "Money / Credit"
}

export const ECO_CONFIG: Record<string, EcoCfg> = {
  CNY: {
    code: "CNH",
    coreLabel: "DR007",
    unit: "%",
    base: 1.8,
    vol: 0.05,
    slope: 0.00005,
    medAmp: 0.28,
    longAmp: 0.18,
    phaseDeg: 40,
    liquidityId: "social_financing",
    cbAssetsId: "fx_reserves",
    moneyCreditId: "m2",
  },
  USD: {
    code: "USD",
    coreLabel: "SOFR",
    unit: "%",
    base: 5.3,
    vol: 0.04,
    slope: -0.0004,
    medAmp: 0.22,
    longAmp: 0.16,
    phaseDeg: 0,
    liquidityId: "reserves",
    cbAssetsId: "fed_assets",
    moneyCreditId: "bank_credit",
  },
  EUR: {
    code: "EUR",
    coreLabel: "€STR",
    unit: "%",
    base: 3.7,
    vol: 0.03,
    slope: -0.0003,
    medAmp: 0.2,
    longAmp: 0.14,
    phaseDeg: 90,
    liquidityId: "excess_liquidity",
    cbAssetsId: "ecb_assets",
    moneyCreditId: "m3",
  },
  JPY: {
    code: "JPY",
    coreLabel: "TONAR",
    unit: "%",
    base: 0.4,
    vol: 0.02,
    slope: 0.0003,
    medAmp: 0.12,
    longAmp: 0.08,
    phaseDeg: 200,
    liquidityId: "current_account",
    cbAssetsId: "boj_assets",
    moneyCreditId: undefined,
  },
  HKD: {
    code: "HKD",
    coreLabel: "HIBOR 3M",
    unit: "%",
    base: 5.1,
    vol: 0.06,
    slope: 0.00002,
    medAmp: 0.3,
    longAmp: 0.2,
    phaseDeg: 60,
    liquidityId: "aggregate_balance",
    cbAssetsId: "monetary_base",
    moneyCreditId: "hkd_loans",
  },
  CHF: {
    code: "CHF",
    coreLabel: "SARON",
    unit: "%",
    base: 1.2,
    vol: 0.02,
    slope: 0.0,
    medAmp: 0.1,
    longAmp: 0.07,
    phaseDeg: 120,
    liquidityId: "fx_reserves",
    cbAssetsId: "snb_assets",
    moneyCreditId: undefined,
  },
  GBP: {
    code: "GBP",
    coreLabel: "SONIA",
    unit: "%",
    base: 4.9,
    vol: 0.04,
    slope: -0.0003,
    medAmp: 0.21,
    longAmp: 0.15,
    phaseDeg: 230,
    liquidityId: "apf",
    cbAssetsId: "boe_assets",
    moneyCreditId: "mortgage_rate",
  },
  AUD: {
    code: "AUD",
    coreLabel: "Cash Rate OIS",
    unit: "%",
    base: 4.3,
    vol: 0.04,
    slope: 0.0,
    medAmp: 0.18,
    longAmp: 0.13,
    phaseDeg: 100,
    liquidityId: undefined,
    cbAssetsId: "yield_10y",
    moneyCreditId: "housing_credit",
  },
};

export const ECO_ORDER = ["CNY", "USD", "EUR", "JPY", "HKD", "CHF", "GBP", "AUD"];

/* ----------------------------------------------------------------------------
 * Core liquidity series generation (embedded cycles → meaningful Sine/Phase)
 * ------------------------------------------------------------------------- */

function genCoreSeries(cfg: EcoCfg): number[] {
  const rnd = mulberry32(hashStr("cycle:" + cfg.code));
  const Lm = CYCLE_DAYS.Medium;
  const Ll = CYCLE_DAYS.Long;
  const ph = (cfg.phaseDeg * Math.PI) / 180;
  const out: number[] = [];
  let v = cfg.base;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const cycMed = cfg.medAmp * Math.sin((2 * Math.PI * i) / Lm + ph);
    const cycLong = cfg.longAmp * Math.sin((2 * Math.PI * i) / Ll + ph * 0.5);
    v = cfg.base + cfg.slope * i + cycMed + cycLong + (rnd() - 0.5) * 2 * cfg.vol;
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

const CORE_CACHE: Record<string, number[]> = {};
function coreSeries(code: string): number[] {
  if (!CORE_CACHE[code]) CORE_CACHE[code] = genCoreSeries(ECO_CONFIG[code]);
  return CORE_CACHE[code];
}

/* ----------------------------------------------------------------------------
 * Cycle transform
 * ------------------------------------------------------------------------- */

function centeredMA(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < values.length) {
        sum += values[j];
        n++;
      }
    }
    out.push(n ? sum / n : values[i]);
  }
  return out;
}

function zscore(values: number[]): number[] {
  const clean = values.filter((v) => !Number.isNaN(v));
  if (!clean.length) return values.map(() => 0);
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const sd = Math.sqrt(clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length);
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (Number.isNaN(v) ? 0 : (v - mean) / sd));
}

export interface CycleResult {
  dates: string[];
  raw: number[];
  normalized: number[]; // z-score of detrended series
  sine: number[]; // [-1, +1]
  phase: number[]; // [0, 360)
  amplitude: number; // normalized units
  signalStrength: number; // 0..100, amplitude scaled for color
  cycleId: CycleId;
  cycleLengthDays: number;
  latestSine: number;
  latestPhase: number;
  method: CycleMethod;
}

export interface CycleMethod {
  input: string;
  source: string;
  frequency: string;
  lookbackDays: number;
  cycleDays: number;
  smoothing: string;
  normalization: string;
  calculationDate: string;
  methodVersion: string;
}

function computeCycle(code: string, cycleId: CycleId, asOf: string): CycleResult {
  const cfg = ECO_CONFIG[code];
  const raw = coreSeries(code);
  const L = CYCLE_DAYS[cycleId];
  const trend = centeredMA(raw, L);
  const detrended = raw.map((v, i) => v - trend[i]);
  const normalized = zscore(detrended);

  // Least-squares fit detrended ≈ a·sin(ωi) + b·cos(ωi)
  const w = (2 * Math.PI) / L;
  let sa = 0;
  let sb = 0;
  const N = normalized.length;
  for (let i = 0; i < N; i++) {
    sa += normalized[i] * Math.sin(w * i);
    sb += normalized[i] * Math.cos(w * i);
  }
  const a = (2 / N) * sa;
  const b = (2 / N) * sb;
  const amplitude = Math.sqrt(a * a + b * b);
  // signal strength: amplitude relative to ~0.8 (strong) capped at 100
  const signalStrength = Math.min(100, Math.round((amplitude / 0.8) * 100));

  const phi = Math.atan2(b, a); // radians
  const sine: number[] = [];
  const phase: number[] = [];
  for (let i = 0; i < N; i++) {
    const ang = w * i + phi;
    sine.push(Number(Math.sin(ang).toFixed(4)));
    let deg = (((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * (180 / Math.PI);
    phase.push(Number(deg.toFixed(1)));
  }

  const method: CycleMethod = {
    input: `${cfg.coreLabel} (${cfg.code})`,
    source: "Mock — deterministic cycle engine (v0.1)",
    frequency: "Daily",
    lookbackDays: HISTORY_DAYS,
    cycleDays: L,
    smoothing: `Centered MA window = cycle length (${L}d)`,
    normalization: "Z-score of detrended series",
    calculationDate: asOf,
    methodVersion: "v0.1",
  };

  return {
    dates: buildDates(asOf),
    raw,
    normalized,
    sine,
    phase,
    amplitude: Number(amplitude.toFixed(3)),
    signalStrength,
    cycleId,
    cycleLengthDays: L,
    latestSine: sine[sine.length - 1],
    latestPhase: phase[phase.length - 1],
    method,
  };
}

const CYCLE_CACHE: Record<string, CycleResult> = {};
export function getCycle(code: string, cycleId: CycleId, asOf: string): CycleResult {
  const key = `${code}|${cycleId}|${asOf}`;
  if (!CYCLE_CACHE[key]) CYCLE_CACHE[key] = computeCycle(code, cycleId, asOf);
  return CYCLE_CACHE[key];
}

/* ----------------------------------------------------------------------------
 * Global Liquidity Monitor row (8 economies)
 * ------------------------------------------------------------------------- */

export interface MonitorRow {
  code: string;
  ecoCode: string;
  name: string;
  color: string;
  coreLabel: string;
  coreValue: number | null;
  coreUnit: string;
  policyRate: number | null;
  liquidityBalance: number | null;
  liquidityLabel: string;
  cbAssets: number | null;
  moneyCredit: number | null;
  moneyCreditLabel: string;
  chg1d: number | null;
  chg1w: number | null;
  chg1m: number | null;
  sine: number | null;
  phase: number | null;
  amplitude: number | null;
  signalStrength: number | null;
}

import { getCurrencyData } from "./mock-data";

export function getLiquidityMonitor(asOf: string, cycleId: CycleId = "Medium"): MonitorRow[] {
  return ECO_ORDER.map((eco) => {
    const cfg = ECO_CONFIG[eco];
    const cur = CURRENCY_MAP[cfg.code];
    const d = getCurrencyData(cfg.code, asOf);
    const c = getCycle(eco, cycleId, asOf);
    const snap = d.snapshot;
    const raw = c.raw;
    const pct = (days: number) =>
      raw.length > days ? ((raw[raw.length - 1] - raw[raw.length - 1 - days]) / Math.abs(raw[raw.length - 1 - days])) * 100 : null;

    const lbId = cfg.liquidityId;
    const cbId = cfg.cbAssetsId;
    const mcId = cfg.moneyCreditId;
    return {
      code: cfg.code,
      ecoCode: eco,
      name: cur?.name ?? cfg.code,
      color: cur?.color ?? "#888",
      coreLabel: cfg.coreLabel,
      coreValue: raw[raw.length - 1],
      coreUnit: cfg.unit,
      policyRate: snap["policy_rate"] ?? null,
      liquidityBalance: lbId ? snap[lbId] ?? null : null,
      liquidityLabel: lbId ? cur?.indicators.find((i) => i.id === lbId)?.label ?? lbId : "—",
      cbAssets: cbId ? snap[cbId] ?? null : null,
      moneyCredit: mcId ? snap[mcId] ?? null : null,
      moneyCreditLabel: mcId ? cur?.indicators.find((i) => i.id === mcId)?.label ?? mcId : "—",
      chg1d: pct(1),
      chg1w: pct(7),
      chg1m: pct(30),
      sine: c.latestSine,
      phase: c.latestPhase,
      amplitude: c.amplitude,
      signalStrength: c.signalStrength,
    };
  });
}

/* ----------------------------------------------------------------------------
 * Matrices
 * ------------------------------------------------------------------------- */

export function getSineMatrix(asOf: string, cycleId: CycleId = "Medium") {
  return ECO_ORDER.map((eco) => {
    const c = getCycle(eco, cycleId, asOf);
    return { code: ECO_CONFIG[eco].code, eco, name: CURRENCY_MAP[ECO_CONFIG[eco].code]?.name, sine: c.latestSine, amplitude: c.amplitude };
  });
}

export function getPhaseMatrix(asOf: string, cycleId: CycleId = "Medium") {
  return ECO_ORDER.map((eco) => {
    const c = getCycle(eco, cycleId, asOf);
    return { code: ECO_CONFIG[eco].code, eco, name: CURRENCY_MAP[ECO_CONFIG[eco].code]?.name, phase: c.latestPhase, amplitude: c.amplitude };
  });
}

/* ----------------------------------------------------------------------------
 * Phase Difference (China vs others) — normalized to (-180, +180]
 * ------------------------------------------------------------------------- */

export function normalizePhaseDiff(diff: number): number {
  let d = ((diff + 180) % 360 + 360) % 360 - 180;
  return Number(d.toFixed(1));
}

export function getPhaseComparison(asOf: string, cycleId: CycleId = "Medium") {
  const cn = getCycle("CNY", cycleId, asOf).latestPhase;
  const targets = ["USD", "EUR", "JPY", "GBP", "AUD"];
  return targets.map((t) => {
    const tp = getCycle(t, cycleId, asOf).latestPhase;
    return {
      target: ECO_CONFIG[t].code,
      targetName: CURRENCY_MAP[ECO_CONFIG[t].code]?.name,
      chinaPhase: cn,
      targetPhase: tp,
      diff: normalizePhaseDiff(cn - tp),
      relation:
        Math.abs(normalizePhaseDiff(cn - tp)) < 30
          ? "In phase"
          : normalizePhaseDiff(cn - tp) > 0
            ? "China leads"
            : "China lags",
    };
  });
}

/* ----------------------------------------------------------------------------
 * Per-economy detail (core indicators + cycle)
 * ------------------------------------------------------------------------- */

export interface EcoContextIndicator {
  label: string;
  value: number | null;
  unit: string;
}

export function getEconomyDetail(code: string, asOf: string, cycleId: CycleId = "Medium") {
  const eco = ECO_ORDER.find((e) => e === code) ?? "USD";
  const cfg = ECO_CONFIG[eco];
  const cur = CURRENCY_MAP[cfg.code];
  const d = getCurrencyData(cfg.code, asOf);
  const cycle = getCycle(eco, cycleId, asOf);

  const context: EcoContextIndicator[] = [];
  // localized core liquidity indicators (from existing mock-data)
  const want: string = {
    USD: "sofr,effr,iorb,on_rrp,reserves,tga,fed_assets",
    EUR: "estr,mro,excess_liquidity,ecb_assets,m3",
    HKD: "hibor_3m,honia,aggregate_balance,monetary_base,hkd_loans",
    JPY: "tonar,current_account,boj_assets,jgb_purchases",
    CNH: "dr007,r007,shibor_3m,m2,social_financing",
    CHF: "saron,snb_assets,fx_reserves,inflation",
    GBP: "sonia,apf,boe_assets,gilt_issuance,mortgage_rate",
    AUD: "ois_3m,yield_10y,housing_credit,cpi",
  }[code] ?? "";
  want.split(",").forEach((id) => {
    const def = cur?.indicators.find((i) => i.id === id);
    if (def && d.snapshot[id] !== undefined) {
      context.push({ label: def.label, value: d.snapshot[id], unit: def.unit });
    }
  });

  return { eco, cfg, cur, cycle, context };
}

/* ----------------------------------------------------------------------------
 * Chart-data helpers
 * ------------------------------------------------------------------------- */

export function phaseChartRows(asOf: string, ecoCodes: string[], cycleId: CycleId = "Medium") {
  const results = ecoCodes.map((code) => {
    const eco = ECO_ORDER.find((e) => ECO_CONFIG[e].code === code)!;
    return { code, eco, c: getCycle(eco, cycleId, asOf) };
  });
  const len = results[0]?.c.dates.length ?? 0;
  const rows: Record<string, number | string>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, number | string> = { date: results[0].c.dates[i] };
    results.forEach((r) => {
      row[r.code] = r.c.phase[i];
    });
    rows.push(row);
  }
  return rows;
}

export function sineChartRows(asOf: string, ecoCodes: string[], cycleId: CycleId = "Medium") {
  const results = ecoCodes.map((code) => {
    const eco = ECO_ORDER.find((e) => ECO_CONFIG[e].code === code)!;
    return { code, eco, c: getCycle(eco, cycleId, asOf) };
  });
  const len = results[0]?.c.dates.length ?? 0;
  const rows: Record<string, number | string>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, number | string> = { date: results[0].c.dates[i] };
    results.forEach((r) => {
      row[r.code] = r.c.sine[i];
    });
    rows.push(row);
  }
  return rows;
}

export const PHASE_PHASES = [
  { deg: 0, label: "Cycle start" },
  { deg: 90, label: "High" },
  { deg: 180, label: "Transition" },
  { deg: 270, label: "Low" },
  { deg: 360, label: "Next start" },
];
