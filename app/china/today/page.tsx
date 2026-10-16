"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import {
  Sparkles,
  CalendarClock,
  Landmark,
  Activity,
  ArrowRight,
  Banknote,
  Layers,
  BarChart3,
} from "lucide-react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ===================================================================
 * 数据来源：Wind（万得）EDB / 新闻接口，经 Wind Alice 实时整合抓取。
 * 数据截至 2026-09-29（周二）收盘；部分指标更新至 2026-09-30。
 * 本页为「研究快照」，非实时行情，不构成投资建议。
 * =================================================================== */

const AS_OF = "2026-09-29";
const AS_OF_LABEL = "2026-09-29（周二）收盘";
const GEN_DATE = "2026-09-29";

/* ----------------------------- 利率序列（DR / R 系列） ----------------------------- */
const DR_DATES = [
  "09-01", "09-02", "09-03", "09-04", "09-07", "09-08", "09-09", "09-10", "09-11",
  "09-14", "09-15", "09-16", "09-17", "09-18", "09-20", "09-21", "09-22", "09-23", "09-24",
];
const DR001 = [1.3576, 1.3594, 1.3542, 1.3593, 1.3701, 1.3665, 1.3736, 1.4079, 1.4206, 1.4145, 1.4266, 1.45, 1.4728, 1.4277, 1.3596, 1.3627, 1.3611, 1.364, 1.3592];
const DR007 = [1.3841, 1.3738, 1.3704, 1.3726, 1.3774, 1.3815, 1.3939, 1.4113, 1.4232, 1.4147, 1.4244, 1.4369, 1.4512, 1.4396, 1.3993, 1.3953, 1.3841, 1.3841, 1.3946];
const R007 = [1.4113, 1.4103, 1.4064, 1.4027, 1.4043, 1.4088, 1.4133, 1.4289, 1.4193, 1.4215, 1.4324, 1.4429, 1.4564, 1.4692, 1.4071, 1.4329, 1.423, 1.4303, 1.4263];
// 交易所回购（R007，上交所口径）用于刻画结构性分层
const SSE_R007 = [1.631, 1.614, 1.597, 1.632, 1.587, 1.595, 1.618, 1.616, 1.64, 1.621, 1.597, 1.61, 1.648, 1.734, 1.82, 1.729, 1.754, 1.688];

/* ----------------------------- 央行公开市场操作净投放（亿元，日频 A4087688） ----------------------------- */
const OMO_DATES = DR_DATES;
const OMO_NET = [-4690, -5985, -1030, -200, -45, -40, 0, 30, 40, 35, 5920, 1130, 1590, -407, 320, 1650, 350, -1020, -1105];

/* ----------------------------- 地方政府债净融资（亿元，日频 J9455629） ----------------------------- */
const LGB_DATES = [
  "09-01", "09-02", "09-03", "09-04", "09-05", "09-06", "09-07", "09-08", "09-09", "09-10",
  "09-11", "09-12", "09-13", "09-14", "09-15", "09-16", "09-17", "09-18", "09-19", "09-20",
  "09-21", "09-22", "09-23", "09-24", "09-25",
];
const LGB_NET = [-72.3, -196.8, 464.63, 121.38, 0, 0, 566.83, -23.46, -55.73, 354.5, 399.39, 0, 0, 31.46, -402.87, 116.39, 622.07, 908.32, 0, -29.31, 312.41, 588.19, 931.95, 266.59, 0];

/* ----------------------------- 关键快照值 ----------------------------- */
const SNAP = {
  dr001: 1.3592,
  dr007: 1.3946,
  r001: 1.3792,
  r007: 1.4263,
  rdSpread: 1.4263 - 1.3946, // bp
  ncd1yAaa: 1.4846, // 中债 1Y AAA 到期收益率（二级）
  ncd1yPrimary: "1.485%–1.495%", // 国股行 1Y 发行利率（新闻）
  omoWeekTo0918: 8268, // 截至 9/18 当周净投放
  omoLast4d: -125, // 9/21-9/24 净投放（地量回笼）
  mlfSep: 8000,
  mlfPrior: 5000,
  lgbWeek: 2977, // 9/18-9/25 地方债净融资
  sseR007Peak: 1.82, // 9/21
};

