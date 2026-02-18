import type { ExerciseMode, CompletedTask } from "@/types";

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

function getModeDurations(
  tasks: CompletedTask[],
  totalDurationSeconds: number
): Map<ExerciseMode, number> {
  const durations = new Map<ExerciseMode, number>();
  let accountedSeconds = 0;

  for (const task of tasks) {
    const mode = task.mode;
    const current = durations.get(mode) || 0;

    if (task.dataJson.durationSeconds && task.dataJson.durationSeconds > 0) {
      durations.set(mode, current + task.dataJson.durationSeconds);
      accountedSeconds += task.dataJson.durationSeconds;
    } else if (task.mode === "strength" && task.dataJson.sets) {
      const completedSets = task.dataJson.sets.filter((s) => s.isCompleted);
      const estimatedSeconds = completedSets.length * 45;
      durations.set(mode, current + estimatedSeconds);
      accountedSeconds += estimatedSeconds;
    }
  }

  if (accountedSeconds < totalDurationSeconds && tasks.length > 0) {
    const unaccounted = totalDurationSeconds - accountedSeconds;
    const tasksWithoutDuration = tasks.filter(
      (t) =>
        !t.dataJson.durationSeconds &&
        !(t.mode === "strength" && t.dataJson.sets)
    );

    if (tasksWithoutDuration.length > 0) {
      const perTask = unaccounted / tasksWithoutDuration.length;
      for (const task of tasksWithoutDuration) {
        const current = durations.get(task.mode) || 0;
        durations.set(task.mode, current + perTask);
      }
    } else {
      const modes = Array.from(durations.keys());
      if (modes.length > 0) {
        const perMode = unaccounted / modes.length;
        for (const mode of modes) {
          durations.set(mode, (durations.get(mode) || 0) + perMode);
        }
      }
    }
  }

  if (durations.size === 0 && totalDurationSeconds > 0 && tasks.length > 0) {
    const perTask = totalDurationSeconds / tasks.length;
    for (const task of tasks) {
      const current = durations.get(task.mode) || 0;
      durations.set(task.mode, current + perTask);
    }
  }

  return durations;
}

export function estimateCalories(
  tasks: CompletedTask[],
  totalDurationSeconds: number,
  userWeightKg?: number
): number {
  if (tasks.length === 0 || totalDurationSeconds <= 0) return 0;

  const weight = userWeightKg && userWeightKg > 0 ? userWeightKg : DEFAULT_WEIGHT_KG;
  const modeDurations = getModeDurations(tasks, totalDurationSeconds);

  let activeDurationSeconds = 0;
  for (const dur of modeDurations.values()) {
    activeDurationSeconds += dur;
  }

  const density = getSessionDensity(totalDurationSeconds, activeDurationSeconds);
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
