import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CompletedSession, CompletedTask } from "@/types";

export interface MonthStats {
  sessionsCount: number;
  totalDurationSeconds: number;
  totalVolume: number;
  totalDistance: number;
}

export function computeMonthStats(
  sessions: CompletedSession[],
  tasks: CompletedTask[],
  year: number,
  month: number
): MonthStats {
  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  let totalDurationSeconds = 0;
  let totalVolume = 0;
  let totalDistance = 0;

  for (const session of monthSessions) {
    totalDurationSeconds += session.durationSeconds;
    const sessionTasks = tasks.filter((t) => t.completedSessionId === session.id);
    for (const task of sessionTasks) {
      if (task.mode === "strength" && task.dataJson.sets) {
        for (const set of task.dataJson.sets) {
          if (set.isCompleted && set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
      if (task.mode === "distance" && task.dataJson.distance) {
        totalDistance += task.dataJson.distance;
      }
    }
  }

  return {
    sessionsCount: monthSessions.length,
    totalDurationSeconds,
    totalVolume,
    totalDistance,
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDistance(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`;
  if (km > 0) return `${Math.round(km * 1000)} m`;
  return "0 km";
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

type Direction = "up" | "down" | "same";

function getDelta(current: number, previous: number): {
  direction: Direction;
  pct: number;
  noData: boolean;
} {
  if (previous === 0) return { direction: "same", pct: 0, noData: true };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return { direction: "same", pct: 0, noData: false };
  return { direction: pct > 0 ? "up" : "down", pct, noData: false };
}

function MetricRow({
  label,
  value,
  current,
  previous,
  isLast,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  isLast?: boolean;
}) {
  const { theme } = useTheme();
  const { direction, pct, noData } = getDelta(current, previous);

  const deltaColor =
    direction === "up" ? "#4CAF50" : theme.textMuted;

  const arrow =
    direction === "up" ? "\u2191 " : direction === "down" ? "\u2193 " : "";

  const deltaText = noData
    ? "no prior data"
    : direction === "same"
      ? "same as last month"
      : `${arrow}${Math.abs(Math.round(pct))}% vs last month`;

  return (
    <View
      style={[
        styles.metricRow,
        isLast
          ? null
          : {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.border,
            },
      ]}
    >
      <View style={styles.metricLeft}>
        <ThemedText type="muted" style={styles.metricLabel}>
          {label}
        </ThemedText>
        <ThemedText type="h2" style={styles.metricValue}>
          {value}
        </ThemedText>
      </View>
      <ThemedText style={[styles.metricDelta, { color: deltaColor }]}>
        {deltaText}
      </ThemedText>
    </View>
  );
}

interface MonthlyComparisonCardProps {
  current: MonthStats;
  previous: MonthStats;
  monthLabel: string;
}

export function MonthlyComparisonCard({
  current,
  previous,
  monthLabel,
}: MonthlyComparisonCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.monthTitle}>
          {monthLabel}
        </ThemedText>
        <ThemedText type="muted" style={styles.subtitle}>
          vs last month
        </ThemedText>
      </View>

      <MetricRow
        label="Sessions"
        value={`${current.sessionsCount} sessions`}
        current={current.sessionsCount}
        previous={previous.sessionsCount}
      />
      <MetricRow
        label="Training Time"
        value={formatDuration(current.totalDurationSeconds)}
        current={current.totalDurationSeconds}
        previous={previous.totalDurationSeconds}
      />
      <MetricRow
        label="Volume"
        value={formatVolume(current.totalVolume)}
        current={current.totalVolume}
        previous={previous.totalVolume}
      />
      <MetricRow
        label="Distance"
        value={formatDistance(current.totalDistance)}
        current={current.totalDistance}
        previous={previous.totalDistance}
        isLast
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 12,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  metricLeft: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  metricDelta: {
    fontSize: 11,
    textAlign: "right",
    maxWidth: "45%",
  },
});
