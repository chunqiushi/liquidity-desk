/* ============================================================================
 * Liquidity · Key Events (recent week + upcoming week)
 * ----------------------------------------------------------------------------
 * 每个经济体的「最近一周关键事件」与「未来一周关键事件」。
 * 数据为确定性 Mock（与全站一致，均标注 Mock），围绕各经济体真实政策/数据节奏虚构，
 * 仅用于原型演示，不构成任何投资建议。
 *
 * 时间锚点：ASOF = 2026-09-29（与 liquidity-monitor.tsx 中一致）。
 *   - recent    : 2026-09-22 ~ 2026-09-29（过去一周已发生）
 *   - upcoming  : 2026-09-26 ~ 2026-10-02（未来一周待发生）
 *
 * impact: "high" 红 / "med" 琥珀 / "low" 灰 —— 由事件对流动性/利率的潜在冲击决定。
 * ========================================================================== */

import type { EcoCode } from "./liquidity";

export type EventImpact = "high" | "med" | "low";

export interface LiqEvent {
  date: string; // 展示用日期，如 "09-22"
  title: string;
  detail: string;
  impact: EventImpact;
  tag: string; // 央行 / 数据 / 风险 / 市场 / 供给
}

export interface CountryEvents {
  recent: LiqEvent[];
  upcoming: LiqEvent[];
}

