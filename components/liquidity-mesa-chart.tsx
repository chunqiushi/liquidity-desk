"use client";

import * as React from "react";
import { useMemo } from "react";
import { phaseSineCosine, firstValidIndex, roofFilter } from "@/lib/mesa";

/* 深色主题色（与 globals.css 对齐） */
const C = {
  panel: "#121620",
  panel2: "#1A2130",
  border: "#232B38",
  text: "#E6E9EF",
  muted: "#8B97A8",
  accent: "#38BDF8", // 正弦
  amber: "#FBBF24", // 余弦
  pink: "#F472B6", // 超前正弦
  pos: "#10B981",
  neg: "#F87171",
  grid: "#232B38",
};

const W = 1000;
const PAD_L = 54;
const PAD_R = 16;
const PLOT_W = W - PAD_L - PAD_R;
const MAIN_TOP = 18;
const MAIN_H = 150;
const OSC_TOP = MAIN_TOP + MAIN_H + 26;
const OSC_H = 132;
const PH_TOP = OSC_TOP + OSC_H + 18;
const PH_H = 58;
const H = PH_TOP + PH_H + 20;

function xAt(i: number, n: number): number {
  return PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
}

/** 把带 NaN 的折线序列转成 SVG path，遇到 NaN 断开。 */
function buildPath(pts: { x: number; y: number; v: number }[]): string {
  let d = "";
  let pen = false;
  for (const p of pts) {
    if (!isFinite(p.v)) {
      pen = false;
      continue;
    }
    d += (pen ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1) + " ";
    pen = true;
  }
  return d.trim();
}

function shortDate(s: string): string {
  // "2024-03-15" -> "24-03"
  const p = s.split("-");
  if (p.length < 2) return s;
  return `${p[0].slice(2)}/${p[1]}`;
}

