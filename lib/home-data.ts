/**
 * 首页派生数据（Phase 2 · 结论 / 风险 / 事件 / 仪表盘映射 / 摘要）
 * --------------------------------------------------------------------------
 * 所有数值均取自统一指标注册表（lib/indicators.ts）的真实字段，
 * 自动摘要仅引用页面真实数值，绝不编造（需求第 14 条）。
 */

import { getIndicator, resolveIndicator, REGION_LABELS, type Category, type Region } from "./indicators";
import type { TW } from "./mock-series";

/* ----------------------- 仪表盘单元格映射（地区 × 维度） ----------------------- */

export const DASHBOARD_CELLS: Partial<Record<Region, Partial<Record<Category, string>>>> = {
  CN: { growth: "CN_GDP_YOY", inflation: "CN_CPI_YOY", policy: "CN_PBOC_7D", liquidity: "CN_DR007" },
  US: { growth: "US_GDP_QOQ", inflation: "US_CPI_YOY", policy: "US_FFR", liquidity: "US_SOFR" },
  EU: { growth: "EU_GDP_YOY", inflation: "EU_CPI_YOY", policy: "EU_DEP", liquidity: "EU_ESTR" },
  JP: { growth: "JP_GDP_YOY", inflation: "JP_CPI_YOY", policy: "JP_POLICY", liquidity: "JP_TONA" },
  HK: { policy: undefined, liquidity: "HK_HIBOR_3M" },
  CH: { policy: "CH_POLICY" },
  GB: { policy: "GB_BANK" },
  AU: { policy: "AU_CASH" },
};

/* ----------------------------- 首页关键变化卡片 ----------------------------- */

export const KEY_CARDS: string[] = [
  "US_10Y",
  "DXY",
  "CN_USDCNH",
  "US_2S10S",
  "US_SOFR_IORB",
  "CN_DR007",
  "EU_CPI_YOY",
  "JP_10Y",
];

/* ----------------------------- 今日结论（数据驱动） ----------------------------- */

export interface Conclusion {
  title: string;
  points: string[];
}

export function buildConclusions(): Conclusion[] {
  const g = (c: string) => resolveIndicator(c) ?? getIndicator(c);
  const usCpi = g("US_CPI_YOY");
  const usCore = g("US_CORECPI_YOY");
  const usFfr = g("US_FFR");
  const sofrIorb = g("US_SOFR_IORB");
  const dr007 = g("CN_DR007");
  const r007 = g("CN_R007");
  const cnCpi = g("CN_CPI_YOY");
  const s2s = g("US_2S10S");
  const us10y = g("US_10Y");
  const dxy = g("DXY");
  const usdcnh = g("CN_USDCNH");

  return [
    {
      title: "美国通胀延续回落，但粘性仍高、货币端摩擦上升",
      points: [
        `美国 CPI 同比 ${usCpi?.value}%（${
          usCpi ? (usCpi.change >= 0 ? "+" : "") + usCpi.change.toFixed(2) + "pp" : ""
        }，前值 ${usCpi?.previous}%），核心 CPI ${usCore?.value}%（前值 ${usCore?.previous}%）：通胀趋势向下但未达目标。`,
        `联邦基金目标上限 ${usFfr?.value}%，政策按兵不动；SOFR-IORB 利差走阔至 ${sofrIorb?.value} bp（前值 ${sofrIorb?.previous} bp，处 ${
          sofrIorb?.percentile
        }% 分位）：美元货币市场摩擦上升。`,
      ],
    },
    {
      title: "中国银行间流动性边际转松，通缩压力未消",
      points: [
        `DR007 ${dr007?.value}%（前值 ${dr007?.previous}%，${dr007 ? (dr007.change >= 0 ? "+" : "") + dr007.change.toFixed(2) + "pp" : ""}）、R007 ${r007?.value}%（前值 ${r007?.previous}%）：短端资金价格回落。`,
        `中国 CPI 同比 ${cnCpi?.value}%（前值 ${cnCpi?.previous}%），处历史 ${cnCpi?.percentile}% 分位（zscore ${cnCpi?.zscore}）：价格偏弱、通缩风险偏高。`,
      ],
    },
    {
      title: "美债曲线倒挂收敛，美元强、人民币对美元微升",
      points: [
        `2s10s 利差 ${s2s?.value} bp（前值 ${s2s?.previous} bp），倒挂程度收敛但仍为负；美国 10Y ${us10y?.value}%（前值 ${us10y?.previous}%）。`,
        `美元指数 ${dxy?.value}（前值 ${dxy?.previous}）走强；但 USDCNH ${usdcnh?.value}（前值 ${usdcnh?.previous}）即人民币对美元微升，交叉盘分化。`,
      ],
    },
  ];
}

/* ----------------------------- 风险提示（数据驱动） ----------------------------- */

export interface RiskAlert {
  title: string;
  detail: string;
  code?: string;
}

export function buildRisks(): RiskAlert[] {
  const cnCpi = getIndicator("CN_CPI_YOY");
  const sofrIorb = getIndicator("US_SOFR_IORB");
  const jp10y = getIndicator("JP_10Y");
  const usdjpy = getIndicator("USDJPY");
  return [
    {
      title: `通缩风险：中国 CPI 同比 ${cnCpi?.value}%（历史 ${cnCpi?.percentile}% 分位）`,
      detail: `CPI 处极低分位（zscore ${cnCpi?.zscore}），价格信号偏弱；关注 PBoC 宽松与财政发力节奏。`,
      code: "CN_CPI_YOY",
    },
    {
      title: `美元资金面摩擦：SOFR-IORB ${sofrIorb?.value} bp（${sofrIorb?.percentile}% 分位）`,
      detail: `货币市场利差走阔，警惕季末/税期回购波动与美元流动性分层。`,
      code: "US_SOFR_IORB",
    },
    {
      title: `日元偏弱：USDJPY ${usdjpy?.value}（日债 10Y ${jp10y?.value}%）`,
      detail: `美日利差维持高位，日元承压，关注日银政策边际调整与干预风险。`,
      code: "USDJPY",
    },
  ].slice(0, 2);
}