const DATA: Record<EcoCode, CountryEvents> = {
  /* ============================== 中国 ============================== */
  CNY: {
    recent: [
      { date: "09-19", title: "降准预期升温，债市走强", detail: "市场对四季度结构性降准预期升温，利率债收益率普遍下行，资金面情绪偏暖。", impact: "med", tag: "市场" },
      { date: "09-22", title: "PBoC 14天逆回购护航跨季", detail: "央行重启并加量 14 天逆回购，熨平跨季资金波动，DR007 围绕政策利率下方平稳。", impact: "med", tag: "央行" },
      { date: "09-24", title: "MLF 小幅超额续作", detail: "本月 MLF 净投放中长期资金，配合买断式逆回购，维持银行体系合理充裕。", impact: "low", tag: "央行" },
    ],
    upcoming: [
      { date: "09-29", title: "季末财政集中支出", detail: "季末财政支出集中投放，利于超储回补；关注与政府债供给的此消彼长。", impact: "med", tag: "供给" },
      { date: "09-30", title: "9月官方制造业 PMI", detail: "关注内需与产需修复斜率，对宽信用传导与后续总量政策节奏有指引。", impact: "high", tag: "数据" },
      { date: "09-30", title: "跨季资金面最后考验", detail: "季末最后交易日，MPA 考核+节前备付，关注 DR007 脉冲与分层。", impact: "med", tag: "市场" },
      { date: "10-01", title: "国庆假期前取现需求", detail: "长假前居民取现与机构备付上升，阶段性抽离超储，节后回笼。", impact: "low", tag: "市场" },
    ],
  },

  /* ============================== 美国 ============================== */
  USD: {
    recent: [
      { date: "09-17", title: "FOMC 维持利率区间", detail: "联邦公开市场委员会按兵不动，点阵图暗示年内降息路径偏谨慎，短端利率高位锚定。", impact: "high", tag: "央行" },
      { date: "09-22", title: "ON RRP 余额跌破阈值", detail: "逆回购余额进一步回落，过剩流动性蓄水池持续收缩，准备金逼近充裕下沿。", impact: "med", tag: "数据" },
      { date: "09-23", title: "SOFR-OIS 季末小幅走阔", detail: "临近季末，SOFR-OIS 基差微扬，提示货币市场边际紧张但尚属可控。", impact: "med", tag: "市场" },
    ],
    upcoming: [
      { date: "09-30", title: "季末国债集中结算", detail: "季度末大规模国债结算叠加新发，短端资金面或现脉冲式收紧。", impact: "med", tag: "供给" },
      { date: "10-01", title: "8月 PCE 物价指数", detail: "核心 PCE 是 Fed 首选通胀指标，将直接校准降息预期与流动性环境。", impact: "high", tag: "数据" },
      { date: "10-02", title: "9月非农就业报告", detail: "就业强弱决定政策路径，弱于预期将抬升宽松预期、缓解货币端压力。", impact: "high", tag: "数据" },
    ],
  },

  /* ============================== 欧元区 ============================== */
  EUR: {
    recent: [
      { date: "09-19", title: "ECB 官员讲话偏鸽", detail: "多位管委暗示若通胀如期回落，将进一步宽松，边际缓解货币端压力。", impact: "med", tag: "央行" },
      { date: "09-22", title: "过剩流动性进一步回落", detail: "随 PEPP/APP 再投资缩减，Excess Liquidity 趋势性下降，靠近稀缺准备金框架。", impact: "med", tag: "数据" },
      { date: "09-22", title: "意/德利差小幅走阔", detail: "主权利差边际走阔，碎片化风险隐现，但尚处可控区间。", impact: "low", tag: "风险" },
    ],
    upcoming: [
      { date: "09-30", title: "9月 CPI 初值(flash)", detail: "通胀初值决定 ECB 后续宽松节奏，能源基数效应值得关注。", impact: "high", tag: "数据" },
      { date: "10-02", title: "9月 PMI 终值", detail: "制造业与服务业终值验证增长动能，弱数据强化宽松预期。", impact: "med", tag: "数据" },
      { date: "10-01", title: "银行贷款调查(BLS)", detail: "关注信贷供给是否延续收缩，是货币传导通畅与否的高频证据。", impact: "med", tag: "数据" },
    ],
  },

  /* ============================== 日本 ============================== */
  JPY: {
    recent: [
      { date: "09-19", title: "BoJ 按兵不动，措辞微调", detail: "日本央行维持政策利率，声明对通胀前景措辞略偏积极，正常化路径未变。", impact: "high", tag: "央行" },
      { date: "09-22", title: "日元走弱，USD/JPY 测试高位", detail: "美日利差支撑套息，日元承压，离岸美元融资成本边际走紧。", impact: "med", tag: "市场" },
      { date: "09-24", title: "JGB 10Y 拍卖需求稳健", detail: "长债拍卖结果平稳，收益率上行有序，未现流动性恐慌。", impact: "low", tag: "市场" },
    ],
    upcoming: [
      { date: "09-30", title: "8月工业产出", detail: "关注产出修复与全球需求，对日元与 BoJ 政策预期有边际影响。", impact: "med", tag: "数据" },
      { date: "10-01", title: "短观调查(Tankan)临近", detail: "季度短观是企业景气与资本开支的前瞻信号，影响政策正常化节奏。", impact: "high", tag: "数据" },
      { date: "10-02", title: "BoJ 购债缩减节奏关注", detail: "市场关注国债减持速度，若超预期将推升全球期限溢价。", impact: "med", tag: "央行" },
    ],
  },

  /* ============================== 英国 ============================== */
  GBP: {
    recent: [
      { date: "09-18", title: "BoE 维持 Bank Rate", detail: "货币政策委员会维持利率，投票出现分歧，暗示后续降息空间有限。", impact: "high", tag: "央行" },
      { date: "09-22", title: "主动 QT 下曲线倒挂加深", detail: "Gilt 2s10s 负值扩大，反映增长与政策滞后压力，缩表持续回收流动性。", impact: "med", tag: "市场" },
    ],
    upcoming: [
      { date: "09-30", title: "Q2 GDP 终值", detail: "增长终值决定衰退风险定价，弱数据强化宽松预期。", impact: "med", tag: "数据" },
      { date: "10-01", title: "9月 PMI", detail: "服务业与制造业景气验证内需，影响英镑与 Gilt 走势。", impact: "med", tag: "数据" },
      { date: "10-02", title: "BoE 主动卖出国债节奏", detail: "关注 APF 缩表主动卖出规模，快于预期将抬升长端收益率。", impact: "low", tag: "央行" },
    ],
  },

  /* ============================== 瑞士 ============================== */
  CHF: {
    recent: [
      { date: "09-18", title: "SNB 季度政策评估按兵不动", detail: "瑞郎强势下 SNB 维持利率，保留外汇干预工具，SARON 与政策利率高度锚定。", impact: "high", tag: "央行" },
      { date: "09-23", title: "瑞郎走强，即期存款边际变动", detail: "避险资金流入推升瑞郎，SNB 即期存款或现边际投放痕迹。", impact: "med", tag: "市场" },
    ],
    upcoming: [
      { date: "09-29", title: "季度即期存款数据", detail: "观察 SNB 干预与流动性投放痕迹，是判断汇率政策意图的核心。", impact: "med", tag: "数据" },
      { date: "10-01", title: "通胀数据(关注负通胀)", detail: "瑞士通胀贴近零轴，若转负将加大 SNB 宽松与干预压力。", impact: "high", tag: "数据" },
    ],
  },

  /* ============================== 香港 ============================== */
  HKD: {
    recent: [
      { date: "09-22", title: "季结临近，总结余偏薄", detail: "季末资金需求上升，Aggregate Balance 维持偏薄水平，资金面波动加大。", impact: "med", tag: "市场" },
      { date: "09-23", title: "HIBOR 跟随 SOFR 上行", detail: "港美利差下 HIBOR 维持相对高位，套息交易压低总结余。", impact: "med", tag: "市场" },
    ],
    upcoming: [
      { date: "09-29", title: "港股季结相关资金流", detail: "指数季结换仓与衍生品结算带来脉冲式资金流动，关注总结余。", impact: "med", tag: "市场" },
      { date: "09-30", title: "月结/季结流动性检查", detail: "监管与银行体系季结流动性检视，关注贴现窗潜在使用。", impact: "low", tag: "风险" },
      { date: "10-01", title: "联系汇率区间检验", detail: "弱方/强方兑换保证附近的资金流，检验总结余与港息联动。", impact: "med", tag: "央行" },
    ],
  },

  /* ============================== 澳大利亚 ============================== */
  AUD: {
    recent: [
      { date: "09-16", title: "RBA 维持现金利率", detail: "澳洲联储按兵不动，声明重申依赖数据，限制性立场未变。", impact: "high", tag: "央行" },
      { date: "09-22", title: "银行批发融资成本边际上行", detail: "全球美元条件与 AGB 收益率牵引下，批发融资成本小幅抬升。", impact: "med", tag: "市场" },
    ],
    upcoming: [
      { date: "09-30", title: "8月月度 CPI", detail: "澳洲月度通胀指标，直接校准 RBA 路径与银行融资条件。", impact: "high", tag: "数据" },
      { date: "10-01", title: "7月零售销售", detail: "消费动能验证内需，弱数据缓和货币端压力。", impact: "med", tag: "数据" },
      { date: "10-02", title: "AGB 拍卖与海外融资", detail: "关注国债拍卖需求与离岸美元条件对批发融资成本的牵引。", impact: "low", tag: "供给" },
    ],
  },
};

export function getCountryEvents(code: string): CountryEvents | null {
  return (DATA as Record<string, CountryEvents>)[code] ?? null;
}
