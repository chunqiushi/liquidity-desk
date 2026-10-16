"use client";

import * as React from "react";
import { Card, CardHead, SectionLabel } from "@/components/ui";
import {
  BOND_DATES,
  GZ,
  GK,
  DR,
  GC,
  dGZ,
  dGK,
  dDR,
  dGC,
  BOND_EVENTS,
  DAILY,
  type EventType,
} from "@/lib/bond-review";

const C_GZ = "#60A5FA"; // 10Y 国债活跃券（主轴）
const C_GK = "#FBBF24"; // 10Y 国开活跃券（次轴）
const C_POLICY = "#CBD5E1"; // 政策/宏观（黑字语义 → 暗色下浅色）
const C_ANOMALY = "#F87171"; // 市场异动（红字语义）

function evColor(t: EventType) {
  return t === "anomaly" ? C_ANOMALY : C_POLICY;
}

function bp(v: number | null): string {
  if (v === null) return "盘中";
  const cls = v > 0 ? "text-neg" : v < 0 ? "text-pos" : "text-muted";
  const s = (v >= 0 ? "+" : "") + v.toFixed(2) + "bp";
  return `<span class="${cls}">${s}</span>`;
}

/** 双序列迷你 sparkline（用于按日复盘的资金/利率走势列） */
function DualSpark({
  a,
  b,
  ca,
  cb,
}: {
  a: number[];
  b: number[];
  ca: string;
  cb: string;
}) {
  const W = 168;
  const H = 46;
  const pad = 4;
  const all = [...a, ...b];
  const mn = Math.min(...all);
  const mx = Math.max(...all);
  const X = (i: number) => pad + ((W - 2 * pad) * i) / (a.length - 1);
  const Y = (v: number) => H - pad - ((H - 2 * pad) * (v - mn)) / (mx - mn || 1);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="mt-1.5" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={path(a)} fill="none" stroke={ca} strokeWidth={1.6} />
      <path d={path(b)} fill="none" stroke={cb} strokeWidth={1.6} strokeDasharray="3 2" />
      {a.map((v, i) => (
        <circle key={i} cx={X(i)} cy={Y(v)} r={i === a.length - 1 ? 2.4 : 1.4} fill={ca} />
      ))}
      <text x={2} y={10} fontSize={8.5} fill={ca}>
        国债
      </text>
      <text x={2} y={20} fontSize={8.5} fill={cb}>
        国开
      </text>
    </svg>
  );
}

/* ===================================================================
 * 主图：10Y 国债 + 10Y 国开 双线 + 事件时间线 + 悬停 tooltip
 * =================================================================== */
