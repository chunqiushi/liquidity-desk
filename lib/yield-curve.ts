/* ============================================================================
 * 八国主权/准主权收益率曲线 — 数据层（确定性 Mock）
 * ----------------------------------------------------------------------------
 * 覆盖 8 个经济体（与各国流动性监测一致）：中国/美国/欧元区/日本/香港/瑞士/英国/澳大利亚
 * 每国构建完整期限结构（1M · 3M · 6M · 1Y · 2Y · 3Y · 5Y · 7Y · 10Y · 20Y · 30Y）：
 *   - 锚定当前曲线形状（正常/倒挂/陡峭/驼峰），与 lib/indicators 的 2Y/10Y 尽量对齐
 *   - 确定性日度历史：采用「平行平移 + 扭曲(twist)」双因子随机游走，保证同日各期限联动真实
 *   - 派生：当日 vs 前日、每日 bp 变动、平行平移、斜率(10Y−2Y)变化、曲线形态、牛熊/趋陡趋平分类
 *
 * 全部以 hashStr + mulberry32 复现，构建结果可重复。每条数据均标注 Mock。
 * ========================================================================== */

import { getCurve, getSeries } from "./realdata";

export type CountryCode = "CN" | "US" | "EU" | "JP" | "HK" | "CH" | "GB" | "AU";

export interface Tenor {
  key: string;
  label: string;
}

export const TENORS: Tenor[] = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "2Y", label: "2Y" },
  { key: "3Y", label: "3Y" },
  { key: "5Y", label: "5Y" },
  { key: "7Y", label: "7Y" },
  { key: "10Y", label: "10Y" },
  { key: "20Y", label: "20Y" },
  { key: "30Y", label: "30Y" },
];

export const TENOR_KEYS = TENORS.map((t) => t.key);
const RANKS: Record<string, number> = {};
TENORS.forEach((t, i) => (RANKS[t.key] = i));
const MID = (TENORS.length - 1) / 2;
/** 期限扭曲贝塔：短端 −1、长端 +1，使 twist 在两端反向移动 */
const slopeBeta = (k: string) => (RANKS[k] - MID) / MID;

export interface CountrySpec {
  code: CountryCode;
  name: string;
  flag: string;
  cb: string;
  currency: string;
  policy: number;
  /** 锚定曲线：每个期限的当前收益率（%） */
  curve: Record<string, number>;
}

/* ---------------------------------------------------------------------------
 * 锚定曲线形状（单位 %）。与 lib/indicators 的 US_2Y/US_10Y/CN_10Y/JP_10Y/EU_10Y/HK_10Y/GB_10Y/AU_10Y 对齐。
 * 形状语义：
 *   US/EU/GB 前端倒挂（2Y>10Y）；CN/CH/AU/JP 正常/陡峭；HK 接近平坦。
 * ------------------------------------------------------------------------- */