/* ===================================================================
 * 内联 SVG 图表（规避 recharts 在静态导出下的潜在问题；纯 SVG 自渲染）
 * =================================================================== */

function LineChartMulti({
  series,
  labels,
  height = 230,
  unit = "%",
  yMin,
  yMax,
}: {
  series: { name: string; color: string; values: number[] }[];
  labels: string[];
  height?: number;
  unit?: string;
  yMin?: number;
  yMax?: number;
}) {
  const W = 680;
  const H = height;
  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const ns = labels.length;
  const all = series.flatMap((s) => s.values);
  const lo = yMin ?? Math.floor(Math.min(...all) * 100) / 100 - 0.01;
  const hi = yMax ?? Math.ceil(Math.max(...all) * 100) / 100 + 0.01;
  const span = hi - lo || 1;
  const X = (i: number) => padL + (ns <= 1 ? 0 : (i / (ns - 1)) * innerW);
  const Y = (v: number) => padT + (1 - (v - lo) / span) * innerH;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {Array.from({ length: ticks + 1 }, (_, t) => {
        const v = lo + (span * t) / ticks;
        const y = Y(v);
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgb(var(--border))" strokeDasharray="2 3" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {series.map((s) => {
        const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
        return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth={1.6} />;
      })}
      {labels.map((lab, i) =>
        i % 3 === 0 ? (
          <text key={i} x={X(i)} y={H - 9} textAnchor="middle" fontSize={8.5} fill="rgb(var(--text-muted))">
            {lab}
          </text>
        ) : null,
      )}
      <text x={padL} y={11} fontSize={9} fill="rgb(var(--text-muted))">
        {unit}
      </text>
      <g transform={`translate(${W - padR + 4}, ${padT})`}>
        {series.map((s, i) => (
          <g key={s.name} transform={`translate(0, ${i * 14})`}>
            <rect width={8} height={3} y={-3} fill={s.color} />
            <text x={12} y={0} fontSize={9} fill="rgb(var(--text))">
              {s.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function BarChartDiverging({
  values,
  labels,
  height = 210,
  unit = "亿元",
  posColor = "#34D399",
  negColor = "#F87171",
  labelEvery = 3,
}: {
  values: number[];
  labels: string[];
  height?: number;
  unit?: string;
  posColor?: string;
  negColor?: string;
  labelEvery?: number;
}) {
  const W = 680;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const X = (i: number) => padL + (values.length <= 1 ? 0 : (i / (values.length - 1)) * innerW);
  const Y = (v: number) => padT + (1 - (v - lo) / span) * innerH;
  const zeroY = Y(0);
  const bw = Math.max(2, (innerW / values.length) * 0.62);
  const ticks = [lo, 0, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)} stroke="rgb(var(--border))" strokeDasharray="2 3" />
          <text x={padL - 6} y={Y(v) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
            {v >= 0 ? "+" : ""}
            {Math.round(v)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const x = X(i) - bw / 2;
        const y = v >= 0 ? Y(v) : zeroY;
        const h = Math.abs(Y(v) - zeroY);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw}
            height={Math.max(0.5, h)}
            fill={v >= 0 ? posColor : negColor}
            opacity={0.82}
          />
        );
      })}
      {labels.map((lab, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={X(i)} y={H - 9} textAnchor="middle" fontSize={8.5} fill="rgb(var(--text-muted))">
            {lab}
          </text>
        ) : null,
      )}
      <text x={padL} y={9} fontSize={9} fill="rgb(var(--text-muted))">
        {unit}
      </text>
    </svg>
  );
}

/* ===================================================================
 * 区块组件
 * =================================================================== */

