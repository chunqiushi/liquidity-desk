/* ============================================================================
 * Global Liquidity / Money Market — five-layer research framework
 * ----------------------------------------------------------------------------
 * Unified research QUESTION across 8 economies (China/US/EUR/JPY/HKD/CHF/GBP/AUD):
 *   ① Liquidity Price       → 现在钱的价格是多少？
 *   ② Liquidity Quantity     → 体系里到底有多少流动性？
 *   ③ Sources & Drains       → 流动性从哪里来，又被什么吸收？
 *   ④ Transmission           → 流动性 → 银行 → 信用 → 实体（流动性 ≠ 信用）
 *   ⑤ Funding Conditions     → 流动性如何反映到市场融资条件？
 *
 * Localised indicators per economy (NOT a uniform template). Deterministic mock
 * engine so the prototype is reproducible. Every point is tagged Mock Data.
 *
 * IMPORTANT: No Country Liquidity Score / Global Liquidity Score is produced.
 * ========================================================================== */

type ChangeMode = "bps" | "pct" | "level";
type Kind = "market" | "official" | "cbop" | "balance" | "macro" | "banking";
type Role = "core" | "policy" | "qty" | "cbassets" | "credit";

export type LiquidityLayer = "price" | "quantity" | "operations" | "transmission" | "funding";

export const LQ_ORDER = ["CNY", "USD", "EUR", "JPY", "HKD", "CHF", "GBP", "AUD"] as const;
export type EcoCode = (typeof LQ_ORDER)[number];

export const LAYER_META: Record<LiquidityLayer, { label: string; sub: string }> = {
  price: { label: "① 流动性价格 · Liquidity Price", sub: "现在钱的价格是多少？核心短端市场利率" },
  quantity: { label: "② 流动性数量 · Liquidity Quantity", sub: "金融体系里到底有多少流动性？" },
  operations: { label: "③ 操作 / 来源与吸收 · Sources & Drains", sub: "流动性从哪里来，又被什么吸收？" },
  transmission: { label: "④ 传导 · Transmission", sub: "流动性 → 银行 → 信用 → 实体（流动性 ≠ 信用）" },
  funding: { label: "⑤ 融资条件 · Funding Conditions", sub: "流动性如何反映到市场融资条件？" },
};

export const LAYER_ORDER: LiquidityLayer[] = ["price", "quantity", "operations", "transmission", "funding"];

interface RawDef {
  id: string;
  label: string;
  unit: string;
  layer: LiquidityLayer;
  mode: ChangeMode; // how the 1D/1W/1M change is expressed
  source: string;
  freq: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  kind: Kind; // distinguishes data frequency / statistical nature
  base: number;
  vol: number;
  drift?: number;
  floor?: number;
  ceil?: number;
  side?: "source" | "drain"; // only for operations layer
  role?: Role; // marks the indicator used in the Global Liquidity Monitor
}

export interface LiqValue {
  id: string;
  label: string;
  unit: string;
  layer: LiquidityLayer;
  mode: ChangeMode;
  source: string;
  freq: string;
  kind: Kind;
  side?: "source" | "drain";
  role?: Role;
  value: number;
  chg1d: number | null;
  chg1w: number | null;
  chg1m: number | null;
  observationDate: string;
  releaseDate: string;
  dataStatus: string;
  history: { date: string; value: number }[];
}

export interface EconomyLiquidity {
  code: string;
  name: string;
  centralBank: string;
  currency: string;
  policyRate: LiqValue;
  coreFunding: LiqValue;
  centralBankAssets: LiqValue | null;
  liquidityQuantity: LiqValue | null;
  credit: LiqValue | null;
  layers: Record<LiquidityLayer, LiqValue[]>;
  researchChain: string[];
  fxLinks: { label: string; href: string }[];
}

export interface MonitorRow {
  code: string;
  name: string;
  centralBank: string;
  currency: string;
  core: LiqValue; // headline short-end rate
  policy: LiqValue;
  qty: LiqValue | null;
  cbassets: LiqValue | null;
  credit: LiqValue | null;
}