export const YIELD_ANCHORS: Record<CountryCode, CountrySpec> = {
  CN: {
    code: "CN",
    name: "中国",
    flag: "🇨🇳",
    cb: "中国人民银行 PBoC",
    currency: "CNY",
    policy: 1.5,
    curve: {
      "1M": 1.68, "3M": 1.72, "6M": 1.76, "1Y": 1.8, "2Y": 1.95, "3Y": 2.02,
      "5Y": 2.08, "7Y": 2.12, "10Y": 2.15, "20Y": 2.33, "30Y": 2.42,
    },
  },
  US: {
    code: "US",
    name: "美国",
    flag: "🇺🇸",
    cb: "Federal Reserve",
    currency: "USD",
    policy: 4.5,
    curve: {
      "1M": 4.63, "3M": 4.6, "6M": 4.55, "1Y": 4.52, "2Y": 4.66, "3Y": 4.5,
      "5Y": 4.4, "7Y": 4.33, "10Y": 4.28, "20Y": 4.46, "30Y": 4.55,
    },
  },
  EU: {
    code: "EU",
    name: "欧元区",
    flag: "🇪🇺",
    cb: "ECB",
    currency: "EUR",
    policy: 3.25,
    curve: {
      "1M": 3.22, "3M": 3.18, "6M": 3.15, "1Y": 3.1, "2Y": 2.95, "3Y": 2.8,
      "5Y": 2.68, "7Y": 2.62, "10Y": 2.55, "20Y": 2.7, "30Y": 2.82,
    },
  },
  JP: {
    code: "JP",
    name: "日本",
    flag: "🇯🇵",
    cb: "日本銀行 BoJ",
    currency: "JPY",
    policy: 0.25,
    curve: {
      "1M": 0.25, "3M": 0.32, "6M": 0.42, "1Y": 0.55, "2Y": 0.72, "3Y": 0.83,
      "5Y": 0.93, "7Y": 1.0, "10Y": 1.05, "20Y": 1.55, "30Y": 1.85,
    },
  },
  HK: {
    code: "HK",
    name: "香港",
    flag: "🇭🇰",
    cb: "HKMA",
    currency: "HKD",
    policy: 4.75,
    curve: {
      "1M": 3.66, "3M": 3.6, "6M": 3.58, "1Y": 3.56, "2Y": 3.5, "3Y": 3.48,
      "5Y": 3.46, "7Y": 3.45, "10Y": 3.45, "20Y": 3.55, "30Y": 3.62,
    },
  },
  CH: {
    code: "CH",
    name: "瑞士",
    flag: "🇨🇭",
    cb: "SNB",
    currency: "CHF",
    policy: 1.0,
    curve: {
      "1M": 0.96, "3M": 0.91, "6M": 0.88, "1Y": 0.85, "2Y": 0.92, "3Y": 0.98,
      "5Y": 1.02, "7Y": 1.05, "10Y": 1.08, "20Y": 1.2, "30Y": 1.3,
    },
  },
  GB: {
    code: "GB",
    name: "英国",
    flag: "🇬🇧",
    cb: "Bank of England",
    currency: "GBP",
    policy: 4.0,
    curve: {
      "1M": 4.18, "3M": 4.12, "6M": 4.06, "1Y": 4.02, "2Y": 4.1, "3Y": 4.18,
      "5Y": 4.25, "7Y": 4.28, "10Y": 4.3, "20Y": 4.46, "30Y": 4.56,
    },
  },
  AU: {
    code: "AU",
    name: "澳大利亚",
    flag: "🇦🇺",
    cb: "RBA",
    currency: "AUD",
    policy: 3.6,
    curve: {
      "1M": 3.66, "3M": 3.63, "6M": 3.6, "1Y": 3.6, "2Y": 3.76, "3Y": 3.9,
      "5Y": 4.0, "7Y": 4.1, "10Y": 4.2, "20Y": 4.46, "30Y": 4.62,
    },
  },
};

export const COUNTRY_ORDER: CountryCode[] = ["CN", "US", "EU", "JP", "HK", "CH", "GB", "AU"];

