// 外汇（FX）货币对数据模块
// 为 regime-modules 的「外汇与相对利率」矩阵提供主要货币对 / 交叉汇率 / 相对人民币(CNY) / 相对离岸人民币(CNH) 的确定性 Mock 数据。

export type FxGroup = "major" | "cross" | "vsCNY" | "vsCNH";

export interface FxPair {
  id: string;
  base: string;
  quote: string;
  current: number;
  chg1d: number | null;
  chg1w: number | null;
  chg1m: number | null;
  ytd: number | null;
  yoy: number | null;
}

interface PairSpec {
  base: string;
  quote: string;
  current: number;
}

const PAIRS: Record<string, PairSpec> = {
  // 主要货币对
  EURUSD: { base: "EUR", quote: "USD", current: 1.085 },
  GBPUSD: { base: "GBP", quote: "USD", current: 1.27 },
  USDJPY: { base: "USD", quote: "JPY", current: 156.3 },
  USDCHF: { base: "USD", quote: "CHF", current: 0.895 },
  AUDUSD: { base: "AUD", quote: "USD", current: 0.665 },
  USDCNY: { base: "USD", quote: "CNY", current: 7.12 },
  USDCNH: { base: "USD", quote: "CNH", current: 7.13 },
  USDCAD: { base: "USD", quote: "CAD", current: 1.36 },
  NZDUSD: { base: "NZD", quote: "USD", current: 0.612 },
  // 交叉汇率
  EURJPY: { base: "EUR", quote: "JPY", current: 169.5 },
  EURGBP: { base: "EUR", quote: "GBP", current: 0.854 },
  GBPJPY: { base: "GBP", quote: "JPY", current: 198.5 },
  AUDJPY: { base: "AUD", quote: "JPY", current: 103.9 },
  EURCHF: { base: "EUR", quote: "CHF", current: 0.972 },
  AUDEUR: { base: "AUD", quote: "EUR", current: 0.613 },
  // 相对人民币（CNY 为报价货币）
  EURCNY: { base: "EUR", quote: "CNY", current: 7.73 },
  GBPCNY: { base: "GBP", quote: "CNY", current: 9.04 },
  JPYCNY: { base: "JPY", quote: "CNY", current: 0.0456 },
  CHFCNY: { base: "CHF", quote: "CNY", current: 7.96 },
  AUDCNY: { base: "AUD", quote: "CNY", current: 4.73 },
  // 相对离岸人民币（CNH 为报价货币）
  EURCNH: { base: "EUR", quote: "CNH", current: 7.74 },
  GBPCNH: { base: "GBP", quote: "CNH", current: 9.05 },
  JPYCNH: { base: "JPY", quote: "CNH", current: 0.0457 },
  AUDCNH: { base: "AUD", quote: "CNH", current: 4.74 },
};

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rnd: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildPair(id: string, asOf: string): FxPair {
  const spec = PAIRS[id];
  const rnd = mulberry32(hashStr(`FXPAIR:${id}:${asOf}`));
  const chg1d = +(gauss(rnd) * 0.25).toFixed(3); // %
  const chg1w = +(gauss(rnd) * 0.6).toFixed(3);
  const chg1m = +(gauss(rnd) * 1.4).toFixed(3);
  const ytd = +(gauss(rnd) * 3.5).toFixed(3);
  const yoy = +(gauss(rnd) * 6.0).toFixed(3);
  return {
    id,
    base: spec.base,
    quote: spec.quote,
    current: spec.current,
    chg1d,
    chg1w,
    chg1m,
    ytd,
    yoy,
  };
}

function groupIds(g: FxGroup): string[] {
  switch (g) {
    case "major":
      return ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCNY", "USDCNH", "USDCAD", "NZDUSD"];
    case "cross":
      return ["EURJPY", "EURGBP", "GBPJPY", "AUDJPY", "EURCHF", "AUDEUR"];
    case "vsCNY":
      return ["USDCNY", "EURCNY", "GBPCNY", "JPYCNY", "CHFCNY", "AUDCNY"];
    case "vsCNH":
      return ["USDCNH", "EURCNH", "GBPCNH", "JPYCNH", "AUDCNH"];
  }
}

export function fxMatrixByGroup(asOf: string): Record<FxGroup, FxPair[]> {
  const out = {} as Record<FxGroup, FxPair[]>;
  (["major", "cross", "vsCNY", "vsCNH"] as FxGroup[]).forEach((g) => {
    out[g] = groupIds(g).map((id) => buildPair(id, asOf));
  });
  return out;
}

export function getFxMatrix(asOf: string): FxPair[] {
  const groups = fxMatrixByGroup(asOf);
  return [...groups.major, ...groups.cross, ...groups.vsCNY, ...groups.vsCNH];
}