/* ----------------------------------------------------------------------------
 * Deterministic engine (copied from mock-data to keep this module self-contained)
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

const HISTORY_DAYS = 1300;
const HIST_KEEP = 756; // ~3Y kept for charts

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

function genPath(
  seed: number,
  base: number,
  vol: number,
  drift: number,
  floor?: number,
  ceil?: number,
): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const reversion = (base - v) * 0.02;
    v = v + reversion + drift + (rnd() - 0.5) * 2 * vol;
    if (floor !== undefined) v = Math.max(floor, v);
    if (ceil !== undefined) v = Math.min(ceil, v);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

function buildValue(def: RawDef, ecoCode: string, asOf: string, dates: string[]): LiqValue {
  const seed = hashStr(`${ecoCode}:${def.id}:${asOf}`) >>> 0;
  const path = genPath(seed, def.base, def.vol, def.drift ?? 0, def.floor, def.ceil);
  const value = path[path.length - 1];
  const full = path.map((v, i) => ({ date: dates[i], value: v }));
  const history = full.slice(Math.max(0, full.length - HIST_KEEP));
  const n = history.length;
  const at = (k: number) => history[Math.max(0, n - 1 - k)]?.value ?? null;
  const chg = (k: number): number | null => {
    const last = at(0);
    const prev = at(k);
    if (last === null || prev === null) return null;
    if (def.mode === "bps") return Number(((last - prev) * 100).toFixed(1));
    if (def.mode === "pct") return prev === 0 ? null : Number((((last - prev) / Math.abs(prev)) * 100).toFixed(2));
    return Number((last - prev).toFixed(2));
  };
  return {
    ...def,
    value: Number(value.toFixed(4)),
    chg1d: chg(1),
    chg1w: chg(7),
    chg1m: chg(30),
    observationDate: dates[dates.length - 1],
    releaseDate: dates[dates.length - 1],
    dataStatus: "Mock Data",
    history,
  };
}

/* ----------------------------------------------------------------------------
 * Localised indicator definitions — 5 layers × 8 economies
 * ------------------------------------------------------------------------- */
function mk(
  id: string,
  label: string,
  unit: string,
  layer: LiquidityLayer,
  mode: ChangeMode,
  source: string,
  freq: RawDef["freq"],
  kind: Kind,
  base: number,
  vol: number,
  extra: Partial<RawDef> = {},
): RawDef {
  return { id, label, unit, layer, mode, source, freq, kind, base, vol, ...extra };
}

interface EcoSpec {
  name: string;
  cb: string;
  cur: string;
  chain: string[];
  defs: RawDef[];
}

const SRC = {
  CNY: "PBoC · 模拟",
  USD: "Federal Reserve · 模拟",
  EUR: "ECB · 模拟",
  JPY: "BoJ · 模拟",
  HKD: "HKMA · 模拟",
  CHF: "SNB · 模拟",
  GBP: "BoE · 模拟",
  AUD: "RBA · 模拟",
};