/* ----------------------------- 事件日历（Mock） ----------------------------- */

export interface MacroEvent {
  date: string;
  region: string;
  title: string;
  importance: "高" | "中" | "低";
}

export const EVENTS: MacroEvent[] = [
  { date: "2026-09-24", region: "US", title: "美国 初请失业金人数", importance: "中" },
  { date: "2026-09-25", region: "JP", title: "日本央行 政策利率公布", importance: "高" },
  { date: "2026-09-30", region: "CN", title: "中国 9 月制造业 PMI（NBS）", importance: "高" },
  { date: "2026-10-01", region: "US", title: "美国 PCE 物价指数 同比", importance: "高" },
  { date: "2026-10-02", region: "US", title: "美国 9 月非农就业", importance: "高" },
  { date: "2026-10-08", region: "EU", title: "欧元区 CPI 同比 初值", importance: "高" },
  { date: "2026-10-15", region: "CN", title: "中国 CPI / PPI 同比", importance: "高" },
  { date: "2026-10-28", region: "EU", title: "欧洲央行 利率决议", importance: "高" },
  { date: "2026-11-05", region: "US", title: "美联储 FOMC 利率决议", importance: "高" },
];

/* ----------------------------- 自动摘要 ----------------------------- */

export function buildSummary(_tw: TW): string {
  const g = (c: string) => resolveIndicator(c) ?? getIndicator(c);
  const fmt = (ind: ReturnType<typeof g>) => {
    if (!ind) return "";
    const u = ind.unit === "%" ? "pp" : ind.unit === "bp" ? "bp" : ind.unit === "pp" ? "pp" : "";
    const sign = ind.change >= 0 ? "+" : "";
    return `${ind.name} ${ind.value}${ind.unit}（较前值 ${sign}${ind.change.toFixed(2)}${u ? " " + u : ""}）`;
  };
  const lines = KEY_CARDS.map((c) => `· ${fmt(g(c))}`);
  return (
    `全球宏观研究决策台 · 今日摘要（截至 ${g("US_10Y")?.as_of} · 真实数据 + 模型推导）\n` +
    `1) 美国通胀延续回落：美国 CPI 同比 ${g("US_CPI_YOY")?.value}%（前值 ${g("US_CPI_YOY")?.previous}%），SOFR-IORB ${g("US_SOFR_IORB")?.value} bp 处 ${g("US_SOFR_IORB")?.percentile}% 分位。\n` +
    `2) 中国流动性转松、通缩未消：DR007 ${g("CN_DR007")?.value}%（前值 ${g("CN_DR007")?.previous}%），CPI ${g("CN_CPI_YOY")?.value}%（${g("CN_CPI_YOY")?.percentile}% 分位）。\n` +
    `3) 美债曲线倒挂收敛、美元走强：2s10s ${g("US_2S10S")?.value} bp，US10Y ${g("US_10Y")?.value}%，DXY ${g("DXY")?.value}，USDCNH ${g("CN_USDCNH")?.value}。\n` +
    `关键变化卡片：\n${lines.join("\n")}`
  );
}

/* ----------------------------- 时间窗口 helpers（本周 / 待发生 / 已发生） ----------------------------- */

/** 站点“今天”锚定 Mock 数据，静态导出稳定。 */
export const TODAY = "2026-09-29";

function parseD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtMD(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${m}-${day}`;
}

/** 目标日期相对 TODAY 的整天数差（正=未来，负=已发生，0=今天）。 */
export function dayDiff(target: string, today: string = TODAY): number {
  return Math.round((parseD(target).getTime() - parseD(today).getTime()) / 86400000);
}

/** 返回 TODAY 所在自然周（周一 00:00 ~ 周日 23:59）。 */
export function weekRange(today: string = TODAY): { start: Date; end: Date } {
  const t = parseD(today);
  const dow = (t.getDay() + 6) % 7; // 0=周一
  const start = new Date(t);
  start.setDate(t.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function getWeekLabel(): string {
  const { start, end } = weekRange();
  return `${start.getFullYear()}-${fmtMD(start)} 至 ${fmtMD(end)}`;
}

export function getThisWeekEvents(): MacroEvent[] {
  const { start, end } = weekRange();
  return EVENTS.filter((e) => {
    const d = parseD(e.date);
    return d >= start && d <= end;
  }).sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
}

export function getUpcomingEvents(days = 21): MacroEvent[] {
  const t = parseD(TODAY);
  const limit = new Date(t);
  limit.setDate(t.getDate() + days);
  return EVENTS.filter((e) => {
    const d = parseD(e.date);
    return d > t && d <= limit;
  }).sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
}

export function getRecentEvents(days = 7): MacroEvent[] {
  const t = parseD(TODAY);
  const limit = new Date(t);
  limit.setDate(t.getDate() - days);
  return EVENTS.filter((e) => {
    const d = parseD(e.date);
    return d <= t && d >= limit;
  }).sort((a, b) => parseD(b.date).getTime() - parseD(a.date).getTime());
}
