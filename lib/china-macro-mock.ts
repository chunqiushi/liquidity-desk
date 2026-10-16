// 中国主要宏观数据（真实数据，构建期由 scripts/fetch_real_data.py 抓取 NBS via akshare）
// 数据来源：国家统计局（CPI/PPI/GDP/PMI/M2 等）。本模块仅做类型化读取与格式归一，
// 组件层无需改动（surprise = actual - previous 自动计算；一致预期 NBS 月度发布不提供，
// 故 expected 留空，图表以「实际 − 前值」呈现）。

import { getCnMacro, DATA_ASOF, DATA_FETCHED_AT } from "./realdata";

export interface ChinaMacroPoint {
  key: string;
  short: string; // 工业 / 社零 / ...
  name: string; // 工业增加值同比
  color: string;
  period: string; // 观察期 2026-08
  actual: number; // 最新同比（%）
  previous: number | null; // 前值同比（%）
  expected: number | null; // 市场预期 / 一致预期（%）；NBS 月度无一致预期则为 null
  releaseDate: string; // 发布日期
  source: string; // 数据源
  series: number[]; // 最近若干月同比，末位 = actual
  // —— 真实化元信息 ——
  history?: { date: string; v: number }[];
  isReal?: boolean;
  asOf?: string;
  unit?: string;
  noConsensus?: boolean;
}

// 展示顺序（与监控页一致）
const ORDER = ["cpi", "ppi", "gdp", "pmi_mfg", "pmi_svc", "m2", "m1", "m0"];

function normPeriod(p: string): string {
  // "2026年08月份" -> "2026-08"；"2026年第1-2季度" 等原样保留
  const m = p.match(/(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  return p;
}

export const CHINA_MACRO_PERIOD = DATA_ASOF;
export const CHINA_MACRO_IS_MOCK = false;
export const CHINA_MACRO_SOURCE = "国家统计局 (NBS) via akshare";
export const CHINA_MACRO_ASOF = DATA_ASOF;
export const CHINA_MACRO_FETCHED_AT = DATA_FETCHED_AT;

export const CHINA_MACRO_MOCK: ChinaMacroPoint[] = (() => {
  const cn = getCnMacro();
  const out: ChinaMacroPoint[] = [];
  for (const k of ORDER) {
    const r = cn[k];
    if (!r || r.actual == null) continue;
    const series = (r.history || []).map((h) => h.v);
    if (series.length === 0) series.push(r.actual as number);
    out.push({
      key: k,
      short: r.short,
      name: r.name,
      color: r.color,
      period: normPeriod(r.period),
      actual: r.actual as number,
      previous: r.previous,
      expected: r.expected,
      releaseDate: r.asOf,
      source: r.source,
      series,
      history: r.history,
      isReal: true,
      asOf: r.asOf,
      unit: r.unit,
      noConsensus: r.expected == null,
    });
  }
  return out;
})();

/* ------------------------- 明细页用的确定性序列（兜底） ------------------------- */
// 当某指标无可用的真实历史时，宏观研究图表明细弹窗用此生成占位走势。
// 正常情况下组件优先使用 realdata 中的 history。
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeries(seed: number, len: number, end: number): number[] {
  const rnd = mulberry32(seed * 7919 + 13);
  const start = end + (rnd() - 0.5) * 6;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const base = start + (end - start) * t;
    const noise = (rnd() - 0.5) * 1.8;
    out.push(+(base + noise).toFixed(1));
  }
  out[len - 1] = end;
  out[0] = +start.toFixed(1);
  return out;
}
