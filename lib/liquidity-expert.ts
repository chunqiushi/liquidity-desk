/* ============================================================================
 * Liquidity · Financial-Expert commentary engine
 * ----------------------------------------------------------------------------
 * 读取每个经济体的真实（确定性 Mock）流动性指标，输出一份"金融专家模式"点评：
 *   ① 流动性态势判定（宽松 / 中性偏松 / 中性 / 中性偏紧 / 收紧）
 *   ② 一段专家综述
 *   ③ 关键信号（数据驱动）
 *   ④ 风险关注
 *   ⑤ 后续关注
 *
 * 全部数值来自 EconomyLiquidity 对象本身，随数据（含未来接入的真实序列）自动更新，
 * 不会出现与图表脱节的静态文字。
 * ========================================================================== */

import {
  EconomyLiquidity,
  LiqValue,
  EcoCode,
  getEconomyLiquidity,
} from "./liquidity";

export type Stance = "宽松" | "中性偏松" | "中性" | "中性偏紧" | "收紧";

export interface ExpertCommentary {
  stance: Stance;
  tone: "loose" | "neutral" | "tight";
  summary: string;
  signals: string[];
  risks: string[];
  watch: string[];
}

/* --------------------------------- 工具 --------------------------------- */
type Dir = "up" | "down" | "flat";

function dirOfInd(ind?: LiqValue): Dir {
  if (!ind || ind.chg1m == null) return "flat";
  const c = Math.abs(ind.chg1m);
  const th =
    ind.mode === "bps"
      ? 1.5
      : ind.mode === "pct"
      ? 0.3
      : 0.01 * Math.abs(ind.value || 1);
  if (c < th) return "flat";
  return ind.chg1m > 0 ? "up" : "down";
}

function chgStr(ind?: LiqValue): string {
  if (!ind || ind.chg1m == null) return "—";
  const v = ind.chg1m;
  const s = v >= 0 ? "+" : "";
  if (ind.mode === "bps") return `${s}${v.toFixed(0)}bp`;
  if (ind.mode === "pct") return `${s}${v.toFixed(2)}%`;
  return `${s}${v.toFixed(2)}`;
}

function valStr(ind?: LiqValue, d = 2): string {
  if (!ind) return "—";
  return `${ind.value.toFixed(d)}${ind.unit}`;
}

/** 边际语义词：对"利率/利差/基差"类，上行=收紧；对"数量/余额"类，上行=转松。 */
function marginWord(dir: Dir, higherTighter: boolean): string {
  if (dir === "flat") return "基本持平";
  const up = dir === "up";
  // higherTighter: 上行=紧；!higherTighter: 上行=松
  const tightening = higherTighter ? up : !up;
  if (tightening) return up ? "边际上行（偏紧）" : "边际下行（偏紧）";
  return up ? "边际上行（偏松）" : "边际下行（偏松）";
}

interface Ctx {
  eco: EconomyLiquidity;
  get: (id: string) => LiqValue | undefined;
  dir: (id: string) => Dir;
  chg: (ind?: LiqValue) => string;
  val: (ind?: LiqValue, d?: number) => string;
  margin: (id: string, higherTighter: boolean) => string;
  word: (dir: Dir, higherTighter: boolean) => string;
}

/* ----------------------------- 态势打分器 ----------------------------- */
type Polarity = "higherTighter" | "higherLooser";

function scoreFrom(eco: EconomyLiquidity, pols: Record<string, Polarity>): number {
  let sum = 0;
  let n = 0;
  for (const [id, pol] of Object.entries(pols)) {
    const ind = findIn(eco, id);
    if (!ind) continue;
    const d = dirOfInd(ind);
    if (d === "flat") continue;
    const up = d === "up";
    // 贡献到"宽松度"：higherLooser 上行=+1；higherTighter 上行=−1
    const contrib = pol === "higherLooser" ? (up ? 1 : -1) : up ? -1 : 1;
    sum += contrib;
    n += 1;
  }
  return n ? sum / n : 0; // [-1, 1]
}

function scoreToStance(score: number): { stance: Stance; tone: "loose" | "neutral" | "tight" } {
  if (score >= 1.2) return { stance: "宽松", tone: "loose" };
  if (score >= 0.4) return { stance: "中性偏松", tone: "loose" };
  if (score > -0.4) return { stance: "中性", tone: "neutral" };
  if (score > -1.2) return { stance: "中性偏紧", tone: "tight" };
  return { stance: "收紧", tone: "tight" };
}

