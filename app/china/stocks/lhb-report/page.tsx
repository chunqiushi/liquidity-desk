"use client";

import * as React from "react";
import { StaticLink } from "@/components/static-link";
import { Card, CardHead, Badge, SectionLabel, DataStatusBadge } from "@/components/ui";
import { lhbReport } from "@/lib/lhb-report-data";

const UP = "rgb(var(--neg))"; // 涨 = 红 (中国习惯)
const DOWN = "rgb(var(--pos))"; // 跌 = 绿

function pctColor(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "rgb(var(--text-muted))";
  return v >= 0 ? UP : DOWN;
}
function pctStr(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function yi(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${(n / 1e8).toFixed(2)} 亿`;
}
function wan(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  const s = Math.abs(n).toFixed(0);
  return `${n >= 0 ? "+" : "-"}${s} 万`;
}
function wanPlain(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${(n / 1e4).toFixed(0)} 万`;
}

const ALIAS_ORDER = [
  "章盟主", "作手新一", "炒股养家", "赵老哥", "方新侠", "孙哥", "葛卫东",
  "瑞鹤仙", "成都帮", "佛山系", "温州帮", "上海超短帮", "量化打板", "拉萨天团",
];

export default function LhbReportPage() {
  const R = lhbReport;
  const activeAliases = ALIAS_ORDER.filter(
    (a) => R.youzi_detail[a] && (R.youzi_detail[a].buy.length || R.youzi_detail[a].sell.length)
  );
  const starCount = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  R.star_stocks.forEach((s) => (starCount[s.star] = (starCount[s.star] || 0) + 1));

  return (
    <main className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">A股游资动态全景报告</h1>
            <Badge tone="pos">akshare 真实数据</Badge>
            <Badge tone="neutral">{R.date}</Badge>
            <StaticLink href="/china/stocks" className="text-2xs text-accent hover:underline">← 返回股市栏</StaticLink>
          </div>
          <p className="text-2xs text-muted leading-relaxed">
            数据源：东方财富龙虎榜（stock_lhb_detail_em / stock_lhb_stock_detail_em）、涨停股池（stock_zt_pool_em）、
            机构买卖（stock_lhb_jgmmtj_em）。<span className="text-warn">游资席位归属为基于公开营业部名称的启发式映射（如"江苏路→章盟主"、"拉萨→拉萨天团"），仅供参考，不构成投资依据。</span>
          </p>
        </header>

        {/* ① 龙虎榜全名单 */}
        <Card className="p-4">
          <CardHead
            title="① 当日龙虎榜全部上榜个股及上榜原因"
            subtitle={`共 ${R.listed.length} 只 · 净买额单位：亿元`}
            right={<Badge tone="pos">真实</Badge>}
          />
          <div className="mt-3 max-h-[420px] overflow-auto rounded border border-border">
            <table className="w-full text-2xs">
              <thead className="sticky top-0 bg-panel-2 text-muted">
                <tr>
                  <th className="px-2 py-2 text-left">代码</th>
                  <th className="px-2 py-2 text-left">名称</th>
                  <th className="px-2 py-2 text-right">涨跌幅</th>
                  <th className="px-2 py-2 text-right">龙虎榜净买额</th>
                  <th className="px-2 py-2 text-left">上榜原因</th>
                </tr>
              </thead>
              <tbody>
                {R.listed.map((s) => (
                  <tr key={s.code} className="border-t border-border/60">
                    <td className="px-2 py-1.5 tnum text-muted">{s.code}</td>
                    <td className="px-2 py-1.5 font-medium">{s.name}</td>
                    <td className="px-2 py-1.5 text-right tnum" style={{ color: pctColor(s.pct) }}>{pctStr(s.pct)}</td>
                    <td className="px-2 py-1.5 text-right tnum" style={{ color: pctColor(s.net) }}>{yi(s.net)}</td>
                    <td className="px-2 py-1.5 text-muted leading-snug">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ② 知名游资席位买卖明细 */}
        <section className="space-y-2">
          <SectionLabel>② 知名游资席位当日买卖个股明细及净额</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {activeAliases.map((alias) => {
              const d = R.youzi_detail[alias];
              return (
                <Card key={alias} className="p-3">
                  <CardHead
                    title={alias}
                    subtitle={`当日净额 ${wan(d.net_total)}`}
                    right={
                      <Badge tone={d.net_total >= 0 ? "pos" : "neg"}>
                        {d.net_total >= 0 ? "净买入" : "净卖出"}
                      </Badge>
                    }
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <div className="mb-1 text-muted">买入个股（{d.buy.length}）</div>
                      {d.buy.slice(0, 6).map((t, i) => (
                        <div key={i} className="flex items-center justify-between py-0.5">
                          <span className="truncate">{t.name}</span>
                          <span className="tnum" style={{ color: UP }}>+{t.net}万</span>
                        </div>
                      ))}
                      {d.buy.length === 0 && <div className="text-muted">—</div>}
                    </div>
                    <div>
                      <div className="mb-1 text-muted">卖出个股（{d.sell.length}）</div>
                      {d.sell.slice(0, 6).map((t, i) => (
                        <div key={i} className="flex items-center justify-between py-0.5">
                          <span className="truncate">{t.name}</span>
                          <span className="tnum" style={{ color: DOWN }}>{t.net}万</span>
                        </div>
                      ))}
                      {d.sell.length === 0 && <div className="text-muted">—</div>}
                    </div>
                  </div>
                  {(d.buy.length > 6 || d.sell.length > 6) && (
                    <div className="mt-1 text-2xs text-muted">…仅显示前 6 只，完整明细见东方财富龙虎榜</div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* ③ 游资星级个股总览 */}
        <Card className="p-4">
          <CardHead
            title="③ 游资星级参与个股总览"
            subtitle="按知名游资席位当日净买入合计划分"
            right={<Badge tone="accent">共 {R.star_stocks.length} 只</Badge>}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[3, 2, 1].map((st) => (
              <div key={st} className="flex items-center gap-2 rounded border border-border px-3 py-1.5">
                <span className="text-base leading-none" style={{ color: st === 3 ? "rgb(var(--warn))" : st === 2 ? "rgb(var(--accent))" : "rgb(var(--text-muted))" }}>
                  {"★".repeat(st)}
                </span>
                <span className="text-2xs text-muted">{st}星</span>
                <span className="tnum font-semibold">{starCount[st] || 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 max-h-[360px] overflow-auto rounded border border-border">
            <table className="w-full text-2xs">
              <thead className="sticky top-0 bg-panel-2 text-muted">
                <tr>
                  <th className="px-2 py-2 text-left">星级</th>
                  <th className="px-2 py-2 text-left">名称</th>
                  <th className="px-2 py-2 text-right">涨跌幅</th>
                  <th className="px-2 py-2 text-right">游资净买(万)</th>
                  <th className="px-2 py-2 text-left">上榜原因</th>
                </tr>
              </thead>
              <tbody>
                {R.star_stocks.map((s) => (
                  <tr key={s.code} className="border-t border-border/60">
                    <td className="px-2 py-1.5" style={{ color: s.star === 3 ? "rgb(var(--warn))" : s.star === 2 ? "rgb(var(--accent))" : "rgb(var(--text-muted))" }}>{"★".repeat(s.star)}</td>
                    <td className="px-2 py-1.5 font-medium">{s.name}<span className="ml-1 text-muted">{s.code}</span></td>
                    <td className="px-2 py-1.5 text-right tnum" style={{ color: pctColor(s.pct) }}>{pctStr(s.pct)}</td>
                    <td className="px-2 py-1.5 text-right tnum" style={{ color: pctColor(s.youzi_net) }}>{wan(s.youzi_net)}</td>
                    <td className="px-2 py-1.5 text-muted leading-snug">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ④ 主攻板块与题材 */}
        <section className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <CardHead title="④ 游资主攻题材方向" subtitle="按上榜原因出现频次" />
            <div className="mt-3 space-y-1.5">
              {R.reason_rank.slice(0, 8).map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 text-2xs">
                  <span className="w-44 shrink-0 truncate text-muted" title={k}>{k}</span>
                  <div className="h-2 flex-1 rounded bg-panel-2">
                    <div className="h-2 rounded bg-accent" style={{ width: `${(v / R.reason_rank[0][1]) * 100}%` }} />
                  </div>
                  <span className="tnum w-6 text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <CardHead title="涨停股所属行业分布" subtitle="来自涨停股池 (前 12)" />
            <div className="mt-3 space-y-1.5">
              {R.ind_rank.slice(0, 12).map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2 text-2xs">
                  <span className="w-20 shrink-0 truncate text-muted">{k}</span>
                  <div className="h-2 flex-1 rounded bg-panel-2">
                    <div className="h-2 rounded bg-warn" style={{ width: `${(v / R.ind_rank[0][1]) * 100}%` }} />
                  </div>
                  <span className="tnum w-6 text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ⑤ 机构专用席位 */}
        <section className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <CardHead title="⑤ 机构专用席位净流入前十" subtitle="单位：万元" right={<Badge tone="pos">净买</Badge>} />
            <div className="mt-3 space-y-1">
              {R.inst_top_buy.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-t border-border/50 py-1 text-2xs">
                  <span><span className="font-medium">{r.name}</span> <span className="text-muted">{r.code}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">机{r.buy_inst}/{r.sell_inst}</span>
                    <span className="tnum font-semibold" style={{ color: UP }}>+{r.net}万</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <CardHead title="机构专用席位净流出前十" subtitle="单位：万元" right={<Badge tone="neg">净卖</Badge>} />
            <div className="mt-3 space-y-1">
              {R.inst_top_sell.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-t border-border/50 py-1 text-2xs">
                  <span><span className="font-medium">{r.name}</span> <span className="text-muted">{r.code}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">机{r.buy_inst}/{r.sell_inst}</span>
                    <span className="tnum font-semibold" style={{ color: DOWN }}>{r.net}万</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ⑥ 北向 */}
        <Card className="p-4">
          <CardHead
            title="⑥ 陆股通（北向）净流入/净流出前十"
            subtitle="个股级排行"
            right={<DataStatusBadge status={R.north_perstock_avail ? "Actual" : "Missing"} />}
          />
          {R.north_perstock_avail ? (
            <div className="mt-3 text-2xs text-muted">（个股级数据可用）</div>
          ) : (
            <div className="mt-3 space-y-2 text-2xs text-muted">
              <div className="rounded border border-dashed border-warn/40 bg-warn/5 p-2 text-warn">
                数据源说明：本次抓取中，akshare 北向个股级净买入接口（stock_hsgt_hold_stock_em / stock_hsgt_stock_statistics_em）对 {R.date} 返回空，
                仅汇总层（stock_hsgt_fund_flow_summary_em）可用。以下以可获取口径呈现当日北向资金概览。
              </div>
              {R.north_rows.map((n, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-border px-3 py-2">
                  <span className="font-medium text-content">{n.板块}</span>
                  <span>成交净买额：<span className="tnum" style={{ color: pctColor(n.成交净买额) }}>{n.成交净买额} 亿</span></span>
                  <span>上涨 <span className="tnum" style={{ color: UP }}>{n.上涨数}</span> / 下跌 <span className="tnum" style={{ color: DOWN }}>{n.下跌数}</span></span>
                  <span>{n.相关指数} {pctStr(n.指数涨跌幅)}</span>
                </div>
              ))}
              <div className="text-muted">提示：北向个股前十排行建议通过 Wind / 东方财富终端"沪深港通成交活跃股"栏目交叉核验。</div>
            </div>
          )}
        </Card>

        {/* ⑦ 涨停/连板/情绪 */}
        <Card className="p-4">
          <CardHead title="⑦ 当日涨停板、连板股与市场情绪" subtitle={`涨停 ${R.zt_count} 只 · 炸板 ${R.zb_count} 只 · 最高连板 ${R.max_lb} 板`} right={<Badge tone="accent">真实</Badge>} />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded border border-border p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: UP }}>{R.zt_count}</div>
              <div className="text-2xs text-muted mt-1">涨停家数</div>
            </div>
            <div className="rounded border border-border p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: "rgb(var(--warn))" }}>{R.max_lb}</div>
              <div className="text-2xs text-muted mt-1">最高连板（板）</div>
            </div>
            <div className="rounded border border-border p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: DOWN }}>{R.zb_count}</div>
              <div className="text-2xs text-muted mt-1">炸板家数</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 text-2xs text-muted">连板分布</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(R.lb_dist).sort((a, b) => Number(b[0]) - Number(a[0])).map(([k, v]) => (
                <span key={k} className="rounded border border-border px-2 py-1 text-2xs">
                  {k}板 <span className="tnum font-semibold">{v}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 max-h-[320px] overflow-auto rounded border border-border">
            <table className="w-full text-2xs">
              <thead className="sticky top-0 bg-panel-2 text-muted">
                <tr>
                  <th className="px-2 py-2 text-left">连板</th>
                  <th className="px-2 py-2 text-left">名称</th>
                  <th className="px-2 py-2 text-right">涨跌幅</th>
                  <th className="px-2 py-2 text-left">行业</th>
                  <th className="px-2 py-2 text-right">封板资金</th>
                  <th className="px-2 py-2 text-right">首次封板</th>
                </tr>
              </thead>
              <tbody>
                {R.strong_lb.map((s, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-2 py-1.5 font-semibold" style={{ color: "rgb(var(--warn))" }}>{s.lb}板</td>
                    <td className="px-2 py-1.5 font-medium">{s.name}<span className="ml-1 text-muted">{s.code}</span></td>
                    <td className="px-2 py-1.5 text-right tnum" style={{ color: pctColor(s.pct) }}>{pctStr(s.pct)}</td>
                    <td className="px-2 py-1.5 text-muted">{s.ind}</td>
                    <td className="px-2 py-1.5 text-right tnum">{s.seal != null ? yi(s.seal) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tnum text-muted">{s.first_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <footer className="pt-2 text-2xs text-muted">
          报告由 akshare 真实数据生成 · 游资席位归属为启发式映射，仅供研究参考，不构成投资建议。
        </footer>
      </div>
    </main>
  );
}
