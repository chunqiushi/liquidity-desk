"use client";

import * as React from "react";
import { Card, CardHead, Badge } from "@/components/ui";
import {
  getFxData,
  FX_META,
  type FxPeriod,
} from "@/lib/fx-heatmap-data";

const PERIODS: { key: FxPeriod; label: string }[] = [
  { key: "1d", label: "1日" },
  { key: "1w", label: "1周" },
  { key: "1m", label: "1月" },
];

// 红=升值 / 绿=贬值（遵循站点涨=红、跌=绿配色约定）
function heatColor(v: number, maxAbs: number): string {
  const t = Math.max(-1, Math.min(1, v / maxAbs));
  const a = 0.12 + 0.62 * Math.abs(t);
  return t >= 0 ? `rgba(248,113,113,${a.toFixed(3)})` : `rgba(52,211,153,${a.toFixed(3)})`;
}
function heatText(v: number, maxAbs: number): string {
  const t = Math.abs(v) / maxAbs;
  return t > 0.5 ? "#f8fafc" : "#cbd5e1";
}
function fmtPct(v: number): string {
  if (Math.abs(v) < 0.005) return "0.00";
  return (v >= 0 ? "+" : "") + v.toFixed(2);
}

export function FxHeatmap() {
  const data = React.useMemo(() => getFxData(), []);
  const [period, setPeriod] = React.useState<FxPeriod>("1w");

  const matrix = data.matrix[period];
  const strength = data.strength[period];

  // 颜色归一化上限（地板 0.5，避免极小变动被拉满）
  let obsMax = 0.5;
  for (const row of matrix)
    for (const v of row) if (isFinite(v)) obsMax = Math.max(obsMax, Math.abs(v));
  const maxAbs = obsMax;

  const n = data.codes.length;
  const cell = 60;
  const lx = 72; // 左侧标签列宽
  const ty = 34; // 顶部标签行高
  const padR = 12;
  const padB = 12;
  const W = lx + n * cell + padR;
  const H = ty + n * cell + padB;

  const metaByCode: Record<string, (typeof FX_META)[number]> = {};
  FX_META.forEach((m) => (metaByCode[m.code] = m));

  // 货币强弱排序（降序）
  const sorted = data.codes
    .map((c, i) => ({ code: c, v: strength[i] }))
    .sort((a, b) => b.v - a.v);

  return (
    <Card>
      <CardHead
        title="外汇热力图 · 八国货币相对强弱"
        subtitle={`交叉涨跌幅（%）· 红=行货币升值 绿=行货币贬值 · 截至 ${data.asof} · 真实数据 (FRED)`}
        right={
          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-accent text-white"
                    : "bg-panel-2 text-muted hover:text-content"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="p-3 space-y-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="外汇热力图">
          {/* 列标签（报价货币） */}
          {data.codes.map((c, j) => (
            <text
              key={`col-${c}`}
              x={lx + j * cell + cell / 2}
              y={ty - 12}
              textAnchor="middle"
              fontSize={11}
              fill="rgb(var(--text-muted))"
            >
              {metaByCode[c].flag} {c}
            </text>
          ))}
          {/* 行标签 + 单元格 */}
          {data.codes.map((ci, i) => (
            <g key={`row-${ci}`}>
              <text
                x={lx - 8}
                y={ty + i * cell + cell / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="rgb(var(--text-muted))"
              >
                {metaByCode[ci].flag} {ci}
              </text>
              {data.codes.map((cj, j) => {
                const v = matrix[i][j];
                const x = lx + j * cell;
                const y = ty + i * cell;
                const isDiag = i === j;
                return (
                  <g key={`cell-${i}-${j}`}>
                    {isDiag ? (
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={cell - 2}
                        height={cell - 2}
                        rx={3}
                        fill="rgb(var(--border))"
                        fillOpacity={0.35}
                      />
                    ) : (
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={cell - 2}
                        height={cell - 2}
                        rx={3}
                        fill={heatColor(v, maxAbs)}
                      />
                    )}
                    <text
                      x={x + cell / 2}
                      y={y + cell / 2 + 4}
                      textAnchor="middle"
                      fontSize={10.5}
                      fontWeight={600}
                      fill={isDiag ? "rgb(var(--text-muted))" : heatText(v, maxAbs)}
                    >
                      {isDiag ? "—" : fmtPct(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        {/* 图例 */}
        <div className="flex items-center gap-3 flex-wrap text-2xs text-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3.5 h-3.5 rounded-sm"
              style={{ background: "rgba(248,113,113,0.7)" }}
            />
            行货币升值
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3.5 h-3.5 rounded-sm"
              style={{ background: "rgba(52,211,153,0.7)" }}
            />
            行货币贬值
          </span>
          <span className="text-muted/70">颜色越深=变动越大；对角为自身（不适用）。</span>
        </div>

        {/* 货币相对强弱条 */}
        <div>
          <div className="text-2xs font-semibold text-muted mb-1.5">货币相对强弱（对全部他国交叉涨跌幅均值）</div>
          <div className="flex flex-col gap-1">
            {sorted.map((s) => {
              const pct = Math.max(-100, Math.min(100, (s.v / maxAbs) * 100));
              const w = Math.abs(pct);
              const color = s.v >= 0 ? "#F87171" : "#34D399";
              return (
                <div key={s.code} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-2xs tnum text-content/80">
                    {metaByCode[s.code].flag} {s.code}
                  </span>
                  <div className="relative flex-1 h-4 rounded bg-panel-2 overflow-hidden">
                    {/* 中线 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/70" />
                    {s.v >= 0 ? (
                      <div
                        className="absolute left-1/2 top-0 bottom-0 rounded-r"
                        style={{ width: `${w / 2}%`, background: color }}
                      />
                    ) : (
                      <div
                        className="absolute right-1/2 top-0 bottom-0 rounded-l"
                        style={{ width: `${w / 2}%`, background: color }}
                      />
                    )}
                  </div>
                  <span className="w-14 shrink-0 text-right text-2xs tnum font-semibold" style={{ color }}>
                    {fmtPct(s.v)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-2xs text-muted leading-snug">
          读法：单元格 (行, 列) = 在所选周期内，<b>行货币</b>相对<b>列货币</b>的涨跌幅。
          例如「USD 行 × EUR 列」为正，即美元相对欧元升值。矩阵反对称，读某一列可看该货币相对其余所有货币的表现。
        </p>
      </div>
    </Card>
  );
}

export { FX_META as FX_META_EXPORT };