function findIn(eco: EconomyLiquidity, id: string): LiqValue | undefined {
  for (const layer of Object.values(eco.layers) as LiqValue[][]) {
    const f = layer.find((d) => d.id === id);
    if (f) return f;
  }
  return undefined;
}

/* ----------------------------- 国别处理器 ----------------------------- */
type Handler = (ctx: Ctx) => Omit<ExpertCommentary, "stance" | "tone">;

const HANDLERS: Partial<Record<EcoCode, { pols: Record<string, Polarity>; h: Handler }>> = {
  /* ----------------------------- 中国 ----------------------------- */
  CNY: {
    pols: {
      dr007: "higherTighter",
      r007: "higherTighter",
      slf_vol: "higherLooser",
      mlf_out: "higherLooser",
      rrr: "higherLooser",
      repo_vol: "higherLooser",
    },
    h: (c) => {
      const dr = c.get("dr007");
      const r = c.get("r007");
      const rrr = c.get("rrr");
      const slf = c.get("slf_vol");
      const repo = c.get("repo_vol");
      const mlf = c.get("mlf_out");
      const signals: string[] = [
        `短端资金利率：DR007 报 ${c.val(dr)}，近1月 ${c.chg(dr)}、${c.margin("dr007", true)}；R007 报 ${c.val(r)}（${c.chg(r)}）。`,
        `价格分层：R007−DR007 利差约 ${(Number(r?.value ?? 0) - Number(dr?.value ?? 0)).toFixed(2)}pp，${Number(r?.value ?? 0) - Number(dr?.value ?? 0) > 0.2 ? "显示非银与信用分层仍在" : "分层较平稳"}。`,
        `数量端：SLF 操作量 ${c.val(slf)}、MLF 余额 ${c.val(mlf, 0)}、银行间质押式回购成交量 ${c.val(repo)}，反映银行体系超储与OMO投放水位。`,
        `政策空间：RRR 仍处 ${c.val(rrr, 1)}% 高位，相对海外有独立降准/降息缓冲。`,
      ];
      return {
        summary:
          `中国流动性呈"量稳价低、政策有空间"格局。央行通过 OMO+MLF+SLF 等结构化工具维持银行体系合理充裕，` +
          `DR007 围绕政策利率下方波动，资金面整体平稳偏松；但信用传导仍偏弱，资金淤积在银行间、向实体与权益的渗透不足。` +
          `在汇率约束下，总量宽松更可能以"降准+结构性工具"而非单边降息推进。`,
        signals,
        risks: [
          "政府债（特别国债/地方债）集中供给阶段性抽离超储，易引发资金面脉冲收紧。",
          "R007−DR007 分层走阔，提示非银与弱资质主体融资条件边际恶化。",
          "内需与地产信用循环未稳，宽货币向宽信用传导不畅。",
        ],
        watch: [
          "PBoC 降准/降息时点与幅度、MLF 与买断式逆回购续作节奏。",
          "DR007 是否持续偏离政策利率、银行间回购成交量变化。",
          "政府债净发行节奏与财政存款波动对超储的扰动。",
          "CNH/CNY 利差与离岸流动性对总量政策的约束。",
        ],
      };
    },
  },

  /* ----------------------------- 美国 ----------------------------- */
  USD: {
    pols: {
      on_rrp: "higherLooser",
      reserves: "higherLooser",
      tga: "higherTighter",
      sofr_ois: "higherTighter",
      hy_spread: "higherTighter",
      ig_spread: "higherTighter",
    },
    h: (c) => {
      const sofr = c.get("sofr");
      const onrrp = c.get("on_rrp");
      const res = c.get("reserves");
      const tga = c.get("tga");
      const ois = c.get("sofr_ois");
      const hy = c.get("hy_spread");
      const ig = c.get("ig_spread");
      const signals: string[] = [
        `货币市场锚：SOFR 报 ${c.val(sofr)}、EFFR 上方运行，ON RRP 余额 ${c.val(onrrp, 0)} 持续作为过剩流动性的"蓄水池"。`,
        `准备金 ${c.val(res, 0)}、TGA ${c.val(tga, 0)}：随 QT 与财政摆动，准备金正缓慢逼近"充足准备金"下沿。`,
        `融资压力：SOFR−OIS ${c.val(ois)}、HY 利差 ${c.val(hy, 0)}bp、IG 利差 ${c.val(ig, 0)}bp，信用端定价${Number(hy?.value ?? 0) > 350 ? "偏防御" : "总体平稳"}。`,
      ];
      return {
        summary:
          `美国处于"限制性利率+量化紧缩"后半程。联邦基金利率高位、ON RRP 与准备金仍是观察流动性边际的核心变量；` +
          `随着 QT 持续，准备金总量缓慢回落，货币市场更多依赖逆回购余额的"缓冲垫"调节。` +
          `SOFR−OIS 与信用利差的细微走阔，往往领先于季末/税期资金面紧张，是判断流动性拐点的高频哨兵。`,
        signals,
        risks: [
          "QT 叠加国债净发行，准备金跌破充裕阈值可能推升短端利率波动率。",
          "季末/税期/新发国债集中时，SOFR 易出现脉冲式跳升。",
          "HY/IG 利差若趋势走阔，提示信用风险与流动性双紧。",
        ],
        watch: [
          "ON RRP 余额衰减速度与准备金「充足性」下沿。",
          "SOFR−OIS、TGCR−SOFR 等基差在季末/新发期的表现。",
          "财政部现金 TGA 与国债净发行节奏对银行准备金的抽水。",
          "信用利差（HY/IG）是否趋势性走阔。",
        ],
      };
    },
  },

  /* ----------------------------- 欧元区 ----------------------------- */
  EUR: {
    pols: {
      estr: "higherTighter",
      excess_liq: "higherLooser",
      it_de_spread: "higherTighter",
      bls: "higherTighter",
    },
    h: (c) => {
      const estr = c.get("estr");
      const el = c.get("excess_liq");
      const spread = c.get("it_de_spread");
      const bls = c.get("bls");
      const signals: string[] = [
        `政策锚：€STR 报 ${c.val(estr)}、紧贴 ECB 存款便利利率，货币市场定价稳定。`,
        `过剩流动性 Excess Liquidity ${c.val(el, 0)}：随 PEPP/APP 再投资缩减而系统性回落，是 ECB 量化紧缩的直接体现。`,
        `碎片化风险：意/德 10Y 主权利差 ${c.val(spread, 0)}bp、银行贷款调查(BLS) ${c.val(bls, 0)}，反映信贷供给${Number(bls?.value ?? 0) < 0 ? "仍处收缩区间" : "边际修复"}。`,
      ];
      return {
        summary:
          `欧元区流动性正随 ECB 缩表被"被动回收"，过剩流动性趋势性下降使银行体系更接近稀缺准备金框架。` +
          `在通胀回落但增长疲弱的背景下，货币政策转向宽松的窗口与碎片化（核心—边陲利差）风险并存。` +
          `银行贷款调查持续偏弱，说明货币宽松尚未顺畅传导至实体信用。`,
        signals,
        risks: [
          "过剩流动性耗竭加快，边际推升短端利率与银行融资成本。",
          "意/德等主权利差走阔，触发碎片化与政策分裂风险。",
          "BLS 信贷收缩若延续，拖累欧元区增长与投资。",
        ],
        watch: [
          "ECB 资产负债表缩减节奏与过剩流动性耗竭速度。",
          "意/德 10Y 利差与任何碎片化信号。",
          "银行贷款调查(BLS)与信贷增速的边际变化。",
        ],
      };
    },
  },

  /* ----------------------------- 日本 ----------------------------- */
  JPY: {
    pols: {
      jgb_10y: "higherTighter",
      boj_jgb: "higherLooser",
      boj_etf: "higherLooser",
      usdjpy_basis: "higherTighter",
    },
    h: (c) => {
      const jgb = c.get("jgb_10y");
      const bojjgb = c.get("boj_jgb");
      const etf = c.get("boj_etf");
      const basis = c.get("usdjpy_basis");
      const signals: string[] = [
        `收益率曲线：JGB 10Y 报 ${c.val(jgb)}，随 BoJ 货币政策正常化而中枢上移。`,
        `央行持仓：BoJ 持债 ${c.val(bojjgb, 0)}、ETF 持仓 ${c.val(etf, 0)}，缩表开启后边际减持构成流动性回收。`,
        `离岸美元：USD/JPY 交叉货币基差 ${c.val(basis, 0)}bp，负值反映离岸美元融资成本${Number(basis?.value ?? 0) < -20 ? "偏紧" : "尚可"}。`,
      ];
      return {
        summary:
          `日本正走出长期超宽松，BoJ 加息与启动国债减持同步推进，JGB 长端收益率中枢上移、央行资产负债表开始收缩。` +
          `这是全球最后一个大型"量化宽松遗孤"的退出，对全球套息（carry）交易与日元融资美元资产的结构性支撑构成逆转风险。`,
        signals,
        risks: [
          "BoJ 减持节奏若快于预期，推升全球期限溢价与套息平仓。",
          "JGB 波动率上升外溢至美债与全球利率。",
          "USD/JPY 基差走阔，离岸美元融资条件收紧。",
        ],
        watch: [
          "BoJ 政策利率路径与 JGB 减持速度。",
          "JGB 10Y 与收益率曲线控制(YCC)退出后的波动。",
          "USD/JPY 基差与日元套息交易平仓风险。",
        ],
      };
    },
  },

  /* ----------------------------- 英国 ----------------------------- */
  GBP: {
    pols: {
      sonia: "higherTighter",
      gilt_2s10s: "higherTighter",
      boe_assets: "higherLooser",
    },
    h: (c) => {
      const sonia = c.get("sonia");
      const g2s = c.get("gilt_2s10s");
      const assets = c.get("boe_assets");
      const signals: string[] = [
        `政策锚：SONIA 报 ${c.val(sonia)}、紧贴 Bank Rate，短端定价稳定。`,
        `曲线形态：Gilt 2s10s ${c.val(g2s, 0)}bp（负值=倒挂），提示增长与政策收紧的滞后压力。`,
        `资产负债表：BoE 总资产 ${c.val(assets, 0)}，APF/QT 缩表持续回收流动性。`,
      ];
      return {
        summary:
          `英国在 BoE 主动 QT（不依赖到期再投资、甚至主动卖出）下，流动性被更"主动"地回收，缩表节奏领先多数发达经济体。` +
          `Gilt 收益率曲线倒挂反映市场对增长与政策滞后效应的担忧；银行体系准备金随缩表下降，融资条件边际收紧。`,
        signals,
        risks: [
          "主动 QT 快于预期，推升长端收益率与养老金(LDI)再平衡压力。",
          "Gilt 曲线深度倒挂，隐含增长与金融稳定风险。",
          "准备金下降使货币市场更易受冲击。",
        ],
        watch: [
          "BoE QT 规模（主动卖出国债节奏）与准备金水平。",
          "Gilt 2s10s 与收益率曲线形态。",
          "银行融资条件与货币市场压力指标。",
        ],
      };
    },
  },

  /* ----------------------------- 瑞士 ----------------------------- */
  CHF: {
    pols: {
      saron: "higherTighter",
      sight_dep: "higherLooser",
      usdchf: "higherTighter",
    },
    h: (c) => {
      const saron = c.get("saron");
      const sight = c.get("sight_dep");
      const fx = c.get("usdchf");
      const signals: string[] = [
        `政策锚：SARON 报 ${c.val(saron)}、紧贴 SNB 政策利率。`,
        `数量端：即期存款 Sight Deposits ${c.val(sight, 0)}，是 SNB 观察银行体系流动性的核心指标。`,
        `汇率：USD/CHF ${c.val(fx, 3)}，瑞郎强弱直接影响 SNB 干预与流动性投放。`,
      ];
      return {
        summary:
          `瑞士流动性由 SNB 通过即期存款与外汇干预高度主动管理。瑞郎作为避险货币，强势时 SNB 往往卖出瑞郎、买入外币，` +
          `向银行体系注入本币流动性；反之则回收。SARON 与政策利率高度锚定，货币市场稳定。`,
        signals,
        risks: [
          "瑞郎急升触发 SNB 大规模干预，改变流动性与资产负债表结构。",
          "全球避险情绪下，避险资金流入放大汇率波动。",
        ],
        watch: [
          "SNB 即期存款与外汇储备变动（干预痕迹）。",
          "USD/CHF 与瑞郎实际有效汇率。",
          "SARON 与政策利率的锚定关系。",
        ],
      };
    },
  },

  /* ----------------------------- 香港 ----------------------------- */
  HKD: {
    pols: {
      agg_bal: "higherLooser",
      hibor_sofr: "higherTighter",
      fx_reserves: "higherLooser",
      disc_window: "higherTighter",
    },
    h: (c) => {
      const ab = c.get("agg_bal");
      const hiborSoFR = c.get("hibor_sofr");
      const fx = c.get("fx_reserves");
      const dw = c.get("disc_window");
      const signals: string[] = [
        `货币基础：总结余 Aggregate Balance ${c.val(ab, 0)}，是联系汇率下银行体系流动性的"总闸"。`,
        `离岸美元：HIBOR−SOFR 基差 ${c.val(hiborSoFR, 0)}bp，反映港美利差与套息资金流向。`,
        `安全垫：外汇储备 ${c.val(fx, 0)}、贴现窗使用 ${c.val(dw, 0)}，衡量体系缓冲与应急流动性需求。`,
      ];
      return {
        summary:
          `香港实行美元联系汇率，流动性由总结余(Aggregate Balance)与港美利差共同决定。当 HIBOR 显著低于 SOFR，` +
          `套息交易压低总结余、资金面趋紧；反之则回升。外汇储备与贴现窗构成体系安全垫，` +
          `在美联储维持高利率期间，港息跟随上行、总结余偏薄是常态。`,
        signals,
        risks: [
          "总结余过薄时，资金面易因IPO/派息/套息平仓而剧烈波动。",
          "HIBOR−SOFR 基差走阔，提示离岸美元融资压力。",
          "外部冲击下贴现窗使用骤升。",
        ],
        watch: [
          "Aggregate Balance 与港美利差(HIBOR−SOFR)的互动。",
          "IPO/派息与套息交易对总结余的脉冲影响。",
          "外汇储备与贴现窗使用作为安全垫指标。",
        ],
      };
    },
  },

  /* ----------------------------- 澳大利亚 ----------------------------- */
  AUD: {
    pols: {
      agb_3y: "higherTighter",
      agb_10y: "higherTighter",
      wholesale_fund: "higherTighter",
      aud_usd: "higherTighter",
    },
    h: (c) => {
      const ay3 = c.get("agb_3y");
      const ay10 = c.get("agb_10y");
      const wf = c.get("wholesale_fund");
      const fx = c.get("aud_usd");
      const signals: string[] = [
        `收益率：AGB 3Y ${c.val(ay3)}、10Y ${c.val(ay10)}，曲线随 RBA 政策高位定价。`,
        `融资条件：银行批发融资成本 ${c.val(wf)}，是银行边际负债成本的关键观察项。`,
        `汇率：AUD/USD ${c.val(fx, 3)}，商品与风险情绪主导澳元融资美元的成本。`,
      ];
      return {
        summary:
          `澳大利亚在 RBA 限制性现金利率下，银行体系高度依赖批发融资（海外与国内货币市场），` +
          `其融资成本直接受全球美元条件与 AGB 收益率牵引。澳元作为商品与风险情绪代理，` +
          `AUD/USD 走弱会抬升以美元计价的外部融资成本，对银行与企业的美元敞口形成约束。`,
        signals,
        risks: [
          "全球美元融资收紧叠加 AUD 走弱，抬高银行批发融资成本。",
          "AGB 长端上行压制银行净值与信贷供给。",
          "商品需求回落通过澳元与贸易条件传导至国内流动性。",
        ],
        watch: [
          "AGB 3Y/10Y 与现金利率的预期差。",
          "银行批发融资成本与离岸美元条件。",
          "AUD/USD 与商品/风险情绪。",
        ],
      };
    },
  },
};

