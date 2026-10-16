"use client";

import * as React from "react";
import {
  PageHeader,
  ConclusionBlock,
  SectionLabel,
} from "@/components/research-ui";
import { getLiquidityMatrix } from "@/lib/liquidity";
import {
  CountryTrendCard,
  ChangeDashboard,
  CountryEventsCard,
  FLAG,
  ASOF,
} from "@/components/money-market-charts";
import { FxHeatmap } from "@/components/fx-heatmap";

export default function MoneyMarketPage() {
  const matrix = React.useMemo(() => getLiquidityMatrix(ASOF), []);
  const up = matrix.filter((e) => (e.coreFunding.chg1w ?? 0) > 0.5).length;
  const down = matrix.filter((e) => (e.coreFunding.chg1w ?? 0) < -0.5).length;
  const inverted = matrix.filter((e) => e.coreFunding.value < e.policyRate.value).length;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader
        question="八国货币市场利率的当前水平、走势与驱动事件？"
        title="货币市场"
        subtitle="Money Market · 八大经济体关键短端利率（DR007 / SOFR / €STR / TONAR / HIBOR / SARON / SONIA / 隔夜OIS）走势、每日变化与关键影响"
        onExport={() => {
          const rows = matrix.map(
            (e) =>
              `${e.currency},${e.coreFunding.label},${e.coreFunding.value},${
                e.coreFunding.chg1d
              },${e.coreFunding.chg1w},${e.coreFunding.chg1m}`,
          );
          const csv = "货币,关键利率,当前,1日bp,1周bp,1月bp\n" + rows.join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "货币市场利率.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      <ConclusionBlock
        items={[
          {
            title: "全球短端利率高位分化",
            points: [
              `8 国关键货币市场利率中，周内上行 ${up} 个、下行 ${down} 个；`,
              `其中 ${inverted} 个经济体出现期限倒挂（货币市场利率低于政策利率），反映各自的流动性分层或季末效应。`,
            ],
          },
          {
            title: "美元资金面边际收紧",
            points: [
              `SOFR ${matrix.find((e) => e.code === "USD")?.coreFunding.value}% 高位锚定，`,
              `ON RRP 缩量与季末国债结算或放大短端波动，需关注跨境外溢。`,
            ],
          },
          {
            title: "中国银行间维持宽松",
            points: [
              `DR007 ${matrix.find((e) => e.code === "CNY")?.coreFunding.value}% 围绕政策利率下方平稳，`,
              `央行跨季呵护下资金面情绪偏暖，但信用传导仍待改善。`,
            ],
          },
        ]}
      />

      {/* 八国快速概览条 */}
      <section>
        <SectionLabel>八国货币市场利率 · 速览</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-2">
          {matrix.map((eco) => {
            const ind = eco.coreFunding;
            const c = ind.chg1w ?? 0;
            const cls = c > 0.05 ? "text-neg" : c < -0.05 ? "text-pos" : "text-muted";
            return (
              <div key={eco.code} className="card-soft p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-2xs text-muted">
                  <span>{FLAG[eco.code]}</span>
                  <span>{eco.currency}</span>
                </div>
                <div className="text-base font-semibold tnum">{ind.value.toFixed(2)}%</div>
                <div className={`text-2xs tnum font-medium ${cls}`}>
                  周 {c >= 0 ? "+" : ""}
                  {c.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 1 · 八国货币市场利率走势（核心展示） */}
      <section className="space-y-3">
        <SectionLabel>
          八国货币市场利率走势 · 完美展示（当前 / 政策利率参考 / 1周前对比）
        </SectionLabel>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {matrix.map((eco) => (
            <CountryTrendCard key={eco.code} eco={eco} />
          ))}
        </div>
      </section>

      {/* 1.5 · 外汇热力图 */}
      <section className="space-y-3">
        <SectionLabel>外汇热力图 · 八国货币相对强弱</SectionLabel>
        <FxHeatmap />
      </section>

      {/* 2 · 最新走势变化 */}
      <section className="space-y-3">
        <SectionLabel>最新走势变化 · 日 / 周 / 月变动</SectionLabel>
        <ChangeDashboard matrix={matrix} />
      </section>

      {/* 3 · 过去与未来关键影响 */}
      <section className="space-y-3">
        <SectionLabel>过去一周 / 未来一周关键影响</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {matrix.map((eco) => (
            <CountryEventsCard key={eco.code} code={eco.code} />
          ))}
        </div>
      </section>
    </div>
  );
}