export function BondYieldChart() {
  const [showGZ, setShowGZ] = React.useState(true);
  const [showGK, setShowGK] = React.useState(true);
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const W = 940;
  const H = 400;
  const ml = 56;
  const mr = 24;
  const mt = 42;
  const mb = 56;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const n = BOND_DATES.length;

  const lo = Math.min(...GZ, ...GK);
  const hi = Math.max(...GZ, ...GK);
  const padY = (hi - lo) * 0.18 || 0.01;
  const yMin = lo - padY;
  const yMax = hi + padY;

  const X = (i: number) => ml + (iw * i) / (n - 1);
  const Y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const yTicks = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) * i) / 5);
  const xTicks = BOND_DATES.map((_, i) => i);

  const linePath = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const areaPath = (arr: number[]) =>
    `${linePath(arr)} L ${X(n - 1).toFixed(1)} ${Y(yMin).toFixed(1)} L ${X(0).toFixed(1)} ${Y(yMin).toFixed(1)} Z`;

  // 事件按 idx 分组（同一天多个事件横向错开）
  const byIdx = React.useMemo(() => {
    const m: Record<number, typeof BOND_EVENTS> = {};
    BOND_EVENTS.forEach((e) => {
      (m[e.idx] ||= []).push(e);
    });
    return m;
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vbX - ml) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hv = hover;
  const tipX = hv !== null ? Math.min(Math.max(X(hv), ml + 8), W - mr - 150) : 0;

  return (
    <Card>
      <CardHead
        title="10Y 国债 / 国开活跃券收益率走势"
        subtitle="2026-09-22 至 2026-09-29 · 日频收盘 (%) · 收益率下行 = 债市上涨（绿）"
        right={
          <div className="flex items-center gap-2 text-2xs">
            <button
              onClick={() => setShowGZ((v) => !v)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors"
              style={{
                borderColor: showGZ ? C_GZ : "rgb(var(--border))",
                color: showGZ ? C_GZ : "rgb(var(--text-muted))",
                opacity: showGZ ? 1 : 0.5,
              }}
            >
              <span className="w-3 h-0.5 rounded" style={{ background: C_GZ }} />
              10Y 国债
            </button>
            <button
              onClick={() => setShowGK((v) => !v)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors"
              style={{
                borderColor: showGK ? C_GK : "rgb(var(--border))",
                color: showGK ? C_GK : "rgb(var(--text-muted))",
                opacity: showGK ? 1 : 0.5,
              }}
            >
              <span
                className="w-3 h-0.5 rounded"
                style={{ background: C_GK, borderTop: `1px dashed ${C_GK}` }}
              />
              10Y 国开
            </button>
          </div>
        }
      />
      <div className="p-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="10Y国债与国开活跃券收益率走势"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="bondGzGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C_GZ} stopOpacity={0.28} />
              <stop offset="100%" stopColor={C_GZ} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* 网格 + Y 轴标签 */}
          {yTicks.map((gv, i) => (
            <g key={i}>
              <line
                x1={ml}
                y1={Y(gv)}
                x2={ml + iw}
                y2={Y(gv)}
                stroke="rgb(var(--border))"
                strokeOpacity={0.5}
              />
              <text x={ml - 8} y={Y(gv) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
                {gv.toFixed(3)}
              </text>
            </g>
          ))}

          {/* Y 轴标题 */}
          <text
            x={16}
            y={mt + ih / 2}
            textAnchor="middle"
            fontSize={11}
            fill="rgb(var(--text-muted))"
            transform={`rotate(-90 16 ${mt + ih / 2})`}
          >
            收益率 (%)
          </text>

          {/* 事件竖向引导线 */}
          {BOND_EVENTS.map((ev, k) => {
            const grp = byIdx[ev.idx] ?? [];
            const off = (grp.indexOf(ev) - (grp.length - 1) / 2) * 13;
            const x = X(ev.idx) + off;
            return (
              <line
                key={k}
                x1={x}
                y1={mt}
                x2={x}
                y2={mt + ih}
                stroke={evColor(ev.type)}
                strokeOpacity={0.28}
                strokeDasharray="3 3"
              />
            );
          })}

          {/* 国开（次轴，虚线） */}
          {showGK && (
            <path
              d={linePath(GK)}
              fill="none"
              stroke={C_GK}
              strokeWidth={1.8}
              strokeDasharray="5 3"
              strokeLinejoin="round"
            />
          )}
          {/* 国债（主轴，面积 + 实线） */}
          {showGZ && <path d={areaPath(GZ)} fill="url(#bondGzGrad)" />}
          {showGZ && (
            <path d={linePath(GZ)} fill="none" stroke={C_GZ} strokeWidth={2.2} strokeLinejoin="round" />
          )}

          {/* 事件标记：曲线上的菱形 + 时间线圆点 */}
          {BOND_EVENTS.map((ev, k) => {
            const grp = byIdx[ev.idx] ?? [];
            const off = (grp.indexOf(ev) - (grp.length - 1) / 2) * 13;
            const x = X(ev.idx) + off;
            const col = evColor(ev.type);
            return (
              <g key={k}>
                {showGZ && (
                  <rect
                    x={x - 3.4}
                    y={Y(GZ[ev.idx]) - 3.4}
                    width={6.8}
                    height={6.8}
                    transform={`rotate(45 ${x} ${Y(GZ[ev.idx])})`}
                    fill={col}
                    stroke="#0b1220"
                    strokeWidth={1}
                  />
                )}
                <circle cx={x} cy={mt + ih + 18} r={6} fill={col} stroke="#0b1220" strokeWidth={1} />
                <text
                  x={x}
                  y={mt + ih + 21.5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="#0b1220"
                >
                  {k + 1}
                </text>
              </g>
            );
          })}

          {/* X 轴日期 */}
          {xTicks.map((i) => (
            <text
              key={i}
              x={X(i)}
              y={H - 14}
              textAnchor="middle"
              fontSize={10}
              fill="rgb(var(--text-muted))"
              fontWeight={i === n - 1 ? 700 : 400}
            >
              {i === n - 1 ? "09-29*" : BOND_DATES[i]}
            </text>
          ))}

          {/* 悬停 tooltip */}
          {hv !== null && (
            <g pointerEvents="none">
              <line x1={X(hv)} y1={mt} x2={X(hv)} y2={mt + ih} stroke="rgb(var(--text))" strokeOpacity={0.4} />
              {showGZ && <circle cx={X(hv)} cy={Y(GZ[hv])} r={3.4} fill={C_GZ} stroke="#0b1220" />}
              {showGK && <circle cx={X(hv)} cy={Y(GK[hv])} r={3.4} fill={C_GK} stroke="#0b1220" />}
              <rect
                x={tipX}
                y={mt + 6}
                width={148}
                height={74}
                rx={6}
                fill="rgb(var(--panel))"
                stroke="rgb(var(--border))"
              />
              <text x={tipX + 9} y={mt + 22} fontSize={10.5} fontWeight={700} fill="rgb(var(--text))">
                {BOND_DATES[hv]}
                {hv === n - 1 ? "（盘中）" : ""}
              </text>
              <text x={tipX + 9} y={mt + 38} fontSize={10} fill={C_GZ}>
                国债 {GZ[hv].toFixed(4)}%
              </text>
              <text x={tipX + 86} y={mt + 38} fontSize={10} fill={C_GZ}>
                {dGZ[hv] === null ? "盘中" : (dGZ[hv]! >= 0 ? "+" : "") + dGZ[hv]!.toFixed(2) + "bp"}
              </text>
              <text x={tipX + 9} y={mt + 53} fontSize={10} fill={C_GK}>
                国开 {GK[hv].toFixed(4)}%
              </text>
              <text x={tipX + 86} y={mt + 53} fontSize={10} fill={C_GK}>
                {dGK[hv] === null ? "盘中" : (dGK[hv]! >= 0 ? "+" : "") + dGK[hv]!.toFixed(2) + "bp"}
              </text>
              <text x={tipX + 9} y={mt + 69} fontSize={9.5} fill="rgb(var(--text-muted))">
                利差 {((GK[hv] - GZ[hv]) * 100).toFixed(1)}bp
              </text>
            </g>
          )}
        </svg>

        {/* 图例说明 */}
        <div className="flex flex-wrap items-center gap-4 mt-2 text-2xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: C_POLICY }} />
            政策 / 央行操作 / 宏观（黑字语义）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: C_ANOMALY }} />
            市场异动（红字语义）
          </span>
          <span>* 09-29 为报告日盘中，收盘未定稿</span>
        </div>
      </div>
    </Card>
  );
}