const ECO: Record<string, EcoSpec> = {
  CNY: {
    name: "中国 China",
    cb: "中国人民银行 PBoC",
    cur: "CNY / CNH",
    chain: ["PBoC", "DR007", "银行体系流动性", "信用", "利率", "CNY/CNH"],
    defs: [
      // ① Price
      mk("dr007", "DR007", "%", "price", "bps", SRC.CNY, "Daily", "market", 1.85, 0.012, { role: "core" }),
      mk("r007", "R007", "%", "price", "bps", SRC.CNY, "Daily", "market", 1.95, 0.014),
      mk("shibor_3m", "SHIBOR 3M", "%", "price", "bps", SRC.CNY, "Daily", "market", 2.1, 0.012),
      mk("pboc_7d", "PBoC 7D 逆回购利率", "%", "price", "bps", SRC.CNY, "Daily", "official", 1.7, 0.001, { role: "policy" }),
      mk("mlf", "MLF 利率", "%", "price", "bps", SRC.CNY, "Daily", "official", 2.5, 0.001),
      // ② Quantity
      mk("pbc_bs", "央行资产负债表", "万亿", "quantity", "pct", SRC.CNY, "Monthly", "balance", 44, 0.05, { role: "cbassets" }),
      mk("m2", "M2", "万亿", "quantity", "pct", SRC.CNY, "Monthly", "macro", 309, 0.08, { role: "qty" }),
      mk("social_fin", "社会融资规模存量", "万亿", "quantity", "pct", SRC.CNY, "Monthly", "macro", 395, 0.1, { role: "credit" }),
      mk("rmb_loans", "人民币贷款", "万亿", "quantity", "pct", SRC.CNY, "Monthly", "macro", 252, 0.09),
      mk("gov_dep", "政府存款", "万亿", "quantity", "pct", SRC.CNY, "Monthly", "balance", 5.8, 0.06),
      mk("omo_out", "公开市场操作余额", "万亿", "quantity", "pct", SRC.CNY, "Daily", "cbop", 12.5, 0.04),
      // ③ Operations (Sources & Drains)
      mk("rr_7d_out", "7天逆回购余额", "千亿", "operations", "pct", SRC.CNY, "Daily", "cbop", 120, 1.5, { side: "source" }),
      mk("mlf_out", "MLF 余额", "千亿", "operations", "pct", SRC.CNY, "Monthly", "cbop", 710, 2, { side: "source" }),
      mk("rr_maturity", "逆回购到期(净)", "千亿", "operations", "level", SRC.CNY, "Daily", "cbop", 80, 6, { side: "drain" }),
      mk("mlf_maturity", "MLF 到期(净)", "千亿", "operations", "level", SRC.CNY, "Monthly", "cbop", 30, 4, { side: "drain" }),
      mk("fiscal_flow", "财政投放/回笼(净)", "千亿", "operations", "level", SRC.CNY, "Monthly", "balance", -20, 5, { side: "drain" }),
      // ④ Transmission
      mk("t_m2", "M2（传导）", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "macro", 309, 0.08),
      mk("t_social_fin", "社融（传导）", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "macro", 395, 0.1),
      mk("t_rmb_loans", "人民币贷款（传导）", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "macro", 252, 0.09),
      mk("bank_dep", "银行存款", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "banking", 290, 0.08),
      mk("corp_fin", "企业融资", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "banking", 36, 0.1),
      mk("prop_fin", "房地产融资", "万亿", "transmission", "pct", SRC.CNY, "Monthly", "banking", 18, 0.08),
      // ⑤ Funding
      mk("f_dr007", "DR007（融资）", "%", "funding", "bps", SRC.CNY, "Daily", "market", 1.85, 0.012),
      mk("f_r007", "R007（融资）", "%", "funding", "bps", SRC.CNY, "Daily", "market", 1.95, 0.014),
      mk("ncd", "NCD 收益率", "%", "funding", "bps", SRC.CNY, "Daily", "market", 2.2, 0.015),
      mk("cgb_10y", "中国国债 10Y", "%", "funding", "bps", SRC.CNY, "Daily", "market", 2.3, 0.02),
      mk("slf_vol", "SLF 操作量", "千亿", "operations", "pct", SRC.CNY, "Daily", "cbop", 35, 2, { side: "source" }),
      mk("rrr", "存款准备金率 RRR", "%", "price", "bps", SRC.CNY, "Daily", "official", 7.0, 0.01),
      mk("repo_vol", "银行间质押式回购成交量", "万亿", "operations", "pct", SRC.CNY, "Daily", "market", 8.2, 0.25),
      mk("credit_spread", "信用利差", "bp", "funding", "level", SRC.CNY, "Daily", "market", 65, 1.2),
    ],
  },
  USD: {
    name: "美国 United States",
    cb: "Federal Reserve",
    cur: "USD",
    chain: ["Fed", "Money Market", "Liquidity", "Funding", "Treasury", "USD"],
    defs: [
      mk("sofr", "SOFR", "%", "price", "bps", SRC.USD, "Daily", "market", 5.33, 0.01, { role: "core" }),
      mk("effr", "EFFR", "%", "price", "bps", SRC.USD, "Daily", "market", 5.33, 0.008),
      mk("iorb", "IORB", "%", "price", "bps", SRC.USD, "Daily", "official", 5.4, 0.001, { role: "policy" }),
      mk("on_rrp_rate", "ON RRP 利率", "%", "price", "bps", SRC.USD, "Daily", "official", 5.3, 0.001),
      mk("repo", "Repo (TGCR)", "%", "price", "bps", SRC.USD, "Daily", "market", 5.35, 0.012),
      mk("reserves", "准备金余额 Reserve Balances", "万亿", "quantity", "pct", SRC.USD, "Daily", "balance", 3.2, 0.02, { role: "qty" }),
      mk("on_rrp", "ON RRP 余额", "万亿", "quantity", "pct", SRC.USD, "Daily", "balance", 0.45, 0.02),
      mk("tga", "财政部现金 TGA", "万亿", "quantity", "pct", SRC.USD, "Daily", "balance", 0.75, 0.02),
      mk("fed_assets", "美联储总资产", "万亿", "quantity", "pct", SRC.USD, "Weekly", "balance", 7.1, 0.01, { role: "cbassets" }),
      mk("fed_repo", "Fed Repo Facility", "千亿", "operations", "pct", SRC.USD, "Daily", "cbop", 5, 0.6, { side: "source" }),
      mk("res_mgmt", "准备金管理操作", "千亿", "operations", "pct", SRC.USD, "Daily", "cbop", 12, 0.8, { side: "source" }),
      mk("tga_flow", "TGA 变动(净)", "千亿", "operations", "level", SRC.USD, "Daily", "balance", -8, 4, { side: "drain" }),
      mk("onrrp_flow", "ON RRP 变动(净)", "千亿", "operations", "level", SRC.USD, "Daily", "balance", -3, 3, { side: "drain" }),
      mk("tsy_issuance", "国债净发行", "千亿", "operations", "level", SRC.USD, "Weekly", "balance", 25, 6, { side: "drain" }),
      mk("t_reserves", "准备金（传导）", "万亿", "transmission", "pct", SRC.USD, "Daily", "balance", 3.2, 0.02),
      mk("bank_dep", "银行存款", "万亿", "transmission", "pct", SRC.USD, "Monthly", "banking", 17.5, 0.03),
      mk("ciloans", "工商业贷款 C&I", "万亿", "transmission", "pct", SRC.USD, "Weekly", "banking", 2.8, 0.02, { role: "credit" }),
      mk("lending_cond", "银行贷款条件指数", "index", "transmission", "level", SRC.USD, "Quarterly", "banking", 12, 1.5),
      mk("credit_spread", "信用利差", "bp", "transmission", "level", SRC.USD, "Daily", "market", 95, 2),
      mk("sofr_effr", "SOFR − EFFR", "bp", "funding", "level", SRC.USD, "Daily", "market", -1, 0.4),
      mk("sofr_iorb", "SOFR − IORB", "bp", "funding", "level", SRC.USD, "Daily", "market", -7, 0.5),
      mk("sofr_ois", "SOFR − OIS", "bp", "funding", "level", SRC.USD, "Daily", "market", 2, 0.5),
      mk("xccy_basis", "美元交叉货币基差", "bp", "funding", "level", SRC.USD, "Daily", "market", -12, 1),
      mk("hy_spread", "HY 信用利差", "bp", "funding", "level", SRC.USD, "Daily", "market", 330, 4),
      mk("ig_spread", "IG 信用利差", "bp", "funding", "level", SRC.USD, "Daily", "market", 110, 2),
      mk("ust_10y", "UST 10Y", "%", "funding", "bps", SRC.USD, "Daily", "market", 4.3, 0.02),
    ],
  },
  EUR: {
    name: "欧元区 Euro Area",
    cb: "European Central Bank",
    cur: "EUR",
    chain: ["ECB", "€STR", "Excess Liquidity", "Bank Lending", "Bund", "EUR"],
    defs: [
      mk("estr", "€STR", "%", "price", "bps", SRC.EUR, "Daily", "market", 3.65, 0.01, { role: "core" }),
      mk("ecb_df", "ECB 存款便利利率", "%", "price", "bps", SRC.EUR, "Daily", "official", 3.75, 0.001, { role: "policy" }),
      mk("mro", "主要再融资利率 MRO", "%", "price", "bps", SRC.EUR, "Daily", "official", 3.9, 0.001),
      mk("euribor_3m", "Euribor 3M", "%", "price", "bps", SRC.EUR, "Daily", "market", 3.7, 0.012),
      mk("excess_liq", "超额流动性 Excess Liquidity", "万亿", "quantity", "pct", SRC.EUR, "Daily", "balance", 2.6, 0.02, { role: "qty" }),
      mk("dep_fac", "存款便利余额", "万亿", "quantity", "pct", SRC.EUR, "Daily", "balance", 1.9, 0.015),
      mk("cur_acct", "经常账户余额", "万亿", "quantity", "pct", SRC.EUR, "Daily", "balance", 0.7, 0.01),
      mk("ecb_assets", "ECB 总资产", "万亿", "quantity", "pct", SRC.EUR, "Weekly", "balance", 6.8, 0.01, { role: "cbassets" }),
      mk("mro_ops", "MRO 操作", "千亿", "operations", "level", SRC.EUR, "Weekly", "cbop", 20, 3, { side: "source" }),
      mk("ltro", "LTRO / 再融资", "千亿", "operations", "level", SRC.EUR, "Quarterly", "cbop", 20, 4, { side: "source" }),
      mk("app_pepp", "APP/PEPP 缩表(净)", "千亿", "operations", "level", SRC.EUR, "Monthly", "cbop", -15, 4, { side: "drain" }),
      mk("df_change", "存款便利变动(净)", "千亿", "operations", "level", SRC.EUR, "Daily", "balance", -3, 3, { side: "drain" }),
      mk("bank_lending", "银行贷款（传导）", "万亿", "transmission", "pct", SRC.EUR, "Monthly", "banking", 12.5, 0.02, { role: "credit" }),
      mk("bls", "银行贷款调查 BLS", "index", "transmission", "level", SRC.EUR, "Quarterly", "banking", -8, 1.2),
      mk("credit_cond", "信贷条件", "index", "transmission", "level", SRC.EUR, "Quarterly", "banking", 10, 1),
      mk("dep_eur", "存款", "万亿", "transmission", "pct", SRC.EUR, "Monthly", "banking", 15, 0.02),
      mk("f_estr", "€STR（融资）", "%", "funding", "bps", SRC.EUR, "Daily", "market", 3.65, 0.01),
      mk("repo_eur", "Repo", "%", "funding", "bps", SRC.EUR, "Daily", "market", 3.68, 0.012),
      mk("euribor_f", "Euribor 3M（融资）", "%", "funding", "bps", SRC.EUR, "Daily", "market", 3.7, 0.012),
      mk("bund_10y", "Bund 10Y", "%", "funding", "bps", SRC.EUR, "Daily", "market", 2.7, 0.02),
      mk("it_de_spread", "主权利差(意/德10Y)", "bp", "funding", "level", SRC.EUR, "Daily", "market", 135, 4),
      mk("credit_spread_eur", "信用利差", "bp", "funding", "level", SRC.EUR, "Daily", "market", 80, 1.5),
    ],
  },
  JPY: {
    name: "日本 Japan",
    cb: "Bank of Japan",
    cur: "JPY",
    chain: ["BoJ", "TONAR", "Current Account", "Bank Lending", "JGB", "JPY"],
    defs: [
      mk("tonar", "TONAR", "%", "price", "bps", SRC.JPY, "Daily", "market", 0.25, 0.004, { role: "core" }),
      mk("boj_policy", "BoJ 政策利率", "%", "price", "bps", SRC.JPY, "Daily", "official", 0.25, 0.001, { role: "policy" }),
      mk("cur_acct_jpy", "经常账户余额 Current Account", "万亿", "quantity", "pct", SRC.JPY, "Daily", "balance", 33, 0.03, { role: "qty" }),
      mk("boj_assets", "BoJ 总资产", "万亿", "quantity", "pct", SRC.JPY, "Daily", "balance", 750, 0.05, { role: "cbassets" }),
      mk("boj_jgb", "BoJ 持债 JGB", "万亿", "quantity", "pct", SRC.JPY, "Daily", "balance", 580, 0.04),
      mk("boj_jgb_buy", "BoJ 购债(月)", "万亿", "operations", "level", SRC.JPY, "Monthly", "cbop", 4, 1, { side: "source" }),
      mk("boj_asset_buy", "BoJ 资产购买(月)", "万亿", "operations", "level", SRC.JPY, "Monthly", "cbop", 5, 1.2, { side: "source" }),
      mk("ca_change", "经常账户变动(净)", "千亿", "operations", "level", SRC.JPY, "Daily", "balance", 5, 3, { side: "drain" }),
      mk("bank_lend_jpy", "银行贷款（传导）", "万亿", "transmission", "pct", SRC.JPY, "Monthly", "banking", 580, 0.03, { role: "credit" }),
      mk("cur_acct_t", "经常账户（传导）", "万亿", "transmission", "pct", SRC.JPY, "Daily", "balance", 33, 0.03),
      mk("credit_cond_jpy", "信贷条件", "index", "transmission", "level", SRC.JPY, "Quarterly", "banking", 8, 1),
      mk("f_tonar", "TONAR（融资）", "%", "funding", "bps", SRC.JPY, "Daily", "market", 0.25, 0.004),
      mk("repo_jpy", "Repo", "%", "funding", "bps", SRC.JPY, "Daily", "market", 0.3, 0.005),
      mk("jgb_10y", "JGB 10Y", "%", "funding", "bps", SRC.JPY, "Daily", "market", 1.1, 0.02),
      mk("boj_etf", "BoJ ETF 持仓", "万亿", "quantity", "pct", SRC.JPY, "Daily", "balance", 37, 0.05),
      mk("usdjpy_basis", "USD/JPY 交叉货币基差", "bp", "funding", "level", SRC.JPY, "Daily", "market", -25, 1.5),
      mk("credit_spread_jpy", "信用利差", "bp", "funding", "level", SRC.JPY, "Daily", "market", 45, 1),
    ],
  },
  HKD: {
    name: "香港 Hong Kong",
    cb: "HKMA",
    cur: "HKD",
    chain: ["USD", "Currency Board", "Aggregate Balance", "HIBOR/HONIA", "HKD Funding", "HKD"],
    defs: [
      mk("hibor_3m", "HIBOR 3M", "%", "price", "bps", SRC.HKD, "Daily", "market", 4.8, 0.02, { role: "core" }),
      mk("honia", "HONIA", "%", "price", "bps", SRC.HKD, "Daily", "market", 4.9, 0.02),
      mk("hkma_base", "HKMA 基本利率", "%", "price", "bps", SRC.HKD, "Daily", "official", 5.25, 0.001, { role: "policy" }),
      mk("agg_bal", "总结余 Aggregate Balance", "十亿", "quantity", "pct", SRC.HKD, "Daily", "balance", 45, 0.04, { role: "qty" }),
      mk("mon_base", "货币基础 Monetary Base", "千亿", "quantity", "pct", SRC.HKD, "Daily", "balance", 210, 0.02),
      mk("ef_bs", "外汇基金资产负债表", "千亿", "quantity", "pct", SRC.HKD, "Monthly", "balance", 4300, 0.03, { role: "cbassets" }),
      mk("hkma_ops", "HKMA 操作", "十亿", "operations", "level", SRC.HKD, "Daily", "cbop", 5, 2, { side: "source" }),
      mk("cur_board", "Currency Board 操作", "十亿", "operations", "level", SRC.HKD, "Daily", "cbop", 3, 2, { side: "source" }),
      mk("ab_change", "总结余变动(净)", "十亿", "operations", "level", SRC.HKD, "Daily", "balance", -2, 2, { side: "drain" }),
      mk("efbn", "外汇基金票据/债券", "千亿", "operations", "level", SRC.HKD, "Weekly", "cbop", 120, 1, { side: "drain" }),
      mk("bank_dep_hkd", "银行存款（传导）", "千亿", "transmission", "pct", SRC.HKD, "Monthly", "banking", 1650, 0.02, { role: "credit" }),
      mk("bank_lend_hkd", "银行贷款（传导）", "千亿", "transmission", "pct", SRC.HKD, "Monthly", "banking", 1020, 0.02),
      mk("mortgage_fund", "按揭融资", "千亿", "transmission", "pct", SRC.HKD, "Monthly", "banking", 180, 0.02),
      mk("f_hibor", "HIBOR（融资）", "%", "funding", "bps", SRC.HKD, "Daily", "market", 4.8, 0.02),
      mk("f_honia", "HONIA（融资）", "%", "funding", "bps", SRC.HKD, "Daily", "market", 4.9, 0.02),
      mk("hkd_fund", "HKD 融资条件", "bp", "funding", "level", SRC.HKD, "Daily", "market", 20, 1),
      mk("hibor_sofr", "HIBOR−SOFR 基差", "bp", "funding", "level", SRC.HKD, "Daily", "market", 80, 3),
      mk("fx_reserves", "外汇储备", "十亿USD", "quantity", "pct", SRC.HKD, "Monthly", "balance", 410, 0.6),
      mk("disc_window", "贴现窗使用", "十亿", "operations", "level", SRC.HKD, "Daily", "cbop", 5, 1, { side: "drain" }),
      mk("hkgb_10y", "HK Gov Bond 10Y", "%", "funding", "bps", SRC.HKD, "Daily", "market", 3.8, 0.02),
    ],
  },
  CHF: {
    name: "瑞士 Switzerland",
    cb: "SNB",
    cur: "CHF",
    chain: ["SNB", "SARON", "Sight Deposits", "Funding", "CHF"],
    defs: [
      mk("saron", "SARON", "%", "price", "bps", SRC.CHF, "Daily", "market", 1.15, 0.008, { role: "core" }),
      mk("snb_policy", "SNB 政策利率", "%", "price", "bps", SRC.CHF, "Daily", "official", 1.25, 0.001, { role: "policy" }),
      mk("sight_dep", "即期存款 Sight Deposits", "十亿", "quantity", "pct", SRC.CHF, "Daily", "balance", 520, 0.02, { role: "qty" }),
      mk("snb_assets", "SNB 总资产", "十亿", "quantity", "pct", SRC.CHF, "Weekly", "balance", 900, 0.02, { role: "cbassets" }),
      mk("fx_reserves", "外汇储备", "十亿", "quantity", "pct", SRC.CHF, "Monthly", "balance", 800, 0.02),
      mk("snb_repo", "SNB Repo", "十亿", "operations", "level", SRC.CHF, "Daily", "cbop", 8, 1.5, { side: "source" }),
      mk("snb_bills", "SNB 票据", "十亿", "operations", "level", SRC.CHF, "Weekly", "cbop", 5, 1, { side: "source" }),
      mk("sight_change", "即期存款变动(净)", "十亿", "operations", "level", SRC.CHF, "Daily", "balance", -3, 2, { side: "drain" }),
      mk("bank_dep_chf", "银行存款（传导）", "十亿", "transmission", "pct", SRC.CHF, "Monthly", "banking", 2300, 0.02, { role: "credit" }),
      mk("bank_lend_chf", "银行贷款（传导）", "十亿", "transmission", "pct", SRC.CHF, "Monthly", "banking", 1700, 0.02),
      mk("mortgage_chf", "按揭/融资条件", "index", "transmission", "level", SRC.CHF, "Quarterly", "banking", 12, 1),
      mk("f_saron", "SARON（融资）", "%", "funding", "bps", SRC.CHF, "Daily", "market", 1.15, 0.008),
      mk("repo_chf", "Repo", "%", "funding", "bps", SRC.CHF, "Daily", "market", 1.18, 0.01),
      mk("usdchf", "USD/CHF", "汇率", "funding", "level", SRC.CHF, "Daily", "market", 0.88, 0.004),
      mk("chf_fund", "CHF 融资条件", "bp", "funding", "level", SRC.CHF, "Daily", "market", 8, 0.8),
    ],
  },
  GBP: {
    name: "英国 United Kingdom",
    cb: "Bank of England",
    cur: "GBP",
    chain: ["BoE", "SONIA", "Reserves", "Repo/APF/QT", "Gilts", "GBP"],
    defs: [
      mk("sonia", "SONIA", "%", "price", "bps", SRC.GBP, "Daily", "market", 5.0, 0.01, { role: "core" }),
      mk("bank_rate", "Bank Rate", "%", "price", "bps", SRC.GBP, "Daily", "official", 5.0, 0.001, { role: "policy" }),
      mk("bank_res", "银行准备金 Reserves", "十亿", "quantity", "pct", SRC.GBP, "Daily", "balance", 900, 0.02, { role: "qty" }),
      mk("boe_assets", "BoE 总资产", "十亿", "quantity", "pct", SRC.GBP, "Weekly", "balance", 1000, 0.02, { role: "cbassets" }),
      mk("apf", "资产购买计划 APF", "十亿", "quantity", "pct", SRC.GBP, "Weekly", "balance", 850, 0.02),
      mk("repo_ops", "Repo 操作", "十亿", "operations", "level", SRC.GBP, "Daily", "cbop", 30, 4, { side: "source" }),
      mk("res_mgmt_gbp", "准备金管理", "十亿", "operations", "level", SRC.GBP, "Daily", "cbop", 10, 2, { side: "source" }),
      mk("qt_gilt", "QT / 国债缩表(净)", "十亿", "operations", "level", SRC.GBP, "Weekly", "cbop", -15, 4, { side: "drain" }),
      mk("gilt_eff", "国债余额表效应", "十亿", "operations", "level", SRC.GBP, "Monthly", "balance", -5, 3, { side: "drain" }),
      mk("bank_lend_gbp", "银行贷款（传导）", "十亿", "transmission", "pct", SRC.GBP, "Monthly", "banking", 4800, 0.02, { role: "credit" }),
      mk("bank_res_t", "准备金（传导）", "十亿", "transmission", "pct", SRC.GBP, "Daily", "balance", 900, 0.02),
      mk("dep_gbp", "存款", "十亿", "transmission", "pct", SRC.GBP, "Monthly", "banking", 5200, 0.02),
      mk("credit_cond_gbp", "信贷条件", "index", "transmission", "level", SRC.GBP, "Quarterly", "banking", 9, 1),
      mk("f_sonia", "SONIA（融资）", "%", "funding", "bps", SRC.GBP, "Daily", "market", 5.0, 0.01),
      mk("repo_gbp", "Repo", "%", "funding", "bps", SRC.GBP, "Daily", "market", 5.02, 0.012),
      mk("gilt_10y", "Gilt 10Y", "%", "funding", "bps", SRC.GBP, "Daily", "market", 4.2, 0.02),
      mk("gilt_2s10s", "Gilt 2s10s", "bp", "funding", "level", SRC.GBP, "Daily", "market", -40, 3),
      mk("bank_fund", "银行融资条件", "bp", "funding", "level", SRC.GBP, "Daily", "market", 15, 1),
    ],
  },
  AUD: {
    name: "澳大利亚 Australia",
    cb: "Reserve Bank of Australia",
    cur: "AUD",
    chain: ["RBA", "Cash Rate / Overnight", "ES Balances", "Repo/OMO", "Bank Lending", "Gov Bonds", "AUD"],
    defs: [
      mk("aud_ovn", "隔夜/OIS 利率", "%", "price", "bps", SRC.AUD, "Daily", "market", 4.32, 0.01, { role: "core" }),
      mk("cash_rate", "Cash Rate", "%", "price", "bps", SRC.AUD, "Daily", "official", 4.35, 0.001, { role: "policy" }),
      mk("es_bal", "结算余额 ES Balances", "十亿", "quantity", "pct", SRC.AUD, "Daily", "balance", 38, 0.03, { role: "qty" }),
      mk("rba_assets", "RBA 总资产", "十亿", "quantity", "pct", SRC.AUD, "Weekly", "balance", 350, 0.02, { role: "cbassets" }),
      mk("omo_repo", "OMO / Repo", "十亿", "operations", "level", SRC.AUD, "Daily", "cbop", 12, 2, { side: "source" }),
      mk("es_ops", "结算余额操作", "十亿", "operations", "level", SRC.AUD, "Daily", "cbop", 5, 1.5, { side: "source" }),
      mk("rba_bs_ops", "RBA 资产负债表操作(净)", "十亿", "operations", "level", SRC.AUD, "Weekly", "balance", -2, 2, { side: "drain" }),
      mk("bank_lend_aud", "银行贷款（传导）", "十亿", "transmission", "pct", SRC.AUD, "Monthly", "banking", 3600, 0.02, { role: "credit" }),
      mk("es_t", "结算余额（传导）", "十亿", "transmission", "pct", SRC.AUD, "Daily", "balance", 38, 0.03),
      mk("dep_aud", "存款", "十亿", "transmission", "pct", SRC.AUD, "Monthly", "banking", 3200, 0.02),
      mk("housing_credit", "住房信贷", "十亿", "transmission", "pct", SRC.AUD, "Monthly", "banking", 2200, 0.02),
      mk("f_cash", "Cash Rate（融资）", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.35, 0.001),
      mk("ois_aud", "OIS", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.32, 0.01),
      mk("repo_aud", "Repo", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.4, 0.012),
      mk("agb_3y", "Australian Gov Bond 3Y", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.1, 0.015),
      mk("wholesale_fund", "银行批发融资成本", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.6, 0.015),
      mk("aud_usd", "AUD/USD", "汇率", "funding", "level", SRC.AUD, "Daily", "market", 0.66, 0.004),
      mk("agb_10y", "Australian Gov Bond 10Y", "%", "funding", "bps", SRC.AUD, "Daily", "market", 4.3, 0.02),
    ],
  },
};

