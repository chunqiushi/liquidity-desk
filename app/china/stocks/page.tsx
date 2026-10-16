"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import {
  TrendingUp,
  Film,
  Layers,
  Activity,
  ArrowRight,
  ListOrdered,
  Building2,
} from "lucide-react";
import { Card, CardHead, Badge, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import { LHB_DATA, type LhbRow } from "@/lib/lhb-data";
import { getAllIndices, DATA_ASOF } from "@/lib/realdata";

/* ===================================================================
 * 数据来源：akshare 龙虎榜（真实） + fundflow_video「资金流 3D」复盘（真实）
 * 数据日期：2026-09-29（周二）收盘。本页为研究快照，不构成投资建议。
 * =================================================================== */

const AS_OF = "2026-09-29";
const AS_OF_LABEL = "2026-09-29（周二）收盘";

/* ----------------------------- 盘面广度（fundflow 复盘） ----------------------------- */
const BREADTH = { up: 644, down: 1896, flat: 94 };
const AVG_CLOSE = -1.14; // 万得二级行业平均涨跌幅 %
const VOLATILITY = 0.93;

/* ----------------------------- 行业资金流向（强度代理） ----------------------------- */
const NET_IN: [string, number][] = [
  ["煤炭Ⅱ", 0.73],
  ["银行", 0.52],
  ["石油石化", 0.52],
];
const NET_OUT: [string, number][] = [
  ["建材Ⅱ", -3.19],
  ["有色金属", -3.15],
  ["硬件设备", -3.08],
];

/* ----------------------------- 叙事节拍（资金流转时间线） ----------------------------- */
const BEATS: { t: string; title: string; text: string }[] = [
  { t: "09:30", title: "开盘 · 资金分化", text: "35 个行业 14 涨 21 跌，资金率先涌入「煤炭Ⅱ」" },
  { t: "10:10", title: "煤炭Ⅱ · 资金最集中", text: "盘中冲高至 +1.42%，为全市场最强方向" },
  { t: "13:00", title: "银行 · 高低切换", text: "资金由「煤炭Ⅱ」撤出转投「银行」，接力上攻至 +0.52%" },
  { t: "15:00", title: "建材Ⅱ · 领跌全场", text: "早盘即弱、一路领跌，收盘 -3.19%，资金持续撤离" },
  { t: "15:00", title: "全市场 · 单边走弱", text: "行业平均涨跌幅一路走低至 -1.14%，下跌扩散" },
];

/* ----------------------------- 通用格式化 ----------------------------- */
function dirClass(v: number): string {
  if (v > 0) return "text-neg"; // 红涨
  if (v < 0) return "text-pos"; // 绿跌
  return "text-muted";
}
function pct(v: number, digits = 2): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/* ===================================================================
 * 分歧柱状（行业资金流向，红涨绿跌）
 * =================================================================== */
function DivergingBars({ data }: { data: [string, number][] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d[1])), 0.01);
  return (
    <div className="space-y-2">
      {data.map(([name, v]) => {
        const w = (Math.abs(v) / maxAbs) * 50; // 百分比半宽
        const pos = v >= 0;
        return (
          <div key={name} className="flex items-center gap-2 text-2xs">
            <span className="w-20 shrink-0 text-right text-content truncate">{name}</span>
            <div className="flex-1 flex items-center">
              <div className="flex-1 flex justify-end">
                {pos && (
                  <div
                    className="h-4 rounded-l bg-neg/70"
                    style={{ width: `${w}%` }}
                  />
                )}
              </div>
              <div className="w-14 text-center tnum font-semibold shrink-0">
                <span className={dirClass(v)}>{pct(v)}</span>
              </div>
              <div className="flex-1 flex justify-start">
                {!pos && (
                  <div
                    className="h-4 rounded-r bg-pos/70"
                    style={{ width: `${w}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-2xs text-muted pt-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-neg/70" />流入（红涨）</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-pos/70" />流出（绿跌）</span>
      </div>
    </div>
  );
}

/* ===================================================================
 * 龙虎榜净买卖榜（表格）
 * =================================================================== */
function LhbTable({ rows, kind }: { rows: LhbRow[]; kind: "buy" | "sell" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-2xs tnum border-collapse">
        <thead>
          <tr className="text-muted border-b border-border">
            <th className="text-left px-2 py-1.5 font-medium">名称</th>
            <th className="text-left px-2 py-1.5 font-medium">代码</th>
            <th className="text-right px-2 py-1.5 font-medium">收盘</th>
            <th className="text-right px-2 py-1.5 font-medium">涨跌%</th>
            <th className="text-right px-2 py-1.5 font-medium">龙虎榜净买(亿)</th>
            <th className="text-right px-2 py-1.5 font-medium">机构净买(亿)</th>
            <th className="text-right px-2 py-1.5 font-medium">上榜</th>
            <th className="text-left px-2 py-1.5 font-medium">上榜原因</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code + kind} className="border-b border-border/50 hover:bg-panel-2/40">
              <td className="text-left px-2 py-1.5 font-medium text-content whitespace-nowrap">{r.name}</td>
              <td className="text-left px-2 py-1.5 text-muted whitespace-nowrap">{r.code}</td>
              <td className="text-right px-2 py-1.5">{r.close.toFixed(2)}</td>
              <td className={cn("text-right px-2 py-1.5 font-medium", dirClass(r.chg))}>{pct(r.chg)}</td>
              <td className={cn("text-right px-2 py-1.5 font-semibold", dirClass(r.net))}>{r.net >= 0 ? "+" : ""}{r.net.toFixed(2)}</td>
              <td className={cn("text-right px-2 py-1.5", dirClass(r.inst))}>{r.inst >= 0 ? "+" : ""}{r.inst.toFixed(2)}</td>
              <td className="text-right px-2 py-1.5 text-muted">{r.times}次</td>
              <td className="text-left px-2 py-1.5 text-muted whitespace-nowrap max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===================================================================
 * 上榜原因分布（横向柱）
 * =================================================================== */
function ReasonBars({ reasons }: { reasons: { reason: string; count: number }[] }) {
  const max = Math.max(...reasons.map((r) => r.count), 1);
  return (
    <div className="space-y-1.5">
      {reasons.map((r) => (
        <div key={r.reason} className="flex items-center gap-2 text-2xs">
          <span className="w-56 shrink-0 text-content truncate" title={r.reason}>{r.reason}</span>
          <div className="flex-1 bg-panel-2 rounded h-3.5 overflow-hidden">
            <div className="h-full bg-accent/70" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right tnum text-muted shrink-0">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ===================================================================
 * 资金流转时间线
 * =================================================================== */
function FlowTimeline({ beats }: { beats: { t: string; title: string; text: string }[] }) {
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {beats.map((b, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-[6px] mt-1 w-2.5 h-2.5 rounded-full bg-accent" />
          <div className="flex items-baseline gap-2">
            <span className="text-2xs tnum text-accent font-semibold w-12 shrink-0">{b.t}</span>
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
export default function ChinaStocksPage() {
  const lhb = LHB_DATA;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent" />
            <h1 className="text-xl font-bold text-content">中国股市 · 龙虎榜与资金流</h1>
            <Badge tone="pos">真实数据</Badge>
          </div>
          <p className="text-2xs text-muted mt-1">
            数据截至 {AS_OF_LABEL} · 龙虎榜来源 akshare（东方财富）· 资金流来源 fundflow 3D 复盘
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <Badge tone="neutral">龙虎榜 {lhb.onBoard} 次</Badge>
          <Badge tone="neutral">净买 {pct(lhb.totalNetBuy)} 亿</Badge>
        </div>
      </div>

      {/* 核心指数（真实行情） */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <SectionLabel>核心指数 · 真实行情（东方财富 · {DATA_ASOF}）</SectionLabel>
          <Badge tone="pos">真实</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.values(getAllIndices()).map((idx) => (
            <Card key={idx.name}>
              <div className="p-2.5">
                <div className="text-2xs text-muted truncate">{idx.name}</div>
                <div className="text-sm font-bold text-content tnum mt-0.5">
                  {idx.last.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={cn("text-2xs font-semibold tnum mt-0.5", dirClass(idx.chgPct ?? 0))}>
                  {idx.chgPct == null ? "—" : pct(idx.chgPct)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 游资全景报告入口 */}
      <StaticLink
        href="/china/stocks/lhb-report"
        className="block rounded-lg border border-accent/30 bg-accent/5 p-3 transition-colors hover:bg-accent/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered size={18} className="text-accent" />
            <div>
              <div className="text-sm font-semibold text-content">A股游资动态全景报告</div>
              <div className="text-2xs text-muted mt-0.5">
                龙虎榜全名单 · 知名游资席位买卖明细 · 星级个股 · 主攻板块 · 机构/北向 · 涨停连板情绪（{AS_OF}）
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1 text-2xs text-accent font-medium shrink-0">
            查看完整报告 <ArrowRight size={14} />
          </span>
        </div>
      </StaticLink>

      {/* 盘面概览 + 行业资金流向 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHead title="盘面概览" subtitle="涨跌家数 · 行业平均" />
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
                <div className="text-lg font-semibold text-muted tnum">{BREADTH.flat}</div>
                <div className="text-2xs text-muted">平盘</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-2xs border-t border-border pt-2">
              <span className="text-muted">万得二级行业平均</span>
              <span className={cn("font-semibold tnum", dirClass(AVG_CLOSE))}>{pct(AVG_CLOSE)}</span>
            </div>
            <div className="flex items-center justify-between text-2xs">
              <span className="text-muted">全市场波动</span>
              <span className="tnum text-content">{VOLATILITY.toFixed(2)}</span>
            </div>
            <div className="text-2xs text-muted leading-relaxed border-t border-border pt-2">
              情绪：防御性轮动（defensive_rotation）· 小调铺底，市场普跌、资金高低切换。
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="行业资金流入（前三）" subtitle="强度代理 · 红涨" />
          <div className="p-3">
            <DivergingBars data={NET_IN} />
          </div>
        </Card>

        <Card>
          <CardHead title="行业资金流出（前三）" subtitle="强度代理 · 绿跌" />
          <div className="p-3">
            <DivergingBars data={NET_OUT} />
          </div>
        </Card>
      </div>

      {/* 资金流转时间线 + 3D 视频 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHead title="资金流转 · 叙事节拍" subtitle="开盘→接力→退潮" />
          <div className="p-3">
            <FlowTimeline beats={BEATS} />
          </div>
        </Card>
        <Card>
          <CardHead title="资金流 3D 复盘" subtitle="fundflow_video 生成 · 真实" right={<Film size={14} className="text-accent" />} />
          <div className="p-3 space-y-2">
            <video
              src="/videos/fundflow_3d_2026-09-29.mp4"
              controls
              muted
              playsInline
              className="w-full rounded-lg border border-border bg-black aspect-video"
            />
            <div className="text-2xs text-muted">
              全市场 35 个行业资金流转的 3D 地形动画：煤炭Ⅱ 领涨、银行接力、建材Ⅱ 退潮。
            </div>
          </div>
        </Card>
      </div>

      {/* 龙虎榜动态分析 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ListOrdered size={16} className="text-accent" />
          <SectionLabel>龙虎榜动态分析 · {lhb.asOf}</SectionLabel>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card><div className="p-3 text-center"><div className="text-lg font-bold text-content tnum">{lhb.onBoard}</div><div className="text-2xs text-muted mt-0.5">上榜次数</div></div></Card>
          <Card><div className="p-3 text-center"><div className="text-lg font-bold text-content tnum">{lhb.activeToday}</div><div className="text-2xs text-muted mt-0.5">当日上榜个股</div></div></Card>
          <Card><div className="p-3 text-center"><div className={cn("text-lg font-bold tnum", dirClass(lhb.totalNetBuy))}>{lhb.totalNetBuy.toFixed(2)}亿</div><div className="text-2xs text-muted mt-0.5">龙虎榜净买入合计</div></div></Card>
          <Card><div className="p-3 text-center"><div className="text-lg font-bold text-content tnum">{lhb.withInst}</div><div className="text-2xs text-muted mt-0.5">获机构席位参与</div></div></Card>
          <Card><div className="p-3 text-center"><div className={cn("text-lg font-bold tnum", dirClass(lhb.instNetTotal))}>{lhb.instNetTotal >= 0 ? "+" : ""}{lhb.instNetTotal.toFixed(2)}亿</div><div className="text-2xs text-muted mt-0.5">机构净买入合计</div></div></Card>
        </div>

        <div className="text-2xs text-muted leading-relaxed border border-border rounded p-3 bg-panel-2/30">
          <span className="font-semibold text-content">研判：</span>
          龙虎榜当日共 {lhb.onBoard} 次上榜、涉及 {lhb.activeToday} 只个股，全市场龙虎榜席位净买入合计约 {lhb.totalNetBuy.toFixed(1)} 亿元；
          其中 {lhb.withInst} 只获机构专用席位参与、机构净买入约 {lhb.instNetTotal.toFixed(1)} 亿元，占比偏低，
          显示 <span className="text-content">游资主导、机构偏谨慎接力</span> 的格局。净买入榜首为
          <span className="text-content"> {lhb.topBuy[0].name}（{lhb.topBuy[0].net.toFixed(2)} 亿）</span>，
          机构净买入最积极为 <span className="text-content">{lhb.instLeaders[0].name}（{lhb.instLeaders[0].inst.toFixed(2)} 亿）</span>。
          上榜主因为「连续三个交易日内涨幅偏离值累计达 20%」与「日换手率达 20%」，反映题材高换手、短线博弈特征显著。
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHead title="龙虎榜净买入榜（前十）" subtitle="席位净买额 · 真实" right={<Badge tone="pos">akshare</Badge>} />
            <div className="p-3">
              <LhbTable rows={lhb.topBuy} kind="buy" />
            </div>
          </Card>
          <Card>
            <CardHead title="龙虎榜净卖出榜（前八）" subtitle="席位净卖额 · 真实" right={<Badge tone="pos">akshare</Badge>} />
            <div className="p-3">
              <LhbTable rows={lhb.topSell} kind="sell" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHead title="机构席位动向（净买入前十）" subtitle="机构专用席位 · 真实" right={<Building2 size={14} className="text-accent" />} />
            <div className="p-3">
              <LhbTable rows={lhb.instLeaders} kind="buy" />
            </div>
          </Card>
          <Card>
            <CardHead title="上榜原因分布" subtitle="触发条件计数" />
            <div className="p-3">
              <ReasonBars reasons={lhb.reasons} />
            </div>
          </Card>
        </div>
      </section>

      {/* 交叉入口 */}
      <div className="flex flex-wrap gap-2 text-2xs">
        <StaticLink href="/china/today" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />中国流动性·今日概览</StaticLink>
        <StaticLink href="/china/futures" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />期货一栏</StaticLink>
        <StaticLink href="/data-detail" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />明细数据</StaticLink>
        <StaticLink href="/" className="text-accent hover:underline flex items-center gap-1"><ArrowRight size={12} />研究枢纽</StaticLink>
      </div>

      <p className="text-2xs text-muted border-t border-border pt-3">
        数据说明：龙虎榜明细与个股上榜统计来自 akshare（东方财富）接口，funds flow 复盘来自 fundflow_video 项目生成的 recap/director 文件；
        本页为研究快照，非实时行情，<span className="text-pos">不构成投资建议</span>。日期按源数据定期更新（当前 2026-09-29）。
      </p>
    </div>
  );
}
