/**
 * 统一指标数据层（Phase 1 · 数据字典核心）
 * --------------------------------------------------------------------------
 * 目标：把分散在 lib/mock-data.ts / fx.ts / regime.ts / liquidity.ts / cycle.ts
 * 中的指标，统一到同一个 17 字段 Schema，供首页仪表盘、二级页、表格与导出复用。
 *
 * 每个指标都带完整的 Mock Data 标识：is_mock / source / frequency / unit / as_of，
 * 以及研究所需的 percentile / zscore / direction / affected_assets / definition。
 *
 * 注意：本文件所有数值均为确定性 Mock，仅供研究原型使用，不对接实时行情。
 * 接真实数据时，只需替换 getIndicator 背后的数据源，Schema 与上游消费方不变。
 */

import { getSeries, isReal, provenance, DATA_ASOF } from "./realdata";

export type Region =
  | "CN" // 中国
  | "US" // 美国
  | "EU" // 欧元区
  | "JP" // 日本
  | "HK" // 香港
  | "CH" // 瑞士
  | "GB" // 英国
  | "AU" // 澳大利亚
  | "GLOBAL"; // 跨资产 / 全球

export type Category =
  | "growth" // 增长
  | "inflation" // 通胀
  | "policy" // 央行政策
  | "liquidity" // 流动性 / 货币数量
  | "rates" // 收益率 / 利率曲线
  | "fx" // 外汇
  | "funding" // 融资条件 / 资金面
  | "risk"; // 风险与周期

export type Direction = "up" | "down" | "flat";
export type Frequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";

/** 统一指标 Schema（需求第 10 条，17 个字段） */
export interface Indicator {
  code: string; // 指标代码
  name: string; // 指标名称（中文）
  region: Region;
  category: Category;
  value: number; // 当前值
  previous: number; // 上期值（同一时间窗口内的对照期）
  change: number; // 变化 = value - previous（已按窗口计算，见 timeWindow）
  unit: string; // 单位：% / bp / 十亿USD / 千人 / level ...
  frequency: Frequency;
  as_of: string; // 数据截止日 YYYY-MM-DD
  source: string; // 数据来源（含 Mock 标注）
  is_mock: boolean; // 是否 Mock 数据
  percentile: number; // 当前值的历史分位 0-100
  zscore: number; // 标准化 Z 分数
  direction: Direction; // 相对 previous 的方向
  affected_assets: string[]; // 受影响资产
  definition: string; // 指标定义
  core?: boolean; // 是否核心指标（默认展示）
}

/** 时间窗口（顶部栏 1D/1W/1M），change/previous 的对照口径随窗口而变 */
export type TimeWindow = "1D" | "1W" | "1M";

/* ------------------------------------------------------------------ */
/* 原始录入（不含 change / direction，由 mk 自动推导，避免不一致）      */
/* ------------------------------------------------------------------ */

type Raw = Omit<Indicator, "change" | "direction">;

