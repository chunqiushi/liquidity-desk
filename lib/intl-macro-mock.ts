// 其余 7 个经济体（非中国）主要宏观数据（真实数据，构建期由 fetch_real_data.py 抓取）
// 美国：FRED CPI/GDP/失业率（真实 YoY 历史）+ 10Y 国债收益率。
// 欧/日/港/瑞/英/澳：World Bank WDI 真实 CPI 通胀 / GDP 增速 / 失业率（年度，2000–2025）
//   + FRED 10Y 国债收益率（真实）。即各国与中国同款，均展示「一系列经济数据」，不虚构。
// 结构复用 ChinaMacroPoint，组件层无需改动。

import type { ChinaMacroPoint } from "./china-macro-mock";
import { getIntlMacroRaw, DATA_ASOF } from "./realdata";

export interface IntlEco {
  code: string;
  name: string;
  source: string;
}

// 7 个非中国经济体
export const INTL_MACRO_ECONOMIES: IntlEco[] = [
  { code: "USD", name: "美国", source: "FRED / BEA / BLS" },
  { code: "EUR", name: "欧元区", source: "World Bank WDI（CPI/GDP/失业）＋ FRED（10Y）" },
  { code: "JPY", name: "日本", source: "World Bank WDI（CPI/GDP/失业）＋ FRED（10Y）" },
  { code: "HKD", name: "香港", source: "World Bank WDI（CPI/GDP/失业）" },
  { code: "CHF", name: "瑞士", source: "World Bank WDI（CPI/GDP/失业）＋ FRED（10Y）" },
  { code: "GBP", name: "英国", source: "World Bank WDI（CPI/GDP/失业）＋ FRED（10Y）" },
  { code: "AUD", name: "澳大利亚", source: "World Bank WDI（CPI/GDP/失业）＋ FRED（10Y）" },
];

export const INTL_MACRO_PERIOD = DATA_ASOF;
export const INTL_MACRO_IS_MOCK = false;

function norm(p: string): string {
  const m = p.match(/(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  const d = /^(\d{4})-(\d{2})/.exec(p);
  if (d) return `${d[1]}-${d[2]}`;
  return p;
}

function toPoint(e: any): ChinaMacroPoint {
  const series = (e.history || []).map((h: any) => h.v);
  if (series.length === 0) series.push(e.actual);
  return {
    key: e.key,
    short: e.short,
    name: e.name,
    color: e.color,
    period: norm(e.period || e.asOf || DATA_ASOF),
    actual: e.actual as number,
    previous: e.previous,
    expected: e.expected,
    releaseDate: e.asOf || DATA_ASOF,
    source: e.source,
    series,
    history: e.history,
    isReal: e.isReal,
    asOf: e.asOf,
    unit: e.unit,
    noConsensus: e.expected == null,
  };
}

export const INTL_MACRO: Record<string, ChinaMacroPoint[]> = (() => {
  const raw = getIntlMacroRaw();
  const out: Record<string, ChinaMacroPoint[]> = {};
  for (const eco of INTL_MACRO_ECONOMIES) {
    const arr = raw[eco.code];
    if (!arr) {
      out[eco.code] = [];
      continue;
    }
    out[eco.code] = arr.filter((e) => e.actual != null).map(toPoint);
  }
  return out;
})();

export function getIntlMacro(code: string): ChinaMacroPoint[] | null {
  return INTL_MACRO[code] ?? null;
}