/* ----------------------------------------------------------------------------
 * 监测重点 · 按用户给定的国别顺序，列出每个经济体最关键、最贴近"真实流动性松紧"
 * 的若干指标（由各层 defs 中取 id）。用于 /liquidity-grid 分国别监测卡片。
 * ------------------------------------------------------------------------- */
export const MONITOR: Record<string, string[]> = {
  CNY: ["dr007", "r007", "slf_vol", "mlf_out", "rrr", "repo_vol"],
  USD: ["on_rrp", "reserves", "tga", "sofr_ois", "hy_spread", "ig_spread"],
  EUR: ["estr", "it_de_spread", "excess_liq", "bls"],
  JPY: ["jgb_10y", "boj_jgb", "boj_etf", "usdjpy_basis"],
  GBP: ["sonia", "gilt_2s10s", "boe_assets"],
  CHF: ["saron", "sight_dep", "usdchf"],
  HKD: ["agg_bal", "hibor_sofr", "fx_reserves", "disc_window"],
  AUD: ["agb_3y", "agb_10y", "wholesale_fund", "aud_usd"],
};

function byRole(defs: LiqValue[], role: Role): LiqValue {
  const found = defs.find((d) => d.role === role);
  if (!found) throw new Error(`liquidity: missing role ${role}`);
  return found;
}

