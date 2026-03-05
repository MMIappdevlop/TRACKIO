import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface WeeklyStatsCardProps {
  stats: WeeklyStats | null;
  loading?: boolean;
  userWeight?: number;
  weightUnit?: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatCalories(cal: number): string {
  if (cal >= 1000) {
    return `${(cal / 1000).toFixed(1)}k`;
  }
  return String(Math.round(cal));
}

export function WeeklyStatsCard({ stats, userWeight, weightUnit = "kg" }: WeeklyStatsCardProps) {
  const { theme } = useTheme();

  const weightDisplay = userWeight ? `${userWeight} ${weightUnit}` : `-- ${weightUnit}`;
  const daysDisplay = `${stats?.sessionsCount ?? 0} days`;
  const exercisesDisplay = `${stats?.totalExercises ?? 0} exercises`;
  const caloriesDisplay = `${formatCalories(stats?.totalCalories ?? 0)} kcal`;
  const durationDisplay = formatDuration(stats?.totalDurationSeconds ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <ThemedText type="muted" style={styles.label}>Weight</ThemedText>
          <ThemedText type="h1" style={styles.value}>{weightDisplay}</ThemedText>
        </View>
        <View style={styles.cell}>
          <ThemedText type="muted" style={styles.label}>Workout Days</ThemedText>
          <ThemedText type="h1" style={styles.value}>{daysDisplay}</ThemedText>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cell}>
          <ThemedText type="muted" style={styles.label}>Total Exercises</ThemedText>
          <ThemedText type="h1" style={styles.value}>{exercisesDisplay}</ThemedText>
        </View>
        <View style={styles.cell}>
          <ThemedText type="muted" style={styles.label}>Calories Burned</ThemedText>
          <ThemedText type="h1" style={styles.value}>{caloriesDisplay}</ThemedText>
        </View>
      </View>

      <View style={styles.rowCentered}>
        <View style={styles.cellCentered}>
          <ThemedText type="muted" style={styles.label}>Training Duration</ThemedText>
          <ThemedText type="h1" style={styles.value}>{durationDisplay}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: "row",
    marginBottom: 18,
  },
  rowCentered: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cell: {
    flex: 1,
  },
  cellCentered: {
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "600",
  },
});
