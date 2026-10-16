"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import { Layers, Film, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ===================================================================
 * 数据来源：fundflow_video「期货 3D 地形」复盘（akshare 新浪主力连续）
 * 数据日期：2026-09-29（含 2026-09-28 夜盘 → 2026-09-29 日盘）
 * 本页为研究快照，不构成投资建议。
 * =================================================================== */

const AS_OF = "2026-09-29";
const AS_OF_LABEL = "2026-09-29（含 9/28 夜盘）";

/* ----------------------------- 板块强弱 ----------------------------- */
// 名称 / 平均涨跌幅% / 品种数
const SECTORS: [string, number, number][] = [
  ["能源", 5.13, 6],
  ["化工", 2.17, 14],
  ["黑色", 0.11, 9],
  ["农副", 0.03, 15],
  ["有色", -0.41, 10],
  ["金融", -1.19, 9],
  ["贵金属", -2.19, 2],
];

/* ----------------------------- 领涨 / 领跌品种 ----------------------------- */
const LEADERS: [string, number][] = [
  ["原油", 8.05],
  ["沥青", 7.31],
  ["燃油", 5.98],
  ["低硫燃油", 5.05],
  ["乙二醇", 5.01],
];
const LAGGARDS: [string, number][] = [
  ["碳酸锂", -3.48],
  ["沪银", -3.12],
  ["红枣", -2.85],
  ["中证500", -2.63],
  ["中证1000", -2.56],
];

/* ----------------------------- 分时段复盘 ----------------------------- */
const BEATS: { t: string; title: string; text: string }[] = [
  { t: "21:00", title: "夜盘开盘", text: "全市场 65 个品种 1 涨 5 跌，资金率先涌入「原油」" },
  { t: "夜盘", title: "原油 · 领涨全场", text: "盘中一度涨近 8.1%，为全天最强品种" },
  { t: "日盘", title: "沥青 · 接力上攻", text: "资金高低切换，收涨 +7.3% 接力" },
  { t: "收盘", title: "碳酸锂 · 强势退潮", text: "由早盘 +0.0% 转为收盘 -3.5%，强势品种回撤" },
  { t: "15:00", title: "收盘复盘", text: "品种平均 +0.67%，原油领涨、碳酸锂领跌" },
];

const BREADTH = { up: 34, down: 25, total: 65 };
const AVG_CHG = 0.67;
const VOLATILITY = 1.37;

