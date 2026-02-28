import type { ExerciseMode, CompletedTask, Settings } from "@/types";

interface METRange {
  low: number;
  mid: number;
  high: number;
}

const MET_RANGES: Record<ExerciseMode, METRange> = {
  strength: { low: 4.5, mid: 5.0, high: 5.5 },
  distance: { low: 7.0, mid: 8.0, high: 9.5 },
  interval: { low: 7.5, mid: 8.0, high: 9.0 },
  time: { low: 4.0, mid: 5.0, high: 6.0 },
  notes: { low: 2.5, mid: 3.0, high: 3.5 },
};

const DEFAULT_WEIGHT_KG = 70;
const SECONDS_PER_STRENGTH_SET = 45;
const MIN_EXERCISE_SECONDS = 60;

function getSessionDensity(
  totalDurationSeconds: number,
  activeDurationSeconds: number
): number {
  if (totalDurationSeconds <= 0 || activeDurationSeconds <= 0) return 0.5;
  const density = activeDurationSeconds / totalDurationSeconds;
  return Math.min(Math.max(density, 0), 1);
}

function selectMET(range: METRange, density: number): number {
  if (density >= 0.65) return range.high;
  if (density >= 0.4) return range.mid;
  return range.low;
}

function getIntensityMultiplier(
  tasks: CompletedTask[],
  density: number
): number {
  let multiplier = 1.0;

  const intervalCount = tasks.filter((t) => t.mode === "interval").length;
  const totalCount = tasks.length;

  if (totalCount > 0 && intervalCount / totalCount >= 0.5) {
    multiplier += 0.08;
  }

  if (density < 0.3) {
    multiplier -= 0.07;
  } else if (density > 0.7) {
    multiplier += 0.05;
  }

  return Math.min(Math.max(multiplier, 0.9), 1.1);
}

function estimateTaskDuration(task: CompletedTask): number {
  if (task.dataJson.durationSeconds && task.dataJson.durationSeconds > 0) {
    return task.dataJson.durationSeconds;
  }

  if (task.mode === "strength" && task.dataJson.sets) {
    const completedSets = task.dataJson.sets.filter((s) => s.isCompleted);
    const totalSets = task.dataJson.sets.length;
    const setCount = Math.max(completedSets.length, totalSets);
    return Math.max(setCount * SECONDS_PER_STRENGTH_SET, MIN_EXERCISE_SECONDS);
  }

  return MIN_EXERCISE_SECONDS;
}

function getModeDurations(
  tasks: CompletedTask[],
  totalDurationSeconds: number
): Map<ExerciseMode, number> {
  const durations = new Map<ExerciseMode, number>();

  for (const task of tasks) {
    const mode = task.mode;
    const current = durations.get(mode) || 0;
    const estimated = estimateTaskDuration(task);
    durations.set(mode, current + estimated);
  }

  let estimatedTotal = 0;
  for (const dur of durations.values()) {
    estimatedTotal += dur;
  }

  if (totalDurationSeconds > estimatedTotal) {
    const extra = totalDurationSeconds - estimatedTotal;
    const modes = Array.from(durations.keys());
    if (modes.length > 0) {
      const perMode = extra / modes.length;
      for (const mode of modes) {
        durations.set(mode, (durations.get(mode) || 0) + perMode);
      }
    }
  }

  return durations;
}

export function isCalorieTrackingReady(settings: Settings | null): boolean {
  if (!settings) return false;
  return (
    settings.calorieTrackingEnabled === true &&
    typeof settings.userAge === "number" && settings.userAge > 0 &&
    typeof settings.userHeight === "number" && settings.userHeight > 0 &&
    typeof settings.userWeight === "number" && settings.userWeight > 0
  );
}

export function estimateCalories(
  tasks: CompletedTask[],
  totalDurationSeconds: number,
  userWeightKg?: number
): number {
  if (tasks.length === 0) return 0;

  const weight = userWeightKg && userWeightKg > 0 ? userWeightKg : DEFAULT_WEIGHT_KG;
  const modeDurations = getModeDurations(tasks, totalDurationSeconds);

  let activeDurationSeconds = 0;
  for (const dur of modeDurations.values()) {
    activeDurationSeconds += dur;
  }

  const effectiveDuration = Math.max(totalDurationSeconds, activeDurationSeconds);
  const density = getSessionDensity(effectiveDuration, activeDurationSeconds);
  const intensityMultiplier = getIntensityMultiplier(tasks, density);

  let totalCalories = 0;

  for (const [mode, durationSeconds] of modeDurations.entries()) {
    const range = MET_RANGES[mode];
    const met = selectMET(range, density);
    const durationHours = durationSeconds / 3600;
    totalCalories += met * weight * durationHours;
  }

  totalCalories *= intensityMultiplier;

  return Math.round(totalCalories);
}
