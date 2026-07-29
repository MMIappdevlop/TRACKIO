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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Convert a stored distance value to the user's display unit. */
function toDisplayUnit(
  value: number,
  storedUnit: "km" | "mi" | "m" | undefined,
  displayUnit: "km" | "mi"
): number {
  const stored = storedUnit || "km";
  let km: number;
  if (stored === "km") {
    km = value;
  } else if (stored === "mi") {
    km = value * 1.60934;
  } else {
    km = value / 1000;
  }
  return displayUnit === "km" ? km : km * 0.621371;
}

// ---------------------------------------------------------------------------
// Workout frequency
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Strength progression (one point per session, not per calendar day)
// ---------------------------------------------------------------------------

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

  // Group by completedSessionId so multiple entries on the same calendar day
  // each produce their own data point.
  const sessionMap = new Map<string, { maxWeight: number; completedAt: string }>();
  for (const t of filtered) {
    let maxWeight = 0;
    if (t.dataJson.sets) {
      for (const set of t.dataJson.sets) {
        if (set.isCompleted && set.weight && set.weight > maxWeight) {
          maxWeight = set.weight;
        }
      }
    }
    if (maxWeight <= 0) continue;

    const key = t.completedSessionId;
    const existing = sessionMap.get(key);
    if (!existing || maxWeight > existing.maxWeight) {
      sessionMap.set(key, { maxWeight, completedAt: t.completedAt });
    }
  }

  return Array.from(sessionMap.values())
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map(({ maxWeight, completedAt }) => ({
      label: dayLabel(completedAt.split("T")[0]),
      value: maxWeight,
      date: completedAt,
    }));
}

// ---------------------------------------------------------------------------
// Weekly training volume (strength only)
// ---------------------------------------------------------------------------

export function getWeeklyVolume(
  tasks: CompletedTask[],
  sessions: CompletedSession[],
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

// ---------------------------------------------------------------------------
// Weekly distance (normalised to the user's display unit)
// ---------------------------------------------------------------------------

export function getWeeklyDistance(
  tasks: CompletedTask[],
  range: ChartRange,
  displayUnit: "km" | "mi" = "km"
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
    const normalised = toDisplayUnit(
      t.dataJson.distance || 0,
      t.dataJson.distanceUnit,
      displayUnit
    );
    const existing = weekMap.get(label);
    if (existing) {
      existing.dist += normalised;
    } else {
      weekMap.set(label, { dist: normalised, sortKey });
    }
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, { dist, sortKey }]) => ({
      label,
      value: parseFloat(dist.toFixed(2)),
      date: sortKey,
    }));
}

// ---------------------------------------------------------------------------
// Body weight trend
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getUniqueStrengthExercises(tasks: CompletedTask[]): string[] {
  const names = new Set<string>();
  for (const t of tasks) {
    if (t.mode === "strength") names.add(t.taskTemplateName);
  }
  return Array.from(names).sort();
}

// ---------------------------------------------------------------------------
// Progress Report — full day breakdown across a date range
// ---------------------------------------------------------------------------

export interface ReportBestSet {
  sessionId: string;
  display: string;  // e.g. "80×4", "5.2km", "32m"
  rawValue: number; // for delta comparison
}

export interface ReportExerciseRow {
  name: string;
  mode: string;
  cells: { [dateKey: string]: ReportBestSet | null };
}

export interface ReportDayGroup {
  dayName: string;
  sessionTemplateId: string;
  dates: string[];                          // "YYYY-MM-DD" sorted ascending
  sessionIdByDate: { [dateKey: string]: string };
  exercises: ReportExerciseRow[];
}

