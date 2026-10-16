"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import { TrendingUp, ArrowRight, AlertTriangle, Activity } from "lucide-react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import { STRATEGY, SAMPLE, NavPoint, Position, SIGNAL, StrategySignal } from "@/lib/strategy-data";

/* ----------------------------- 工具函数 ----------------------------- */
function pct(v: number, digits = 2): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
function dirClass(v: number): string {
  if (v > 0) return "text-neg";
  if (v < 0) return "text-pos";
  return "text-muted";
}
function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(1, Math.round((db - da) / 86400000));
}

/* ----------------------------- 净值 + 回撤图 ----------------------------- */
function NavChart({ nav }: { nav: NavPoint[] }) {
  const W = 680;
  const topH = 150;
  const ddTop = 178;
  const ddH = 86;
  const padL = 46; // 左侧纵轴区
  const padR = 20;
  const plotW = W - padL - padR;
  const n = nav.length;
  const xs = nav.map((_, i) => padL + (i / (n - 1)) * plotW);
  const vals = nav.map((d) => d.nav);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.18 || 0.01;
  const yNav = (v: number) =>
    topH - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (topH - 24) + 12;

  let rmax = -Infinity;
  const dds: number[] = [];
  for (const v of vals) {
    rmax = Math.max(rmax, v);
    dds.push(v / rmax - 1);
  }
  const ddMin = Math.min(...dds, -0.001);

  // 回撤纵轴刻度（自 0 向下到 ddMin）
  const ddSpan = Math.abs(ddMin);
  const ddStep = ddSpan > 0.05 ? 0.01 : ddSpan / 4;
  const ddTicks: number[] = [];
  for (let v = 0; v <= ddSpan + 1e-9; v += ddStep) ddTicks.push(-v);

  const line = xs.map((x, i) => `${x.toFixed(1)},${yNav(vals[i]).toFixed(1)}`).join(" ");
  const area =
    `M ${xs[0].toFixed(1)},${topH} ` +
    xs.map((x, i) => `L ${x.toFixed(1)},${yNav(vals[i]).toFixed(1)}`).join(" ") +
    ` L ${xs[n - 1].toFixed(1)},${topH} Z`;

  const tickIdx = [0, Math.floor(n / 2), n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${ddTop + ddH + 8}`} className="w-full">
      <defs>
        <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* NAV 区 */}
      <line x1={padL} y1={topH} x2={W - padR} y2={topH} stroke="rgb(var(--border))" strokeWidth="1" />
      <path d={area} fill="url(#navFill)" />
      <polyline points={line} fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
      {tickIdx.map((i) => (
        <text key={i} x={xs[i]} y={topH + 16} fill="rgb(var(--muted))" fontSize="10" textAnchor="middle">
          {nav[i].date.slice(5)}
        </text>
      ))}
      <text x="24" y="14" fill="rgb(var(--muted))" fontSize="10">净值</text>
      <text x={W - padR} y="14" fill="rgb(var(--accent))" fontSize="10" textAnchor="end">
        {hi.toFixed(4)}
      </text>

      {/* 回撤柱状图（每点一根柱，自零轴向下） + 纵轴坐标 */}
      <line x1={padL} y1={ddTop} x2={W - padR} y2={ddTop} stroke="rgb(var(--border))" strokeWidth="1" />
      {/* 纵轴 + 刻度网格线 */}
      <line x1={padL} y1={ddTop} x2={padL} y2={ddTop + ddH} stroke="rgb(var(--border))" strokeWidth="1" />
      {ddTicks.map((v, i) => {
        const y = ddTop + (v / ddMin) * ddH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgb(var(--border))" strokeWidth="0.5" strokeOpacity="0.5" />
            <text x={padL - 4} y={y + 3} fill="rgb(var(--muted))" fontSize="8" textAnchor="end">
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
      {dds.map((v, i) => {
        const bw = Math.max(1.5, (plotW / (n - 1)) * 0.55);
        const bh = (v / ddMin) * ddH;
        return (
          <rect
            key={i}
            x={xs[i] - bw / 2}
            y={ddTop}
            width={bw}
            height={bh}
            fill="rgb(var(--neg))"
            fillOpacity="0.55"
          />
        );
      })}
      <text x={padL + 3} y={ddTop + 12} fill="rgb(var(--muted))" fontSize="10">回撤（柱状）</text>
      <text x={W - padR} y={ddTop + 12} fill="rgb(var(--neg))" fontSize="10" textAnchor="end">
        {(ddMin * 100).toFixed(2)}%
      </text>
    </svg>
  );
}

/* ----------------------------- KPI 卡片 ----------------------------- */
function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="card-soft p-3">
      <div className="text-2xs text-muted">{label}</div>
      <div className={cn("text-lg font-semibold tnum mt-0.5", cls ?? "text-content")}>{value}</div>
    </div>
  );
}

/* ----------------------------- 策略多空信号卡片 ----------------------------- */
function SignalCard({ sig }: { sig: StrategySignal }) {
  const parts = [
    { label: "多", v: sig.long, color: "rgb(var(--neg))" },
    { label: "空", v: sig.short, color: "rgb(var(--pos))" },
    { label: "中", v: sig.neutral, color: "rgb(var(--muted))" },
  ];
  const total = sig.total || parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <Card>
      <CardHead
        title="策略多空信号"
        subtitle={`日志末次输出 · ${sig.asOf || "—"}`}
        right={<Activity size={14} className="text-accent" />}
      />
      <div className="p-3 space-y-3">
        {/* 多空堆叠条 */}
        <div>
          <div className="flex h-5 rounded overflow-hidden border border-border">
            {parts.map((p, i) =>
              p.v > 0 ? (
                <div
                  key={i}
                  style={{ width: `${(p.v / total) * 100}%`, backgroundColor: p.color }}
                  className="flex items-center justify-center text-[10px] font-medium text-white/95"
                  title={`${p.label} ${p.v}`}
                >
                  {p.label}
                  {p.v}
                </div>
              ) : null,
            )}
          </div>
          <div className="flex justify-between text-2xs mt-1">
            <span className="text-neg font-medium">多 {sig.long}</span>
            <span className="text-pos font-medium">空 {sig.short}</span>
            <span className="text-muted font-medium">中 {sig.neutral}</span>
            <span className="text-muted">共 {sig.total}</span>
          </div>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-2xs">
          <div className="card-soft p-2">
            <div className="text-muted">市场状态</div>
            <div className="font-medium text-content mt-0.5 truncate" title={sig.market}>
              {sig.market || "—"}
            </div>
          </div>
          <div className="card-soft p-2">
            <div className="text-muted">资金使用率</div>
            <div className="font-medium text-content mt-0.5">
              {sig.capitalUsage}% <span className="text-muted">(实际 {sig.actualUsage}%)</span>
            </div>
          </div>
          <div className="card-soft p-2">
            <div className="text-muted">止损 ATR 倍</div>
            <div className="font-medium text-content mt-0.5 tnum">{sig.stopAtr}</div>
          </div>
          <div className="card-soft p-2">
            <div className="text-muted">权益 / 回撤</div>
            <div className="font-medium text-content mt-0.5 tnum">
              {(sig.equity / 10000).toFixed(0)}万
              {sig.drawdown > 0 ? (
                <span className="text-pos"> / {sig.drawdown}%</span>
              ) : (
                <span className="text-muted"> / {sig.drawdown}%</span>
              )}
            </div>
          </div>
        </div>

        {sig.snr && (
          <div>
            <div className="text-2xs text-muted mb-1">SNR 分布（信号强度占比）</div>
            <div className="text-2xs text-content font-mono leading-relaxed">{sig.snr}</div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------- 主页面 ----------------------------- */
export default function StrategyPage() {
  const { meta, nav, trades, positions, analysis } = STRATEGY;

  // 衍生指标
  const lastNav = nav[nav.length - 1].nav;
  const cumRet = lastNav - meta.baseNav;
  const ann =
    Math.pow(1 + cumRet, 365 / daysBetween(meta.inception, meta.asOf)) - 1;
  let rmax = -Infinity;
  let maxDD = 0;
  for (const v of nav.map((d) => d.nav)) {
    rmax = Math.max(rmax, v);
    maxDD = Math.min(maxDD, v / rmax - 1);
  }
  const rets: number[] = [];
  for (let i = 1; i < nav.length; i++) rets.push(nav[i].nav / nav[i - 1].nav - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const std = Math.sqrt(variance) || 1e-9;
  const sharpe = (mean / std) * Math.sqrt(252);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = wins / trades.length;
  // 净敞口由数据生成端按合约乘数估算后写入 meta
  const netExposure = meta.netExposurePct;

  // 进阶量化指标（基于净值序列与逐笔）
  const vol = std * Math.sqrt(252); // 年化波动率
  const downsideRets = rets.filter((r) => r < 0);
  const downStd =
    Math.sqrt(downsideRets.reduce((a, b) => a + b * b, 0) / (downsideRets.length || 1)) || 1e-9;
  const sortino = (mean / downStd) * Math.sqrt(252);
  const calmar = Math.abs(maxDD) > 0 ? ann / Math.abs(maxDD) : 0;
  const posRatio = rets.filter((r) => r > 0).length / rets.length;
  // 最长回撤天数（自然日）
  let peakNav = -Infinity;
  let ddStart = 0;
  let maxDDDays = 0;
  let inDrawdown = false;
  nav.forEach((d, i) => {
    if (d.nav > peakNav) {
      peakNav = d.nav;
      inDrawdown = false;
    } else if (d.nav < peakNav) {
      if (!inDrawdown) {
        inDrawdown = true;
        ddStart = i;
      }
      const span = daysBetween(nav[ddStart].date, d.date);
      if (span > maxDDDays) maxDDDays = span;
    }
  });
  // 盈利因子（仅统计已平仓 pnl≠0）
  const closedTrades = trades.filter((t) => t.pnl !== 0);
  const grossProfit = closedTrades.filter((t) => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => t.pnl < 0).reduce((a, t) => a + t.pnl, 0));
  const profitFactorTxt =
    grossProfit > 0 || grossLoss > 0
      ? grossLoss > 0
        ? (grossProfit / grossLoss).toFixed(2)
        : "∞"
      : "—";

  // 品种盈亏聚合已按需求移除（去掉品种盈亏图），逐笔数据仍用于胜率/盈利因子

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent" />
            <h1 className="text-xl font-bold text-content">{meta.name} · 净值与市场分析</h1>
            <Badge tone="pos">真实策略</Badge>
            {SAMPLE && <Badge tone="warn">示例数据</Badge>}
          </div>
          <p className="text-2xs text-muted mt-1">
            数据截至 {meta.asOf} · 起始 {meta.inception} · 基准 {meta.benchmark} · 初始资金{" "}
            {meta.initialCapitalWan} 万元 · {meta.source}
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <Badge tone="neutral">累计 {pct(cumRet * 100)}</Badge>
          <Badge tone="neutral">最大回撤 {pct(maxDD * 100)}</Badge>
        </div>
      </div>

      {/* 示例数据提示 */}
      {SAMPLE && (
        <div className="flex items-start gap-2 border border-warn/40 bg-warn/5 rounded p-3 text-2xs">
          <AlertTriangle size={14} className="text-warn shrink-0 mt-0.5" />
          <div className="text-muted leading-relaxed">
            <span className="font-semibold text-warn">当前为示例数据。</span>
            接入网盘同步后，自动化将用真实策略输出覆盖本页（净值 / 逐笔 / 持仓 / 分析）。需在你那台运行策略的电脑上，把
            <code className="px-1">futures_strategy.json</code> 同步到本机指定目录即可，无需手动改代码。
          </div>
        </div>
      )}

      {/* 净值 + 回撤 */}
      <Card>
        <CardHead title="净值曲线与回撤" subtitle="单位净值（起点 1.0000）· 下方为回撤柱状图" right={<Activity size={14} className="text-accent" />} />
        <div className="p-3">
          <NavChart nav={nav} />
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="累计收益" value={pct(cumRet * 100)} cls={dirClass(cumRet)} />
        <Kpi label="年化收益" value={pct(ann * 100)} cls={dirClass(ann)} />
        <Kpi label="最大回撤" value={pct(maxDD * 100)} cls="text-neg" />
        <Kpi label="夏普比率" value={sharpe.toFixed(2)} cls="text-content" />
        <Kpi label="交易胜率" value={`${(winRate * 100).toFixed(0)}%`} cls="text-content" />
        <Kpi label="净敞口" value={`${netExposure.toFixed(1)}%`} cls="text-content" />
      </div>

      {/* 净值量化分析 */}
      <div>
        <SectionLabel>净值量化分析</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi label="年化波动率" value={pct(vol * 100)} cls="text-content" />
          <Kpi label="索提诺比率" value={sortino.toFixed(2)} cls="text-content" />
          <Kpi label="卡玛比率" value={calmar.toFixed(2)} cls="text-content" />
          <Kpi label="正收益占比" value={`${(posRatio * 100).toFixed(0)}%`} cls="text-content" />
          <Kpi label="最长回撤天数" value={`${maxDDDays} 天`} cls="text-content" />
          <Kpi label="盈利因子" value={profitFactorTxt} cls="text-content" />
        </div>
        <p className="text-2xs text-muted mt-2 leading-relaxed">
          年化波动率=日收益标准差×√252；索提诺以仅下行收益标准差为分母（更强调下行风险）；卡玛=年化收益/|最大回撤|；
          正收益占比为日频净值上涨比例；最长回撤天数为净值自历史高点回落持续的最长自然日数；盈利因子=总盈利/总亏损（基于已平仓 pnl≠0 样本）。
        </p>
      </div>

      {/* 当前持仓 */}
      <Card>
        <CardHead title="当前持仓" subtitle={`共 ${positions.length} 个 · 更新 ${meta.updateTime || meta.asOf}`} />
        <div className="p-2 overflow-x-auto">
          <table className="w-full text-2xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left font-medium p-1.5">合约</th>
                <th className="text-left font-medium p-1.5">方向</th>
                <th className="text-right font-medium p-1.5">手数</th>
                <th className="text-right font-medium p-1.5">开仓价</th>
                <th className="text-right font-medium p-1.5">止损</th>
                <th className="text-right font-medium p-1.5">止盈</th>
                <th className="text-right font-medium p-1.5">ATR</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: Position, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="p-1.5 font-medium text-content">{p.symbol}</td>
                  <td className={cn("p-1.5 font-medium", p.net === "long" ? "text-neg" : "text-pos")}>
                    {p.net === "long" ? "多" : "空"}
                  </td>
                  <td className="p-1.5 tnum text-right text-content">{p.qty}</td>
                  <td className="p-1.5 tnum text-right text-muted">{p.avg}</td>
                  <td className="p-1.5 tnum text-right text-pos">{p.sl}</td>
                  <td className="p-1.5 tnum text-right text-neg">{p.tp}</td>
                  <td className="p-1.5 tnum text-right text-muted">{p.atr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 市场分析 */}
      <div>
        <SectionLabel>市场分析</SectionLabel>
        {SIGNAL && (
          <div className="mb-3">
            <SignalCard sig={SIGNAL} />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHead title="市场观点" subtitle="宏观与品种格局" />
            <p className="p-3 text-2xs text-muted leading-relaxed">{analysis.market}</p>
          </Card>
          <Card>
            <CardHead title="策略业绩" subtitle="收益来源拆解" />
            <p className="p-3 text-2xs text-muted leading-relaxed">{analysis.performance}</p>
          </Card>
          <Card>
            <CardHead title="风险提示" subtitle="敞口与集中度" />
            <p className="p-3 text-2xs text-muted leading-relaxed">{analysis.risk}</p>
          </Card>
        </div>
      </div>

      {/* 交叉入口 */}
      <div className="flex flex-wrap gap-2 text-2xs">
        <StaticLink href="/china/futures" className="text-accent hover:underline flex items-center gap-1">
          <ArrowRight size={12} />中国期货·板块强弱
        </StaticLink>
        <StaticLink href="/china/stocks" className="text-accent hover:underline flex items-center gap-1">
          <ArrowRight size={12} />中国股市·龙虎榜
        </StaticLink>
        <StaticLink href="/china/today" className="text-accent hover:underline flex items-center gap-1">
          <ArrowRight size={12} />中国流动性·今日概览
        </StaticLink>
        <StaticLink href="/" className="text-accent hover:underline flex items-center gap-1">
          <ArrowRight size={12} />研究枢纽
        </StaticLink>
      </div>

      <p className="text-2xs text-muted border-t border-border pt-3">
        数据说明：净值、持仓、市场分析及多空信号由策略端导出并经网盘同步至本机后自动生成；
        “策略多空信号”取自策略运行日志（strategy_stdout.log）末次状态输出。本页为研究快照，
        <span className="text-pos">不构成投资建议</span>。日期随策略输出定期更新。
      </p>
    </div>
  );
}