function buildEconomy(code: string, asOf: string, dates: string[]): EconomyLiquidity {
  const spec = ECO[code];
  const all = spec.defs.map((d) => buildValue(d, code, asOf, dates));
  const layers = {
    price: all.filter((d) => d.layer === "price"),
    quantity: all.filter((d) => d.layer === "quantity"),
    operations: all.filter((d) => d.layer === "operations"),
    transmission: all.filter((d) => d.layer === "transmission"),
    funding: all.filter((d) => d.layer === "funding"),
  } as Record<LiquidityLayer, LiqValue[]>;
  const slug = code === "CNY" ? "CNH" : code;
  const fxLinks = [
    { label: `货币详情 ${slug}`, href: `/currency/${slug}` },
    { label: "利率与收益率曲线", href: "/rates-matrix" },
    { label: "外汇与相对利率", href: "/fx-funding" },
  ];
  if (code === "CNY") fxLinks.push({ label: "中国宏观", href: "/china/overview" });
  return {
    code,
    name: spec.name,
    centralBank: spec.cb,
    currency: spec.cur,
    policyRate: byRole(all, "policy"),
    coreFunding: byRole(all, "core"),
    centralBankAssets: all.find((d) => d.role === "cbassets") ?? null,
    liquidityQuantity: all.find((d) => d.role === "qty") ?? null,
    credit: all.find((d) => d.role === "credit") ?? null,
    layers,
    researchChain: spec.chain,
    fxLinks,
  };
}