export function LiquidityMesaChart({
  history,
  label,
  unit,
}: {
  history: { date: string; value: number }[];
  label: string;
  unit: string;
}) {
  const out = useMemo(() => {
    const raw = history.map((h) => h.value);
    // B 修复：MESA 作用于「利率相对长期中枢的偏离」（去趋势信号），
    // 而非原始利率水平 —— 原始水平是均值回归随机游走，看不出周期。
    const signal = roofFilter(raw, 250, 10);
    return { raw, signal, m: phaseSineCosine(signal, 50, 10, 50) };
  }, [history]);

  const n = history.length;
  const vals = out.raw;
  const signal = out.signal;
  const m = out.m;
  const fv = firstValidIndex(m.phase);

  // 主图 Y 范围
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);
  const pad = (vmax - vmin) * 0.08 || 0.01;
  const lo = vmin - pad;
  const hi = vmax + pad;
  const yMain = (v: number) => MAIN_TOP + (1 - (v - lo) / (hi - lo || 1)) * MAIN_H;

  const yOsc = (v: number) => OSC_TOP + (1 - (v + 1) / 2) * OSC_H;
  const yPh = (v: number) => PH_TOP + (1 - v / 360) * PH_H;

  // 主图折线
  const mainPts = history.map((h, i) => ({ x: xAt(i, n), y: yMain(h.value), v: h.value }));
  const mainPath = buildPath(mainPts);

  // 副图：实际去趋势偏离（归一显示形态）+ 三条 MESA 振荡器
  const sigMax = Math.max(1e-9, ...signal.map((v) => Math.abs(v)));
  const normSig = signal.map((v) => (v / sigMax) * 0.92);
  const sigPts = normSig.map((v, i) => ({ x: xAt(i, n), y: yOsc(v), v }));
  const sinePts = m.sine.map((v, i) => ({ x: xAt(i, n), y: yOsc(v), v }));
  const cosPts = m.cosine.map((v, i) => ({ x: xAt(i, n), y: yOsc(v), v }));
  const leadPts = m.lead.map((v, i) => ({ x: xAt(i, n), y: yOsc(v), v }));

  // 实际偏离的填充面积（淡色），衬在振荡器下方，直观显示真实波动形态
  const sigAreaPts = sigPts.filter((p) => isFinite(p.v));
  const sigArea =
    sigAreaPts.length > 1
      ? `M ${sigAreaPts[0].x.toFixed(1)} ${yOsc(0).toFixed(1)} ` +
        sigAreaPts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
        ` L ${sigAreaPts[sigAreaPts.length - 1].x.toFixed(1)} ${yOsc(0).toFixed(1)} Z`
      : "";

  // 相位线
  const phPts = m.phase.map((v, i) => ({ x: xAt(i, n), y: yPh(v), v }));

  // 正弦-超前正弦穿越信号（lead 上穿 sine = 多；下穿 = 空）
  const signals: { x: number; y: number; buy: boolean }[] = [];
  for (let i = fv + 1; i < n; i++) {
    const a = m.lead[i - 1] - m.sine[i - 1];
    const b = m.lead[i] - m.sine[i];
    if (!isFinite(a) || !isFinite(b)) continue;
    if (a <= 0 && b > 0) signals.push({ x: xAt(i, n), y: yOsc(m.sine[i]), buy: true });
    else if (a >= 0 && b < 0) signals.push({ x: xAt(i, n), y: yOsc(m.sine[i]), buy: false });
  }

  // 读数
  const curPhase = isFinite(m.phase[n - 1]) ? m.phase[n - 1] : NaN;
  const curDc = isFinite(m.dc[n - 1]) ? m.dc[n - 1] : NaN;
  const curStrength = m.strength;
  const strengthLabel = !isFinite(curStrength)
    ? "—"
    : curStrength >= 0.6
      ? "强"
      : curStrength >= 0.35
        ? "中"
        : "弱";
  const lastSignal = signals.length ? signals[signals.length - 1] : null;

  // 刻度日期
  const ticks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].map((i) => ({
    x: xAt(i, n),
    d: shortDate(history[Math.max(0, Math.min(n - 1, i))].date),
  }));

  // 相位盘（右上角）
  const dialCx = W - 46;
  const dialCy = MAIN_TOP + 34;
  const dialR = 28;
  const phRad = isFinite(curPhase) ? (curPhase * Math.PI) / 180 : 0;
  const dialPx = dialCx + dialR * Math.cos(phRad);
  const dialPy = dialCy - dialR * Math.sin(phRad);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: "block", fontFamily: "var(--font-mono, monospace)" }}
      >
        {/* 主图：日线利率 */}
        <text x={PAD_L} y={MAIN_TOP - 5} fontSize={11} fill={C.muted}>
          主图 · {label} ({unit})
        </text>
        <line x1={PAD_L} y1={MAIN_TOP} x2={PAD_L + PLOT_W} y2={MAIN_TOP} stroke={C.border} />
        <line
          x1={PAD_L}
          y1={MAIN_TOP + MAIN_H}
          x2={PAD_L + PLOT_W}
          y2={MAIN_TOP + MAIN_H}
          stroke={C.border}
        />
        <text x={PAD_L - 6} y={MAIN_TOP + 4} fontSize={9} fill={C.muted} textAnchor="end">
          {hi.toFixed(2)}
        </text>
        <text x={PAD_L - 6} y={MAIN_TOP + MAIN_H} fontSize={9} fill={C.muted} textAnchor="end">
          {lo.toFixed(2)}
        </text>
        <path d={mainPath} fill="none" stroke={C.text} strokeWidth={1.4} />

        {/* 相位盘 */}
        <circle cx={dialCx} cy={dialCy} r={dialR} fill="none" stroke={C.border} />
        <line x1={dialCx - dialR} y1={dialCy} x2={dialCx + dialR} y2={dialCy} stroke={C.border} strokeDasharray="2 2" />
        <line x1={dialCx} y1={dialCy - dialR} x2={dialCx} y2={dialCy + dialR} stroke={C.border} strokeDasharray="2 2" />
        <line x1={dialCx} y1={dialCy} x2={dialPx} y2={dialPy} stroke={C.accent} strokeWidth={1.6} />
        <circle cx={dialPx} cy={dialPy} r={3} fill={C.accent} />
        <text x={dialCx} y={dialCy + dialR + 12} fontSize={9} fill={C.muted} textAnchor="middle">
          相位 {isFinite(curPhase) ? curPhase.toFixed(0) + "°" : "—"}
        </text>

        {/* 副图：去趋势实际偏离 + 正弦/余弦/超前正弦 振荡器 */}
        <text x={PAD_L} y={OSC_TOP - 6} fontSize={11} fill={C.muted}>
          副图 · 去趋势实际偏离（形态归一）+ 相位正余弦指标（Ehlers MESA）
        </text>
        <rect x={PAD_L} y={OSC_TOP} width={PLOT_W} height={OSC_H} fill={C.panel} stroke={C.border} />
        {/* 零轴 */}
        <line
          x1={PAD_L}
          y1={yOsc(0)}
          x2={PAD_L + PLOT_W}
          y2={yOsc(0)}
          stroke={C.muted}
          strokeWidth={0.8}
        />
        <line x1={PAD_L} y1={yOsc(1)} x2={PAD_L + PLOT_W} y2={yOsc(1)} stroke={C.grid} strokeDasharray="2 3" />
        <line x1={PAD_L} y1={yOsc(-1)} x2={PAD_L + PLOT_W} y2={yOsc(-1)} stroke={C.grid} strokeDasharray="2 3" />
        {/* 实际去趋势偏离（填充+描边），衬在振荡器下方，直观显示真实波动形态 */}
        <path d={sigArea} fill="rgba(45,212,191,0.12)" stroke="none" />
        <path d={buildPath(sigPts)} fill="none" stroke="#2DD4BF" strokeWidth={1.4} opacity={0.85} />
        <path d={buildPath(cosPts)} fill="none" stroke={C.amber} strokeWidth={1.2} opacity={0.9} />
        <path d={buildPath(leadPts)} fill="none" stroke={C.pink} strokeWidth={1.2} strokeDasharray="4 3" />
        <path d={buildPath(sinePts)} fill="none" stroke={C.accent} strokeWidth={1.5} />
        {/* 穿越信号 */}
        {signals.map((s, i) => (
          <path
            key={i}
            d={
              s.buy
                ? `M${s.x} ${s.y - 6} l5 9 l-10 0 z`
                : `M${s.x} ${s.y + 6} l5 -9 l-10 0 z`
            }
            fill={s.buy ? C.pos : C.neg}
          />
        ))}
        <text x={PAD_L - 6} y={yOsc(1) + 3} fontSize={9} fill={C.muted} textAnchor="end">
          +1
        </text>
        <text x={PAD_L - 6} y={yOsc(-1) + 3} fontSize={9} fill={C.muted} textAnchor="end">
          -1
        </text>

        {/* 相位带（0–360） */}
        <text x={PAD_L} y={PH_TOP - 6} fontSize={11} fill={C.muted}>
          相位角（0°–360°）
        </text>
        <rect x={PAD_L} y={PH_TOP} width={PLOT_W} height={PH_H} fill={C.panel2} stroke={C.border} />
        {/* 象限淡色带 */}
        {[0, 90, 180, 270].map((q) => (
          <rect
            key={q}
            x={PAD_L}
            y={yPh(q + 90)}
            width={PLOT_W}
            height={(PH_H / 360) * 90}
            fill={q % 180 === 0 ? "rgba(56,189,248,0.05)" : "rgba(251,191,36,0.05)"}
          />
        ))}
        <line x1={PAD_L} y1={yPh(180)} x2={PAD_L + PLOT_W} y2={yPh(180)} stroke={C.grid} strokeDasharray="2 3" />
        <path d={buildPath(phPts)} fill="none" stroke={C.muted} strokeWidth={1.3} />

        {/* X 轴日期 */}
        {ticks.map((t, i) => (
          <text key={i} x={t.x} y={H - 5} fontSize={9} fill={C.muted} textAnchor="middle">
            {t.d}
          </text>
        ))}

        {/* 图例 */}
        <g fontSize={9} fill={C.muted}>
          <rect x={PAD_L + 4} y={OSC_TOP + 4} width={10} height={3} fill="#2DD4BF" />
          <text x={PAD_L + 18} y={OSC_TOP + 8}>实际偏离</text>
          <rect x={PAD_L + 86} y={OSC_TOP + 4} width={10} height={3} fill={C.accent} />
          <text x={PAD_L + 100} y={OSC_TOP + 8}>正弦 Sine</text>
          <rect x={PAD_L + 168} y={OSC_TOP + 4} width={10} height={3} fill={C.amber} />
          <text x={PAD_L + 182} y={OSC_TOP + 8}>余弦 Cos</text>
          <rect x={PAD_L + 250} y={OSC_TOP + 4} width={10} height={3} fill={C.pink} />
          <text x={PAD_L + 264} y={OSC_TOP + 8}>超前正弦 Lead</text>
          <rect x={PAD_L + 348} y={OSC_TOP + 4} width={8} height={8} fill={C.pos} />
          <text x={PAD_L + 360} y={OSC_TOP + 10}>Lead上穿=多</text>
          <rect x={PAD_L + 436} y={OSC_TOP + 4} width={8} height={8} fill={C.neg} />
          <text x={PAD_L + 448} y={OSC_TOP + 10}>下穿=空</text>
        </g>
      </svg>

      {/* 读数条 */}
      <div className="flex flex-wrap gap-2 mt-2 text-2xs">
        <span className="chip bg-panel-2 text-muted border border-border">
          主导周期 {isFinite(curDc) ? curDc.toFixed(1) + " 根" : "—"}
        </span>
        <span className="chip bg-panel-2 text-muted border border-border">
          当前相位 {isFinite(curPhase) ? curPhase.toFixed(0) + "°" : "—"}
        </span>
        <span
          className="chip border"
          style={{
            color:
              strengthLabel === "强"
                ? C.pos
                : strengthLabel === "弱"
                  ? C.neg
                  : C.amber,
            borderColor:
              strengthLabel === "强"
                ? "rgba(16,185,129,0.3)"
                : strengthLabel === "弱"
                  ? "rgba(248,113,113,0.3)"
                  : "rgba(251,191,36,0.3)",
            background:
              strengthLabel === "强"
                ? "rgba(16,185,129,0.12)"
                : strengthLabel === "弱"
                  ? "rgba(248,113,113,0.10)"
                  : "rgba(251,191,36,0.10)",
          }}
        >
          周期强度 {strengthLabel}
          {isFinite(curStrength) ? ` ${(curStrength * 100).toFixed(0)}%` : ""}
        </span>
        <span className="chip bg-panel-2 text-muted border border-border">
          正弦 {m.sine[n - 1].toFixed(2)} · 余弦 {m.cosine[n - 1].toFixed(2)}
        </span>
        {lastSignal ? (
          <span
            className="chip border"
            style={{
              background: lastSignal.buy ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
              color: lastSignal.buy ? C.pos : C.neg,
              borderColor: lastSignal.buy ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)",
            }}
          >
            最近信号：{lastSignal.buy ? "多头（Lead 上穿 Sine）" : "空头（Lead 下穿 Sine）"}
          </span>
        ) : null}
        {strengthLabel === "弱" ? (
          <span
            className="chip border"
            style={{
              color: C.neg,
              borderColor: "rgba(248,113,113,0.3)",
              background: "rgba(248,113,113,0.08)",
            }}
          >
            当前周期偏弱 · 信号偏随机游走，按偏离形态解读即可
          </span>
        ) : null}
      </div>
    </div>
  );
}
