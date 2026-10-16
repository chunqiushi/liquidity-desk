"use client";

import * as React from "react";
import {
  type ChinaMacroPoint,
  buildSeries,
} from "@/lib/china-macro-mock";

/* ============================================================
 * 通用宏观研究图表组件（可复用）
 * 上图：各指标独立 mini 同比走势（X 轴 = 指标名，不连成一条线）
 * 下图：预期(黄) / 实际(深蓝) 双柱 + 预期差(黑点)
 * 纯 SVG 绘制，规避 Recharts 在静态导出下的 Invariant failed。
 * 中国图与国际（各国）宏观图共用此组件，仅数据不同。
 * ============================================================ */

const W = 1100;
const M = { top: 40, right: 72, bottom: 48, left: 46 };
const INNER_W = W - M.left - M.right; // 982

const SVG_H = (innerH: number) => M.top + innerH + M.bottom;

/* -------------------- 自适应 Y 轴：按各国数据自行收敛 -------------------- */
// 不再锁死 ±20%：每个国家的同比数据量级不同（有的 ±2%，有的 -11%~+9%），
// 统一刻度会把小波动国家压扁。改为按该国家自身数据范围自适应收敛：
// 取所有点（actual/previous/expected/series）的极值，加 ~18% 余量，并强制包含 0
// （柱基线），最后取整到干净的刻度。结果让曲线铺满绘图区、波动更显著，且 0 始终可见。
function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  let m: number;
  if (n <= 1) m = 1;
  else if (n <= 2) m = 2;
  else if (n <= 2.5) m = 2.5;
  else if (n <= 5) m = 5;
  else m = 10;
  return m * pow;
}

type Bounds = { min: number; max: number; ticks: number[] };

function computeBounds(indicators: ChinaMacroPoint[]): Bounds {
  let dMin = Infinity;
  let dMax = -Infinity;
  for (const it of indicators) {
    const vals = [it.actual, it.previous, it.expected, ...it.series].filter(
      (x): x is number => typeof x === "number" && Number.isFinite(x)
    );
    for (const v of vals) {
      if (v < dMin) dMin = v;
      if (v > dMax) dMax = v;
    }
  }
  if (!Number.isFinite(dMin) || !Number.isFinite(dMax)) {
    dMin = -10;
    dMax = 10;
  }
  const span = dMax - dMin;
  const pad = span > 1e-6 ? span * 0.18 : Math.max(1, Math.abs(dMax) * 0.2 + 1);
  // 强制包含 0（柱基线），并给上下留适度边距
  let lo = Math.min(0, dMin - pad);
  let hi = Math.max(0, dMax + pad);
  if (hi - lo < 1e-6) hi = lo + 2;
  // 取整到干净的刻度，并重新确认 0 落在范围内
  const step = niceStep((hi - lo) / 6);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (lo > 0) lo = 0;
  if (hi < 0) hi = 0;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-6; v += step) ticks.push(+v.toFixed(2));
  return { min: lo, max: hi, ticks };
}

