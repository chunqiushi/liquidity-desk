/**
 * 确定性 Mock 序列引擎（Phase 2 · 首页图表与可视化）
 * --------------------------------------------------------------------------
 * 为统一指标注册表（lib/indicators.ts）中的每个指标生成可复现的时间序列，
 * 供首页图表区（收益率曲线 / 利差矩阵 / 外汇热力图 / 流动性时间序列）使用。
 *
 * 设计原则：
 *  - 种子由指标 code 经 FNV-1a 哈希决定 → 同一 code 永远得到同一条序列（确定性）。
 *  - 序列终点严格等于指标注册 value，保证图表末端与「数据字典」数值一致。
 *  - 方向（direction）影响序列整体趋势，使可视化与指标方向自洽。
 *  - 全部为 Mock，仅供研究原型，不对接实时行情。
 */

import type { Indicator, Region } from "./indicators";
import { getIndicator } from "./indicators";

/* ----------------------------- 确定性 RNG ----------------------------- */

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function r4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

const SERIES_LEN = 120;
const cache = new Map<string, { date: string; v: number }[]>();

/** 生成某指标的长度为 SERIES_LEN 的日频序列，终点 = indicator.value */
export function getSeries(ind: Indicator): { date: string; v: number }[] {
  const hit = cache.get(ind.code);
  if (hit) return hit;

  const rng = mulberry32(fnv1a(ind.code));
  const end = ind.value;
  const trend = ind.direction === "up" ? 1 : ind.direction === "down" ? -1 : 0;
  const vol = Math.max(Math.abs(end) * 0.01, 0.0025);

  const arr = new Array<number>(SERIES_LEN);
  arr[SERIES_LEN - 1] = end;
  let v = end;
  for (let i = SERIES_LEN - 2; i >= 0; i--) {
    const drift = trend * Math.abs(end) * 0.0035 * (0.5 + rng());
    const noise = (rng() - 0.5) * 2 * vol;
    v = v - drift + noise;
    arr[i] = v;
  }

  const today = new Date(ind.as_of + "T00:00:00");
  const out: { date: string; v: number }[] = [];
  for (let i = 0; i < SERIES_LEN; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (SERIES_LEN - 1 - i));
    out.push({ date: d.toISOString().slice(0, 10), v: r4(arr[i]) });
  }
  cache.set(ind.code, out);
  return out;
}

/* ----------------------------- 时间窗口 ----------------------------- */

export type TW = "1D" | "1W" | "1M";
const WP: Record<TW, number> = { "1D": 12, "1W": 24, "1M": 48 };

/** 取某指标在指定窗口内的序列切片 */
export function windowSlice(ind: Indicator, tw: TW): { date: string; v: number }[] {
  const s = getSeries(ind);
  return s.slice(Math.max(0, s.length - WP[tw]));
}

/** 取某指标在指定窗口内的纯数值数组（用于迷你走势） */
export function windowValues(ind: Indicator, tw: TW): number[] {
  return windowSlice(ind, tw).map((p) => p.v);
}

/* ----------------------------- 外汇热力图 ----------------------------- */

export const FX_CCYS = ["USD", "CNY", "EUR", "JPY", "HKD", "CHF", "GBP", "AUD"] as const;
export type FxCcy = (typeof FX_CCYS)[number];

/** 构建跨币种 % 变化矩阵：matrix[a][b] = a 相对 b 在窗口内的变化百分比 */
export function fxMatrix(tw: TW): {
  currencies: readonly string[];
  matrix: Record<string, Record<string, number>>;
} {
  const n = WP[tw];
  const sliceOf = (code: string) => windowSlice(getIndicator(code)!, tw).map((p) => p.v);

  const usd: Record<string, number[]> = { USD: new Array(n).fill(1) };
  const eur = sliceOf("EURUSD");
  const jpy = sliceOf("USDJPY");
  const hkd = sliceOf("HKDUSD");
  const chf = sliceOf("CHFUSD");
  const aud = sliceOf("AUDUSD");
  const cnh = sliceOf("CN_USDCNH");
  const gbpEur = sliceOf("GBPEUR");
  usd["EUR"] = eur;
  usd["JPY"] = jpy;
  usd["HKD"] = hkd;
  usd["CHF"] = chf;
  usd["AUD"] = aud;
  usd["CNY"] = cnh;
  usd["GBP"] = gbpEur.map((g, i) => g * eur[i]);

  const f: Record<string, number> = {};
  for (const c of FX_CCYS) {
    const s = usd[c];
    f[c] = s[s.length - 1] / s[0];
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const a of FX_CCYS) {
    matrix[a] = {};
    for (const b of FX_CCYS) {
      matrix[a][b] = r4((f[a] / f[b] - 1) * 100);
    }
  }
  return { currencies: FX_CCYS, matrix };
}

/* ----------------------------- 收益率曲线 ----------------------------- */

export interface CurvePoint {
  tenor: string;
  yield: number;
}

/**
 * 构建单条收益率曲线（Mock 形状）。
 * 期限从超短端开始：1D（≈隔夜/政策利率）→ 1W → 1M → 3M → 6M → 1Y → 2Y → 3Y → 5Y → 7Y →
 * 10Y（= tenY 注册值，严格对齐）→ 20Y → 30Y。2Y 可选（注册值），否则由 short/tenY 推导。
 * 短端锚定政策/隔夜利率，长端由 2Y→10Y 趋势外推，保证 10Y 与注册值完全一致。
 */
