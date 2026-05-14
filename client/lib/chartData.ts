import type { CompletedSession, CompletedTask, WeightLogEntry } from "@/types";

export type ChartRange = "1m" | "3m" | "6m" | "all";

export interface ChartPoint {
  label: string;
  value: number;
  date: string;
}

function getStartDate(range: ChartRange): Date | null {
  const now = new Date();
  switch (range) {
    case "1m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "all":
      return null;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date: Date): string {
  const ws = getWeekStart(date);
  return `${MONTHS[ws.getMonth()]} ${ws.getDate()}`;
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function getWorkoutFrequency(
  sessions: CompletedSession[],
  range: ChartRange
): ChartPoint[] {
  const start = getStartDate(range);
  const filtered = start
    ? sessions.filter((s) => new Date(s.completedAt) >= start)
    : sessions;

  const weekMap = new Map<string, { count: number; sortKey: string }>();
  for (const s of filtered) {
    const d = new Date(s.completedAt);
    const ws = getWeekStart(d);
    const label = weekLabel(d);
    const sortKey = ws.toISOString();
    const existing = weekMap.get(label);
    if (existing) {
      existing.count += 1;
    } else {
      weekMap.set(label, { count: 1, sortKey });
    }
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, { count, sortKey }]) => ({ label, value: count, date: sortKey }));
}

export function getStrengthProgression(
  tasks: CompletedTask[],
  exerciseName: string,
  range: ChartRange
): ChartPoint[] {
  const start = getStartDate(range);
  const filtered = tasks.filter(
    (t) =>
      t.mode === "strength" &&
      t.taskTemplateName === exerciseName &&
      (!start || new Date(t.completedAt) >= start)
  );

  const dateMap = new Map<string, number>();
  for (const t of filtered) {
    const dateStr = t.completedAt.split("T")[0];
    let maxWeight = 0;
    if (t.dataJson.sets) {
      for (const set of t.dataJson.sets) {
        if (set.isCompleted && set.weight && set.weight > maxWeight) {
          maxWeight = set.weight;
        }
      }
    }
    if (maxWeight > 0) {
      const existing = dateMap.get(dateStr);
      if (existing === undefined || maxWeight > existing) {
        dateMap.set(dateStr, maxWeight);
      }
    }
  }

  return Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ label: dayLabel(date), value, date }));
}

export function getWeeklyVolume(
  tasks: CompletedTask[],
  range: ChartRange
): ChartPoint[] {
  const start = getStartDate(range);
  const filtered = tasks.filter(
    (t) => t.mode === "strength" && (!start || new Date(t.completedAt) >= start)
  );

  const weekMap = new Map<string, { volume: number; sortKey: string }>();
  for (const t of filtered) {
    const d = new Date(t.completedAt);
    const ws = getWeekStart(d);
    const label = weekLabel(d);
    const sortKey = ws.toISOString();
    let volume = 0;
    if (t.dataJson.sets) {
      for (const set of t.dataJson.sets) {
        if (set.isCompleted && set.weight && set.reps) {
          volume += set.weight * set.reps;
        }
      }
    }
    const existing = weekMap.get(label);
    if (existing) {
      existing.volume += volume;
    } else {
      weekMap.set(label, { volume, sortKey });
    }
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, { volume, sortKey }]) => ({
      label,
      value: Math.round(volume),
      date: sortKey,
    }));
}

export function getWeeklyDistance(
  tasks: CompletedTask[],
  range: ChartRange
): ChartPoint[] {
  const start = getStartDate(range);
  const filtered = tasks.filter(
    (t) =>
      t.mode === "distance" &&
      t.dataJson.distance &&
      t.dataJson.distance > 0 &&
      (!start || new Date(t.completedAt) >= start)
  );

  const weekMap = new Map<string, { dist: number; sortKey: string }>();
  for (const t of filtered) {
    const d = new Date(t.completedAt);
    const ws = getWeekStart(d);
    const label = weekLabel(d);
    const sortKey = ws.toISOString();
    const dist = t.dataJson.distance || 0;
    const existing = weekMap.get(label);
    if (existing) {
      existing.dist += dist;
    } else {
      weekMap.set(label, { dist, sortKey });
    }
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, { dist, sortKey }]) => ({
      label,
      value: parseFloat(dist.toFixed(1)),
      date: sortKey,
    }));
}

export function getBodyWeightTrend(
  entries: WeightLogEntry[],
  range: ChartRange
): ChartPoint[] {
  const start = getStartDate(range);
  const filtered = start
    ? entries.filter((e) => new Date(e.date) >= start)
    : entries;

  return filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      label: dayLabel(e.date),
      value: e.weight,
      date: e.date,
    }));
}

export function getUniqueStrengthExercises(tasks: CompletedTask[]): string[] {
  const names = new Set<string>();
  for (const t of tasks) {
    if (t.mode === "strength") names.add(t.taskTemplateName);
  }
  return Array.from(names).sort();
}
