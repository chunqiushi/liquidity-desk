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

export default function CentralBanksPage() {
  const g = (c: string) => getIndicator(c);
  const usFfr = g("US_FFR");
  const usIorb = g("US_IORB");
  const sofrIorb = g("US_SOFR_IORB");
  const cnPbc = g("CN_PBOC_7D");
  const cnMlf = g("CN_MLF");
  const cnLpr = g("CN_LPR_1Y");
  const cnCpi = g("CN_CPI_YOY");
  const euDep = g("EU_DEP");
  const euCpi = g("EU_CPI_YOY");
  const jpPol = g("JP_POLICY");
  const jpCpi = g("JP_CPI_YOY");

  const policy = byCategory("policy");
  const csv = indicatorsToCSV(policy);

  const realRate = (pol: number, cpi: number) => (pol - cpi).toFixed(2);

  return (
    <div className="space-y-6">
      <PageHeader
        question="主要央行处于紧缩 / 宽松 / 观望的哪一阶段？政策利率与通胀的背离说明什么？"
        title="央行与政策"
        subtitle="Central Banks & Policy · 结论基于下方真实指标（全部 Mock）"
        onExport={() => downloadCSV("央行与政策.csv", csv)}
      />

      <ConclusionBlock
        items={[
          {
            title: "美联储按兵不动，货币端摩擦上升",
            points: [
              `联邦基金目标上限 ${usFfr?.value}%，IORB ${usIorb?.value}%；SOFR-IORB 利差走阔至 ${sofrIorb?.value} bp（前值 ${sofrIorb?.previous} bp，处 ${sofrIorb?.percentile}% 分位）。`,
              `真实利率 ${realRate(usFfr!.value, g("US_CPI_YOY")!.value)}%（政策−CPI），限制性仍强。`,
            ],
          },
          {
            title: "中国 PBoC 宽松空间打开",
            points: [
              `7 天逆回购 ${cnPbc?.value}%、MLF ${cnMlf?.value}%、LPR 1Y ${cnLpr?.value}%；低通胀（CPI ${cnCpi?.value}%）打开宽松窗口。`,
            ],
          },
          {
            title: "欧央行走降息通道、日银谨慎正常化",
            points: [
              `欧央行存款利率 ${euDep?.value}%，欧元区 CPI ${euCpi?.value}% 支撑继续降息；`,
              `日银政策利率 ${jpPol?.value}%，CPI ${jpCpi?.value}% 仍支撑温和正常化。`,
            ],
          },
        ]}
      />

      <RiskBlock
        items={[
          {
            title: `美元资金面摩擦：SOFR-IORB ${sofrIorb?.value} bp（${sofrIorb?.percentile}% 分位）`,
            detail: "货币市场利差走阔，警惕季末/税期回购波动与美元流动性分层。",
          },
          {
            title: `中国通缩约束：CPI ${cnCpi?.value}% 低位`,
            detail: "低通胀提升实际利率，对实体经济与银行净息差形成压力。",
          },
        ]}
      />

      <section className="space-y-3">
        <SectionLabel>图表区</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <MultiTrendChart
            codes={["CN_PBOC_7D", "US_FFR", "EU_DEP", "JP_POLICY"]}
            unit="%"
            title="政策利率水平"
          />
          <MultiTrendChart
            codes={["US_FFR", "US_CPI_YOY", "CN_PBOC_7D", "CN_CPI_YOY", "EU_DEP", "EU_CPI_YOY"]}
            unit="%"
            title="政策利率 vs 通胀（真实利率视角）"
            height={300}
          />
        </div>
      </section>

      <IndicatorTable
        indicators={policy}
        groupBy="region"
        title="政策利率指标"
        subtitle="各央行政策利率 · 冻结表头首列 · 点击行展开 17 字段"
      />
    </div>
  );
}