const RAW: Raw[] = [
  /* ============================ 中国 CN ============================ */
  { code: "CN_GDP_YOY", name: "中国 GDP 同比", region: "CN", category: "growth", value: 4.8, previous: 4.6, unit: "%", frequency: "Quarterly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 40, zscore: -0.2, affected_assets: ["A股", "人民币", "国债"], definition: "中国实际 GDP 同比增长率，季频初值。", core: true },
  { code: "CN_IP_YOY", name: "工业增加值 同比", region: "CN", category: "growth", value: 5.1, previous: 4.8, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 45, zscore: 0.1, affected_assets: ["A股", "周期股"], definition: "规模以上工业企业增加值同比。", core: true },
  { code: "CN_RETAIL_YOY", name: "社会消费品零售 同比", region: "CN", category: "growth", value: 3.2, previous: 2.9, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 35, zscore: -0.3, affected_assets: ["消费股"], definition: "社会消费品零售总额同比，衡量内需。", core: false },
  { code: "CN_FAI_YOY", name: "固定资产投资 同比", region: "CN", category: "growth", value: 3.4, previous: 4.6, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 30, zscore: -0.5, affected_assets: ["A股", "周期股", "地产"], definition: "固定资产投资完成额累计同比。", core: true },
  { code: "CN_MANU_INVEST_YOY", name: "制造业投资 同比", region: "CN", category: "growth", value: 7.5, previous: 8.8, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 40, zscore: -0.2, affected_assets: ["A股", "制造业"], definition: "制造业固定资产投资完成额累计同比。", core: false },
  { code: "CN_INFRA_INVEST_YOY", name: "基建投资 同比", region: "CN", category: "growth", value: 4.1, previous: 6.2, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 25, zscore: -0.7, affected_assets: ["A股", "周期股", "地方债"], definition: "基础设施固定资产投资完成额累计同比。", core: false },
  { code: "CN_PROPERTY_INVEST_YOY", name: "房地产投资 同比", region: "CN", category: "growth", value: -10.9, previous: -8.8, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 15, zscore: -1.1, affected_assets: ["地产", "建材", "信用"], definition: "房地产开发投资完成额累计同比。", core: false },
  { code: "CN_EXPORT_YOY", name: "出口 同比", region: "CN", category: "growth", value: 8.4, previous: 4.9, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "海关总署 (Mock)", is_mock: true, percentile: 70, zscore: 0.6, affected_assets: ["人民币", "出口链", "航运"], definition: "以美元计价出口总额同比。", core: true },
  { code: "CN_IMPORT_YOY", name: "进口 同比", region: "CN", category: "growth", value: 2.6, previous: 1.4, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "海关总署 (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["人民币", "内需", "大宗商品"], definition: "以美元计价进口总额同比。", core: false },
  { code: "CN_CPI_YOY", name: "中国 CPI 同比", region: "CN", category: "inflation", value: 0.5, previous: 0.3, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 15, zscore: -1.0, affected_assets: ["利率", "人民币", "国债"], definition: "居民消费价格指数同比。", core: true },
  { code: "CN_PPI_YOY", name: "中国 PPI 同比", region: "CN", category: "inflation", value: -1.8, previous: -2.1, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "国家统计局 (Mock)", is_mock: true, percentile: 20, zscore: -0.8, affected_assets: ["工业股", "人民币"], definition: "工业生产者出厂价格同比。", core: false },
  { code: "CN_PBOC_7D", name: "7天逆回购利率", region: "CN", category: "policy", value: 1.50, previous: 1.50, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "中国人民银行 (Mock)", is_mock: true, percentile: 20, zscore: -0.9, affected_assets: ["国债", "DR007", "人民币"], definition: "央行 7 天逆回购操作利率，政策基准利率。", core: true },
  { code: "CN_MLF", name: "MLF 利率", region: "CN", category: "policy", value: 2.30, previous: 2.30, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "中国人民银行 (Mock)", is_mock: true, percentile: 25, zscore: -0.7, affected_assets: ["国债", "LPR"], definition: "中期借贷便利操作利率。", core: false },
  { code: "CN_LPR_1Y", name: "LPR 1Y", region: "CN", category: "policy", value: 3.10, previous: 3.10, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "全国银行间同业拆借中心 (Mock)", is_mock: true, percentile: 30, zscore: -0.5, affected_assets: ["贷款", "地产"], definition: "贷款市场报价利率（1年期）。", core: false },
  { code: "CN_DR007", name: "DR007", region: "CN", category: "liquidity", value: 1.72, previous: 1.80, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "银行间市场 (Mock)", is_mock: true, percentile: 30, zscore: -0.6, affected_assets: ["回购", "国债", "信用"], definition: "存款类机构 7 天质押式回购加权利率，银行间流动性锚。", core: true },
  { code: "CN_R007", name: "R007", region: "CN", category: "liquidity", value: 1.95, previous: 2.05, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "银行间市场 (Mock)", is_mock: true, percentile: 35, zscore: -0.5, affected_assets: ["回购", "杠杆"], definition: "全市场 7 天质押式回购加权利率。", core: false },
  { code: "CN_SHIBOR_3M", name: "SHIBOR 3M", region: "CN", category: "liquidity", value: 1.85, previous: 1.90, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "全国银行间同业拆借中心 (Mock)", is_mock: true, percentile: 40, zscore: -0.4, affected_assets: ["同业存单", "理财"], definition: "3 个月上海银行间同业拆放利率。", core: false },
  { code: "CN_M2_YOY", name: "M2 同比", region: "CN", category: "liquidity", value: 8.0, previous: 8.1, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "中国人民银行 (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["信用", "A股"], definition: "广义货币供应量同比。", core: false },
  { code: "CN_SF_YOY", name: "社融 同比", region: "CN", category: "liquidity", value: 8.1, previous: 8.0, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "中国人民银行 (Mock)", is_mock: true, percentile: 45, zscore: 0.1, affected_assets: ["信用", "地产"], definition: "社会融资规模存量同比，广义信用扩张。", core: false },
  { code: "CN_10Y", name: "中国 10Y 国债收益率", region: "CN", category: "rates", value: 2.15, previous: 2.20, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "中债估值 (Mock)", is_mock: true, percentile: 25, zscore: -0.7, affected_assets: ["国债", "利率互换"], definition: "10 年期国债到期收益率。", core: false },
  { code: "CN_USDCNH", name: "USDCNH", region: "CN", category: "fx", value: 7.08, previous: 7.10, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["人民币", "港股", "A股"], definition: "美元兑离岸人民币即期汇率。", core: true },
  { code: "CN_US10Y_SPD", name: "中美 10Y 利差 (中-美)", region: "CN", category: "rates", value: -2.13, previous: -2.08, unit: "pp", frequency: "Daily", as_of: "2026-09-29", source: "派生 (Mock)", is_mock: true, percentile: 30, zscore: -0.6, affected_assets: ["人民币", "国债", "北向资金"], definition: "中国 10Y 减美国 10Y 利差，正值为中债相对占优。", core: false },

  /* ============================ 美国 US ============================ */
  { code: "US_GDP_QOQ", name: "美国 GDP 环比折年", region: "US", category: "growth", value: 2.6, previous: 3.0, unit: "%", frequency: "Quarterly", as_of: "2026-09-29", source: "BEA (Mock)", is_mock: true, percentile: 60, zscore: 0.4, affected_assets: ["美股", "美元", "美债"], definition: "美国实际 GDP 环比折年率。", core: true },
  { code: "US_NFP", name: "非农就业 变化", region: "US", category: "growth", value: 142, previous: 168, unit: "千人", frequency: "Monthly", as_of: "2026-09-29", source: "BLS (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["美元", "美股", "美债"], definition: "非农就业人数月度净变化。", core: false },
  { code: "US_UNEMP", name: "失业率", region: "US", category: "growth", value: 4.2, previous: 4.3, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "BLS (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["美元", "美联储"], definition: "U3 失业率。", core: false },
  { code: "US_CPI_YOY", name: "美国 CPI 同比", region: "US", category: "inflation", value: 2.9, previous: 3.1, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "BLS (Mock)", is_mock: true, percentile: 75, zscore: 0.8, affected_assets: ["美债", "美元", "美股"], definition: "居民消费价格指数同比。", core: true },
  { code: "US_CORECPI_YOY", name: "美国 核心 CPI 同比", region: "US", category: "inflation", value: 3.2, previous: 3.3, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "BLS (Mock)", is_mock: true, percentile: 70, zscore: 0.7, affected_assets: ["美债"], definition: "剔除食品能源的 CPI 同比。", core: false },
  { code: "US_PCE_YOY", name: "美国 PCE 同比", region: "US", category: "inflation", value: 2.6, previous: 2.7, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "BEA (Mock)", is_mock: true, percentile: 65, zscore: 0.6, affected_assets: ["美债", "美联储"], definition: "个人消费支出价格指数同比。", core: false },
  { code: "US_COREPCE", name: "美国 核心 PCE 同比", region: "US", category: "inflation", value: 2.9, previous: 2.9, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "BEA (Mock)", is_mock: true, percentile: 68, zscore: 0.6, affected_assets: ["美联储"], definition: "美联储偏好通胀指标。", core: false },
  { code: "US_FFR", name: "联邦基金目标上限", region: "US", category: "policy", value: 4.50, previous: 4.50, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "Federal Reserve (Mock)", is_mock: true, percentile: 80, zscore: 1.0, affected_assets: ["美债", "美元", "美股"], definition: "联邦基金利率目标区间上限。", core: true },
  { code: "US_IORB", name: "准备金余额利率 (IORB)", region: "US", category: "policy", value: 4.40, previous: 4.40, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "Federal Reserve (Mock)", is_mock: true, percentile: 78, zscore: 0.9, affected_assets: ["银行", "美元"], definition: "银行准备金余额支付利息的利率。", core: false },
  { code: "US_SOFR", name: "SOFR", region: "US", category: "liquidity", value: 4.62, previous: 4.60, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "FRBNY (Mock)", is_mock: true, percentile: 85, zscore: 1.1, affected_assets: ["回购", "美债", "美元"], definition: "担保隔夜融资利率。", core: true },
  { code: "US_ONRRP", name: "ON RRP 规模", region: "US", category: "liquidity", value: 320, previous: 360, unit: "十亿USD", frequency: "Daily", as_of: "2026-09-29", source: "Federal Reserve (Mock)", is_mock: true, percentile: 35, zscore: -0.5, affected_assets: ["美元流动性", "美债"], definition: "隔夜逆回购工具用量，衡量过剩流动性。", core: false },
  { code: "US_SOFR_IORB", name: "SOFR-IORB 利差", region: "US", category: "funding", value: 12, previous: 8, unit: "bp", frequency: "Daily", as_of: "2026-09-29", source: "派生 (Mock)", is_mock: true, percentile: 80, zscore: 1.0, affected_assets: ["资金面", "Repo", "美元"], definition: "SOFR 与准备金利率之差，反映货币市场摩擦。", core: true },
  { code: "US_2Y", name: "美国 2Y 国债", region: "US", category: "rates", value: 4.66, previous: 4.71, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "US Treasury (Mock)", is_mock: true, percentile: 68, zscore: 0.6, affected_assets: ["美债", "美联储"], definition: "2 年期国债到期收益率。", core: false },
  { code: "US_10Y", name: "美国 10Y 国债", region: "US", category: "rates", value: 4.28, previous: 4.34, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "US Treasury (Mock)", is_mock: true, percentile: 70, zscore: 0.7, affected_assets: ["美债", "美元", "全球利率"], definition: "10 年期国债到期收益率，全球定价锚。", core: true },
  { code: "US_2S10S", name: "2s10s 利差", region: "US", category: "rates", value: -38, previous: -43, unit: "bp", frequency: "Daily", as_of: "2026-09-29", source: "派生 (Mock)", is_mock: true, percentile: 40, zscore: -0.4, affected_assets: ["收益率曲线", "银行股"], definition: "美国 2Y 与 10Y 利差，负值即收益率曲线倒挂。", core: true },
  { code: "DXY", name: "美元指数", region: "US", category: "fx", value: 101.2, previous: 100.8, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "ICE (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["美元", "黄金", "新兴市场"], definition: "美元兑一篮子货币指数。", core: true },

  /* ============================ 欧元区 EU ============================ */
  { code: "EU_GDP_YOY", name: "欧元区 GDP 同比", region: "EU", category: "growth", value: 0.9, previous: 0.8, unit: "%", frequency: "Quarterly", as_of: "2026-09-29", source: "Eurostat (Mock)", is_mock: true, percentile: 25, zscore: -0.8, affected_assets: ["欧股", "欧元", "欧债"], definition: "欧元区实际 GDP 同比。", core: true },
  { code: "EU_CPI_YOY", name: "欧元区 CPI 同比", region: "EU", category: "inflation", value: 2.1, previous: 2.2, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "Eurostat (Mock)", is_mock: true, percentile: 35, zscore: -0.5, affected_assets: ["欧债", "欧元"], definition: "调和 CPI 同比。", core: true },
  { code: "EU_CORECPI", name: "欧元区 核心 CPI 同比", region: "EU", category: "inflation", value: 2.8, previous: 2.9, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "Eurostat (Mock)", is_mock: true, percentile: 40, zscore: -0.4, affected_assets: ["欧债"], definition: "剔除食品能源的调和 CPI 同比。", core: false },
  { code: "EU_DEP", name: "存款利率", region: "EU", category: "policy", value: 3.25, previous: 3.25, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "ECB (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["欧债", "欧元"], definition: "欧央行存款便利利率。", core: true },
  { code: "EU_ESTR", name: "ESTR", region: "EU", category: "liquidity", value: 3.18, previous: 3.20, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "ECB (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["欧元回购", "欧债"], definition: "欧元短期利率。", core: true },
  { code: "EU_10Y", name: "德债 10Y", region: "EU", category: "rates", value: 2.55, previous: 2.62, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "EGB (Mock)", is_mock: true, percentile: 45, zscore: -0.1, affected_assets: ["欧债", "欧元"], definition: "德国 10 年期国债收益率。", core: false },
  { code: "EURUSD", name: "欧元兑美元", region: "EU", category: "fx", value: 1.085, previous: 1.082, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["欧元", "欧股", "美元"], definition: "欧元兑美元即期汇率。", core: false },

  /* ============================ 日本 JP ============================ */
  { code: "JP_GDP_YOY", name: "日本 GDP 同比", region: "JP", category: "growth", value: 0.8, previous: 0.7, unit: "%", frequency: "Quarterly", as_of: "2026-09-29", source: "Cabinet Office (Mock)", is_mock: true, percentile: 45, zscore: 0.1, affected_assets: ["日股", "日元", "日债"], definition: "日本实际 GDP 同比。", core: true },
  { code: "JP_CPI_YOY", name: "日本 CPI 同比", region: "JP", category: "inflation", value: 2.7, previous: 2.8, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "Statistics Bureau (Mock)", is_mock: true, percentile: 70, zscore: 0.7, affected_assets: ["日债", "日元", "日股"], definition: "全国 CPI 同比。", core: true },
  { code: "JP_CORECPI", name: "日本 核心 CPI 同比", region: "JP", category: "inflation", value: 2.5, previous: 2.6, unit: "%", frequency: "Monthly", as_of: "2026-09-29", source: "Statistics Bureau (Mock)", is_mock: true, percentile: 65, zscore: 0.6, affected_assets: ["日银"], definition: "剔除生鲜的 CPI 同比。", core: false },
  { code: "JP_POLICY", name: "政策利率", region: "JP", category: "policy", value: 0.25, previous: 0.25, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "BOJ (Mock)", is_mock: true, percentile: 30, zscore: -0.6, affected_assets: ["日债", "日元"], definition: "日本央行短期政策利率。", core: true },
  { code: "JP_TONA", name: "TONA", region: "JP", category: "liquidity", value: 0.21, previous: 0.20, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "BOJ (Mock)", is_mock: true, percentile: 35, zscore: -0.5, affected_assets: ["日元回购"], definition: "东京隔夜平均利率。", core: true },
  { code: "JP_10Y", name: "日债 10Y", region: "JP", category: "rates", value: 1.05, previous: 1.02, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "JB (Mock)", is_mock: true, percentile: 60, zscore: 0.4, affected_assets: ["日债", "日元"], definition: "日本 10 年期国债收益率（含 YCC 约束）。", core: true },
  { code: "USDJPY", name: "美元兑日元", region: "JP", category: "fx", value: 142.3, previous: 143.9, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["日元", "日股", "美元"], definition: "美元兑日元即期汇率。", core: false },

  /* ============================ 香港 HK ============================ */
  { code: "HK_HIBOR_3M", name: "HIBOR 3M", region: "HK", category: "liquidity", value: 3.60, previous: 3.70, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "HKMA (Mock)", is_mock: true, percentile: 45, zscore: -0.1, affected_assets: ["港股", "地产"], definition: "香港银行间 3 个月同业拆息。", core: false },
  { code: "HK_10Y", name: "港债 10Y", region: "HK", category: "rates", value: 3.45, previous: 3.50, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "HKGB (Mock)", is_mock: true, percentile: 45, zscore: -0.1, affected_assets: ["港债"], definition: "香港 10 年期政府债券收益率。", core: false },
  { code: "HKDUSD", name: "港元兑美元", region: "HK", category: "fx", value: 7.81, previous: 7.81, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["港元"], definition: "联系汇率制度下港元兑美元。", core: false },

  /* ============================ 瑞士 CH ============================ */
  { code: "CH_POLICY", name: "SNB 政策利率", region: "CH", category: "policy", value: 1.00, previous: 1.00, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "SNB (Mock)", is_mock: true, percentile: 40, zscore: -0.3, affected_assets: ["瑞郎", "瑞债"], definition: "瑞士央行政策利率。", core: false },
  { code: "CHFUSD", name: "瑞郎兑美元", region: "CH", category: "fx", value: 0.92, previous: 0.93, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 45, zscore: -0.1, affected_assets: ["瑞郎", "避险"], definition: "瑞郎兑美元即期汇率。", core: false },

  /* ============================ 英国 GB ============================ */
  { code: "GB_BANK", name: "BOE 银行利率", region: "GB", category: "policy", value: 4.00, previous: 4.00, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "BOE (Mock)", is_mock: true, percentile: 60, zscore: 0.4, affected_assets: ["英债", "英镑"], definition: "英国央行基准利率。", core: false },
  { code: "GB_10Y", name: "英债 10Y", region: "GB", category: "rates", value: 4.30, previous: 4.35, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "UK Gilt (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["英债", "英镑"], definition: "英国 10 年期国债收益率。", core: false },
  { code: "GBPEUR", name: "英镑兑欧元", region: "GB", category: "fx", value: 1.18, previous: 1.17, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["英镑"], definition: "英镑兑欧元即期汇率。", core: false },

  /* ============================ 澳大利亚 AU ============================ */
  { code: "AU_CASH", name: "RBA 现金利率", region: "AU", category: "policy", value: 3.60, previous: 3.60, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "RBA (Mock)", is_mock: true, percentile: 55, zscore: 0.2, affected_assets: ["澳债", "澳元"], definition: "澳洲联储现金利率。", core: false },
  { code: "AUDUSD", name: "澳元兑美元", region: "AU", category: "fx", value: 0.66, previous: 0.65, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "外汇市场 (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["澳元", "大宗商品"], definition: "澳元兑美元即期汇率。", core: false },
  { code: "AU_10Y", name: "澳债 10Y", region: "AU", category: "rates", value: 4.20, previous: 4.25, unit: "%", frequency: "Daily", as_of: "2026-09-29", source: "AU GB (Mock)", is_mock: true, percentile: 50, zscore: 0.0, affected_assets: ["澳债"], definition: "澳大利亚 10 年期国债收益率。", core: false },

  /* ============================ 跨资产 / 风险 GLOBAL ============================ */
  { code: "VIX", name: "VIX 波动率指数", region: "GLOBAL", category: "risk", value: 14.5, previous: 16.2, unit: "level", frequency: "Daily", as_of: "2026-09-29", source: "CBOE (Mock)", is_mock: true, percentile: 30, zscore: -0.6, affected_assets: ["美股", "全球风险", "VIX 衍生品"], definition: "标普 500 隐含波动率，恐慌指标。", core: true },
  { code: "US_IG_OAS", name: "投资级信用利差", region: "GLOBAL", category: "risk", value: 92, previous: 95, unit: "bp", frequency: "Daily", as_of: "2026-09-29", source: "ICE BAML (Mock)", is_mock: true, percentile: 40, zscore: -0.4, affected_assets: ["信用债", "美股"], definition: "投资级公司债相对国债的期权调整利差。", core: false },
  { code: "US_HY_OAS", name: "高收益信用利差", region: "GLOBAL", category: "risk", value: 320, previous: 335, unit: "bp", frequency: "Daily", as_of: "2026-09-29", source: "ICE BAML (Mock)", is_mock: true, percentile: 35, zscore: -0.5, affected_assets: ["高收益债", "风险偏好"], definition: "高收益公司债相对国债的期权调整利差。", core: false },
];

/* ------------------------------------------------------------------ */
/* 派生：change / direction                                           */
/* ------------------------------------------------------------------ */

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function deriveDirection(change: number): Direction {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export const INDICATORS: Indicator[] = RAW.map((r) => {
  const change = round(r.value - r.previous);
  return { ...r, change, direction: deriveDirection(change) };
});

/* ------------------------------------------------------------------ */
/* 访问器                                                             */
/* ------------------------------------------------------------------ */

export function getIndicator(code: string): Indicator | undefined {
  return INDICATORS.find((i) => i.code === code);
}

/* ------------------------------------------------------------------ */
/* 真实数据覆盖层                                                      */
/* ------------------------------------------------------------------ */
/**
 * 解析指标：当 code 存在真实序列且 provenance OK 时，用真实末值覆盖
 * value/previous/change/as_of/source/is_mock；percentile/zscore 为模型推导，
 * 置 NaN 由 UI 标注「模型推导」。无真实源时回退确定性 Mock（is_mock=true），
 * 绝不把 Mock 冒充真实。仅用于首页等需要"真实优先"的展示层。
 */
export function resolveIndicator(code: string): Indicator | undefined {
  const base = getIndicator(code);
  if (!base) return undefined;
  const pts = getSeries(code);
  if (!pts || pts.length === 0 || !isReal(code)) return base;

  const last = pts[pts.length - 1].v;
  const lastDate = new Date(pts[pts.length - 1].date);
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - 30);
  let prev = pts[0].v;
  for (const p of pts) {
    if (new Date(p.date) <= cutoff) prev = p.v;
    else break;
  }
  const change = round(last - prev);
  const direction = deriveDirection(change);
  const prov = provenance[code];
  return {
    ...base,
    value: last,
    previous: prev,
    change,
    direction,
    as_of: DATA_ASOF,
    source: prov?.source ?? base.source,
    is_mock: false,
    frequency: pts.length > 5 ? "Daily" : base.frequency,
    percentile: NaN,
    zscore: NaN,
  };
}

/** 真实序列按时间窗口切片，返回 [{date, v}]，用于时间序列图。 */
export function realWindowSlice(
  code: string,
  tw: "1D" | "1W" | "1M",
): { date: string; v: number }[] {
  const pts = getSeries(code);
  if (!pts || pts.length === 0) return [];
  const n = tw === "1D" ? 2 : tw === "1W" ? 6 : 23;
  return pts.slice(Math.max(0, pts.length - n));
}

export function byRegion(region: Region): Indicator[] {
  return INDICATORS.filter((i) => i.region === region);
}

export function byCategory(category: Category): Indicator[] {
  return INDICATORS.filter((i) => i.category === category);
}

export function coreIndicators(): Indicator[] {
  return INDICATORS.filter((i) => i.core);
}

export const REGION_LABELS: Record<Region, string> = {
  CN: "中国",
  US: "美国",
  EU: "欧元区",
  JP: "日本",
  HK: "香港",
  CH: "瑞士",
  GB: "英国",
  AU: "澳大利亚",
  GLOBAL: "全球 / 跨资产",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  growth: "增长",
  inflation: "通胀",
  policy: "央行政策",
  liquidity: "流动性",
  rates: "收益率 / 利率",
  fx: "外汇",
  funding: "融资条件",
  risk: "风险与周期",
};

/** 默认展示地区（需求第 9 条：默认只展示 CN/US/EU/JP，其余可选） */
export const DEFAULT_REGIONS: Region[] = ["CN", "US", "EU", "JP"];
export const OPTIONAL_REGIONS: Region[] = ["HK", "CH", "GB", "AU"];

/** 仪表盘维度（需求第 6 条：地区 × 维度 增长/通胀/政策/流动性） */
export const DASHBOARD_DIMENSIONS: { category: Category; label: string }[] = [
  { category: "growth", label: "增长" },
  { category: "inflation", label: "通胀" },
  { category: "policy", label: "政策" },
  { category: "liquidity", label: "流动性" },
];

/* ------------------------------------------------------------------ */
/* CSV 导出（需求第 13 条：导出 CSV）                                  */
/* ------------------------------------------------------------------ */

export const INDICATOR_CSV_HEADERS = [
  "code",
  "name",
  "region",
  "category",
  "value",
  "previous",
  "change",
  "unit",
  "frequency",
  "as_of",
  "source",
  "is_mock",
  "percentile",
  "zscore",
  "direction",
  "affected_assets",
  "definition",
] as const;

export function indicatorsToCSV(list: Indicator[]): string {
  const esc = (s: string | number | boolean) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = list.map((i) =>
    [
      i.code,
      i.name,
      i.region,
      i.category,
      i.value,
      i.previous,
      i.change,
      i.unit,
      i.frequency,
      i.as_of,
      i.source,
      i.is_mock,
      i.percentile,
      i.zscore,
      i.direction,
      i.affected_assets.join(" | "),
      i.definition,
    ]
      .map(esc)
      .join(","),
  );
  return [INDICATOR_CSV_HEADERS.join(","), ...lines].join("\n");
}

export function downloadCSV(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