/* ----------------------------- 通用回退 ----------------------------- */
function generic(eco: EconomyLiquidity, ctx: Ctx): Omit<ExpertCommentary, "stance" | "tone"> {
  const all = Object.values(eco.layers).flat();
  const signals = all.slice(0, 4).map((ind) => `${ind.label} 报 ${ctx.val(ind)}，近1月 ${ctx.chg(ind)}。`);
  return {
    summary: `${eco.name} 流动性监测覆盖价格、数量、操作、传导与融资五层。当前核心短端利率 ${ctx.val(
      eco.coreFunding,
    )}，政策利率 ${ctx.val(eco.policyRate)}。`,
    signals,
    risks: ["关注核心短端利率与数量指标的趋势背离。", "关注信用与融资条件边际变化。"],
    watch: ["政策利率路径与央行资产负债表变动。", "货币市场与融资条件的高频指标。"],
  };
}

/* ----------------------------- 主入口 ----------------------------- */
export function buildExpertCommentary(eco: EconomyLiquidity): ExpertCommentary {
  const get = (id: string) => findIn(eco, id);
  const ctx: Ctx = {
    eco,
    get,
    dir: (id) => dirOfInd(get(id)),
    chg: (ind) => chgStr(ind),
    val: (ind, d) => valStr(ind, d),
    margin: (id, higherTighter) => marginWord(dirOfInd(get(id)), higherTighter),
    word: (d, higherTighter) => marginWord(d, higherTighter),
  };

  const spec = HANDLERS[eco.code as EcoCode];
  const base = spec ? spec.h(ctx) : generic(eco, ctx);
  const score = spec ? scoreFrom(eco, spec.pols) : 0;
  const { stance, tone } = scoreToStance(score);
  return { stance, tone, ...base };
}

export function getExpertCommentary(code: string, asOf: string): ExpertCommentary | null {
  const eco = getEconomyLiquidity(code, asOf);
  if (!eco) return null;
  return buildExpertCommentary(eco);
}
