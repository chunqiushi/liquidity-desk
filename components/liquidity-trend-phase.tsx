"use client";

import * as React from "react";
import { type EconomyLiquidity, type LiqValue } from "@/lib/liquidity";
import { fitCycle } from "@/lib/phase";
import { fmtNum } from "@/lib/utils";

/* ============================================================
 * 货币市场 · 各国关键指标走势 + 正余弦/相位副图
 * 主区：各国角色指标（核心短端 / 政策 / 数量 / 央行资产 / 信用）各自 sparkline
 * 副图：以核心短端利率为基准的周期分解 —— 残差 + 拟合 sin/cos + 相位角
 * 正余弦/相位仅作"衍生研究指标"，明确标注非预测 / 非交易信号 / 不做因果解释。
 * 纯 SVG，规避 Recharts 静态导出 Invariant failed。
 * ============================================================ */

const SPARK_COLORS = ["#1F4E79", "#E8743B", "#3FA34D", "#B5179E", "#2E86C1"];

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 220;
  const h = 46;
  const ml = 4;
  const mr = 4;
  const mt = 4;
  const mb = 4;
  const iw = w - ml - mr;
  const ih = h - mt - mb;
  if (values.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || 0.01;
  const yMin = min - pad;
  const yMax = max + pad;
  const x = (j: number) => ml + (j * iw) / (values.length - 1);
  const y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const d = values.map((v, j) => `${j === 0 ? "M" : "L"} ${x(j).toFixed(1)},${y(v).toFixed(2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

function PhaseSubplot({ fit, color }: { fit: ReturnType<typeof fitCycle>; color: string }) {
  const W = 1100;
  const H = 230;
  const M = { top: 22, right: 150, bottom: 34, left: 46 };
  const IW = W - M.left - M.right;
  const IH = H - M.top - M.bottom;

  // 降采样到 ~240 点
  const step = Math.max(1, Math.floor(fit.residual.length / 240));
  const idx: number[] = [];
  for (let i = 0; i < fit.residual.length; i += step) idx.push(i);
  if (idx[idx.length - 1] !== fit.residual.length - 1) idx.push(fit.residual.length - 1);
  const m = idx.length;

  const res = idx.map((k) => fit.residual[k]);
  const sin = idx.map((k) => fit.fittedSin[k]);
  const cos = idx.map((k) => fit.fittedCos[k]);
  const all = [...res, ...sin, ...cos];
  const mx = Math.max(...all.map((v) => Math.abs(v)), 1e-6) * 1.15;

  const x = (j: number) => M.left + (j * IW) / (m - 1);
  const y = (v: number) => M.top + IH / 2 - (v / mx) * (IH / 2 - 6);
  const path = (arr: number[]) => arr.map((v, j) => `${j === 0 ? "M" : "L"} ${x(j).toFixed(1)},${y(v).toFixed(2)}`).join(" ");

  // 单位圆（右上角 inset）
  const cx = W - M.right + 60;
  const cy = M.top + 60;
  const R = 46;
  const phi = (fit.phaseDeg * Math.PI) / 180;
  const px = cx + R * Math.cos(phi);
  const py = cy - R * Math.sin(phi);

  const ticks = [-mx, 0, mx];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-x-3">
        <h4 className="text-sm font-semibold text-slate-800">正余弦指标与相位（以核心短端利率为基准）</h4>
        <span className="text-2xs text-slate-500">
          周期 {fit.T} 日 · 相位 {fit.phaseDeg.toFixed(0)}° · 振幅 {fmtNum(fit.amplitude, 4)}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* 零线 / 网格 */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={M.left}
              y1={y(t)}
              x2={M.left + IW}
              y2={y(t)}
              stroke={t === 0 ? "#94A3B8" : "#E2E8F0"}
              strokeDasharray={t === 0 ? undefined : "3 3"}
            />
            <text x={M.left - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#64748B">
              {t.toFixed(3)}
            </text>
          </g>
        ))}
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + IH} stroke="#475569" />
        <line x1={M.left} y1={M.top + IH} x2={M.left + IW} y2={M.top + IH} stroke="#475569" />

        {/* 残差（浅灰） */}
        <path d={path(res)} fill="none" stroke="#CBD5E1" strokeWidth={1} />
        {/* 拟合正弦（青） */}
        <path d={path(sin)} fill="none" stroke="#0E9F6E" strokeWidth={1.8} />
        {/* 拟合余弦（橙） */}
        <path d={path(cos)} fill="none" stroke="#DD6B20" strokeWidth={1.8} />

        {/* 图例 */}
        <g>
          <rect x={M.left + 6} y={M.top + 6} width={10} height={3} fill="#0E9F6E" />
          <text x={M.left + 20} y={M.top + 10} fontSize={10} fill="#475569">sin</text>
          <rect x={M.left + 56} y={M.top + 6} width={10} height={3} fill="#DD6B20" />
          <text x={M.left + 70} y={M.top + 10} fontSize={10} fill="#475569">cos</text>
          <rect x={M.left + 110} y={M.top + 6} width={10} height={3} fill="#CBD5E1" />
          <text x={M.left + 124} y={M.top + 10} fontSize={10} fill="#475569">残差</text>
        </g>

        {/* 单位圆 + 相位点 */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#475569" strokeWidth={1.2} />
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="#E2E8F0" />
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="#E2E8F0" />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={2} />
        <circle cx={px} cy={py} r={4} fill={color} />
        <text x={cx} y={cy + R + 16} textAnchor="middle" fontSize={11} fill="#475569">相位 {fit.phaseDeg.toFixed(0)}°</text>
      </svg>

      <div className="text-2xs text-muted mt-1">
        衍生研究指标（周期分解）· 非预测 / 非交易信号 / 不做因果解释。相位 = 拟合 sin/cos 的相位角，仅描述现有序列的周期位置。
      </div>
    </div>
  );
}

export function LiquidityTrendPhase({ eco }: { eco: EconomyLiquidity }) {
  const roles = [eco.coreFunding, eco.policyRate, eco.liquidityQuantity, eco.centralBankAssets, eco.credit].filter(
    Boolean,
  ) as LiqValue[];

  const coreValues = React.useMemo(
    () => eco.coreFunding.history.map((p) => p.value),
    [eco.coreFunding],
  );
  const fit = React.useMemo(() => fitCycle(coreValues), [coreValues]);

  return (
    <div className="space-y-4">
      {/* 角色指标 sparkline 网格 */}
      <div>
        <div className="text-2xs text-slate-500 mb-2">关键指标走势（各指标独立缩放）</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {roles.map((r, i) => (
            <div key={r.id} className="border border-slate-200 rounded-md p-2 bg-white">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xs font-medium text-slate-700 truncate">{r.label}</span>
                <span className="text-2xs tnum font-semibold text-slate-800 ml-1 shrink-0">
                  {fmtNum(r.value, 2)}
                  <span className="text-[10px] text-slate-400 ml-0.5">{r.unit}</span>
                </span>
              </div>
              <Sparkline values={r.history.map((p) => p.value)} color={SPARK_COLORS[i % SPARK_COLORS.length]} />
            </div>
          ))}
        </div>
      </div>

      {/* 正余弦 / 相位 副图 */}
      <PhaseSubplot fit={fit} color="#1F4E79" />
    </div>
  );
}
