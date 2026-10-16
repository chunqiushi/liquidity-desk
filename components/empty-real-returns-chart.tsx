"use client";

import React, { useMemo, useState } from "react";
import { EMPTY_REAL_POINTS, EMPTY_REAL_META } from "@/lib/empty-real-returns-series";

type Pt = (typeof EMPTY_REAL_POINTS)[number];

const W = 920;
const H = 480;
const M = { top: 58, right: 28, bottom: 78, left: 58 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const Y_MIN = -1.8;
const Y_MAX = 3.0;
const Y_STEP = 0.6;

const ORANGE = "#E07B00"; // 实体收益
const BLUE = "#1F4E79"; // 空转收益
const AXIS = "#1F2937";
const GRID = "#E5E7EB";
const GRID_DASH = "#EDEFF2";

function yToPx(v: number) {
  return M.top + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * PLOT_H;
}

function monthEnds(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (d <= end) {
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    if (last >= start) out.push(last);
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return out;
}

function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { ymd: `${y}-${m}-${day}`, ym: `${String(y).slice(2)}-${m}` };
}

export default function EmptyRealReturnsChart() {
  const [hover, setHover] = useState<number | null>(null);

  const { t0, t1, hasData, lines, ellipse, ellipseLabel, endLabels } = useMemo(() => {
    const pts = EMPTY_REAL_POINTS;
    const t0 = new Date(EMPTY_REAL_META.windowStart + "T00:00:00Z").getTime();
    const t1 = new Date(EMPTY_REAL_META.windowEnd + "T00:00:00Z").getTime();
    const has = pts.some((p) => p.real !== null && p.empty !== null);

    const xToPx = (t: number) => M.left + ((t - t0) / (t1 - t0)) * PLOT_W;

    const orangePts: [number, number][] = [];
    const bluePts: [number, number][] = [];
    pts.forEach((p) => {
      const t = new Date(p.date + "T00:00:00Z").getTime();
      if (p.real !== null) orangePts.push([xToPx(t), yToPx(p.real)]);
      if (p.empty !== null) bluePts.push([xToPx(t), yToPx(p.empty)]);
    });

    // 椭圆圈出 2026-06 ~ 2026-08 末端；标注按真实数据方向动态生成（不写死结论）
    let ellipse: { cx: number; cy: number; rx: number; ry: number } | null = null;
    let ellipseLabel = "";
    const endLabels: { x: number; y: number; text: string; color: string }[] = [];
    if (has) {
      const seg = pts.filter((p) => {
        const t = new Date(p.date + "T00:00:00Z").getTime();
        return t >= new Date("2026-06-01T00:00:00Z").getTime() && p.real !== null && p.empty !== null;
      });
      if (seg.length) {
        const xs = seg.map((p) => xToPx(new Date(p.date + "T00:00:00Z").getTime()));
        const ys = seg.flatMap((p) => [yToPx(p.real as number), yToPx(p.empty as number)]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        ellipse = {
          cx: (minX + maxX) / 2,
          cy: (minY + maxY) / 2,
          rx: (maxX - minX) / 2 + 26,
          ry: (maxY - minY) / 2 + 22,
        };
        const dir = (arr: number[]) => (arr[arr.length - 1] < arr[0] ? "下行" : "上行");
        ellipseLabel = `2026年6–8月：实体收益${dir(seg.map((p) => p.real as number))} · 空转收益${dir(seg.map((p) => p.empty as number))}`;
      }
      const last = pts[pts.length - 1];
      if (last.real !== null && last.empty !== null) {
        const lx = xToPx(t1);
        endLabels.push({ x: lx, y: yToPx(last.real), text: `实体 ${last.real >= 0 ? "+" : ""}${last.real.toFixed(2)}`, color: ORANGE });
        endLabels.push({ x: lx, y: yToPx(last.empty), text: `空转 ${last.empty >= 0 ? "+" : ""}${last.empty.toFixed(2)}`, color: BLUE });
      }
    }

    return { t0, t1, hasData: has, lines: { orange: orangePts, blue: bluePts }, ellipse, ellipseLabel, endLabels };
  }, []);

  const xToPx = (t: number) => M.left + ((t - t0) / (t1 - t0)) * PLOT_W;

  const yTicks: number[] = [];
  for (let v = Y_MIN; v <= Y_MAX + 1e-9; v += Y_STEP) yTicks.push(Math.round(v * 100) / 100);

  const xTicks = monthEnds(new Date(t0), new Date(t1));

  const svgPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = t0 + ((px - M.left) / PLOT_W) * (t1 - t0);
    let best = 0;
    let bestD = Infinity;
    EMPTY_REAL_POINTS.forEach((p, i) => {
      const d = Math.abs(new Date(p.date + "T00:00:00Z").getTime() - t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hv = hover !== null ? EMPTY_REAL_POINTS[hover] : null;
  const hx = hover !== null ? xToPx(new Date(EMPTY_REAL_POINTS[hover].date + "T00:00:00Z").getTime()) : 0;

  const chinaMissing = EMPTY_REAL_META.china10yStatus === "missing";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" style={{ fontFamily: "inherit" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="空转收益与实体收益分配">
        {/* 标题 */}
        <text x={W / 2} y={30} textAnchor="middle" fontSize={18} fontWeight={700} fill={AXIS}>
          空转收益与实体收益分配
        </text>

        {/* Y 轴标签与水平虚线网格 */}
        {yTicks.map((v) => {
          const y = yToPx(v);
          return (
            <g key={`y${v}`}>
              <line x1={M.left} y1={y} x2={M.left + PLOT_W} y2={y} stroke={GRID} strokeDasharray="3 3" />
              <text x={M.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6B7280">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={M.left - 40} y={M.top - 14} fontSize={11} fill="#6B7280">单位 %</text>

        {/* X 轴刻度（月末） */}
        {xTicks.map((d) => {
          const t = d.getTime();
          const x = xToPx(t);
          const { ym } = fmtDate(d);
          const isStart = t === t0;
          return (
            <g key={`x${t}`}>
              <line x1={x} y1={M.top} x2={x} y2={M.top + PLOT_H} stroke={GRID_DASH} strokeDasharray="2 4" />
              <text x={x} y={M.top + PLOT_H + 16} textAnchor="middle" fontSize={10} fill="#6B7280">
                {isStart ? fmtDate(d).ymd.slice(2) : ym}
              </text>
            </g>
          );
        })}

        {/* 坐标轴 */}
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PLOT_H} stroke={AXIS} strokeWidth={1} />
        <line x1={M.left} y1={M.top + PLOT_H} x2={M.left + PLOT_W} y2={M.top + PLOT_H} stroke={AXIS} strokeWidth={1} />

        {/* 双曲线 */}
        {hasData && (
          <>
            <path d={svgPath(lines.blue)} fill="none" stroke={BLUE} strokeWidth={1.8} />
            <path d={svgPath(lines.orange)} fill="none" stroke={ORANGE} strokeWidth={1.8} />
            {ellipse && (
              <>
                <ellipse cx={ellipse.cx} cy={ellipse.cy} rx={ellipse.rx} ry={ellipse.ry} fill="none" stroke="#111827" strokeWidth={1.2} />
                <text x={ellipse.cx} y={ellipse.cy - ellipse.ry - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#111827">
                  {ellipseLabel}
                </text>
              </>
            )}
            {endLabels.map((l, i) => (
              <text key={i} x={Math.min(l.x + 6, W - 70)} y={l.y + (i === 0 ? -6 : 12)} fontSize={11} fontWeight={600} fill={l.color}>
                {l.text}
              </text>
            ))}
          </>
        )}

        {/* 悬停 */}
        {hv && hv.real !== null && hv.empty !== null && (
          <>
            <line x1={hx} y1={M.top} x2={hx} y2={M.top + PLOT_H} stroke="#9CA3AF" strokeDasharray="3 3" />
            <circle cx={hx} cy={yToPx(hv.real)} r={3.2} fill={ORANGE} />
            <circle cx={hx} cy={yToPx(hv.empty)} r={3.2} fill={BLUE} />
          </>
        )}

        {/* 待补充横幅 */}
        {!hasData && (
          <g>
            <rect x={M.left + 40} y={M.top + PLOT_H / 2 - 30} width={PLOT_W - 80} height={60} rx={6} fill="#F9FAFB" stroke="#E5E7EB" />
            <text x={W / 2} y={M.top + PLOT_H / 2 - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="#DC2626">
              中债10Y 数据缺失 —— 双曲线暂无法计算
            </text>
            <text x={W / 2} y={M.top + PLOT_H / 2 + 14} textAnchor="middle" fontSize={11} fill="#6B7280">
              其余 4 条 Wind 真实序列（美国10Y / CPI / M2 / GDP）已就位，待中债10Y 接入后即出图
            </text>
          </g>
        )}

        {/* 底部居中图例 */}
        <g transform={`translate(${W / 2 - 90}, ${H - 34})`}>
          <line x1={0} y1={-4} x2={22} y2={-4} stroke={ORANGE} strokeWidth={2.4} />
          <text x={28} y={0} fontSize={12} fill={AXIS}>实体收益（中债10Y − CPI）</text>
          <line x1={250} y1={-4} x2={272} y2={-4} stroke={BLUE} strokeWidth={2.4} />
          <text x={278} y={0} fontSize={12} fill={AXIS}>空转收益（M2 − GDPₗₐg − 中美利差）</text>
        </g>
      </svg>

      {/* 数据来源说明 */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span>数据来源：Wind（Alice）为主</span>
        <span className={chinaMissing ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"}>
          {chinaMissing
            ? "中债10Y（S0059749）：账号权限受限 + 积分耗尽，未取得"
            : `中债10Y：${(EMPTY_REAL_META.sources.china10y as any)?.source ?? "替代源"}（非 Wind，待 Wind 可用后替换）`}
        </span>
        <span>美国10Y / CPI / M2 / GDP：Wind 真实序列（{EMPTY_REAL_META.windowStart} ~ {EMPTY_REAL_META.windowEnd}）</span>
        <span className="text-amber-600">GDP 已前置滞后 {EMPTY_REAL_META.gdpLagDays} 日，避免前视偏差</span>
      </div>

      {/* 悬停浮窗 */}
      {hv && hv.real !== null && hv.empty !== null && (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-700">
          <div className="font-semibold">{hv.date}</div>
          <div>实体收益：{hv.real >= 0 ? "+" : ""}{hv.real.toFixed(2)}%　中债10Y {hv.china10y?.toFixed(2)}% − CPI {hv.cpi?.toFixed(2)}%</div>
          <div>空转收益：{hv.empty >= 0 ? "+" : ""}{hv.empty.toFixed(2)}%　M2 {hv.m2?.toFixed(2)}% − GDPₗₐg {hv.gdpLag?.toFixed(2)}% − 中美利差 {hv.spread?.toFixed(2)}%</div>
        </div>
      )}
    </div>
  );
}