function MetricStrip() {
  const items = [
    { label: "DR001", value: SNAP.dr001.toFixed(4), unit: "%", sub: "较前日 -0.48bp", tone: "neutral" as const, accent: "#38BDF8" },
    { label: "DR007", value: SNAP.dr007.toFixed(4), unit: "%", sub: "较前日 +1.05bp", tone: "neutral" as const, accent: "#34D399" },
    { label: "R007（银行间）", value: SNAP.r007.toFixed(4), unit: "%", sub: "较前日 -0.40bp", tone: "neutral" as const, accent: "#FBBF24" },
    { label: "R007−DR007 利差", value: SNAP.rdSpread.toFixed(1), unit: "bp", sub: "极窄 · 流动性充裕", tone: "pos" as const },
    { label: "OMO 净投放（周·至9/18）", value: "+" + SNAP.omoWeekTo0918.toLocaleString(), unit: "亿", sub: "近4日(9/21-24) -125亿", tone: "pos" as const },
    { label: "MLF（9月）", value: SNAP.mlfSep.toLocaleString(), unit: "亿", sub: `前月 ${SNAP.mlfPrior.toLocaleString()}亿`, tone: "accent" as const },
    { label: "NCD 1Y AAA（二级）", value: SNAP.ncd1yAaa.toFixed(4), unit: "%", sub: `一级 ${SNAP.ncd1yPrimary}`, tone: "neutral" as const },
    { label: "地方债净融资（周·9/18-25）", value: "+" + SNAP.lgbWeek.toLocaleString(), unit: "亿", sub: "持续为正 · 供给偏强", tone: "pos" as const },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted leading-tight">{it.label}</span>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: it.accent ?? "rgb(var(--accent))" }} />
          </div>
          <div className="mt-1 text-xl font-semibold tnum">
            {it.value}
            <span className="text-2xs text-muted ml-1">{it.unit}</span>
          </div>
          <div className={cn("text-2xs tnum mt-0.5", it.tone === "pos" ? "text-pos" : it.tone === "accent" ? "text-accent" : "text-muted")}>
            {it.sub}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AliceSummary() {
  return (
    <Card className="overflow-hidden">
      <CardHead
        title="货币总结 · 由 Wind Alice 实时整合生成"
        subtitle="整合央行公开市场操作、财政债券发行与到期、银行间 DR/R 利率、同业存单一二级表现，并刻画大行与主要城商行交易行为"
        right={<Badge tone="pos">真实数据 · Wind Alice</Badge>}
      />
      <div className="p-4 space-y-4 text-xs leading-relaxed text-content/90">
        {/* 一、流动性供需总览 */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-accent/10 text-accent">一</span>
            <h3 className="text-sm font-semibold text-content">流动性供需总览：央行「收短放长」，财政债供给放量</h3>
          </div>
          <ul className="space-y-1.5 list-disc pl-5 text-muted">
            <li>
              央行公开市场 9 月节奏呈「月初大额净回笼 → 税期前大额对冲 → 近期地量回笼」：周度净投放 9/4 当周
              <b className="text-content"> -14,115 亿</b>、9/11 当周 <b className="text-content">-15 亿</b>、9/18 当周
              <b className="text-pos"> +8,268 亿</b>（受 9/15 单日 +5,920 亿带动）；最近 4 个交易日（9/21–9/24）小幅净回笼约
              <b className="text-neg"> -125 亿</b>，7 天 OMO 利率维持 <b className="text-content">1.40%</b> 不变。
            </li>
            <li>
              中期流动性明显加量：9 月 MLF 投放 <b className="text-accent">8,000 亿</b>（前月 5,000 亿）；并搭配 14 天逆回购「提前跨季」、3M 买断式逆回购等量续作（9/14–17 重启隔夜逆回购护航税期），体现「收短放长、精准削峰填谷」。
            </li>
            <li>
              财政债券供给偏强：地方政府债净融资日频持续为正，9/18–9/25 当周净融资约
              <b className="text-pos"> +2,977 亿</b>；9 月政府债净融资预估逾 <b className="text-content">1.2 万亿</b>（较 8 月 +1,500 亿），周度净缴款 9/14–18 约 6,330 亿、9/21 当周约 5,472 亿，对资金面扰动仍大。
            </li>
          </ul>
        </section>

        {/* 二、市场定价动态 */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-accent/10 text-accent">二</span>
            <h3 className="text-sm font-semibold text-content">市场定价动态：资金利率平稳，存单一二级温和</h3>
          </div>
          <ul className="space-y-1.5 list-disc pl-5 text-muted">
            <li>
              关键利率（9/24 收盘）：DR001 <b className="text-content">1.3592%</b>、DR007 <b className="text-content">1.3946%</b>、R001
              <b className="text-content"> 1.3792%</b>、R007（银行间）<b className="text-content"> 1.4263%</b>。9 月走势先松后税期小升、再回落：DR007 月中税期一度冲高至 1.45%，当前回到 1.39% 一线。
            </li>
            <li>
              <b className="text-content">R007−DR007 利差仅约 3.2bp</b>，处于极窄区间，反映银行体系资金总体充裕、非银结构性摩擦不大；但交易所回购（R007，上交所口径）在 9/21 一度升至
              <b className="text-neg"> 1.82%</b>（9/24 回落至 1.69%），显示跨季与税期下的分层，尚未向银行间传导。
            </li>
            <li>
              同业存单：二级 1Y AAA 到期收益率 <b className="text-content">1.4846%</b>（9/24），9 月围绕 1.48%–1.49% 窄幅震荡；一级国股行 1Y 发行利率约
              <b className="text-content"> 1.485%–1.495%</b>，周初提价后发行放量、略高于二级，发行端偏积极。本周（截至 9/19）NCD 净融资 2,081 亿、环比增加，下周（9/21 后）到期约 5,995 亿，滚续压力不低。
            </li>
          </ul>
        </section>

        {/* 三、大行与城商行交易行为 */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-accent/10 text-accent">三</span>
            <h3 className="text-sm font-semibold text-content">大行与主要城商行交易行为：融出结构分化</h3>
          </div>
          <ul className="space-y-1.5 list-disc pl-5 text-muted">
            <li>
              银行体系日均净融出 9/7–11 当周 <b className="text-content">4.37 万亿</b>（较前周 +746 亿），但结构分化：大行日均净融出由
              <b className="text-content"> 3.71 万亿降至 3.58 万亿</b>、周内缩至 3.24 万亿；非大行（城商、农商等）由 5,784 亿升至
              <b className="text-content"> 7,880 亿</b>，成为支撑融出的主要力量。
            </li>
            <li>
              大行「防御性缩表」：9/7–13 受缴准缴税影响，大行融出自 3 万亿高位回落至 2.6 万亿，资金面由宽松转均衡偏紧、隔夜利率抬升；同期大行存单净融资由 850 亿升至
              <b className="text-content"> 1,809 亿</b>、发行价稳于 1.48%–1.49%，指向大行季末主动补负债、减少融出。
            </li>
            <li>
              主要城商行 / 非大行融出上升承接了部分供给，但稳定性弱于大行；其存单配置需求对价格高度敏感，提价到位时买盘迅速涌入、提价放缓则交投转淡，显示长端上行主要由一级提价成本推动、而非需求主动拉动。
            </li>
          </ul>
        </section>

        {/* 四、研判与预期 */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-accent/10 text-accent">四</span>
            <h3 className="text-sm font-semibold text-content">资金面研判与流动性预期</h3>
          </div>
          <ul className="space-y-1.5 list-disc pl-5 text-muted">
            <li>
              9 月节奏：月初宽松 → 税期（9/15–17）扰动、利率小升 → 央行护航后回落 → 季末多重扰动下边际转紧、波动加大。央行呵护态度明确，资金面
              <b className="text-content"> 不具备持续收紧基础</b>。
            </li>
            <li>
              季末（9 月底）关注：政府债发行提速（周净缴款 5,000 亿+）、MLF <b className="text-content">6,000 亿 9/28 到期</b>、3M 国库现金定存 1,800 亿 9/22 到期、双节取现、信贷大月派生存款缴准、北交所新股冻结（9/21 宇特光电冻结 1.05–1.1 万亿）。
            </li>
            <li>
              预期区间：DR001 围绕 <b className="text-content">1.33%–1.40%</b>、DR007 围绕 <b className="text-content">1.38%–1.45%</b>；1Y AAA 存单二级在 <b className="text-content">1.48%–1.50%</b> 震荡。<b className="text-content">大行融出稳定性</b>与存单一级提价是核心观测信号。
            </li>
            <li>
              对金融机构建议：季末前适度拉长负债久期、提前安排跨季头寸；紧盯大行净融出修复节奏与存单发行利率，灵活摆布杠杆与期限。
            </li>
          </ul>
        </section>
      </div>
    </Card>
  );
}

function BankBehaviorTable() {
  const rows = [
    { who: "大行", v: "3.58 万亿", note: "日均净融出，由 3.71→3.58 缩量", tone: "warn" as const },
    { who: "非大行（城商/农商等）", v: "7,880 亿", note: "日均净融出，由 5,784→7,880 上升", tone: "pos" as const },
    { who: "银行体系合计", v: "4.37 万亿", note: "9/7–11 当周日均，较前周 +746 亿", tone: "neutral" as const },
    { who: "大行存单净融资", v: "1,809 亿", note: "9/7–11 当周，由 850→1,809 上升", tone: "warn" as const },
  ];
  return (
    <Card>
      <CardHead title="大行 vs 主要城商行 · 融出与存单" subtitle="9/7–11 当周日均口径（来源：申万固收 / 银行业资负跟踪周报）" />
      <div className="p-3 space-y-2">
        {rows.map((r) => (
          <div key={r.who} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
            <div className="text-2xs text-muted">{r.who}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tnum text-content">{r.v}</span>
              <Badge tone={r.tone}>{r.note}</Badge>
            </div>
          </div>
        ))}
        <div className="text-2xs text-muted pt-1">
          大行融出回落 + 存单净融资上升，指向季末主动补负债、防御性减少融出；城商/农商等承接部分供给，稳定性弱于大行。
        </div>
      </div>
    </Card>
  );
}

function SourceCard() {
  const srcs = [
    ["利率 DR/R 系列", "Wind EDB M1006336/6337（DR001/DR007）、M0041652/1653（R001/R007），中国货币网，日频"],
    ["央行公开市场净投放", "Wind EDB A4087688（日频）、M0061614（周频）；MLF M5528818（月频，央行）"],
    ["同业存单", "中债 1Y AAA 到期收益率 M1004902（中国货币网）；一级发行利率来自机构周报"],
    ["财政债券", "地方政府债净融资 J9455629（Wind，日频）；政府债周度净缴款来自申万固收周报"],
    ["银行行为", "大行/非大行净融出、存单净融资来自申万固收、银行业资负跟踪周报（2026-09-05/12/14/19）"],
  ];
  return (
    <Card>
      <CardHead title="数据来源与口径说明" subtitle="透明化：本页所有数值均来自以下 Wind（万得）EDB / 新闻接口" />
      <div className="p-3 space-y-2">
        {srcs.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-2xs">
            <span className="text-accent font-medium shrink-0 w-28">{k}</span>
            <span className="text-muted leading-relaxed">{v}</span>
          </div>
        ))}
        <div className="text-2xs text-warn/90 pt-1 border-t border-border">
          免责声明：本页为 Wind Alice 生成的研究快照，数据截至 {AS_OF_LABEL}（部分至 2026-09-30），静态站点在构建时生成，非实时行情，不构成投资建议或交易信号。
        </div>
      </div>
    </Card>
  );
}

/* ===================================================================
 * 页面
 * =================================================================== */

export default function ChinaLiquidityTodayPage() {
  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <h1 className="text-lg font-semibold text-content">中国流动性 · 今日概览</h1>
            <Badge tone="pos">Wind Alice 生成</Badge>
          </div>
          <p className="text-2xs text-muted mt-1">
            实时整合央行公开市场操作、财政债券发行与到期、银行间 DR/R 利率、同业存单一二级表现，梳理流动性供需格局与市场定价动态
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs text-muted">
          <CalendarClock size={14} className="text-accent" />
          数据截至 {AS_OF_LABEL}
          <span className="text-border">·</span>
          生成于 {GEN_DATE}
        </div>
      </div>

      {/* Alice 货币总结（核心） */}
      <AliceSummary />

      {/* 关键指标条 */}
      <SectionLabel>关键指标快照</SectionLabel>
      <MetricStrip />

      {/* 图表区 */}
      <SectionLabel>市场定价动态 · 图表</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHead title="银行间关键利率走势（DR / R 系列）" subtitle="2026-09-01 → 09-24，日频，%" />
          <div className="p-3">
            <LineChartMulti
              labels={DR_DATES}
              series={[
                { name: "DR001", color: "#38BDF8", values: DR001 },
                { name: "DR007", color: "#34D399", values: DR007 },
                { name: "R007", color: "#FBBF24", values: R007 },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="交易所回购分层（R007·上交所口径）" subtitle="刻画跨季/税期下的结构性摩擦，9/21 一度 1.82%" />
          <div className="p-3">
            <LineChartMulti
              labels={DR_DATES}
              series={[{ name: "SSE R007", color: "#F87171", values: SSE_R007 }]}
              yMin={1.5}
              yMax={1.9}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="央行公开市场净投放（日频）" subtitle="亿元，正=净投放 / 负=净回笼" />
          <div className="p-3">
            <BarChartDiverging values={OMO_NET} labels={OMO_DATES} unit="亿元" labelEvery={3} />
          </div>
        </Card>

        <Card>
          <CardHead title="地方政府债净融资（日频）" subtitle="亿元，正=净融资 / 负=净偿还" />
          <div className="p-3">
            <BarChartDiverging values={LGB_NET} labels={LGB_DATES} unit="亿元" labelEvery={4} />
          </div>
        </Card>
      </div>

      {/* 银行行为 + 来源 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <BankBehaviorTable />
        <SourceCard />
      </div>

      {/* 交叉入口 */}
      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-2xs text-muted">
          <Layers size={14} className="text-accent" />
          延伸阅读：中国同款宏观走势、空转 vs 实体收益、各国流动性监测
        </div>
        <div className="flex gap-2 flex-wrap">
          <StaticLink href="/macro-global" className="chip bg-panel-2 text-content border border-border hover:border-accent">
            全球宏观 <ArrowRight size={12} />
          </StaticLink>
          <StaticLink href="/china/idle-vs-real" className="chip bg-panel-2 text-content border border-border hover:border-accent">
            空转 vs 实体 <ArrowRight size={12} />
          </StaticLink>
          <StaticLink href="/liquidity-grid" className="chip bg-panel-2 text-content border border-border hover:border-accent">
            各国流动性 <ArrowRight size={12} />
          </StaticLink>
          <StaticLink href="/data-detail" className="chip bg-panel-2 text-content border border-border hover:border-accent">
            明细数据 <ArrowRight size={12} />
          </StaticLink>
        </div>
      </Card>

      <footer className="text-2xs text-muted border-t border-border pt-3 leading-relaxed">
        本页为 Wind（万得）Alice 生成的研究快照，区别于站内其他确定性 Mock 页面；所有数值均标注来源与口径。数据截至 {AS_OF_LABEL}，静态导出站点在构建时固化，如需更新请重新生成。
      </footer>
    </div>
  );
}
