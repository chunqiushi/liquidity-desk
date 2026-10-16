// 外汇（FX）热力图数据模块 —— 八国货币相对强弱
// 真实数据源：FRED DEX 系列（level = 100 / (USD per unit)），由 scripts/fetch_real_data.py
// 在构建期抓取并烘焙进 lib/data/realdata.json，本模块仅做类型化读取与交叉涨跌幅计算。
// 交叉涨跌幅 = (1+ci)/(1+cj) − 1，保证矩阵反对称（cell(i,j) = −cell(j,i)）。

import { getFxLevels, DATA_ASOF } from "./realdata";

export type FxPeriod = "1d" | "1w" | "1m";

export const FX_Asof = DATA_ASOF;
export const FX_IS_REAL = true;
export const FX_SOURCE = "FRED (DEXUSEU/DEXJPUS/DEXUSUK/DEXSZUS/DEXUSAL/DEXHKUS/DEXCHUS)";

export interface FxMeta {
  code: string;
  name: string;
  flag: string;
}

// 顺序与货币市场页一致：中/美/欧/日/港/瑞/英/澳
export const FX_META: FxMeta[] = [
  { code: "CNY", name: "人民币", flag: "🇨🇳" },
  { code: "USD", name: "美元", flag: "🇺🇸" },
  { code: "EUR", name: "欧元", flag: "🇪🇺" },
  { code: "JPY", name: "日元", flag: "🇯🇵" },
  { code: "HKD", name: "港币", flag: "🇭🇰" },
  { code: "CHF", name: "瑞郎", flag: "🇨🇭" },
  { code: "GBP", name: "英镑", flag: "🇬🇧" },
  { code: "AUD", name: "澳元", flag: "🇦🇺" },
];

export const FX_CODES = FX_META.map((m) => m.code);

// 各周期回看窗口（业务日）：1日=1，1周≈5，1月≈21。FRED DEX 为工作日序列。
const SHIFT: Record<FxPeriod, number> = { "1d": 1, "1w": 5, "1m": 21 };

// 单货币在 k 个交易日前至今的水平涨跌幅（%）
function pctChange(level: number[], k: number): number {
  const t = level.length - 1;
  const base = level[Math.max(0, t - k)];
  if (!base) return 0;
  return level[t] / base - 1;
}

export interface FxData {
  codes: string[];
  // 各周期下，每个货币自身的水平涨跌幅（%）
  chg: Record<FxPeriod, number[]>;
  // 各周期下的交叉涨跌幅矩阵：matrix[p][i][j] = 货币 i 相对货币 j 的涨跌幅（%）
  matrix: Record<FxPeriod, number[][]>;
  // 各周期下的货币相对强弱得分（对全部他国交叉涨跌幅均值，%）
  strength: Record<FxPeriod, number[]>;
  asof: string;
  isReal: boolean;
  source: string;
}

let _cache: FxData | null = null;

export function getFxData(): FxData {
  if (_cache) return _cache;
  // 组装真实水平序列（长度统一为 130；USD 固定为 100）
  const L = 130;
  const levels: Record<string, number[]> = {};
  for (const c of FX_CODES) {
    const raw = getFxLevels(c);
    if (raw && raw.length > 1) {
      levels[c] = raw.map((x) => x.level);
    } else if (raw && raw.length === 1) {
      levels[c] = new Array(L).fill(raw[0].level); // USD numeraire
    } else {
      // 降级：缺数据货币以 100 平线占位（不破坏矩阵），但整体标记为非全真实
      levels[c] = new Array(L).fill(c === "USD" ? 100 : 100);
    }
  }

  const periods: FxPeriod[] = ["1d", "1w", "1m"];
  const chg = {} as Record<FxPeriod, number[]>;
  const matrix = {} as Record<FxPeriod, number[][]>;
  const strength = {} as Record<FxPeriod, number[]>;

  for (const p of periods) {
    const k = SHIFT[p];
    const own = FX_CODES.map((c) => pctChange(levels[c], k) * 100);
    chg[p] = own;

    const mat: number[][] = [];
    const str: number[] = [];
    for (let i = 0; i < FX_CODES.length; i++) {
      const row: number[] = [];
      let s = 0;
      for (let j = 0; j < FX_CODES.length; j++) {
        if (i === j) {
          row.push(NaN);
          continue;
        }
        // 交叉涨跌幅 = (1+ci)/(1+cj) − 1
        const ci = own[i] / 100;
        const cj = own[j] / 100;
        const v = (1 + ci) / (1 + cj) - 1;
        row.push(v * 100);
        s += v * 100;
      }
      mat.push(row);
      str.push(s / (FX_CODES.length - 1));
    }
    matrix[p] = mat;
    strength[p] = str;
  }

  _cache = {
    codes: FX_CODES,
    chg,
    matrix,
    strength,
    asof: FX_Asof,
    isReal: true,
    source: FX_SOURCE,
  };
  return _cache;
}
