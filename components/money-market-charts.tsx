"use client";

import * as React from "react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import type { EconomyLiquidity, LiqValue } from "@/lib/liquidity";
import { getCountryEvents, type EventImpact } from "@/lib/liquidity-events";

const ASOF = "2026-09-29";

export const FLAG: Record<string, string> = {
  CNY: "🇨🇳",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  JPY: "🇯🇵",
  HKD: "🇭🇰",
  CHF: "🇨🇭",
  GBP: "🇬🇧",
  AUD: "🇦🇺",
};

// 暗色主题下各国配色（与站点 accent 协调）
const REGION_COLORS: Record<string, string> = {
  CNY: "#38BDF8",
  USD: "#F87171",
  EUR: "#34D399",
  JPY: "#FBBF24",
  HKD: "#A78BFA",
  CHF: "#22D3EE",
  GBP: "#F472B6",
  AUD: "#A3E635",
};

const IMPACT_HEX: Record<EventImpact, string> = {
  high: "#F87171",
  med: "#FBBF24",
  low: "#94A3B8",
};
const IMPACT_LABEL: Record<EventImpact, string> = {
  high: "高冲击",
  med: "中冲击",
  low: "低冲击",
};

function fmtVal(v: number, unit: string): string {
  if (unit === "%") return v.toFixed(2);
  if (unit === "bp") return v.toFixed(0);
  if (unit === "汇率") return v.toFixed(4);
  if (["万亿", "千亿", "十亿", "十亿USD"].some((u) => unit.includes(u))) return v.toFixed(1);
  return v.toFixed(1);
}

