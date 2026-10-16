"use client";

import * as React from "react";
import {
  provenanceSummary,
  DATA_ASOF,
  DATA_FETCHED_AT,
} from "@/lib/realdata";

/* 全站数据溯源条：公开数据截止日、抓取时间、真实覆盖率与来源构成。
   所有可观测序列均为构建期抓取的静态研究快照，非实时行情。优先数据源为 Wind
   金融数据服务（缺口利率/政策利率/离岸利率等），其余由免费公开源（FRED /
   akshare / EastMoney / NBS / Sina）补充。分析层（regime 矩阵、策略回测）为标注模型。 */

export function DataProvenanceBar() {
  const [open, setOpen] = React.useState(false);
  const summary = React.useMemo(() => provenanceSummary(), []);
  const real = summary.real;
  const total = summary.total;
  const pct = total ? Math.round((real / total) * 100) : 0;
  const fetched = DATA_FETCHED_AT ? DATA_FETCHED_AT.replace("T", " ").slice(0, 16) : "—";

  return (
    <div className="border-t border-border bg-panel-2">
      <div className="px-4 py-1.5 flex items-center gap-3 flex-wrap text-2xs text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-content/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          真实数据 {real}/{total}（{pct}%）
        </span>
        <span className="text-border">·</span>
        <span>数据截至 <b className="text-content/80">{DATA_ASOF}</b></span>
        <span className="text-border">·</span>
        <span>抓取于 {fetched}</span>
        <span className="text-border">·</span>
        <span>来源：Wind（优先）/ FRED / akshare / EastMoney / NBS / Sina</span>
        <span className="text-border">·</span>
        <span className="text-amber-500/90">分析层（regime 矩阵 / 策略回测）为模型推导，非真实数据</span>
        <span className="text-border">·</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-accent hover:underline"
        >
          {open ? "收起溯源明细" : "查看溯源明细"}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-3 max-h-64 overflow-auto">
          <table className="w-full text-2xs border-collapse">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-1 pr-3 font-medium">序列</th>
                <th className="py-1 pr-3 font-medium">状态</th>
                <th className="py-1 pr-3 font-medium">来源</th>
                <th className="py-1 font-medium">截止</th>
              </tr>
            </thead>
            <tbody>
              {summary.details.map((d) => (
                <tr key={d.key} className="border-b border-border/60">
                  <td className="py-0.5 pr-3 font-mono text-content/80">{d.key}</td>
                  <td className="py-0.5 pr-3">
                    <span
                      className={
                        d.status.startsWith("OK")
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-0.5 pr-3 text-muted">{d.source}</td>
                  <td className="py-0.5 text-muted">{d.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
