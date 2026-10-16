"use client";

import {
  PageHeader,
  ConclusionBlock,
  IndicatorTable,
  SpreadMatrix,
  MultiTrendChart,
  SectionLabel,
} from "@/components/research-ui";
import {
  getIndicator,
  byCategory,
  indicatorsToCSV,
  downloadCSV,
} from "@/lib/indicators";

export default function CrossCountrySpreadsPage() {
  const g = (c: string) => getIndicator(c);
  const us10y = g("US_10Y");
  const eu10y = g("EU_10Y");
  const jp10y = g("JP_10Y");
  const cn10y = g("CN_10Y");
  const cnus = g("CN_US10Y_SPD");

  const rates = byCategory("rates");
  const csv = indicatorsToCSV(rates);

  return (
    <div className="space-y-6">
      <PageHeader
        question="主要主权利差如何分布？中美 / 美欧 / 美日利差变化对汇率与资金流意味着什么？"
        title="跨国利差"
        subtitle="Cross-Country Spreads · 仅列事实，不给交易建议"
        onExport={() => downloadCSV("跨国利差.csv", csv)}
      />

      <ConclusionBlock
        items={[
          {
            title: "美债 10Y 相对欧 / 日 / 中显著占优",
            points: [
              `美 10Y ${us10y?.value}% vs 德 ${eu10y?.value}% / 日 ${jp10y?.value}% / 中 ${cn10y?.value}%，绝对利差高位。`,
            ],
          },
          {
            title: "中美 10Y 利差深度为负，压制人民币资产",
            points: [
              `中美 10Y 利差（中−美）${cnus?.value} pp（前值 ${cnus?.previous} pp），人民币资产相对吸引力偏弱。`,
            ],
          },
          {
            title: "利差高位支撑美元、套息交易活跃",
            points: [
              `美日 10Y 利差约 ${(Number(us10y?.value) - Number(jp10y?.value)).toFixed(2)} pp，carry 仍具吸引力（仅描述）。`,
            ],
          },
        ]}
      />

      <section className="space-y-3">
        <SectionLabel>图表区</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SpreadMatrix caption="10Y 收益率之差（bp，行 − 列）" />
          <MultiTrendChart
            codes={["US_10Y", "CN_10Y", "EU_10Y", "JP_10Y"]}
            unit="%"
            title="主要 10Y 国债收益率走势"
          />
        </div>
      </section>

      <IndicatorTable
        indicators={rates}
        groupBy="region"
        title="利率与利差指标"
        subtitle="各期限收益率 / 跨国利差 · 冻结表头首列 · 点击行展开 17 字段"
      />
    </div>
  );
}