/* ===================================================================
 * 事件图例（主图下方，编号 ↔ 详情）
 * =================================================================== */
export function BondEventLegend() {
  return (
    <Card>
      <CardHead title="事件标注" subtitle="编号对应走势图时间线 · 政策/宏观 vs 市场异动" />
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {BOND_EVENTS.map((ev, i) => {
          const col = evColor(ev.type);
          return (
            <div key={i} className="flex gap-2.5">
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: col, color: "#0b1220" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="tnum text-2xs font-semibold text-content">{ev.date}</span>
                  <span
                    className="text-[10px] px-1 py-px rounded-sm"
                    style={{ color: col, background: `${col}1f`, border: `1px solid ${col}55` }}
                  >
                    {ev.type === "anomaly" ? "市场异动" : "政策/宏观"}
                  </span>
                </div>
                <div className="text-2xs font-medium text-content mt-0.5 leading-snug">{ev.title}</div>
                <div className="text-2xs text-muted leading-snug mt-0.5">{ev.detail}</div>
                <div className="text-[10px] text-muted/70 mt-0.5">来源：{ev.source}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ===================================================================
 * 二、按日复盘（倒序，4 列）
 * =================================================================== */
export function BondDailyTable() {
  return (
    <Card>
      <CardHead
        title="按日复盘（交易日倒序）"
        subtitle="四列：资金走势 / 资金面 / 利率走势 / 债市研判 · 红=上行(债市承压) 绿=下行(债市走强)"
      />
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse">
          <thead>
            <tr className="text-muted border-b border-border/60">
              <th className="text-left font-medium px-2 py-1.5 whitespace-nowrap">交易日</th>
              <th className="text-left font-medium px-2 py-1.5">资金走势</th>
              <th className="text-left font-medium px-2 py-1.5">资金面</th>
              <th className="text-left font-medium px-2 py-1.5">利率走势</th>
              <th className="text-left font-medium px-2 py-1.5">债市研判</th>
            </tr>
          </thead>
          <tbody>
            {DAILY.map((r) => (
              <tr key={r.date} className="border-b border-border/30 align-top hover:bg-panel-2/40">
                <td className="px-2 py-2 whitespace-nowrap">
                  <div className="font-semibold text-content">{r.date}</div>
                  {r.intraday && <div className="text-[10px] text-muted italic">盘中</div>}
                </td>
                <td className="px-2 py-2">
                  <div className="text-content">
                    DR007 <span className="font-semibold">{r.dr.toFixed(4)}</span>{" "}
                    <span dangerouslySetInnerHTML={{ __html: bp(r.drChg) }} />
                  </div>
                  <div className="text-content mt-0.5">
                    GC007 <span className="font-semibold">{r.gc.toFixed(3)}</span>{" "}
                    <span dangerouslySetInnerHTML={{ __html: bp(r.gcChg) }} />
                  </div>
                  <DualSpark a={DR} b={GC} ca={C_GZ} cb={C_GK} />
                </td>
                <td className="px-2 py-2 text-muted leading-relaxed normal-case">{r.fundText}</td>
                <td className="px-2 py-2">
                  <div className="text-content">
                    国债 <span className="font-semibold">{r.gz.toFixed(4)}</span>{" "}
                    <span dangerouslySetInnerHTML={{ __html: bp(r.gzChg) }} />
                  </div>
                  <div className="text-content mt-0.5">
                    国开 <span className="font-semibold">{r.gk.toFixed(4)}</span>{" "}
                    <span dangerouslySetInnerHTML={{ __html: bp(r.gkChg) }} />
                  </div>
                  <DualSpark a={GZ} b={GK} ca={C_GZ} cb={C_GK} />
                </td>
                <td className="px-2 py-2 text-muted leading-relaxed normal-case">{r.judgeText}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-2xs text-muted mt-2 leading-snug">
          数据来源：Wind（万得）实时/最新数据，经 wind-finance 接口提取。10Y 国债/国开均为活跃券收盘到期收益率（%）；
          DR007 = 存款类机构质押式回购加权利率（7天）；GC007 = 交易所 7 天回购利率。收益率与价格反向，
          收益率下行 = 债市上涨。09-29 为报告日盘中，相关数值以“盘中”标注。
        </p>
      </div>
    </Card>
  );
}
