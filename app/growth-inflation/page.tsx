"use client";

import {
  PageHeader,
  ConclusionBlock,
  RiskBlock,
  IndicatorTable,
  SectionLabel,
} from "@/components/research-ui";
import { ChinaMacroDashboard } from "@/components/china-macro-dashboard";
import EmptyRealReturnsChart from "@/components/empty-real-returns-chart";
import {
  getIndicator,
  byCategory,
  indicatorsToCSV,
  downloadCSV,
} from "@/lib/indicators";

export default function GrowthInflationPage() {
  const g = (c: string) => getIndicator(c);
  const usGdp = g("US_GDP_QOQ");
  const usNfp = g("US_NFP");
  const usUnemp = g("US_UNEMP");
  const cnGdp = g("CN_GDP_YOY");
  const cnIp = g("CN_IP_YOY");
  const cnRetail = g("CN_RETAIL_YOY");
  const usCpi = g("US_CPI_YOY");
  const usCore = g("US_CORECPI_YOY");
  const cnCpi = g("CN_CPI_YOY");
  const euCpi = g("EU_CPI_YOY");
  const jpCpi = g("JP_CPI_YOY");

  const growth = byCategory("growth");
  const inflation = byCategory("inflation");
  const csv = indicatorsToCSV([...growth, ...inflation]);

  return (
    <div className="space-y-6">
      <PageHeader
        question="全球增长是否分化？通胀是否趋势回落、粘性在哪？对股/债/汇含义如何？"
        title="增长与通胀"
        subtitle="Growth & Inflation · 下方为模型推导指标（确定性 Mock，非真实发布数据）"
        onExport={() => downloadCSV("增长与通胀.csv", csv)}
      />

      <p className="text-2xs text-amber-500/90 leading-relaxed -mt-2">
        说明：本页增长/通胀指标为模型推导（确定性 Mock），用于演示分析框架；真实 CPI / GDP / PMI / M2 等序列已抓取并展示于「宏观明细 /macro」与「中国流动性」等页面。
      </p>

      <ConclusionBlock
        items={[
          {
            title: "美国增长放缓但仍具韧性",
            points: [
              `美国 GDP 环比折年 ${usGdp?.value}%（前值 ${usGdp?.previous}%），非农 +${usNfp?.value}k（前值 ${usNfp?.previous}k），失业率 ${usUnemp?.value}%。`,
              "增速较前期回落，但就业与消费未明显恶化，软着陆叙事仍成立。",
            ],
          },
          {
            title: "中国增长温和、内需偏弱",
            points: [
              `中国 GDP 同比 ${cnGdp?.value}%（前值 ${cnGdp?.previous}%），工业增加值 ${cnIp?.value}%，但社零 ${cnRetail?.value}% 处 ${cnRetail?.percentile}% 分位，内需仍待修复。`,
            ],
          },
          {
            title: "通胀普遍回落，美核心粘性高、中国通缩风险",
            points: [
              `美国 CPI ${usCpi?.value}%（前值 ${usCpi?.previous}%）、核心 ${usCore?.value}%，距目标仍有距离；`,
              `中国 CPI ${cnCpi?.value}% 处 ${cnCpi?.percentile}% 分位、欧元区 ${euCpi?.value}%、日本 ${jpCpi?.value}%，分化明显。`,
            ],
          },
        ]}
      />

      <RiskBlock
        items={[
          {
            title: `中国通缩风险：CPI ${cnCpi?.value}%（${cnCpi?.percentile}% 分位）`,
            detail: "价格信号偏弱，关注 PBoC 宽松与财政发力节奏。",
          },
          {
            title: `美国粘性通胀：核心 CPI ${usCore?.value}%`,
            detail: "若反弹将推迟降息，推高美债收益率与美元。",
          },
        ]}
      />

      <section className="space-y-3">
        <SectionLabel>图表区 · 中国主要经济数据走势 & 预期差</SectionLabel>
        <ChinaMacroDashboard />
      </section>

      <section className="space-y-3">
        <SectionLabel>研究图表 · 空转收益与实体收益分配（2025-01 ~ 2026-08，日频对齐）</SectionLabel>
        <EmptyRealReturnsChart />
      </section>

      <IndicatorTable
        indicators={growth}
        groupBy="region"
        title="增长指标"
        subtitle="GDP / 工业 / 零售 / 就业 · 冻结表头首列 · 点击行展开 17 字段"
      />
      <IndicatorTable
        indicators={inflation}
        groupBy="region"
        title="通胀指标"
        subtitle="CPI / 核心 CPI / PPI / PCE · 点击行展开 17 字段"
      />
    </div>
  );
}
