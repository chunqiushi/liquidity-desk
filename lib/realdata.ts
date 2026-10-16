/* ============================================================================
 * 真实数据加载层 (build-time fetched, frozen snapshot)
 * ----------------------------------------------------------------------------
 * 数据由 scripts/fetch_real_data.py 在构建期抓取并写入 lib/data/realdata.json
 * （含 lib/data/provenance.json 来源/截止日/抓取时间）。本文件只做类型化读取与
 * 降级：任何 key 缺失时返回 undefined，调用方据此回退到既有 mock，保证构建不破。
 *
 * 重要：本层数据为「静态研究快照」，非实时行情。UI 须展示 provenance（来源/as-of）。
 * ========================================================================== */

import realdataJson from "./data/realdata.json";
import provenanceJson from "./data/provenance.json";
import type { Observation } from "./types";

export interface RealPoint {
  date: string;
  v: number;
  unit?: string;
  source?: string;
}
export interface RealSeriesPoint {
  date: string;
  v: number;
}
export interface CurvePoint {
  tenor: string;
  v: number;
}
export interface RealCurve {
  date: string;
  points: CurvePoint[];
}
export interface FxLevel {
  date: string;
  level: number;
}
export interface IndexQuote {
  name: string;
  last: number;
  chgPct: number | null;
  source: string;
}

// 单条宏观指标（中国 / 国际通用）
export interface CnMacroPoint {
  key: string;
  name: string;
  short: string;
  color: string;
  unit: string;
  actual: number | null;
  previous: number | null;
  expected: number | null;
  period: string;
  asOf: string;
  source: string;
  history: { date: string; v: number }[];
  isReal: boolean;
}
export interface IntlMacroPoint {
  key: string;
  name: string;
  short: string;
  color: string;
  unit: string;
  actual: number | null;
  previous: number | null;
  expected: number | null;
  period: string;
  asOf: string;
  source: string;
  history: { date: string; v: number }[];
  isReal: boolean;
}
export interface LhbRow {
  [k: string]: any;
}
export interface FuturesRow {
  symbol: string;
  name: string;
  last: number;
  chgPct: number | null;
  source: string;
}
export interface RealData {
  meta: { asOf: string; fetchedAt: string; generator: string };
  series: Record<string, RealSeriesPoint[]>;
  points: Record<string, RealPoint>;
  curves: Record<string, RealCurve>;
  fx: { levels: Record<string, FxLevel[]>; asOf: string; source: string };
  indices: Record<string, IndexQuote>;
  lhb: { date: string | null; rows: LhbRow[] };
  futures: { rows: FuturesRow[] };
  cnMacro: Record<string, CnMacroPoint>;
  intlMacro: Record<string, IntlMacroPoint[]>;
}
export interface ProvEntry {
  status: string; // "OK" | "OK (seeded)" | "OK (cached)" | "FAIL"
  source: string;
  asOf: string;
  note?: string;
}

const RD = realdataJson as RealData;
const PROV = provenanceJson as Record<string, ProvEntry>;

export const realdata: RealData = RD;
export const provenance: Record<string, ProvEntry> = PROV;
export const DATA_ASOF: string = RD.meta.asOf;
export const DATA_FETCHED_AT: string = RD.meta.fetchedAt;

/* ------------------------------- 访问器 ------------------------------- */
export function getPoint(code: string): RealPoint | undefined {
  return RD.points[code];
}
export function getSeries(code: string): RealSeriesPoint[] | undefined {
  return RD.series[code];
}
export function getCurve(country: string): RealCurve | undefined {
  return RD.curves[country];
}
export function getFxLevels(currency: string): FxLevel[] | undefined {
  return RD.fx.levels[currency];
}
export function getIndex(key: string): IndexQuote | undefined {
  return RD.indices[key];
}
export function getAllIndices(): Record<string, IndexQuote> {
  return RD.indices;
}
export function getLhb() {
  return RD.lhb;
}
export function getFutures() {
  return RD.futures;
}
export function getCnMacro(): Record<string, CnMacroPoint> {
  return RD.cnMacro || {};
}
export function getIntlMacroRaw(): Record<string, IntlMacroPoint[]> {
  return RD.intlMacro || {};
}
export function getProv(key: string): ProvEntry | undefined {
  return PROV[key];
}

/** 该 key 是否为真实数据（含 seeded/cached 兜底）。FAIL 或缺失视为非真实。 */
export function isReal(key: string): boolean {
  const p = PROV[key];
  return !!p && p.status.startsWith("OK");
}

