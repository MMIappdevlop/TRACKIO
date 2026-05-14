import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CompletedSession, CompletedTask } from "@/types";

function computeVolume(tasks: CompletedTask[]): number {
  let total = 0;
  for (const task of tasks) {
    if (task.mode === "strength" && task.dataJson.sets) {
      for (const set of task.dataJson.sets) {
        if (set.isCompleted && set.weight && set.reps) {
          total += set.weight * set.reps;
        }
      }
    }
  }
  return total;
}

function formatPrevDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatVolumeDelta(delta: number, unit: string): string {
  const abs = Math.round(Math.abs(delta));
  if (abs >= 1000) return `${(Math.abs(delta) / 1000).toFixed(1)}k ${unit}`;
  return `${abs} ${unit}`;
}

function formatDurationDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  if (hrs > 0) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  return `${mins} min`;
}

interface DeltaMetricProps {
  label: string;
  mainText: string;
  deltaText: string;
  better: boolean | null;
  isLast?: boolean;
}

function DeltaMetric({ label, mainText, deltaText, better, isLast }: DeltaMetricProps) {
  const { theme } = useTheme();
  const color =
    better === true
      ? theme.success
      : better === false
        ? theme.textMuted
        : theme.textMuted;

  const arrowIcon: "trending-up" | "trending-down" | "minus" =
    better === true ? "trending-up" : better === false ? "trending-down" : "minus";

  return (
    <View
      style={[
        styles.metric,
        isLast ? null : { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
      ]}
    >
      <ThemedText type="muted" style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={[styles.metricMain, { color: theme.text }]}>{mainText}</ThemedText>
      <View style={styles.deltaRow}>
        <Feather name={arrowIcon} size={11} color={color} />
        <ThemedText style={[styles.deltaText, { color }]}>{deltaText}</ThemedText>
      </View>
    </View>
  );
}

interface SessionComparisonCardProps {
  session: CompletedSession;
  prevSession: CompletedSession | null;
  tasks: CompletedTask[];
  prevTasks: CompletedTask[];
  weightUnit?: string;
}

export function SessionComparisonCard({
  session,
  prevSession,
  tasks,
  prevTasks,
  weightUnit = "kg",
}: SessionComparisonCardProps) {
  const { theme } = useTheme();

  if (!prevSession) return null;

  const curVolume = computeVolume(tasks);
  const prevVolume = computeVolume(prevTasks);
  const volumeDelta = curVolume - prevVolume;

  const durationDelta = session.durationSeconds - prevSession.durationSeconds;
  const exerciseDelta = tasks.length - prevTasks.length;

  const durationBetter = durationDelta < -30 ? true : durationDelta > 30 ? false : null;
  const volumeBetter = volumeDelta > 0 ? true : volumeDelta < 0 ? false : null;
  const exerciseBetter = exerciseDelta > 0 ? true : exerciseDelta < 0 ? false : null;

  const durationMain =
    Math.abs(durationDelta) <= 30
      ? "Same"
      : durationDelta < 0
        ? formatDurationDelta(durationDelta) + " faster"
        : formatDurationDelta(durationDelta) + " longer";

  const volumeMain =
    Math.abs(volumeDelta) < 1
      ? "Same"
      : (volumeDelta > 0 ? "+" : "-") + formatVolumeDelta(volumeDelta, weightUnit);

  const exerciseMain =
    exerciseDelta === 0
      ? `${tasks.length} exercises`
      : exerciseDelta > 0
        ? `+${exerciseDelta} more`
        : `${Math.abs(exerciseDelta)} fewer`;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
        <ThemedText type="muted" style={styles.headerText}>
          vs {formatPrevDate(prevSession.completedAt)}
        </ThemedText>
      </View>

      <View style={styles.metricsRow}>
        <DeltaMetric
          label="Duration"
          mainText={durationMain}
          deltaText={
            Math.abs(durationDelta) <= 30
              ? "no change"
              : durationDelta < 0
                ? "faster"
                : "slower"
          }
          better={durationBetter}
        />
        <DeltaMetric
          label="Volume"
          mainText={volumeMain}
          deltaText={
            Math.abs(volumeDelta) < 1
              ? "no change"
              : volumeDelta > 0
                ? "more weight"
                : "less weight"
          }
          better={volumeBetter}
        />
        <DeltaMetric
          label="Exercises"
          mainText={exerciseMain}
          deltaText={
            exerciseDelta === 0
              ? "same count"
              : exerciseDelta > 0
                ? "added some"
                : "dropped some"
          }
          better={exerciseBetter}
          isLast
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  metricsRow: {
    flexDirection: "row",
  },
  metric: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricMain: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  deltaText: {
    fontSize: 11,
  },
});
