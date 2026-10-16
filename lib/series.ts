import { Observation } from "./types";

/** Convert a map of Observation[] into chart rows keyed by series id. */
export function toChartRows(
  seriesMap: Record<string, Observation[]>,
  ids: string[],
): { date: string; [k: string]: number | string }[] {
  const lists = ids.map((id) => seriesMap[id] ?? []);
  const len = Math.min(...lists.map((l) => l.length), 100000);
  if (!len || len <= 0) return [];
  const out: { date: string; [k: string]: number | string }[] = [];
  for (let i = 0; i < len; i++) {
    const row: { date: string; [k: string]: number | string } = {
      date: lists[0][i]?.observationDate ?? "",
    };
    ids.forEach((id, idx) => {
      const o = lists[idx][i];
      row[id] = o && o.value !== null ? o.value : NaN;
    });
    out.push(row);
  }
  return out;
}

export function latestValue(obs?: Observation[]): number | null {
  if (!obs || obs.length === 0) return null;
  const last = obs[obs.length - 1];
  return last.value;
}

export function changePct(obs?: Observation[], days = 30): number | null {
  if (!obs || obs.length <= days) return null;
  const last = obs[obs.length - 1].value;
  const prev = obs[obs.length - 1 - days].value;
  if (last === null || prev === null || prev === 0) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

/* ---- calendar-aware deltas (robust for weekly/daily mixed real series) ---- */
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Absolute change over ~`days` calendar days ending at the last observation. */
export function calDelta(obs?: Observation[], days = 1): number | null {
  if (!obs || obs.length < 2) return null;
  const last = obs[obs.length - 1];
  if (last.value === null) return null;
  const target = shiftDate(last.observationDate, -days);
  let chosen: Observation | null = null;
  for (const o of obs) {
    if (o.observationDate <= target) chosen = o;
    else break;
  }
  if (!chosen || chosen === last || chosen.value === null) return null;
  return Number((last.value - chosen.value).toFixed(4));
}

/** Percentage change over ~`days` calendar days ending at the last observation. */
export function calPct(obs?: Observation[], days = 30): number | null {
  if (!obs || obs.length < 2) return null;
  const last = obs[obs.length - 1];
  if (last.value === null) return null;
  const target = shiftDate(last.observationDate, -days);
  let chosen: Observation | null = null;
  for (const o of obs) {
    if (o.observationDate <= target) chosen = o;
    else break;
  }
  if (!chosen || chosen === last || chosen.value === null || chosen.value === 0) return null;
  return Number((((last.value - chosen.value) / Math.abs(chosen.value)) * 100).toFixed(2));
}

export function zscore(values: number[]): number[] {
  const clean = values.filter((v) => !Number.isNaN(v));
  if (clean.length === 0) return values.map(() => 0);
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const sd = Math.sqrt(
    clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length,
  );
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (Number.isNaN(v) ? 0 : (v - mean) / sd));
}

export function percentileRank(values: number[], x: number): number {
  const clean = values.filter((v) => !Number.isNaN(v));
  if (clean.length === 0) return 0.5;
  const below = clean.filter((v) => v <= x).length;
  return below / clean.length;
}