function fmtChg(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(1)}`;
}

// 货币市场利率：上行=红(收紧) / 下行=绿(宽松)，遵循站点价涨跌配色约定
function chgClass(v: number | null): string {
  if (v === null || v === undefined || Math.abs(v) < 0.05) return "text-muted";
  return v >= 0 ? "text-neg" : "text-pos";
}
function chgHex(v: number | null): string {
  if (v === null || v === undefined || Math.abs(v) < 0.05) return "#94A3B8";
  return v >= 0 ? "#F87171" : "#34D399";
}
function dirLabel(v: number | null): string {
  if (v === null || v === undefined || Math.abs(v) < 0.05) return "平稳";
  return v >= 0 ? "上行" : "下行";
}

/* =========================== 八国货币市场利率走势图（核心） =========================== */
export function MoneyMarketTrendChart({
  ind,
  policy,
  color,
}: {
  ind: LiqValue;
  policy: LiqValue | null;
  color: string;
}) {
  const W = 680,
    H = 232,
    ml = 46,
    mr = 16,
    mt = 16,
    mb = 30;
  const iw = W - ml - mr;
  const ih = H - mt - mb;

  const hist = ind.history.slice(-120);
  if (hist.length < 2) return null;
  const vals = hist.map((h) => h.value);

  let yMin = Math.min(...vals);
  let yMax = Math.max(...vals);
  if (policy) {
    yMin = Math.min(yMin, policy.value);
    yMax = Math.max(yMax, policy.value);
  }
  const pad = (yMax - yMin) * 0.16 || 0.02;
  yMin -= pad;
  yMax += pad;

  const x = (i: number) => ml + (i * iw) / (hist.length - 1);
  const y = (v: number) => mt + ih - ((v - yMin) / (yMax - yMin)) * ih;

  // 1周前参考值（用于直观看走势变化）
  const wkAgoIdx = Math.max(0, hist.length - 8);
  const wkAgoVal = hist[wkAgoIdx].value;
  const wkChg = vals[vals.length - 1] - wkAgoVal;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  const lineD = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaD = `${lineD} L ${x(vals.length - 1).toFixed(1)},${y(yMin).toFixed(1)} L ${x(0).toFixed(1)},${y(yMin).toFixed(1)} Z`;

  // X 轴日期刻度（约 5 个）
  const xticks = 5;
  const xi = Array.from({ length: xticks }, (_, i) =>
    Math.round((i * (hist.length - 1)) / (xticks - 1)),
  );

  const lastV = vals[vals.length - 1];
  const lastX = x(vals.length - 1);
  const lastY = y(lastV);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${ind.label} 走势`}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* 网格 + Y 轴标签 */}
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={ml} y1={y(gv)} x2={ml + iw} y2={y(gv)} stroke="rgb(var(--border))" strokeOpacity={0.5} />
          <text x={ml - 6} y={y(gv) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--text-muted))">
            {gv.toFixed(2)}
          </text>
        </g>
      ))}

      {/* 政策利率参考线 */}
      {policy && (
        <g>
          <line
            x1={ml}
            y1={y(policy.value)}
            x2={ml + iw}
            y2={y(policy.value)}
            stroke={color}
            strokeOpacity={0.45}
            strokeDasharray="5 4"
            strokeWidth={1}
          />
          <text x={ml + iw} y={y(policy.value) - 4} textAnchor="end" fontSize={8.5} fill={color} fillOpacity={0.85}>
            政策利率 {fmtVal(policy.value, policy.unit)}
          </text>
        </g>
      )}

      {/* 1周前参考线（走势变化） */}
      <g>
        <line
          x1={ml}
          y1={y(wkAgoVal)}
          x2={ml + iw}
          y2={y(wkAgoVal)}
          stroke="#94A3B8"
          strokeOpacity={0.4}
          strokeDasharray="2 3"
          strokeWidth={1}
        />
        <rect
          x={ml + 2}
          y={y(wkAgoVal) - 13}
          width={62}
          height={13}
          rx={2}
          fill="#0b1220"
          stroke="#334155"
        />
        <text x={ml + 6} y={y(wkAgoVal) - 3} fontSize={8.5} fill={chgHex(wkChg)}>
          1周前 {wkChg >= 0 ? "+" : ""}
          {wkChg.toFixed(1)}
        </text>
      </g>

      {/* 面积 + 主曲线 */}
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />

      {/* 末点标注 */}
      <circle cx={lastX} cy={lastY} r={3.2} fill={color} stroke="#0b1220" strokeWidth={1} />
      <text
        x={Math.min(lastX, ml + iw - 52)}
        y={lastY - 7}
        fontSize={9.5}
        fontWeight={700}
        fill={color}
      >
        {fmtVal(lastV, ind.unit)}
      </text>

      {/* X 轴日期 */}
      {xi.map((i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={8.5} fill="rgb(var(--text-muted))">
          {hist[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

/* =========================== 单国走势卡片 =========================== */
export function CountryTrendCard({ eco }: { eco: EconomyLiquidity }) {
  const color = REGION_COLORS[eco.code] ?? "#38BDF8";
  const ind = eco.coreFunding;
  const policy = eco.policyRate;
  const d = ind.chg1d,
    w = ind.chg1w,
    m = ind.chg1m;

  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-2">
            <span className="text-base">{FLAG[eco.code]}</span>
            {eco.name}
          </span>
        }
        subtitle={`${eco.currency} · ${eco.centralBank} · ${ind.label}`}
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="p-3 space-y-2.5">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tnum" style={{ color }}>
              {fmtVal(ind.value, ind.unit)}
            </span>
            <span className="text-2xs text-muted">{ind.unit === "%" ? "%" : ind.unit}</span>
          </div>
          <div className="flex items-center gap-2 text-2xs">
            <span className={`tnum font-semibold ${chgClass(d)}`}>日 {fmtChg(d)}</span>
            <span className={`tnum font-semibold ${chgClass(w)}`}>周 {fmtChg(w)}</span>
            <span className={`tnum font-semibold ${chgClass(m)}`}>月 {fmtChg(m)}</span>
          </div>
        </div>
        <MoneyMarketTrendChart ind={ind} policy={policy} color={color} />
        <p className="text-2xs text-muted leading-snug">
          近一周{ind.label}
          <span className={chgClass(w)}>
            {fmtChg(w)}bp {dirLabel(w)}
          </span>
          ，政策利率 {fmtVal(policy.value, policy.unit)}%，货币市场{Math.abs(w ?? 0) < 1 ? "保持平稳" : w! >= 0 ? "边际收紧" : "边际宽松"}。
        </p>
      </div>
    </Card>
  );
}

/* =========================== 最新走势变化一览表 =========================== */
export function ChangeDashboard({ matrix }: { matrix: EconomyLiquidity[] }) {
  return (
    <Card>
      <CardHead
        title="最新走势变化一览"
        subtitle="八国关键货币市场利率的日 / 周 / 月变动（bp）· 红=上行(收紧) 绿=下行(宽松)"
        right={<Badge tone="mock">Mock</Badge>}
      />
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-2xs tnum border-collapse">
          <thead>
            <tr className="text-muted border-b border-border/60">
              <th className="text-left font-medium px-2 py-1.5">国家</th>
              <th className="text-left font-medium px-2 py-1.5">关键利率</th>
              <th className="text-right font-medium px-2 py-1.5">当前</th>
              <th className="text-right font-medium px-2 py-1.5">1日</th>
              <th className="text-right font-medium px-2 py-1.5">1周</th>
              <th className="text-right font-medium px-2 py-1.5">1月</th>
              <th className="text-center font-medium px-2 py-1.5">趋势</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((eco) => {
              const ind = eco.coreFunding;
              const color = REGION_COLORS[eco.code] ?? "#38BDF8";
              const trend = ind.chg1w;
              return (
                <tr key={eco.code} className="border-b border-border/30 hover:bg-panel-2/40">
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>{FLAG[eco.code]}</span>
                      <span className="text-content/90">{eco.currency}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-muted">{ind.label}</td>
                  <td className="px-2 py-1.5 text-right font-semibold" style={{ color }}>
                    {fmtVal(ind.value, ind.unit)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-medium ${chgClass(ind.chg1d)}`}>
                    {fmtChg(ind.chg1d)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-medium ${chgClass(ind.chg1w)}`}>
                    {fmtChg(ind.chg1w)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-medium ${chgClass(ind.chg1m)}`}>
                    {fmtChg(ind.chg1m)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${chgClass(trend)}`}
                      style={{ background: `${chgHex(trend)}1a` }}
                    >
                      {dirLabel(trend)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-2xs text-muted mt-2 leading-snug">
          注：周/月变动为相对 7 / 30 个交易日前中枢的偏离（bp）。货币市场利率上行通常对应流动性收紧、下行对应宽松。
        </p>
      </div>
    </Card>
  );
}

/* =========================== 过去 / 未来关键影响 =========================== */
function EventRow({ ev }: { ev: { date: string; title: string; detail: string; impact: EventImpact; tag: string } }) {
  const c = IMPACT_HEX[ev.impact];
  return (
    <li className="text-2xs leading-snug flex gap-2">
      <span className="mt-1 shrink-0 w-1 h-1 rounded-full" style={{ background: c }} aria-hidden />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="tnum font-semibold text-content/90">{ev.date}</span>
          <span className="text-content/90 font-medium">{ev.title}</span>
          <span
            className="text-[10px] px-1 py-px rounded-sm"
            style={{ color: c, background: `${c}1a`, border: `1px solid ${c}55` }}
          >
            {ev.tag} · {IMPACT_LABEL[ev.impact]}
          </span>
        </div>
        <p className="text-content/65 mt-0.5">{ev.detail}</p>
      </div>
    </li>
  );
}

export function CountryEventsCard({ code }: { code: string }) {
  const ev = getCountryEvents(code);
  if (!ev) return null;
  return (
    <div className="card-soft p-2.5 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-2xs font-semibold text-muted">
          {FLAG[code]} 关键事件 · 近一周 / 未来一周
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-2xs font-semibold text-muted">最近一周（已发生）</span>
            <span className="text-[10px] text-muted/60 ml-auto">{ev.recent.length} 件</span>
          </div>
          <ul className="space-y-1.5">
            {ev.recent.map((e, i) => (
              <EventRow key={i} ev={e} />
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-2xs font-semibold text-muted">未来一周（待发生）</span>
            <span className="text-[10px] text-muted/60 ml-auto">{ev.upcoming.length} 件</span>
          </div>
          <ul className="space-y-1.5">
            {ev.upcoming.map((e, i) => (
              <EventRow key={i} ev={e} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export { ASOF };
