import Link from "next/link";
import { notFound } from "next/navigation";
import {
  INTL_MACRO_ECONOMIES,
  INTL_MACRO,
  INTL_MACRO_PERIOD,
  INTL_MACRO_IS_MOCK,
} from "@/lib/intl-macro-mock";
import { MacroResearchChart } from "@/components/macro-research-chart";

export function generateStaticParams() {
  return INTL_MACRO_ECONOMIES.map((e) => ({ code: e.code }));
}

export default function MacroEcoPage({ params }: { params: { code: string } }) {
  const eco = INTL_MACRO_ECONOMIES.find((e) => e.code === params.code);
  if (!eco) return notFound();
  const indicators = INTL_MACRO[eco.code];
  const hasData = !!indicators && indicators.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/global-regime" className="text-2xs text-accent hover:underline">
          ← 返回全球宏观态势
        </Link>
        <h1 className="text-lg font-semibold mt-1">{eco.name}宏观数据监控</h1>
        <p className="text-2xs text-muted">
          各指标独立同比走势 + 实际−前值（一致预期免费源暂未覆盖）。数据来源：{eco.source}。
          美国宏观取自 FRED（CPI/GDP/失业率真实 YoY 历史），其余经济体展示 FRED 10Y 国债收益率（真实）。
          数据状态：{INTL_MACRO_IS_MOCK ? "Mock" : "真实数据（构建期快照）"}。
        </p>
      </div>

      {hasData ? (
        <MacroResearchChart
          key={eco.code}
          indicators={indicators}
          title={`${eco.name}主要经济数据`}
          period={INTL_MACRO_PERIOD}
          isMock={INTL_MACRO_IS_MOCK}
          sourceLabel={eco.source}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-md p-6 text-center text-sm text-slate-500">
          当前免费数据源（FRED）暂未覆盖 {eco.name} 的 10Y 国债收益率等可观测序列，本页暂无真实数据展示。
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-2xs">
        {INTL_MACRO_ECONOMIES.filter((e) => e.code !== eco.code).map((e) => (
          <Link
            key={e.code}
            href={`/macro/${e.code}`}
            className="px-2 py-1 rounded border border-border hover:bg-panel-2 text-muted"
          >
            {e.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