export function getProgressReport(
  tasks: CompletedTask[],
  sessions: CompletedSession[],
  from: Date,
  to: Date,
): ReportDayGroup[] {
  const fromMs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toMs   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate(), 23, 59, 59, 999).getTime();

  const filteredSessions = sessions.filter(s => {
    const t = new Date(s.completedAt).getTime();
    return t >= fromMs && t <= toMs;
  });
  if (filteredSessions.length === 0) return [];

  const sessionIdSet = new Set(filteredSessions.map(s => s.id));
  const filteredTasks = tasks.filter(t => sessionIdSet.has(t.completedSessionId));

  // group sessions by training-day template
  const dayMap = new Map<string, { dayName: string; sessions: CompletedSession[] }>();
  for (const s of filteredSessions) {
    const entry = dayMap.get(s.sessionTemplateId);
    if (entry) {
      entry.sessions.push(s);
    } else {
      dayMap.set(s.sessionTemplateId, { dayName: s.sessionTemplateName, sessions: [s] });
    }
  }

  // tasks keyed by sessionId
  const tasksBySession = new Map<string, CompletedTask[]>();
  for (const t of filteredTasks) {
    const arr = tasksBySession.get(t.completedSessionId) ?? [];
    arr.push(t);
    tasksBySession.set(t.completedSessionId, arr);
  }

  const result: ReportDayGroup[] = [];

  for (const [sessionTemplateId, { dayName, sessions: daySessions }] of dayMap.entries()) {
    // sort sessions ascending; later session on same date wins
    const sorted = [...daySessions].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const dateToSid = new Map<string, string>();
    for (const s of sorted) {
      dateToSid.set(s.completedAt.split("T")[0], s.id);
    }
    const dates = Array.from(dateToSid.keys()).sort();

    // collect exercise names in order of first appearance
    const exerciseOrder = new Map<string, { mode: string; idx: number }>();
    let idx = 0;
    for (const dateKey of dates) {
      const sid = dateToSid.get(dateKey)!;
      for (const t of tasksBySession.get(sid) ?? []) {
        if (!exerciseOrder.has(t.taskTemplateName)) {
          exerciseOrder.set(t.taskTemplateName, { mode: t.mode, idx: idx++ });
        }
      }
    }

    const exercises: ReportExerciseRow[] = Array.from(exerciseOrder.entries())
      .sort((a, b) => a[1].idx - b[1].idx)
      .map(([name, { mode }]) => {
        const cells: { [d: string]: ReportBestSet | null } = {};
        for (const dateKey of dates) {
          const sid = dateToSid.get(dateKey)!;
          const task = (tasksBySession.get(sid) ?? []).find(t => t.taskTemplateName === name);
          cells[dateKey] = task ? computeBestSet(task, sid) : null;
        }
        return { name, mode, cells };
      });

    result.push({ dayName, sessionTemplateId, dates, sessionIdByDate: Object.fromEntries(dateToSid), exercises });
  }

  return result.sort((a, b) => (a.dates[0] ?? "").localeCompare(b.dates[0] ?? ""));
}

function computeBestSet(task: CompletedTask, sessionId: string): ReportBestSet | null {
  switch (task.mode) {
    case "strength": {
      const done = task.dataJson.sets?.filter(s => s.isCompleted && s.weight != null);
      if (!done || done.length === 0) return null;
      const best = done.reduce((a, b) => (b.weight ?? 0) > (a.weight ?? 0) ? b : a);
      return { sessionId, display: `${best.weight}×${best.reps ?? "?"}`, rawValue: best.weight ?? 0 };
    }
    case "distance": {
      const d = task.dataJson.distance;
      if (!d) return null;
      return { sessionId, display: `${d}${task.dataJson.distanceUnit ?? "km"}`, rawValue: d };
    }
    case "time": {
      const dur = task.dataJson.durationSeconds;
      if (!dur) return null;
      const m = Math.floor(dur / 60), s = dur % 60;
      return { sessionId, display: s > 0 ? `${m}m${s}s` : `${m}m`, rawValue: dur };
    }
    case "interval": {
      const r = task.dataJson.roundsCompleted;
      if (r == null) return null;
      return { sessionId, display: `${r}rds`, rawValue: r };
    }
    default:
      return null;
  }
}
