// 利率债复盘数据（Wind 万得提取）
// 时间范围：2026-09-22 至 2026-09-29（最近 5 个交易日；09-25 中秋节休市）
// 主标的：10Y 国债活跃券收益率；辅标的：10Y 国开活跃券收益率；资金指标：DR007、GC007

export const BOND_ASOF = "2026-09-29";
export const BOND_START = "2026-09-22";

// 交易日（5 个）；09-29 为报告日盘中
export const BOND_DATES = ["09-22", "09-23", "09-24", "09-28", "09-29"] as const;

// 10Y 国债活跃券收盘到期收益率 (%)
export const GZ = [1.672, 1.671, 1.67, 1.6715, 1.6715];
// 10Y 国开活跃券收盘到期收益率 (%)
export const GK = [1.7585, 1.7555, 1.753, 1.753, 1.753];
// DR007 存款类机构质押式回购加权利率 7天 (%)
export const DR = [1.3841, 1.3841, 1.3946, 1.3911, 1.39];
// GC007 交易所 7 天回购利率 (%)
export const GC = [1.446, 1.465, 1.472, 1.474, 1.474];

// 较前交易日变化 (bp)，null = 盘中 / 无前值参考
export const dGZ: (number | null)[] = [-0.55, -0.1, -0.1, 0.15, null];
export const dGK: (number | null)[] = [null, -0.3, -0.25, 0.0, null];
export const dDR: (number | null)[] = [-1.12, 0.0, 1.05, -0.35, 0.0];
export const dGC: (number | null)[] = [null, 1.9, 0.7, 0.2, 0.0];

export type EventType = "policy" | "anomaly";

export interface BondEvent {
  idx: number; // 对应 BOND_DATES 索引
  date: string;
  type: EventType;
  title: string;
  detail: string;
  source: string;
}

// 事件标注：policy = 政策/央行操作/宏观数据（黑字语义）；anomaly = 市场异动（红字语义）
export const BOND_EVENTS: BondEvent[] = [
  {
    idx: 0,
    date: "09-22",
    type: "policy",
    title: "逆回购净投放 350 亿 · 公积金贷款利率下调",
    detail:
      "央行 7D 逆回购净投放 350 亿，资金面维持宽松；公积金贷款利率下调、MPA 久期监管预期升温，配置盘强势。",
    source: "Wind · 央行公开市场交易公告 / 固收早参",
  },
  {
    idx: 1,
    date: "09-23",
    type: "policy",
    title: "隔夜逆回购上限提至 1 万亿 · MLF 加量 2000 亿",
    detail:
      "央行公告 9/28–10/8 开展隔夜逆回购、单日上限提至 1 万亿；MLF 加量续作 2000 亿，跨季跨节呵护信号明确。",
    source: "Wind · 央行公告",
  },
  {
    idx: 2,
    date: "09-24",
    type: "anomaly",
    title: "权益大跌 · 股债跷板",
    detail:
      "A 股大幅调整，股债跷板突出，收益率明显下行；30Y 国债下破 2.1% 创年内新低。",
    source: "Wind · 债市复盘 / 权益市场",
  },
  {
    idx: 2,
    date: "09-24",
    type: "policy",
    title: "货政委三季度例会",
    detail:
      "延续适度宽松基调，提及「关注长债收益率变化」，尾盘收益率小幅回调。",
    source: "Wind · 货币政策委员会例会通稿",
  },
  {
    idx: 3,
    date: "09-28",
    type: "anomaly",
    title: "债市回调 · 长端上行",
    detail:
      "前期抢跑后止盈兑现，长端普遍上行，30Y 国债日内最大调整近 2bp（“风雨骤至”）。",
    source: "Wind · 债市复盘",
  },
  {
    idx: 4,
    date: "09-29",
    type: "policy",
    title: "国常会：加大宏观政策逆周期调节力度",
    detail:
      "稳增长信号释放，长端或延续调整；但央行跨季呵护明确，大幅上行风险可控。",
    source: "Wind · 国务院常务会议",
  },
];

export interface DailyReview {
  date: string;
  intraday?: boolean;
  dr: number;
  drChg: number | null;
  gc: number;
  gcChg: number | null;
  gz: number;
  gzChg: number | null;
  gk: number;
  gkChg: number | null;
  fundText: string;
  rateText: string;
  judgeText: string;
}