/* ----------------------------- 数据格式化 ----------------------------- */
const signed = (n: number, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;
const fmtPeriod = (p: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(p);
  if (m) return `${m[1]}年${Number(m[2])}月`;
  return p; // 季度 / 其他格式原样显示
};
// 一致预期可用性：若任意指标含真实一致预期则用「预期」口径，否则退化为「前值」口径
const compareMode = (inds: ChinaMacroPoint[]): "预期" | "前值" => {
  const anyConsensus = inds.some((i) => i.expected != null && Number.isFinite(i.expected));
  return anyConsensus ? "预期" : "前值";
};
const comparator = (it: ChinaMacroPoint): number =>
  it.expected != null && Number.isFinite(it.expected)
    ? (it.expected as number)
    : it.previous != null
    ? (it.previous as number)
    : (it.actual as number);

/* ============================ 上图：走势一览 ============================ */
function TrendChart({
  indicators,
  title,
  period,
  bounds,
  onEnter,
  onLeave,
  onClick,
}: {
  indicators: ChinaMacroPoint[];
  title: string;
  period: string;
  bounds: Bounds;
  onEnter: (i: number, e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (i: number) => void;
}) {
  const N = indicators.length;
  const COL_W = INNER_W / N;
  const INNER_H = 282;
  const y = (v: number) => M.top + INNER_H - ((v - bounds.min) / (bounds.max - bounds.min)) * INNER_H;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-x-3">
        <h4 className="text-sm font-semibold text-slate-800">
          {title}走势一览（{fmtPeriod(period)}）
        </h4>
        <span className="text-2xs text-slate-500">
          同比 % · 各指标独立 mini 走势 · 末点标注最新值
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${SVG_H(INNER_H)}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {bounds.ticks.map((v) => (
          <g key={v}>
            <line
              x1={M.left}
              y1={y(v)}
              x2={M.left + INNER_W}
              y2={y(v)}
              stroke={v === 0 ? "#94A3B8" : "#E2E8F0"}
              strokeDasharray={v === 0 ? undefined : "3 3"}
            />
            <text
              x={M.left - 8}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={10}
              fill="#64748B"
            >
              {v}%
            </text>
          </g>
        ))}

        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + INNER_H} stroke="#475569" />
        <line
          x1={M.left}
          y1={M.top + INNER_H}
          x2={M.left + INNER_W}
          y2={M.top + INNER_H}
          stroke="#475569"
        />

        {indicators.map((it, i) => {
          const colLeft = M.left + i * COL_W;
          const innerStart = colLeft + COL_W * 0.12;
          const innerEnd = colLeft + COL_W * 0.58;
          const innerW = innerEnd - innerStart;
          const n = it.series.length;
          const xj = (j: number) => innerStart + (j * innerW) / (n - 1);
          const d = it.series
            .map((v, j) => `${j === 0 ? "M" : "L"} ${xj(j).toFixed(1)},${y(v).toFixed(1)}`)
            .join(" ");
          const endX = xj(n - 1);
          const endY = y(it.actual);
          const cx = colLeft + COL_W / 2;
          return (
            <g key={it.key}>
              <path
                d={d}
                fill="none"
                stroke={it.color}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={endX} cy={endY} r={2.8} fill={it.color} stroke="#fff" strokeWidth={1} />
              <text
                x={innerEnd + 5}
                y={endY + 3.2}
                textAnchor="start"
                fontSize={10}
                fontWeight={600}
                fill={it.color}
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, strokeLinejoin: "round" }}
              >
                {signed(it.actual)}%
              </text>
              <text
                x={cx}
                y={M.top + INNER_H + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#475569"
              >
                {it.short}
              </text>
              <rect
                x={colLeft}
                y={M.top}
                width={COL_W}
                height={INNER_H}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => onEnter(i, e)}
                onMouseMove={(e) => onEnter(i, e)}
                onMouseLeave={onLeave}
                onClick={() => onClick(i)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================ 下图：预期差 ============================ */
function SurpriseChart({
  indicators,
  title,
  period,
  bounds,
  onEnter,
  onLeave,
  onClick,
}: {
  indicators: ChinaMacroPoint[];
  title: string;
  period: string;
  bounds: Bounds;
  onEnter: (i: number, e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (i: number) => void;
}) {
  const N = indicators.length;
  const COL_W = INNER_W / N;
  const INNER_H = 282;
  const cm = compareMode(indicators);
  const y = (v: number) => M.top + INNER_H - ((v - bounds.min) / (bounds.max - bounds.min)) * INNER_H;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-x-3">
        <h4 className="text-sm font-semibold text-slate-800">
          {title}{cm === "预期" ? "预期差" : "实际−前值"}（{fmtPeriod(period)}）
        </h4>
        <span className="text-2xs text-slate-500">
          单位 % · 黑点 = 预期差（实际 − 预期）
        </span>
      </div>

      <div className="flex items-center gap-4 text-2xs text-slate-600 mb-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1F2937]" /> 预期差
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#D4A017]" /> {cm}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#1F4E79]" /> 实际
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${SVG_H(INNER_H)}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {bounds.ticks.map((v) => (
          <g key={v}>
            <line
              x1={M.left}
              y1={y(v)}
              x2={M.left + INNER_W}
              y2={y(v)}
              stroke={v === 0 ? "#94A3B8" : "#E2E8F0"}
              strokeDasharray={v === 0 ? undefined : "3 3"}
            />
            <text
              x={M.left - 8}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={10}
              fill="#64748B"
            >
              {v}%
            </text>
          </g>
        ))}

        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + INNER_H} stroke="#475569" />
        <line
          x1={M.left}
          y1={M.top + INNER_H}
          x2={M.left + INNER_W}
          y2={M.top + INNER_H}
          stroke="#475569"
        />

        {indicators.map((it, i) => {
          const colLeft = M.left + i * COL_W;
          const cx = colLeft + COL_W / 2;
          const barW = COL_W * 0.2;
          const expX = cx - barW - 2;
          const actX = cx + 2;
          const zeroY = y(0);
          const barH = (v: number) => Math.abs(y(v) - zeroY);
          const barY = (v: number) => (v >= 0 ? y(v) : zeroY);
          const comp = comparator(it);
          const dotX = actX + barW + 6;
          const dotY = y(it.actual);
          const surprise = +(it.actual - comp).toFixed(2);
          const splabel = `${surprise >= 0 ? "+" : ""}${surprise.toFixed(2)}`;
          return (
            <g key={it.key}>
              <rect
                x={expX}
                y={barY(comp)}
                width={barW}
                height={barH(comp)}
                fill="#D4A017"
              />
              <rect
                x={actX}
                y={barY(it.actual)}
                width={barW}
                height={barH(it.actual)}
                fill="#1F4E79"
              />
              <circle cx={dotX} cy={dotY} r={3.6} fill="#1F2937" stroke="#fff" strokeWidth={1} />
              <text
                x={dotX + 6}
                y={dotY + 3.2}
                textAnchor="start"
                fontSize={10}
                fontWeight={600}
                fill="#1F2937"
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, strokeLinejoin: "round" }}
              >
                {splabel}
              </text>
              <text
                x={cx}
                y={M.top + INNER_H + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#475569"
              >
                {it.short}
              </text>
              <rect
                x={colLeft}
                y={M.top}
                width={COL_W}
                height={INNER_H}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => onEnter(i, e)}
                onMouseMove={(e) => onEnter(i, e)}
                onMouseLeave={onLeave}
                onClick={() => onClick(i)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================ 悬停提示 ============================ */
function HoverTip({
  data,
  x,
  y,
  isMock,
  sourceLabel,
}: {
  data: ChinaMacroPoint;
  x: number;
  y: number;
  isMock: boolean;
  sourceLabel: string;
}) {
  const comp = comparator(data);
  const hasConsensus = data.expected != null && Number.isFinite(data.expected);
  const surprise = +(data.actual - comp).toFixed(2);
  const rows: [string, string][] = [
    ["指标名称", data.name],
    ["观察期", data.period],
    ["实际值", `${signed(data.actual)}%`],
    ["前值", data.previous != null ? `${signed(data.previous)}%` : "—"],
    ["一致预期", hasConsensus ? `${signed(data.expected as number)}%` : "—（暂不可用）"],
    [hasConsensus ? "预期差" : "实际−前值", `${surprise >= 0 ? "+" : ""}${surprise.toFixed(2)} pp`],
    ["发布日期", data.releaseDate],
    ["数据来源", `${data.source}${isMock ? "（Mock）" : ""}`],
    ["数据状态", isMock ? "Mock" : "真实"],
  ];
  return (
    <div
      style={{ position: "fixed", left: x + 14, top: y + 14, zIndex: 60 }}
      className="pointer-events-none bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-2xs w-56"
    >
      <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: data.color }} />
        {data.short}
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5">
          <span className="text-slate-500">{k}</span>
          <span className="text-slate-800 font-medium tnum">{v}</span>
        </div>
      ))}
      <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
        数据来源：{sourceLabel}
      </div>
    </div>
  );
}

/* ============================ 明细折线 ============================ */
function DetailLine({ values, color }: { values: number[]; color: string }) {
  const w = 660;
  const h = 170;
  const ml = 40;
  const mr = 14;
  const mt = 14;
  const mb = 22;
  const iw = w - ml - mr;
  const ih = h - mt - mb;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min) * 0.12 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const x = (j: number) => ml + (j * iw) / (values.length - 1);
  const d = values
    .map((v, j) => `${j === 0 ? "M" : "L"} ${x(j).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={ml} y1={y(t)} x2={ml + iw} y2={y(t)} stroke="#E2E8F0" strokeDasharray="3 3" />
          <text x={ml - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#64748B">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {yMin < 0 && yMax > 0 && <line x1={ml} y1={y(0)} x2={ml + iw} y2={y(0)} stroke="#94A3B8" />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} />
      <text x={ml} y={h - 6} fontSize={9} fill="#64748B">
        T-{values.length - 1}
      </text>
      <text x={ml + iw} y={h - 6} textAnchor="end" fontSize={9} fill="#64748B">
        当前
      </text>
    </svg>
  );
}

/* ============================ 点击明细弹窗 ============================ */
function DetailModal({
  idx,
  indicators,
  onClose,
  isMock,
  sourceLabel,
}: {
  idx: number;
  indicators: ChinaMacroPoint[];
  onClose: () => void;
  isMock: boolean;
  sourceLabel: string;
}) {
  const it = indicators[idx];
  const hist = it.history && it.history.length ? it.history.map((h) => h.v) : null;
  const s1 = hist ? hist.slice(-12) : buildSeries(idx + 1, 12, it.actual);
  const s3 = hist ? hist.slice(-36) : buildSeries(idx + 1, 36, it.actual);
  const hasConsensus = it.expected != null && Number.isFinite(it.expected);
  const comp = comparator(it);
  const surprise = +(it.actual - comp).toFixed(2);

  const tableRows: [string, string][] = [
    ["观察期", it.period],
    ["实际值（同比）", `${signed(it.actual)}%`],
    ["前值（同比）", it.previous != null ? `${signed(it.previous)}%` : "—"],
    ["一致预期", hasConsensus ? `${signed(it.expected as number)}%` : "—（暂不可用）"],
    [hasConsensus ? "预期差" : "实际−前值", `${surprise >= 0 ? "+" : ""}${surprise.toFixed(2)} pp`],
    ["发布日期", it.releaseDate],
    ["数据来源", `${it.source}${isMock ? "（Mock）" : ""}`],
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: it.color }} />
              {it.name}（{it.short}）
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              观察期 {it.period} · 单位 %（同比） · {isMock ? "Mock Data" : "Real"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none px-2"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1">过去 12 个月走势{hist ? "（真实）" : "（Mock）"}</div>
            <DetailLine values={s1} color={it.color} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1">过去 36 个月走势{hist ? "（真实）" : "（Mock）"}</div>
            <DetailLine values={s3} color={it.color} />
          </div>
          <table className="w-full text-2xs border-collapse">
            <tbody>
              {tableRows.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-500 w-32">{k}</td>
                  <td className="py-1.5 font-medium text-slate-800 tnum">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 text-2xs text-slate-500">
          数据来源：{it.source} ｜ 数据状态：{isMock ? "Mock Data（示例）" : "真实数据"}
          {!isMock && it.asOf ? ` · 截至 ${it.asOf}` : ""} · 来源基准：{sourceLabel}
        </div>
      </div>
    </div>
  );
}

/* ============================ 通用模块出口 ============================ */
export interface MacroResearchChartProps {
  indicators: ChinaMacroPoint[];
  title: string;
  period: string;
  isMock: boolean;
  sourceLabel: string;
  cardTitle?: string;
}

export function MacroResearchChart({
  indicators,
  title,
  period,
  isMock,
  sourceLabel,
  cardTitle,
}: MacroResearchChartProps) {
  const [hover, setHover] = React.useState<{ idx: number; x: number; y: number } | null>(null);
  const [detail, setDetail] = React.useState<number | null>(null);

  const onEnter = (i: number, e: React.MouseEvent) => setHover({ idx: i, x: e.clientX, y: e.clientY });
  const onLeave = () => setHover(null);
  const onClick = (i: number) => setDetail(i);

  const bounds = computeBounds(indicators);

  const inner = (
    <>
      <div className="space-y-6">
        <TrendChart
          indicators={indicators}
          title={title}
          period={period}
          bounds={bounds}
          onEnter={onEnter}
          onLeave={onLeave}
          onClick={onClick}
        />
        <SurpriseChart
          indicators={indicators}
          title={title}
          period={period}
          bounds={bounds}
          onEnter={onEnter}
          onLeave={onLeave}
          onClick={onClick}
        />
      </div>
      {hover && (
        <HoverTip
          data={indicators[hover.idx]}
          x={hover.x}
          y={hover.y}
          isMock={isMock}
          sourceLabel={sourceLabel}
        />
      )}
      {detail !== null && (
        <DetailModal
          idx={detail}
          indicators={indicators}
          onClose={() => setDetail(null)}
          isMock={isMock}
          sourceLabel={sourceLabel}
        />
      )}
    </>
  );

  if (!cardTitle) return <div className="p-4">{inner}</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-md">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-800">{cardTitle}</div>
        <span className="text-2xs text-slate-500 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isMock ? "bg-amber-500" : "bg-emerald-500"}`} />
          数据状态：{isMock ? "Mock Data" : "真实数据"}
        </span>
      </div>
      <div className="p-4">{inner}</div>
      <div className="px-4 py-2 border-t border-slate-200 text-2xs text-slate-500 flex items-center justify-between flex-wrap gap-x-3">
        <span>数据来源：{sourceLabel} ｜ 数据状态：{isMock ? "Mock Data（示例数据，非真实发布）" : "真实数据"}</span>
        <span>点击任一指标查看 1Y / 3Y 明细</span>
      </div>
    </div>
  );
}