export function buildCurve(short: number, tenY: number, twoY?: number): CurvePoint[] {
  const two = twoY ?? short + (tenY - short) * 0.45;
  const s3m = short + (two - short) * 0.18; // 3M 略高于隔夜
  const long30 = tenY + (tenY - two) * 0.35; // 30Y 由 2Y→10Y 趋势外推
  const pts: { label: string; y: number }[] = [
    { label: "1D", y: short }, // 1D ≈ 隔夜/政策利率
    { label: "1W", y: short + (s3m - short) * 0.45 },
    { label: "1M", y: short + (s3m - short) * 0.75 },
    { label: "3M", y: s3m },
    { label: "6M", y: s3m + (two - s3m) * 0.3 },
    { label: "1Y", y: s3m + (two - s3m) * 0.62 },
    { label: "2Y", y: two },
    { label: "3Y", y: two + (tenY - two) * 0.4 },
    { label: "5Y", y: two + (tenY - two) * 0.7 },
    { label: "7Y", y: two + (tenY - two) * 0.85 },
    { label: "10Y", y: tenY }, // 严格等于注册值
    { label: "20Y", y: tenY + (long30 - tenY) * 0.5 },
    { label: "30Y", y: long30 },
  ];
  return pts.map((p) => ({ tenor: p.label, yield: r4(p.y) }));
}

/* ----------------------------- 中国宏观月度序列（ Wind 风格） ----------------------------- */

/** 10 个中国核心宏观指标的预期差（实际 − 预期，单位 pp），忠实还原 Wind 截图风格 */
export const CHINA_SURPRISE: Record<string, number> = {
  CN_IP_YOY: 0.2,
  CN_RETAIL_YOY: 0.1,
  CN_FAI_YOY: -1.2,
  CN_MANU_INVEST_YOY: -1.3,
  CN_INFRA_INVEST_YOY: -2.87,
  CN_PROPERTY_INVEST_YOY: -2.1,
  CN_EXPORT_YOY: 3.5,
  CN_IMPORT_YOY: 1.2,
  CN_CPI_YOY: 0.1,
  CN_PPI_YOY: 0.5,
};

/** 获取某指标的预期值；对中国 10 个核心指标使用固定预期差，其余按 code hash 生成 */
export function expectedValue(ind: Indicator): number {
  if (CHINA_SURPRISE[ind.code] !== undefined) {
    return r4(ind.value - CHINA_SURPRISE[ind.code]);
  }
  const rng = mulberry32(fnv1a("expected:" + ind.code));
  const noise = Math.max(Math.abs(ind.value), 0.5) * (rng() - 0.5) * 0.3;
  return r4(ind.value - noise);
}

const MONTH_LABELS = ["2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月"];
const CHINA_SERIES_CACHE = new Map<string, { month: string; v: number }[]>();

/** 生成 8 个月度序列（2月→9月），终点 = indicator.value，波动与中国宏观同比匹配 */
export function chinaMonthlySeries(ind: Indicator): { month: string; v: number }[] {
  const hit = CHINA_SERIES_CACHE.get(ind.code);
  if (hit) return hit;

  const rng = mulberry32(fnv1a("china-monthly:" + ind.code));
  const end = ind.value;
  const vol = Math.max(Math.abs(end) * 0.04, 0.2);
  const trend = ind.direction === "up" ? 1 : ind.direction === "down" ? -1 : 0;

  const arr = new Array<number>(MONTH_LABELS.length);
  arr[MONTH_LABELS.length - 1] = end;
  let v = end;
  for (let i = MONTH_LABELS.length - 2; i >= 0; i--) {
    const drift = trend * Math.abs(end) * 0.02 * (0.5 + rng());
    const noise = (rng() - 0.5) * 2 * vol;
    v = v - drift + noise;
    arr[i] = v;
  }

  const out = MONTH_LABELS.map((m, i) => ({ month: m, v: r4(arr[i]) }));
  CHINA_SERIES_CACHE.set(ind.code, out);
  return out;
}

/** 默认收益率曲线锚点（覆盖 8 关注国中的 7 国，瑞士缺 10Y 注册值暂未纳入） */
export const YIELD_CURVE_REGIONS: { region: Region; label: string; short: string; tenY: string; twoY?: string }[] = [
  { region: "CN", label: "中国", short: "CN_PBOC_7D", tenY: "CN_10Y" },
  { region: "US", label: "美国", short: "US_IORB", tenY: "US_10Y", twoY: "US_2Y" },
  { region: "EU", label: "欧元区", short: "EU_ESTR", tenY: "EU_10Y" },
  { region: "JP", label: "日本", short: "JP_TONA", tenY: "JP_10Y" },
  { region: "HK", label: "香港", short: "HK_HIBOR_3M", tenY: "HK_10Y" },
  { region: "GB", label: "英国", short: "GB_BANK", tenY: "GB_10Y" },
  { region: "AU", label: "澳大利亚", short: "AU_CASH", tenY: "AU_10Y" },
];
