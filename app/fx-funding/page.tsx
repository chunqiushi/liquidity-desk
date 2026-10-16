"use client";

import {
  PageHeader,
  ConclusionBlock,
  RiskBlock,
  IndicatorTable,
  FxHeatmap,
  MultiTrendChart,
  SectionLabel,
} from "@/components/research-ui";
import {
  getIndicator,
  byCategory,
  indicatorsToCSV,
  downloadCSV,
} from "@/lib/indicators";

export default function FxFundingPage() {
  const g = (c: string) => getIndicator(c);
  const dxy = g("DXY");
  const usdcnh = g("CN_USDCNH");
  const usdjpy = g("USDJPY");
  const eurusd = g("EURUSD");

  const fx = byCategory("fx");
  const csv = indicatorsToCSV(fx);

  return (
    <div className="space-y-6">
      <PageHeader
        question="美元强弱如何？人民币 / 日元压力来源？资金流向哪类资产？"
        title="外汇与资金"
        subtitle="FX & Flows · 资金流为 Mock 占位，标 MOCK"
        onExport={() => downloadCSV("外汇与资金.csv", csv)}
      />

      <ConclusionBlock
        items={[
          {
            title: "美元指数走强",
            points: [`DXY ${dxy?.value}（前值 ${dxy?.previous}），美元对一篮子货币偏强。`],
          },
          {
            title: "人民币对美元小幅升值，但仍在中性分位",
            points: [
              `USDCNH ${usdcnh?.value}（前值 ${usdcnh?.previous}），即人民币兑美元微升；处 ${usdcnh?.percentile}% 分位，未明显超卖。`,
            ],
          },
          {
            title: "日元反弹、美日利差仍高",
            points: [
              `USDJPY ${usdjpy?.value}（前值 ${usdjpy?.previous}），日元回升；美日 10Y 利差高位是主要压制因素。`,
            ],
          },
        ]}
      />

      <RiskBlock
        items={[
          {
            title: `日元反弹后的可持续性：USDJPY ${usdjpy?.value}`,
            detail: "美日利差维持高位，日元反弹可持续性存疑，关注日银边际调整与干预风险。",
          },
        ]}
      />

      <section className="space-y-3">
        <SectionLabel>图表区</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <FxHeatmap />
          <MultiTrendChart
            codes={["DXY", "US_10Y"]}
            title="美元指数 vs 美债 10Y"
            subtitle="两者走强反映美元流动性收紧预期"
          />
        </div>
      </section>

      <IndicatorTable
        indicators={fx}
        groupBy="region"
        title="外汇指标"
        subtitle="即期汇率 / 美元指数 · 冻结表头首列 · 点击行展开 17 字段"
      />
    </div>
  );
}