/* ----------------------------------------------------------------------------
 * 货币市场真实覆盖映射：货币代码 + 内部 series id → realdata series key
 * 用于把免费公开源抓取的真实序列注入 getCurrencyData，使货币/回购/SOFR 模块
 * 在存在真实源时自动覆盖确定性 Mock。无免费源的项（CN 政策利率/MLF/CNH HIBOR
 * 等）保持 Mock，由 UI 标注，绝不以 Mock 冒充真实。
 * ------------------------------------------------------------------------- */
export const MM_OVERRIDE: Record<string, Record<string, string>> = {
  CNH: {
    dr007: "CN_DR007",
    r007: "CN_R007",
    shibor_3m: "CN_SHIBOR_3M",
    // Wind 真实覆盖（原 Mock 缺口）
    policy_rate: "CN_REPO_7D", // 7天逆回购利率
    cnh_hibor: "CNH_HIBOR_3M", // CNH HIBOR 3M
    lpr_1y: "CN_LPR_1Y", // LPR 1年
    lpr_5y: "CN_LPR_5Y", // LPR 5年
    // mlf 保持 Mock：Wind 中 MLF 序列止于 2025-02（PBoC 改革后无续更），属真实缺口
  },
  USD: {
    sofr: "US_SOFR",
    effr: "US_EFFR",
    iorb: "US_IORB",
    on_rrp: "US_ON_RRP",
    reserves: "US_RESERVES",
    tga: "US_TGA",
    fed_assets: "US_FED_ASSETS",
  },
  // Wind 真实覆盖的其它经济体隔夜/短端利率（原 Mock 缺口）
  EUR: { estr: "EU_ESTR" },
  JPY: { tonar: "JP_TONA" },
  GBP: { sonia: "GB_SONIA" },
  CHF: { saron: "CH_SARON" },
  // AUD.policy_rate 暂保持 Mock：Wind 账户积分耗尽，恢复后由 CN_REPO_7D 同类逻辑补入
};

const MM_OVERRIDE_UNIT: Record<string, Record<string, string>> = {
  CNH: {
    dr007: "%",
    r007: "%",
    shibor_3m: "%",
    policy_rate: "%",
    cnh_hibor: "%",
    lpr_1y: "%",
    lpr_5y: "%",
  },
  USD: { sofr: "%", effr: "%", iorb: "%", on_rrp: "$bn", reserves: "$bn", tga: "$bn", fed_assets: "$bn" },
  EUR: { estr: "%" },
  JPY: { tonar: "%" },
  GBP: { sonia: "%" },
  CHF: { saron: "%" },
};

/** 返回该 (code,id) 的真实 Observation[]（注入 getCurrencyData 用），无真实源返回 undefined。 */
export function getRealMmObs(code: string, id: string): Observation[] | undefined {
  const key = MM_OVERRIDE[code]?.[id];
  if (!key) return undefined;
  const pts = getSeries(key);
  if (!pts || pts.length === 0) return undefined;
  const unit = MM_OVERRIDE_UNIT[code]?.[id] ?? "";
  const source = RD.points[key]?.source ?? "real";
  // 准备金余额 (WRESBAL) 为周度；其余均为日度。
  const freq: "Daily" | "Weekly" = code === "USD" && id === "reserves" ? "Weekly" : "Daily";
  return pts.map((p) => ({
    seriesId: id,
    value: p.v,
    unit,
    currency: code,
    observationDate: p.date,
    releaseDate: p.date,
    vintageDate: p.date,
    source,
    sourceKind: "Official" as const,
    frequency: freq,
    status: "Actual" as const,
    method: "real-fetch",
    methodVersion: "v1",
    dataQuality: "Real Data",
  }));
}

/** 该 (code,id) 是否已被真实数据覆盖（用于 UI 标注 真实 / Mock）。 */
export function mmIsReal(code: string, id: string): boolean {
  const key = MM_OVERRIDE[code]?.[id];
  return key ? isReal(key) : false;
}

/** 全站真实率摘要（用于 UI 顶部 provenance 条） */
export function provenanceSummary(): {
  total: number;
  real: number;
  details: { key: string; status: string; source: string; asOf: string }[];
} {
  const details = Object.entries(PROV).map(([key, v]) => ({
    key,
    status: v.status,
    source: v.source,
    asOf: v.asOf,
  }));
  return {
    total: details.length,
    real: details.filter((d) => d.status.startsWith("OK")).length,
    details,
  };
}
