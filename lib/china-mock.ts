/* ============================================================================
 * China Macro — 6 modules (mock data)
 * Ported into the unified desk. Deterministic mock; clearly labeled Mock Data.
 * Replace buildSeries data sources to wire real data; keep CSeries shape.
 * ========================================================================== */

export interface CObs {
  date: string;
  value: number | null;
}
export interface CSeries {
  id: string;
  name: string;
  unit: string;
  source: string;
  observations: CObs[];
}

const N = 60; // ~5 years of monthly points
export const CHINA_META = {
  asOf: "2026-09",
  releaseNote: "观察期 2026-09（次月中旬发布，Mock）",
  source: "Mock Data — Wind / 公开数据合成逻辑模拟",
  disclaimer:
    "本看板为 UI 原型，全部指标使用 Mock Data，不代表真实市场数据。真实数据接入接口已预留（CSeries / sourceKind）。",
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthlyDates(n: number, end: string): string[] {
  const [y0, m0] = end.split("-").map(Number);
  let y = y0;
  let mm = m0;
  const arr: { y: number; m: number }[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({ y, m: mm });
    mm -= 1;
    if (mm === 0) {
      mm = 12;
      y -= 1;
    }
  }
  return arr
    .reverse()
    .map((o) => `${o.y}-${String(o.m).padStart(2, "0")}`);
}

function genMonthly(seed: number, base: number, vol: number, drift: number, n: number): number[] {
  const r = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = v + drift + (r() - 0.5) * 2 * vol;
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

function buildSeries(
  id: string,
  name: string,
  unit: string,
  dates: string[],
  values: number[],
  opts?: { latest?: number; prev?: number },
): CSeries {
  const observations: CObs[] = dates.map((d, i) => ({ date: d, value: values[i] }));
  if (opts?.latest !== undefined && observations.length > 0)
    observations[observations.length - 1].value = opts.latest;
  if (opts?.prev !== undefined && observations.length > 1)
    observations[observations.length - 2].value = opts.prev;
  return { id, name, unit, source: CHINA_META.source, observations };
}

const DATES = monthlyDates(N, CHINA_META.asOf);
const SRC = "Mock Data";

/* ---------------- Module 1: 中国宏观总览 ---------------- */
export interface MacroItem {
  key: string;
  name: string;
  group: string;
  unit: string;
  kind: string;
  series: CSeries;
  latest: number;
  prev: number;
  direction: "up" | "down" | "flat";
  releaseDate: string;
}
const IND = [
  { key: "ip", name: "工业增加值", group: "增长", unit: "%", kind: "同比", base: 5.0, vol: 0.5, drift: -0.01, latest: 5.0, prev: 5.1, seed: 11 },
  { key: "retail", name: "社会消费品零售", group: "增长", unit: "%", kind: "同比", base: 3.4, vol: 0.6, drift: -0.01, latest: 3.4, prev: 3.6, seed: 12 },
  { key: "fai", name: "固定资产投资(累计)", group: "增长", unit: "%", kind: "同比", base: 3.2, vol: 0.3, drift: 0.0, latest: 3.2, prev: 3.3, seed: 13 },
  { key: "re", name: "房地产开发投资(累计)", group: "增长", unit: "%", kind: "同比", base: -9.8, vol: 0.8, drift: 0.04, latest: -9.8, prev: -10.1, seed: 14 },
  { key: "exp", name: "出口", group: "增长", unit: "%", kind: "同比", base: 6.5, vol: 2.0, drift: 0.0, latest: 6.5, prev: 7.0, seed: 15 },
  { key: "imp", name: "进口", group: "增长", unit: "%", kind: "同比", base: 1.8, vol: 1.5, drift: 0.0, latest: 1.8, prev: 2.1, seed: 16 },
  { key: "cpi", name: "CPI", group: "价格", unit: "%", kind: "同比", base: 0.5, vol: 0.4, drift: 0.0, latest: 0.5, prev: 0.3, seed: 21 },
  { key: "ppi", name: "PPI", group: "价格", unit: "%", kind: "同比", base: -1.4, vol: 0.5, drift: 0.03, latest: -1.4, prev: -1.6, seed: 22 },
  { key: "pmi", name: "制造业PMI", group: "价格", unit: "", kind: "", base: 49.8, vol: 0.6, drift: 0.0, latest: 49.8, prev: 49.5, seed: 23 },
  { key: "m2", name: "M2", group: "货币信用", unit: "%", kind: "同比", base: 8.1, vol: 0.3, drift: 0.0, latest: 8.1, prev: 8.0, seed: 31 },
  { key: "tsf", name: "社会融资规模存量", group: "货币信用", unit: "%", kind: "同比", base: 8.4, vol: 0.2, drift: 0.0, latest: 8.4, prev: 8.3, seed: 32 },
  { key: "loan", name: "新增人民币贷款", group: "货币信用", unit: "亿元", kind: "当月", base: 9000, vol: 2500, drift: 0.0, latest: 9000, prev: 11000, seed: 33 },
  { key: "unemp", name: "城镇调查失业率", group: "货币信用", unit: "%", kind: "", base: 5.1, vol: 0.2, drift: 0.0, latest: 5.1, prev: 5.2, seed: 34 },
];
export const macroItems: MacroItem[] = IND.map((c) => {
  const values = genMonthly(c.seed, c.base, c.vol, c.drift, N);
  const series = buildSeries(c.key, c.name, c.unit, DATES, values, { latest: c.latest, prev: c.prev });
  const d: "up" | "down" | "flat" = c.latest > c.prev ? "up" : c.latest < c.prev ? "down" : "flat";
  return { key: c.key, name: c.name, group: c.group, unit: c.unit, kind: c.kind, series, latest: c.latest, prev: c.prev, direction: d, releaseDate: CHINA_META.releaseNote };
});
export const macroGroups = [
  { name: "增长", items: macroItems.filter((m) => m.group === "增长") },
  { name: "价格", items: macroItems.filter((m) => m.group === "价格") },
  { name: "货币与信用", items: macroItems.filter((m) => m.group === "货币信用") },
];
export function getMacroItem(key: string): MacroItem | undefined {
  return macroItems.find((m) => m.key === key);
}

/* ---------------- Module 2: 空转收益与实体收益分配 ---------------- */
const idleSeries = buildSeries("idle", "空转收益（金融部门）", "%", DATES, genMonthly(101, 3.0, 0.6, -0.005, N), { latest: 3.2, prev: 2.9 });
const realSeries = buildSeries("real", "实体收益（实体部门）", "%", DATES, genMonthly(102, 6.0, 0.5, -0.004, N), { latest: 5.8, prev: 6.1 });
export const idleReal = {
  idle: idleSeries,
  real: realSeries,
  unit: "%",
  note: "空转收益代理：金融部门资金套利/加杠杆收益；实体收益代理：工业企业营业收入利润率。两条曲线为 Mock 合成，用于展示分配关系，不构成因果判断。",
};

/* ---------------- Module 3: 宏观数据与预期差 ---------------- */
const TREND_EXTRA: Record<string, { name: string; base: number; vol: number; latest: number; prev: number; seed: number }> = {
  manu: { name: "制造业投资(累计)", base: 9.0, vol: 0.5, latest: 9.0, prev: 9.3, seed: 41 },
  infra: { name: "基建投资(累计,不含电力)", base: 5.5, vol: 0.5, latest: 5.5, prev: 5.7, seed: 42 },
};
const trendKeys = ["ip", "retail", "fai", "manu", "infra", "re", "exp", "imp", "cpi", "ppi"];
export const expectationTrends = trendKeys.map((k) => {
  if (k === "manu" || k === "infra") {
    const cfg = TREND_EXTRA[k];
    const s = buildSeries(k, cfg.name, "%", DATES, genMonthly(cfg.seed, cfg.base, cfg.vol, 0, N), { latest: cfg.latest, prev: cfg.prev });
    return { key: k, name: cfg.name, unit: "%", series: s };
  }
  const it = getMacroItem(k)!;
  return { key: k, name: it.name, unit: it.unit || "%", series: it.series };
});
export interface GapRow {
  indicator: string;
  unit: string;
  actual: number;
  consensus: number;
  previous: number;
  releaseDate: string;
}
export const expectationGap: GapRow[] = [
  { indicator: "工业增加值同比", unit: "%", actual: 5.0, consensus: 4.8, previous: 5.1, releaseDate: CHINA_META.releaseNote },
  { indicator: "社会消费品零售同比", unit: "%", actual: 3.4, consensus: 3.6, previous: 3.6, releaseDate: CHINA_META.releaseNote },
  { indicator: "固定资产投资累计同比", unit: "%", actual: 3.2, consensus: 3.3, previous: 3.3, releaseDate: CHINA_META.releaseNote },
  { indicator: "房地产开发投资累计同比", unit: "%", actual: -9.8, consensus: -10.0, previous: -10.1, releaseDate: CHINA_META.releaseNote },
  { indicator: "出口同比", unit: "%", actual: 6.5, consensus: 5.8, previous: 7.0, releaseDate: CHINA_META.releaseNote },
  { indicator: "进口同比", unit: "%", actual: 1.8, consensus: 2.2, previous: 2.1, releaseDate: CHINA_META.releaseNote },
  { indicator: "CPI同比", unit: "%", actual: 0.5, consensus: 0.4, previous: 0.3, releaseDate: CHINA_META.releaseNote },
  { indicator: "PPI同比", unit: "%", actual: -1.4, consensus: -1.5, previous: -1.6, releaseDate: CHINA_META.releaseNote },
  { indicator: "制造业PMI", unit: "", actual: 49.8, consensus: 49.6, previous: 49.5, releaseDate: CHINA_META.releaseNote },
  { indicator: "M2同比", unit: "%", actual: 8.1, consensus: 8.0, previous: 8.0, releaseDate: CHINA_META.releaseNote },
];

/* ---------------- Module 4: 中国利率曲线 ---------------- */
export const ratesCurve = {
  tenors: ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "7Y", "10Y", "30Y"],
  current: [1.45, 1.55, 1.65, 1.7, 1.72, 1.78, 1.95, 2.1, 2.18, 2.35],
  oneWeekAgo: [1.48, 1.57, 1.66, 1.71, 1.73, 1.79, 1.96, 2.11, 2.19, 2.36],
  oneMonthAgo: [1.5, 1.6, 1.68, 1.73, 1.75, 1.82, 1.99, 2.13, 2.21, 2.38],
  policy: [
    { label: "7天逆回购利率", value: 1.4, unit: "%", kind: "政策利率" },
    { label: "1年MLF", value: 2.0, unit: "%", kind: "政策利率" },
    { label: "DR007", value: 1.75, unit: "%", kind: "资金利率" },
    { label: "R007", value: 1.85, unit: "%", kind: "资金利率" },
  ],
  get spreads() {
    return [
      { label: "10Y-2Y", value: this.current[8] - this.current[4], change: this.current[8] - this.current[4] - (this.oneMonthAgo[8] - this.oneMonthAgo[4]) },
      { label: "10Y-1Y", value: this.current[8] - this.current[3], change: this.current[8] - this.current[3] - (this.oneMonthAgo[8] - this.oneMonthAgo[3]) },
    ];
  },
  history10y: buildSeries("cgb10y", "10年期国债收益率", "%", DATES, genMonthly(201, 2.5, 0.15, -0.006, N), { latest: 2.18, prev: 2.21 }),
};

/* ---------------- Module 5: 中美10Y国债利差 ---------------- */
const china10y = buildSeries("cn10y", "中国10年期国债收益率", "%", DATES, genMonthly(301, 2.3, 0.18, -0.006, N), { latest: 2.18, prev: 2.21 });
const us10y = buildSeries("us10y", "美国10年期国债收益率", "%", DATES, genMonthly(302, 4.3, 0.3, 0.002, N), { latest: 4.25, prev: 4.3 });
const spreadObs: CObs[] = DATES.map((d, i) => ({ date: d, value: Number((china10y.observations[i].value! - us10y.observations[i].value!).toFixed(2)) }));
const spreadSeries: CSeries = { id: "cnus10y", name: "中美10Y国债利差（中-美）", unit: "%", source: SRC, observations: spreadObs };
const usdcny = buildSeries("usdcny", "USD/CNY", "", DATES, genMonthly(303, 7.2, 0.08, 0.0, N), { latest: 7.16, prev: 7.18 });
const usdcnh = buildSeries("usdcnh", "USD/CNH", "", DATES, genMonthly(304, 7.21, 0.09, 0.0, N), { latest: 7.17, prev: 7.19 });
export const cnus = { china10y, us10y, spread: spreadSeries, usdcny, usdcnh };

/* ---------------- Module 6: 中国流动性与资金市场 ---------------- */
const dr007 = buildSeries("dr007", "DR007", "%", DATES, genMonthly(401, 1.85, 0.15, -0.004, N), { latest: 1.75, prev: 1.78 });
const r007 = buildSeries("r007", "R007", "%", DATES, genMonthly(402, 1.95, 0.2, -0.004, N), { latest: 1.85, prev: 1.9 });
const shibor3m = buildSeries("shibor3m", "SHIBOR 3M", "%", DATES, genMonthly(403, 1.9, 0.12, -0.003, N), { latest: 1.85, prev: 1.87 });
const tsfNew = buildSeries("tsf_new", "新增社会融资规模", "亿元", DATES, genMonthly(404, 16000, 6000, 0.0, N), { latest: 15000, prev: 18000 });
const omo = buildSeries("omo", "公开市场操作净投放", "亿元", DATES, genMonthly(405, 0, 3000, 0.0, N), { latest: 800, prev: -500 });
export const liquidity = {
  dr007,
  r007,
  shibor3m,
  m2: getMacroItem("m2")!.series,
  tsfNew,
  loanNew: getMacroItem("loan")!.series,
  omo,
  cgb10y: ratesCurve.history10y,
  policy: [
    { label: "7天逆回购利率", value: 1.4, unit: "%" },
    { label: "1年MLF", value: 2.0, unit: "%" },
    { label: "DR007", value: 1.75, unit: "%" },
    { label: "R007", value: 1.85, unit: "%" },
    { label: "SHIBOR 3M", value: 1.85, unit: "%" },
  ],
};

/* ---------------- helpers ---------------- */
export function latest(s: CSeries): CObs | undefined {
  const v = s.observations.filter((o) => o.value !== null);
  return v[v.length - 1];
}
export function previous(s: CSeries): CObs | undefined {
  const v = s.observations.filter((o) => o.value !== null);
  return v[v.length - 2];
}
export function sliceSeries(s: CSeries, months: number): CSeries {
  return { ...s, observations: s.observations.slice(Math.max(0, s.observations.length - months)) };
}
export function toRows(series: CSeries[], keys: string[], months = N): Record<string, number | string>[] {
  const sliced = series.map((s) => sliceSeries(s, months));
  const len = sliced[0]?.observations.length ?? 0;
  const rows: Record<string, number | string>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, number | string> = { date: sliced[0].observations[i].date };
    sliced.forEach((s, idx) => {
      row[keys[idx]] = s.observations[i]?.value ?? NaN;
    });
    rows.push(row);
  }
  return rows;
}