/* ----------------------------- 确定性引擎 ----------------------------- */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 近似标准正态（4 个均匀分布之和，标准差归一） */
function gauss(rnd: () => number): number {
  return (rnd() + rnd() + rnd() + rnd() - 2) * Math.sqrt(3);
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

function buildDates(asOf: string, n: number): string[] {
  const end = new Date(asOf + "T00:00:00Z");
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/* 双因子日度波动参数（单位 bp） */
const LEVEL_SCALE = 1.0; // 平行平移幅度
const TWIST_SCALE = 0.9; // 扭曲幅度（乘以 slopeBeta）
const LEVEL_SD = 2.6; // 每日平行冲击标准差
const TWIST_SD = 3.4; // 每日扭曲冲击标准差
const HIST_DAYS = 30;

export type MoveDir = "up" | "down" | "flat";
export type MoveTwist = "steep" | "flat" | "none";

export interface CurveMove {
  dir: MoveDir; // 利率方向：up=上行(熊) down=下行(牛) flat=横盘
  twist: MoveTwist; // steep=趋陡 flat=趋平 none=斜率未变
  label: string; // 如「熊市趋陡」
  cls: string; // tailwind 文本色类
}

export interface CurveShape {
  label: string; // 倒挂 / 趋平 / 正常·陡峭
  cls: string;
}

export interface CountryYield {
  code: CountryCode;
  name: string;
  flag: string;
  cb: string;
  currency: string;
  policyRate: number;
  asOf: string;
  tenors: string[];
  current: Record<string, number>;
  prev: Record<string, number>;
  history: Record<string, { date: string; value: number }[]>;
  /** 每日变动（bp），当日 − 前日，正=收益率上行 */
  dailyBps: Record<string, number>;
  /** 平行平移（bp）= 各期限日变动均值 */
  parallelBps: number;
  /** 斜率变化（bp）= (10Y−2Y) 当日 − 前日 = dailyBps[10Y] − dailyBps[2Y] */
  slopeBps: number;
  move: CurveMove;
  shape: CurveShape;
  /** 真实数据覆盖程度：full=全期限真实；partial=仅 10Y 等部分期限真实；false=纯模型估算 */
  isReal?: "full" | "partial" | false;
  /** 数据说明（真实来源或模型说明） */
  realNote?: string;
  /** 真实数据来源（isReal 为真时） */
  source?: string;
}

function classifyMove(
  parallelBps: number,
  slopeBps: number,
): CurveMove {
  const dir: MoveDir = parallelBps > 0.5 ? "up" : parallelBps < -0.5 ? "down" : "flat";
  const twist: MoveTwist = slopeBps > 0.5 ? "steep" : slopeBps < -0.5 ? "flat" : "none";
  let label = "变化不大";
  let cls = "text-muted";
  if (dir === "up") {
    cls = "text-neg"; // 收益率上行=红
    label = twist === "steep" ? "熊市趋陡" : twist === "flat" ? "熊市趋平" : "熊市平移";
  } else if (dir === "down") {
    cls = "text-pos"; // 收益率下行=绿
    label = twist === "steep" ? "牛市趋陡" : twist === "flat" ? "牛市趋平" : "牛市平移";
  } else {
    label = twist === "steep" ? "趋陡" : twist === "flat" ? "趋平" : "变化不大";
  }
  return { dir, twist, label, cls };
}

function classifyShape(current: Record<string, number>): CurveShape {
  const c2 = current["2Y"];
  const c10 = current["10Y"];
  const c30 = current["30Y"];
  if (c2 - c10 > 0.15) return { label: "倒挂", cls: "text-neg" };
  if (c30 - c2 < 0.15) return { label: "趋平", cls: "text-muted" };
  return { label: "正常·陡峭", cls: "text-pos" };
}

function buildCountry(
  spec: CountrySpec,
  asOf: string,
  dates: string[],
  realCurrent?: Record<string, number>,
  realPrev10Y?: number,
): CountryYield {
  const rnd = mulberry32(hashStr("YC:" + spec.code + ":" + asOf));
  const anchor = spec.curve;

  // 每日双因子冲击
  const levelShocks: number[] = [];
  const slopeShocks: number[] = [];
  for (let i = 0; i < HIST_DAYS; i++) {
    levelShocks.push(gauss(rnd) * LEVEL_SD);
    slopeShocks.push(gauss(rnd) * TWIST_SD);
  }
  // 每日各期限变动 moves[i][k]
  const moves: Record<string, number[]> = {};
  TENOR_KEYS.forEach((k) => (moves[k] = []));
  for (let i = 0; i < HIST_DAYS; i++) {
    TENOR_KEYS.forEach((k) => {
      const m = LEVEL_SCALE * levelShocks[i] + TWIST_SCALE * slopeShocks[i] * slopeBeta(k);
      moves[k].push(m);
    });
  }
  // 累计末值 → 起点 = 锚 − 累计，使末日恰好等于锚
  const cumEnd: Record<string, number> = {};
  TENOR_KEYS.forEach((k) => (cumEnd[k] = moves[k].reduce((a, b) => a + b, 0)));
  const start: Record<string, number> = {};
  TENOR_KEYS.forEach((k) => (start[k] = anchor[k] - cumEnd[k]));

  const current: Record<string, number> = {};
  const prev: Record<string, number> = {};
  const dailyBps: Record<string, number> = {};
  const history: Record<string, { date: string; value: number }[]> = {};

  TENOR_KEYS.forEach((k) => {
    const arr: number[] = [];
    let run = 0;
    for (let i = 0; i < HIST_DAYS; i++) {
      run += moves[k][i];
      arr.push(Math.max(0, start[k] + run));
    }
    const realV = realCurrent?.[k];
    let cur: number;
    if (realV != null) {
      // 平移整条路径，使末点恰好等于真实值（保留模型波动形态，端点真实）
      const offset = realV - arr[HIST_DAYS - 1];
      for (let i = 0; i < HIST_DAYS; i++) arr[i] = Math.max(0, arr[i] + offset);
      cur = realV;
    } else {
      cur = anchor[k];
    }
    const p = arr[HIST_DAYS - 2];
    current[k] = round3(cur);
    if (k === "10Y" && realPrev10Y != null && realV != null) {
      prev[k] = round3(realPrev10Y);
      dailyBps[k] = round1((cur - realPrev10Y) * 100);
    } else {
      prev[k] = round3(p);
      dailyBps[k] = round1((cur - p) * 100);
    }
    history[k] = dates.map((d, i) => ({ date: d, value: round3(arr[i]) }));
  });

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const parallelBps = round1(mean(TENOR_KEYS.map((k) => dailyBps[k])));
  const slopeBps = round1(dailyBps["10Y"] - dailyBps["2Y"]);
  const move = classifyMove(parallelBps, slopeBps);
  const shape = classifyShape(current);

  const realCount = realCurrent ? TENOR_KEYS.filter((k) => realCurrent[k] != null).length : 0;
  const isReal: "full" | "partial" | false =
    realCurrent && realCount >= TENOR_KEYS.length ? "full"
    : realCount > 0 ? "partial" : false;
  const note =
    isReal === "full"
      ? spec.code === "CN"
        ? "中债估值曲线（ChinaBond）真实全期限"
        : "U.S. Treasury 日度曲线真实全期限"
      : isReal === "partial"
        ? "10Y 为 FRED 真实行情，其余期限为模型路径（仅端点真实）"
        : "模型估算曲线（无免费真实源）";

  return {
    code: spec.code,
    name: spec.name,
    flag: spec.flag,
    cb: spec.cb,
    currency: spec.currency,
    policyRate: spec.policy,
    asOf,
    tenors: TENOR_KEYS,
    current,
    prev,
    history,
    dailyBps,
    parallelBps,
    slopeBps,
    move,
    shape,
    isReal,
    realNote: note,
    source: isReal ? (spec.code === "CN" ? "ChinaBond via akshare" : spec.code === "US" ? "U.S. Treasury" : "FRED") : undefined,
  };
}

/** 主入口：返回 8 国收益率曲线（已按 COUNTRY_ORDER 排序）。
 *  真实数据由 lib/realdata 提供（CN/US 全期限真实，EU/JP/GB/CH/AU 至少 10Y 真实）。 */
export function getYieldCurves(asOf: string): CountryYield[] {
  const dates = buildDates(asOf, HIST_DAYS);
  return COUNTRY_ORDER.map((code) => {
    const c = getCurve(code);
    let realCurrent: Record<string, number> | undefined;
    if (c) {
      realCurrent = {};
      for (const pt of c.points) {
        if (TENOR_KEYS.includes(pt.tenor as any)) realCurrent[pt.tenor] = pt.v;
      }
    }
    let realPrev10Y: number | undefined;
    const s = getSeries(code + "_10Y");
    if (s && s.length >= 2) realPrev10Y = s[s.length - 2].v;
    return buildCountry(YIELD_ANCHORS[code], asOf, dates, realCurrent, realPrev10Y);
  });
}