function dirClass(v: number): string {
  if (v > 0) return "text-neg";
  if (v < 0) return "text-pos";
  return "text-muted";
}
function pct(v: number, digits = 2): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/* ----------------------------- 板块强弱柱（红涨绿跌，分歧） ----------------------------- */
function SectorBars({ data }: { data: [string, number, number][] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d[1])), 0.01);
  return (
    <div className="space-y-2">
      {data.map(([name, v, n]) => {
        const w = (Math.abs(v) / maxAbs) * 50;
        const pos = v >= 0;
        return (
          <div key={name} className="flex items-center gap-2 text-2xs">
            <span className="w-14 shrink-0 text-right text-content truncate">{name}</span>
            <div className="flex-1 flex items-center">
              <div className="flex-1 flex justify-end">
                {pos && <div className="h-4 rounded-l bg-neg/70" style={{ width: `${w}%` }} />}
              </div>
              <div className="w-16 text-center tnum font-semibold shrink-0">
                <span className={dirClass(v)}>{pct(v)}</span>
              </div>
              <div className="flex-1 flex justify-start">
                {!pos && <div className="h-4 rounded-r bg-pos/70" style={{ width: `${w}%` }} />}
              </div>
            </div>
            <span className="w-12 text-right text-muted shrink-0">{n} 品种</span>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-2xs text-muted pt-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-neg/70" />涨（红）</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-pos/70" />跌（绿）</span>
      </div>
    </div>
  );
}

/* ----------------------------- 领涨/领跌柱 ----------------------------- */
function MoverBars({ data }: { data: [string, number][] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d[1])), 0.01);
  return (
    <div className="space-y-1.5">
      {data.map(([name, v]) => {
        const w = (Math.abs(v) / maxAbs) * 100;
        return (
          <div key={name} className="flex items-center gap-2 text-2xs">
            <span className="w-16 shrink-0 text-right text-content truncate">{name}</span>
            <div className="flex-1 bg-panel-2 rounded h-3.5 overflow-hidden flex justify-end">
              <div className={cn("h-full", v >= 0 ? "bg-neg/70" : "bg-pos/70")} style={{ width: `${w}%` }} />
            </div>
            <span className={cn("w-16 text-right tnum font-semibold shrink-0", dirClass(v))}>{pct(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- 时间线 ----------------------------- */
function FlowTimeline({ beats }: { beats: { t: string; title: string; text: string }[] }) {
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {beats.map((b, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-[6px] mt-1 w-2.5 h-2.5 rounded-full bg-accent" />
          <div className="flex items-baseline gap-2">
            <span className="text-2xs tnum text-accent font-semibold w-14 shrink-0">{b.t}</span>
            <span className="text-2xs font-semibold text-content">{b.title}</span>
          </div>
          <div className="text-2xs text-muted leading-relaxed mt-0.5">{b.text}</div>
        </li>
      ))}
    </ol>
  );
}

/* ===================================================================
 * 页面
 * =================================================================== */
export default function ChinaFuturesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-accent" />
            <h1 className="text-xl font-bold text-content">中国期货 · 板块强弱与资金</h1>
            <Badge tone="pos">真实数据</Badge>
          </div>
          <p className="text-2xs text-muted mt-1">
            数据截至 {AS_OF_LABEL} · 来源 akshare 新浪主力连续（含夜盘历史补全）· fundflow 3D 地形复盘
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <Badge tone="neutral">65 品种</Badge>
          <Badge tone="neutral">均值 {pct(AVG_CHG)}</Badge>
        </div>
      </div>

      {/* 全天主线 + 板块强弱 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHead title="全天主线" subtitle="品种涨跌分布" />
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="card-soft p-2">
                <div className="text-lg font-semibold text-neg tnum">{BREADTH.up}</div>
                <div className="text-2xs text-muted">上涨</div>
              </div>
              <div className="card-soft p-2">
                <div className="text-lg font-semibold text-pos tnum">{BREADTH.down}</div>
                <div className="text-2xs text-muted">下跌</div>
              </div>
              <div className="card-soft p-2">
                <div className="text-lg font-semibold text-content tnum">{BREADTH.total}</div>
                <div className="text-2xs text-muted">品种总数</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-2xs border-t border-border pt-2">
              <span className="text-muted">品种平均涨跌幅</span>
              <span className={cn("font-semibold tnum", dirClass(AVG_CHG))}>{pct(AVG_CHG)}</span>
            </div>
            <div className="flex items-center justify-between text-2xs">
              <span className="text-muted">全市场波动</span>
              <span className="tnum text-content">{VOLATILITY.toFixed(2)}</span>
            </div>
            <div className="text-2xs text-muted leading-relaxed border-t border-border pt-2">
              主线：能源链（原油/沥青/燃油）受供给端驱动集体走强，贵金属与金融期货偏弱；市场普涨、大调扬升。
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHead title="板块强弱（七大类）" subtitle="各板块品种平均涨跌幅 · 红涨绿跌" />
          <div className="p-3">
            <SectorBars data={SECTORS} />
          </div>
        </Card>
      </div>

      {/* 领涨/领跌 + 视频 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHead title="领涨品种（前五）" subtitle="真实" />
            <div className="p-3">
              <MoverBars data={LEADERS} />
            </div>
          </Card>
          <Card>
            <CardHead title="领跌品种（前五）" subtitle="真实" />
            <div className="p-3">
              <MoverBars data={LAGGARDS} />
            </div>
          </Card>
        </div>
        <Card>
          <CardHead title="期货 3D 地形复盘" subtitle="fundflow_video 生成 · 真实" right={<Film size={14} className="text-accent" />} />
          <div className="p-3 space-y-2">
            <video
              src="/videos/futures_3d_2026-09-29.mp4"
              controls
              muted
              playsInline
              className="w-full rounded-lg border border-border bg-black aspect-video"
            />
            <div className="text-2xs text-muted">
              65 个期货品种涨跌的 3D 地形动画：原油领涨、碳酸锂退潮，能源链成全天主线。
            </div>
          </div>
        </Card>
      </div>

      {/* 分时段复盘 */}
      <Card>
        <CardHead title="分时段复盘 · 夜盘 → 日盘" subtitle="资金切换路径" />
        <div className="p-3">
          <FlowTimeline beats={BEATS} />
        </div>
      </Card>

      {/* 数据缺口 */}
      <div className="flex items-start gap-2 border border-warn/40 bg-warn/5 rounded p-3 text-2xs">
        <AlertTriangle size={14} className="text-warn shrink-0 mt-0.5" />
        <div className="text-muted leading-relaxed">
          <span className="font-semibold text-warn">数据缺口：</span>
          线材（wr0）、动力煤（ZC0）在数据源（akshare 新浪主力连续，含夜盘历史补全）中窗口内无可用行情，
          已按「无数据」处理、不参与涨跌排序，地形中显示为 0%。
        </div>
      </div>

      {/* 交叉入口 */}
      <div className="flex flex-wrap gap-2 text-2xs">
        <StaticLink href="/china/stocks" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />中国股市·龙虎榜</StaticLink>
        <StaticLink href="/china/futures/strategy" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />我的期货策略净值</StaticLink>
        <StaticLink href="/china/today" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />中国流动性·今日概览</StaticLink>
        <StaticLink href="/" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />研究枢纽</StaticLink>
      </div>

      <p className="text-2xs text-muted border-t border-border pt-3">
        数据说明：期货行情来自 akshare 新浪主力连续（含夜盘历史补全），换月跳空已按新主力开盘价重锚修正，
        金融期货改用 CFFEX 官方昨结算价作基准；本页为研究快照，非实时行情，<span className="text-pos">不构成投资建议</span>。日期按源数据定期更新（当前 2026-09-29）。
      </p>
    </div>
  );
}
