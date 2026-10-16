import { z } from "zod";

/* ----------------------------------------------------------------------------
 * Data status & quality vocabulary (spec §11)
 * ------------------------------------------------------------------------- */

export const DATA_STATUS = [
  "Actual",
  "Estimate",
  "Revised",
  "Missing",
] as const;
export type DataStatus = (typeof DATA_STATUS)[number];

export const SOURCE_KIND = [
  "Official",
  "Market",
  "Delayed",
  "Manual",
  "Mock",
] as const;
export type SourceKind = (typeof SOURCE_KIND)[number];

export const FREQUENCY = ["Daily", "Weekly", "Monthly", "Quarterly"] as const;
export type Frequency = (typeof FREQUENCY)[number];

export const LOOKBACK = ["1M", "3M", "6M", "1Y", "3Y", "5Y"] as const;
export type Lookback = (typeof LOOKBACK)[number];

export const PRIORITY = ["P0", "P1", "P2"] as const;
export type Priority = (typeof PRIORITY)[number];

/* ----------------------------------------------------------------------------
 * Observation: the atomic, auditable data point (spec §11)
 * ------------------------------------------------------------------------- */

export const ObservationSchema = z.object({
  seriesId: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  currency: z.string(),
  observationDate: z.string(), // ISO date the value refers to
  releaseDate: z.string(), // ISO date the value was published
  vintageDate: z.string(), // ISO date the data became usable
  source: z.string(),
  sourceKind: z.enum(SOURCE_KIND),
  frequency: z.enum(FREQUENCY),
  status: z.enum(DATA_STATUS),
  method: z.string(),
  methodVersion: z.string(),
  dataQuality: z.string().optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;

/* ----------------------------------------------------------------------------
 * Indicator definition
 * ------------------------------------------------------------------------- */

export type IndicatorCategory =
  | "Policy"
  | "ShortEnd"
  | "Curve"
  | "BalanceSheet"
  | "Banking"
  | "Funding"
  | "FX"
  | "Macro";

export interface IndicatorDef {
  id: string;
  label: string;
  unit: string;
  category: IndicatorCategory;
  /** When true, a deterministic mock series is generated for this indicator. */
  mockSeries?: boolean;
  /** When true, the indicator is shown in the Currency Monitor snapshot table. */
  snapshot?: boolean;
  description?: string;
}

/* ----------------------------------------------------------------------------
 * Currency configuration (spec §2, §8) — localized, not a uniform template
 * ------------------------------------------------------------------------- */

export interface CurrencyConfig {
  code: string;
  name: string;
  centralBank: string;
  region: string;
  /** Short note on the monetary regime / plumbing that differs per currency. */
  regime: string;
  /** Accent color used for charts. */
  color: string;
  /** Key monitoring focus bullets. */
  focus: string[];
  indicators: IndicatorDef[];
}

/* ----------------------------------------------------------------------------
 * News & Events (spec §7 Section 8, §6 Module D)
 * ------------------------------------------------------------------------- */

export type NewsCategory =
  | "Central Bank"
  | "Liquidity"
  | "Fiscal"
  | "Macro Data"
  | "Funding"
  | "FX Policy"
  | "Global Risk";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  currency: string;
  category: NewsCategory;
  priority: Priority;
  summary: string;
  marketRelevance: string;
  relatedIndicators: string[];
  url: string;
  read: boolean;
  inNotes: boolean;
}

export interface PolicyEvent {
  id: string;
  title: string;
  date: string;
  currency: string;
  priority: Priority;
  kind: "CentralBank" | "Macro" | "Fiscal" | "Liquidity" | "Research";
  note: string;
}

/* ----------------------------------------------------------------------------
 * Research workflow (spec §12, §13)
 * ------------------------------------------------------------------------- */

export const RESEARCH_STATUS = [
  "Idea",
  "In Progress",
  "Evidence",
  "Hypothesis",
  "Review",
  "Closed",
] as const;
export type ResearchStatus = (typeof RESEARCH_STATUS)[number];

export interface ResearchTask {
  id: string;
  title: string;
  researchQuestion: string;
  hypothesis: string;
  currency: string;
  assetClass: string;
  priority: Priority;
  status: ResearchStatus;
  evidence: string[];
  relatedIndicators: string[];
  relatedNews: string[];
  nextAction: string;
  reviewDate: string;
  conclusion: string;
  confidence: number; // 0..1
  openQuestions: string[];
  createdAt: string;
}

export interface ResearchHypothesis {
  id: string;
  statement: string;
  currency: string;
  assetClass: string;
  linkedTasks: string[];
  status: "Proposed" | "Testing" | "Supported" | "Rejected" | "Open";
  evidenceFor: string[];
  evidenceAgainst: string[];
}

export type BriefStatus = "Draft" | "Review" | "Published" | "Archived";

export interface WeeklyBriefBlock {
  id: string;
  title: string;
  queryId: string;
  asOfDate: string;
  vintageDate: string;
  source: string;
  methodVersion: string;
  chartConfig: string;
  relatedResearchId: string;
}

export interface WeeklyBrief {
  id: string;
  weekOf: string;
  status: BriefStatus;
  sections: string[]; // 10 sections per spec §13
  blocks: WeeklyBriefBlock[];
  version: number;
}
