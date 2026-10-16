"use client";

import * as React from "react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { REGION_COLORS } from "@/components/research-ui";
import {
  getYieldCurves,
  TENORS,
  TENOR_KEYS,
  type CountryYield,
} from "@/lib/yield-curve";

const colorOf = (code: string) => REGION_COLORS[code] ?? "#888888";

/* 涨跌 bp 着色：收益率上行=红、下行=绿（与站内 --neg/--pos 约定一致） */
function bpsClass(bps: number): string {
  if (bps > 0.05) return "text-neg";
  if (bps < -0.05) return "text-pos";
  return "text-muted";
}
function fmtBps(bps: number): string {
  const s = bps.toFixed(1);
  return bps > 0.05 ? "+" + s : s;
}

/* ---------------------------------------------------------------------------
 * ① 八国曲线小倍数总览
 * ------------------------------------------------------------------------- */
function MiniBars({ c }: { c: CountryYield }) {
  const maxAbs = Math.max(0.5, ...TENOR_KEYS.map((k) => Math.abs(c.dailyBps[k])));
  return (
    <div className="flex items-end gap-[2px] h-8 mt-2 px-1">
      {TENOR_KEYS.map((k) => {
        const b = c.dailyBps[k];
        const h = 4 + (Math.abs(b) / maxAbs) * 26;
        return (
          <div key={k} className="flex-1 flex flex-col items-center justify-end" title={`${k}: ${fmtBps(b)} bp`}>
            <div
              className={bpsClass(b)}
              style={{ height: `${h}px`, width: "70%", borderRadius: 1, background: "currentColor", opacity: 0.85 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function YieldCurveMini({ c }: { c: CountryYield }) {
  const color = colorOf(c.code);
  const W = 300, H = 150, PL = 32, PR = 8, PT = 8, PB = 20;
  const iw = W - PL - PR, ih = H - PT - PB;
  const all = TENOR_KEYS.flatMap((k) => [c.current[k], c.prev[k]]);
  let yMin = Math.min(...all), yMax = Math.max(...all);
  const pad = (yMax - yMin) * 0.18 || 0.1;
  yMin -= pad; yMax += pad;
  const x = (i: number) => PL + (TENOR_KEYS.length === 1 ? 0 : (i * iw) / (TENOR_KEYS.length - 1));
  const y = (v: number) => PT + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const curPath = TENOR_KEYS.map((k, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)},${y(c.current[k]).toFixed(1)}`).join(" ");
  const prevPath = TENOR_KEYS.map((k, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)},${y(c.prev[k]).toFixed(1)}`).join(" ");
  const ticks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <Card>
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-content">
          <span className="text-base">{c.flag}</span>
          {c.name}
          <span className="text-2xs font-normal text-muted">{c.currency}</span>
        </div>
        <Badge tone={c.move.dir === "up" ? "neg" : c.move.dir === "down" ? "pos" : "neutral"} className={c.move.cls}>
          {c.move.label}
        </Badge>
      </div>
      <div className="px-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={y(t)} x2={PL + iw} y2={y(t)} stroke="rgb(var(--border))" strokeDasharray="2 3" />
              <text x={PL - 3} y={y(t) + 3} textAnchor="end" fontSize={8} fill="rgb(var(--text-muted))">
                {t.toFixed(1)}
              </text>
            </g>
          ))}
          <path d={prevPath} fill="none" stroke="rgb(var(--text-muted))" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
          <path d={curPath} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          {TENOR_KEYS.map((k, i) => (
            <circle key={k} cx={x(i)} cy={y(c.current[k])} r={1.8} fill={color} />
          ))}
          {TENOR_KEYS.map((k, i) =>
            i % 2 === 0 ? (
              <text key={k} x={x(i)} y={H - 6} textAnchor="middle" fontSize={7.5} fill="rgb(var(--text-muted))">
                {k}
              </text>
            ) : null,
          )}
        </svg>
        <MiniBars c={c} />
        <div className="flex justify-between text-2xs px-1 pb-2 text-muted">
          <span>10Y <span className="text-content font-medium">{c.current["10Y"].toFixed(2)}%</span></span>
          <span>2Y <span className="text-content font-medium">{c.current["2Y"].toFixed(2)}%</span></span>
          <span>日变 <span className={bpsClass(c.parallelBps)}>{fmtBps(c.parallelBps)}bp</span></span>
        </div>
      </div>
    </Card>
  );
}

export function AllCountriesCurves({ curves }: { curves: CountryYield[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {curves.map((c) => (
        <YieldCurveMini key={c.code} c={c} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ② 单国曲线精读（当日 vs 前日）
 * ------------------------------------------------------------------------- */
function DailyBars({ c }: { c: CountryYield }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1 text-2xs text-muted">
        {TENOR_KEYS.map((k) => (
          <div key={k} className="flex-1 text-center">
            {k}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-9">
        {TENOR_KEYS.map((k) => {
          const b = c.dailyBps[k];
          const h = 6 + Math.min(30, Math.abs(b) * 4);
          return (
            <div key={k} className="flex-1 flex flex-col items-center justify-end" title={`${k}: ${fmtBps(b)} bp`}>
              <span className={`text-[9px] leading-none ${bpsClass(b)}`}>{fmtBps(b)}</span>
              <div
                className={bpsClass(b)}
                style={{ height: `${h}px`, width: "80%", borderRadius: 1, background: "currentColor", opacity: 0.9, marginTop: 1 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CountryCurveDetail({ c }: { c: CountryYield }) {
  const color = colorOf(c.code);
  const W = 760, H = 340, PL = 44, PR = 12, PT = 16, PB = 28;
  const iw = W - PL - PR, ih = H - PT - PB;
  const all = TENOR_KEYS.flatMap((k) => [c.current[k], c.prev[k], c.policyRate]);
  let yMin = Math.min(...all), yMax = Math.max(...all);
  const pad = (yMax - yMin) * 0.15 || 0.1;
  yMin -= pad; yMax += pad;
  const x = (i: number) => PL + (TENOR_KEYS.length === 1 ? 0 : (i * iw) / (TENOR_KEYS.length - 1));
  const y = (v: number) => PT + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const curPath = TENOR_KEYS.map((k, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)},${y(c.current[k]).toFixed(1)}`).join(" ");
  const prevPath = TENOR_KEYS.map((k, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)},${y(c.prev[k]).toFixed(1)}`).join(" ");
  const gridVals = (() => {
    const out: number[] = [];
    const step = (yMax - yMin) / 5;
    for (let i = 0; i <= 5; i++) out.push(yMin + step * i);
    return out;
  })();
  const labelKeys = ["2Y", "10Y", "30Y"];

  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-2">
            <span className="text-base">{c.flag}</span>
            {c.name}
            <span className="text-2xs font-normal text-muted">{c.currency} · {c.cb}</span>
          </span>
        }
        subtitle={`政策利率 ${c.policyRate.toFixed(2)}% · 形态 ${c.shape.label} · 截至 ${c.asOf}`}
        right={
          <Badge tone={c.move.dir === "up" ? "neg" : c.move.dir === "down" ? "pos" : "neutral"} className={c.move.cls}>
            {c.move.label}
          </Badge>
        }
      />
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap gap-2 text-2xs">
          <span className="chip bg-panel-2 border border-border text-muted">
            平行平移 <b className={bpsClass(c.parallelBps)}>{fmtBps(c.parallelBps)} bp</b>
          </span>
          <span className="chip bg-panel-2 border border-border text-muted">
            斜率(10Y−2Y)变化 <b className={bpsClass(c.slopeBps)}>{fmtBps(c.slopeBps)} bp</b>
          </span>
          <span className="chip bg-panel-2 border border-border text-muted">
            10Y 日变 <b className={bpsClass(c.dailyBps["10Y"])}>{fmtBps(c.dailyBps["10Y"])} bp</b>
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* 网格 + Y 轴 */}
          {gridVals.map((t, i) => (
            <g key={i}>
              <line x1={PL} y1={y(t)} x2={PL + iw} y2={y(t)} stroke="rgb(var(--border))" strokeDasharray="2 3" />
              <text x={PL - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
                {t.toFixed(2)}
              </text>
            </g>
          ))}
          {/* 政策利率参考线 */}
          <line x1={PL} y1={y(c.policyRate)} x2={PL + iw} y2={y(c.policyRate)} stroke="rgb(var(--text-muted))" strokeWidth={0.8} strokeDasharray="4 3" />
          <text x={PL + iw} y={y(c.policyRate) - 3} textAnchor="end" fontSize={8} fill="rgb(var(--text-muted))">
            政策 {c.policyRate.toFixed(2)}%
          </text>
          {/* 前日曲线 */}
          <path d={prevPath} fill="none" stroke="rgb(var(--text-muted))" strokeWidth={1.2} strokeDasharray="4 2" opacity={0.7} />
          {/* 当日曲线 */}
          <path d={curPath} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
          {TENOR_KEYS.map((k, i) => (
            <circle key={k} cx={x(i)} cy={y(c.current[k])} r={2.4} fill={color} />
          ))}
          {/* 关键期限数值标签 */}
          {labelKeys.map((k) => {
            const i = TENOR_KEYS.indexOf(k);
            return (
              <text key={k} x={x(i)} y={y(c.current[k]) - 7} textAnchor="middle" fontSize={9} fontWeight={600} fill={color}>
                {c.current[k].toFixed(2)}
              </text>
            );
          })}
          {/* X 轴期限 */}
          {TENOR_KEYS.map((k, i) => (
            <text key={k} x={x(i)} y={H - 9} textAnchor="middle" fontSize={9} fill="rgb(var(--text-muted))">
              {k}
            </text>
          ))}
          {/* 图例 */}
          <g fontSize={9} fill="rgb(var(--text-muted))">
            <line x1={PL + 6} y1={PT + 4} x2={PL + 22} y2={PT + 4} stroke={color} strokeWidth={2.2} />
            <text x={PL + 26} y={PT + 7}>当日</text>
            <line x1={PL + 70} y1={PT + 4} x2={PL + 86} y2={PT + 4} stroke="rgb(var(--text-muted))" strokeWidth={1.2} strokeDasharray="4 2" />
            <text x={PL + 90} y={PT + 7}>前日</text>
          </g>
        </svg>

        <DailyBars c={c} />
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * ③ 每日收益率涨跌总结（bp，红涨绿跌）
 * ------------------------------------------------------------------------- */
function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DailyChangeTable({ curves }: { curves: CountryYield[] }) {
  const toCSV = () => {
    const header = ["国家", "货币", ...TENOR_KEYS, "平行平移bp", "斜率变化bp", "形态", "分类"];
    const rows = curves.map((c) => [
      c.name,
      c.currency,
      ...TENOR_KEYS.map((k) => c.dailyBps[k].toFixed(1)),
      c.parallelBps.toFixed(1),
      c.slopeBps.toFixed(1),
      c.shape.label,
      c.move.label,
    ]);
    return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  return (
    <Card>
      <CardHead
        title="每日收益率涨跌总结"
        subtitle={`各期限日变动（bp）· 收益率上行=红、下行=绿 · 截至 ${curves[0]?.asOf ?? ""}`}
        right={
          <button
            onClick={() => downloadCSV("每日收益率涨跌.csv", toCSV())}
            className="text-2xs px-2 py-1 rounded-md border border-border text-muted hover:text-content hover:bg-panel-2 transition-colors"
          >
            导出 CSV
          </button>
        }
      />
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse min-w-[760px]">
          <thead>
            <tr className="text-muted">
              <th className="text-left px-2 py-1.5 font-medium sticky left-0 bg-panel">国家</th>
              {TENOR_KEYS.map((k) => (
                <th key={k} className="px-1 py-1.5 font-medium text-center">{k}</th>
              ))}
              <th className="px-2 py-1.5 font-medium text-center">平行平移</th>
              <th className="px-2 py-1.5 font-medium text-center">斜率变化</th>
              <th className="px-2 py-1.5 font-medium text-center">形态</th>
              <th className="px-2 py-1.5 font-medium text-center">分类</th>
            </tr>
          </thead>
          <tbody>
            {curves.map((c) => (
              <tr key={c.code} className="border-t border-border/60">
                <td className="px-2 py-1.5 font-semibold text-left sticky left-0 bg-panel whitespace-nowrap">
                  <span className="mr-1">{c.flag}</span>
                  {c.name}
                </td>
                {TENOR_KEYS.map((k) => (
                  <td key={k} className={`px-1 py-1.5 text-center font-medium ${bpsClass(c.dailyBps[k])}`}>
                    {fmtBps(c.dailyBps[k])}
                  </td>
                ))}
                <td className={`px-2 py-1.5 text-center font-semibold ${bpsClass(c.parallelBps)}`}>{fmtBps(c.parallelBps)}</td>
                <td className={`px-2 py-1.5 text-center font-semibold ${bpsClass(c.slopeBps)}`}>{fmtBps(c.slopeBps)}</td>
                <td className={`px-2 py-1.5 text-center ${c.shape.cls}`}>{c.shape.label}</td>
                <td className={`px-2 py-1.5 text-center font-medium ${c.move.cls}`}>{c.move.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-2xs text-muted flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-neg/40" />收益率上行（红）</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-pos/40" />收益率下行（绿）</span>
          <span className="ml-auto">平行平移 = 各期限日变动均值；斜率变化 = (10Y−2Y) 当日 − 前日</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * ④ 10Y 跨国对比（当前 vs 前日）
 * ------------------------------------------------------------------------- */
export function TenYearCompare({ curves }: { curves: CountryYield[] }) {
  const rows = [...curves].sort((a, b) => b.current["10Y"] - a.current["10Y"]);
  const max = Math.max(...rows.map((r) => r.current["10Y"]));
  const W = 720, rowH = 30, PT = 16, PB = 8;
  const H = PT + rows.length * rowH + PB;
  const barX = 92, barW = W - barX - 70;

  return (
    <Card>
      <CardHead title="10Y 收益率跨国对比" subtitle="各经济体中长端锚 · 实条=当日、虚尾=前日（灰色）" right={<Badge tone="mock">Mock</Badge>} />
      <div className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {rows.map((r, i) => {
            const cy = PT + i * rowH + rowH / 2;
            const w = (r.current["10Y"] / max) * barW;
            const wPrev = (r.prev["10Y"] / max) * barW;
            const color = colorOf(r.code);
            const d = r.dailyBps["10Y"];
            return (
              <g key={r.code}>
                <text x={barX - 8} y={cy + 3} textAnchor="end" fontSize={10} fill="rgb(var(--text))">
                  {r.flag} {r.name}
                </text>
                {/* 前日幽灵条 */}
                <rect x={barX} y={cy - 7} width={wPrev} height={14} rx={2} fill="rgb(var(--text-muted))" opacity={0.22} />
                {/* 当日条 */}
                <rect x={barX} y={cy - 7} width={w} height={14} rx={2} fill={color} />
                <text x={barX + w + 6} y={cy + 3} fontSize={10} fontWeight={600} fill={color}>
                  {r.current["10Y"].toFixed(2)}%
                </text>
                <text x={W - 4} y={cy + 3} textAnchor="end" fontSize={9} className={bpsClass(d)} fill="currentColor">
                  {fmtBps(d)}bp
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * 页面装配（供 app/yield-curve/page.tsx 调用）
 * ------------------------------------------------------------------------- */
export function YieldCurveModule({ asOf }: { asOf: string }) {
  const curves = React.useMemo(() => getYieldCurves(asOf), [asOf]);
  return (
    <div className="space-y-5">
      <SectionLabel>① 八国收益率曲线（全期限形态）</SectionLabel>
      <AllCountriesCurves curves={curves} />
      <SectionLabel>② 单国曲线精读（当日 vs 前日）</SectionLabel>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {curves.map((c) => (
          <CountryCurveDetail key={c.code} c={c} />
        ))}
      </div>
      <SectionLabel>③ 每日收益率涨跌总结</SectionLabel>
      <DailyChangeTable curves={curves} />
      <SectionLabel>④ 10Y 收益率跨国对比</SectionLabel>
      <TenYearCompare curves={curves} />
    </div>
  );
}