const matrixCache: Record<string, EconomyLiquidity[]> = {};

export function getLiquidityMatrix(asOf: string): EconomyLiquidity[] {
  if (matrixCache[asOf]) return matrixCache[asOf];
  const dates = buildDates(asOf);
  const m = LQ_ORDER.map((c) => buildEconomy(c, asOf, dates));
  matrixCache[asOf] = m;
  return m;
}

export function getEconomyLiquidity(code: string, asOf: string): EconomyLiquidity | null {
  if (!(code in ECO)) return null;
  return getLiquidityMatrix(asOf).find((e) => e.code === code) ?? null;
}

export function getLiquidityMonitor(asOf: string): MonitorRow[] {
  return getLiquidityMatrix(asOf).map((e) => ({
    code: e.code,
    name: e.name,
    centralBank: e.centralBank,
    currency: e.currency,
    core: e.coreFunding,
    policy: e.policyRate,
    qty: e.liquidityQuantity,
    cbassets: e.centralBankAssets,
    credit: e.credit,
  }));
}

/** 按 id 在指定经济体的全部层级中查找某个流动性指标（用于 MESA 周期分析等）。 */
export function getLiqValue(code: string, id: string, asOf: string): LiqValue | null {
  const eco = getEconomyLiquidity(code, asOf);
  if (!eco) return null;
  const all: LiqValue[] = [];
  for (const layer of Object.values(eco.layers) as LiqValue[][]) all.push(...layer);
  return all.find((d) => d.id === id) ?? null;
}
