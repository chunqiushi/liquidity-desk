"use client";

import {
  PageHeader,
  ConclusionBlock,
  RiskBlock,
  IndicatorTable,
  MultiTrendChart,
  SectionLabel,
} from "@/components/research-ui";
import {
  getIndicator,
  byCategory,
  indicatorsToCSV,
  downloadCSV,
} from "@/lib/indicators";

export default function RiskCyclePage() {
  const g = (c: string) => getIndicator(c);
  const vix = g("VIX");
  const ig = g("US_IG_OAS");
  const hy = g("US_HY_OAS");

  const risk = byCategory("risk");
  const csv = indicatorsToCSV(risk);

  return (
    <div className="space-y-6">
      <PageHeader
        question="当前处在风险周期的什么位置？波动率、信用利差、风险偏好给出什么信号？"
        title="风险与周期"
        subtitle="Risk & Cycle · 仅描述事实，不做因果结论"
        onExport={() => downloadCSV("风险与周期.csv", csv)}
      />

      <ConclusionBlock
        items={[
          {
            title: "风险偏好改善，波动率回落",
            points: [
              `VIX ${vix?.value}（前值 ${vix?.previous}），处 ${vix?.percentile}% 分位，恐慌情绪降温。`,
            ],
          },
          {
            title: "信用利差收窄",
            points: [
              `投资级 OAS ${ig?.value} bp（前值 ${ig?.previous}）、高收益 ${hy?.value} bp（前值 ${hy?.previous}），融资环境边际宽松。`,
            ],
          },
          {
            title: "周期定位：温和扩张后段",
            points: [
              `增长为正、通胀回落、政策仍偏紧——典型 late-cycle 组合，关注政策转向与盈利韧性。`,
            ],
          },
        ]}
      />

      <RiskBlock
        items={[
          {
            title: `波动率低位：VIX ${vix?.value}`,
            detail: "低波动往往伴随仓位拥挤，关注外生冲击下的回撤放大。",
          },
          {
            title: `信用利差低位：HY OAS ${hy?.value} bp`,
            detail: "利差压缩反映乐观定价，若利率或增长预期反转，信用板块脆弱性上升。",
          },
        ]}
      />

      <section className="space-y-3">
        <SectionLabel>图表区</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <MultiTrendChart codes={["VIX"]} title="VIX 波动率指数" height={240} />
          <MultiTrendChart
            codes={["US_IG_OAS", "US_HY_OAS"]}
            unit="bp"
            title="信用利差（OAS）"
            height={240}
          />
        </div>
      </section>

      <IndicatorTable
        indicators={risk}
        groupBy="region"
        title="风险指标"
        subtitle="波动率 / 信用利差 · 冻结表头首列 · 点击行展开 17 字段"
      />
    </div>
  );
}
