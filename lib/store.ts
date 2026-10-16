"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ResearchHypothesis,
  ResearchTask,
  WeeklyBrief,
} from "./types";
import { SEED_TASKS, SEED_HYPOTHESES, SEED_BRIEF } from "./mock-data";

/* ----------------------------------------------------------------------------
 * Research context filters (spec §5) — not persisted
 * ------------------------------------------------------------------------- */

export interface ResearchContextState {
  asOfDate: string;
  vintageDate: string;
  currency: string; // "ALL" or code
  region: string; // "ALL" or region
  assetClass: string; // "ALL" or asset class
  frequency: string;
  lookback: string; // 1M/3M/6M/1Y/3Y/5Y
  dataSource: string; // "ALL"
  dataStatus: string; // "ALL"
  methodVersion: string;
  timeWindow: "1D" | "1W" | "1M"; // 全局时间窗口（顶部栏 1D/1W/1M）
  theme: "dark" | "light";
  sidebarOpen: boolean; // 移动端侧栏抽屉
  set: (patch: Partial<ResearchContextState>) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

const DEFAULT_CONTEXT = {
  asOfDate: "2026-09-29",
  vintageDate: "2026-09-29",
  currency: "ALL",
  region: "ALL",
  assetClass: "ALL",
  frequency: "Daily",
  lookback: "6M",
  dataSource: "ALL",
  dataStatus: "ALL",
  methodVersion: "v0.1",
  timeWindow: "1W" as const,
  theme: "dark" as const,
  sidebarOpen: false,
};

export const useResearchContext = create<ResearchContextState>((set) => ({
  ...DEFAULT_CONTEXT,
  set: (patch) => set(patch),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

/* ----------------------------------------------------------------------------
 * Persisted research data (spec §12, §13)
 * ------------------------------------------------------------------------- */

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface ResearchDataState {
  tasks: ResearchTask[];
  hypotheses: ResearchHypothesis[];
  brief: WeeklyBrief;
  notes: { id: string; currency: string; text: string; createdAt: string }[];
  watchlist: string[]; // 关注清单（指标 code）
  addTask: (t: Omit<ResearchTask, "id" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<ResearchTask>) => void;
  removeTask: (id: string) => void;
  addHypothesis: (h: Omit<ResearchHypothesis, "id">) => void;
  linkHypothesisTask: (hId: string, taskId: string) => void;
  updateBrief: (patch: Partial<WeeklyBrief>) => void;
  addNote: (currency: string, text: string) => void;
  toggleWatch: (code: string) => void;
  reset: () => void;
}

export const useResearchData = create<ResearchDataState>()(
  persist(
    (set) => ({
      tasks: SEED_TASKS,
      hypotheses: SEED_HYPOTHESES,
      brief: SEED_BRIEF,
      notes: [],
      watchlist: [
        "US_10Y",
        "DXY",
        "CN_USDCNH",
        "US_2S10S",
        "US_SOFR_IORB",
        "CN_DR007",
        "EU_CPI_YOY",
        "JP_10Y",
      ],
      addTask: (t) =>
        set((s) => ({
          tasks: [
            { ...t, id: genId("t"), createdAt: new Date().toISOString().slice(0, 10) },
            ...s.tasks,
          ],
        })),
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      addHypothesis: (h) =>
        set((s) => ({ hypotheses: [{ ...h, id: genId("h") }, ...s.hypotheses] })),
      linkHypothesisTask: (hId, taskId) =>
        set((s) => ({
          hypotheses: s.hypotheses.map((h) =>
            h.id === hId && !h.linkedTasks.includes(taskId)
              ? { ...h, linkedTasks: [...h.linkedTasks, taskId] }
              : h,
          ),
        })),
      updateBrief: (patch) => set((s) => ({ brief: { ...s.brief, ...patch } })),
      addNote: (currency, text) =>
        set((s) => ({
          notes: [
            { id: genId("n"), currency, text, createdAt: new Date().toISOString() },
            ...s.notes,
          ],
        })),
      toggleWatch: (code) =>
        set((s) => ({
          watchlist: s.watchlist.includes(code)
            ? s.watchlist.filter((c) => c !== code)
            : [...s.watchlist, code],
        })),
      reset: () =>
        set({ tasks: SEED_TASKS, hypotheses: SEED_HYPOTHESES, brief: SEED_BRIEF, notes: [] }),
    }),
    {
      name: "liquidity-desk-research",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