// 按日复盘（交易日倒序，5 行）
export const DAILY: DailyReview[] = [
  {
    date: "09-29",
    intraday: true,
    dr: 1.39,
    drChg: 0.0,
    gc: 1.474,
    gcChg: 0.0,
    gz: 1.6715,
    gzChg: null,
    gk: 1.753,
    gkChg: null,
    fundText:
      "央行开展 7D 逆回购 1390 亿、14D 3000 亿、隔夜 6610 亿；当日净回笼 1603 亿（含 6000 亿逆回购 + 6000 亿 MLF 到期）。DR007 盘中最低 1.3794%、午后持稳 1.39% 一线，资金面整体均衡。",
    rateText:
      "截至发稿，10Y 国债活跃券参考前收 1.6715% 附近震荡；国常会部署“加大宏观政策逆周期调节力度”，稳增长信号释放，长端或延续调整。",
    judgeText:
      "国常会稳增长定调 + 前期抢跑止盈，节前最后交易日长端面临调整压力；但央行跨季跨节呵护明确（隔夜逆回购上限 1 万亿），大幅上行风险可控，建议防守观望。",
  },
  {
    date: "09-28",
    dr: 1.3911,
    drChg: -0.35,
    gc: 1.474,
    gcChg: 0.2,
    gz: 1.6715,
    gzChg: 0.15,
    gk: 1.753,
    gkChg: 0.0,
    fundText:
      "央行开展隔夜逆回购跨季跨节操作，资金面均衡宽松，DR007 下行 0.35bp 至 1.3911%，GC007 微升 0.2bp 至 1.474%，机构持券过节需求支撑。",
    rateText:
      "10Y 国债活跃券收 1.6715%（+0.15bp），10Y 国开收 1.7530%（持平）。早盘 10Y 于 1.667% 附近，后震荡上行至 1.672–1.673%；长端普遍上行，30Y 国债日内最大调整近 2bp，“风雨骤至”显示止盈压力。",
    judgeText:
      "前期抢跑后止盈兑现，长端自高位回落；央行跨季呵护下资金无忧，但交易盘主导、超长端波动加大，节前或维持高位震荡。",
  },
  {
    date: "09-24",
    dr: 1.3946,
    drChg: 1.05,
    gc: 1.472,
    gcChg: 0.7,
    gz: 1.67,
    gzChg: -0.1,
    gk: 1.753,
    gkChg: -0.25,
    fundText:
      "央行 OMO+MLF 合计净投放 6895 亿（7D 逆回购 515 亿 + MLF 8000 亿），DR007 升 1.05bp 至 1.3946%，GC007 升 0.7bp 至 1.472%，资金面均衡偏松。",
    rateText:
      "10Y 国债活跃券收 1.6700%（−0.10bp），10Y 国开收 1.7530%（−0.25bp）。海外避险情绪升温、A 股大幅调整，股债跷板突出，收益率明显下行，30Y 国债下破 2.1% 创年内新低；尾盘货政委三季度例会提及“关注长债收益率变化”，收益率小幅回调。",
    judgeText:
      "权益大跌 + 宽松资金驱动债市走强，超长端领涨；但政策对长端关注的表述令尾盘止盈，曲线牛平、期限利差压缩。",
  },
  {
    date: "09-23",
    dr: 1.3841,
    drChg: 0.0,
    gc: 1.465,
    gcChg: 1.9,
    gz: 1.671,
    gzChg: -0.1,
    gk: 1.7555,
    gkChg: -0.3,
    fundText:
      "央行 7D 逆回购净回笼 1020 亿，资金面均衡，DR007 持平 1.3841%，GC007 升 1.9bp 至 1.465%。",
    rateText:
      "10Y 国债活跃券收 1.6710%（−0.10bp），10Y 国开收 1.7555%（−0.30bp）。日内窄幅震荡，尾盘央行公告 9/28–10/8 开展隔夜逆回购、上限提至 1 万亿、MLF 加量 2000 亿，做多情绪升温，收益率快速回落。",
    judgeText:
      "季末扰动 + 止盈致早盘小幅上行，但央行跨季呵护信号明确，长端超长端走强，曲线牛平。",
  },
  {
    date: "09-22",
    dr: 1.3841,
    drChg: -1.12,
    gc: 1.446,
    gcChg: null,
    gz: 1.672,
    gzChg: -0.55,
    gk: 1.7585,
    gkChg: null,
    fundText:
      "央行 7D 逆回购净投放 350 亿，资金面维持宽松，DR007 下行 1.12bp 至 1.3841%，GC007 1.446%；税期后资金平稳。",
    rateText:
      "10Y 国债活跃券收 1.6720%（较 9/21 −0.55bp），10Y 国开收 1.7585%。盘初 1.677%，受公积金贷款利率下调及 MPA 久期监管预期升温、机构配置盘强势带动，国债期货走强，收益率下探 1.668% 附近，尾盘止盈回升；超长端表现最强。",
    judgeText:
      "宽松资金 + 配置需求支撑，TL 期货上涨带动超长端，曲线平坦化初期，做多情绪偏强但需警惕止盈。",
  },
];
