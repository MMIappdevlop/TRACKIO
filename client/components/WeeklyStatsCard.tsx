import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <ThemedText type="muted" style={styles.label}>{label}</ThemedText>
      <ThemedText type="h1" style={styles.value}>{value}</ThemedText>
    </View>
  );
}

export function WeeklyStatsCard({ stats, userWeight, weightUnit = "kg" }: WeeklyStatsCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.row}>
        <StatCell label="Weight" value={userWeight ? `${userWeight} ${weightUnit}` : `-- ${weightUnit}`} />
        <StatCell label="Workout Days" value={`${stats?.sessionsCount ?? 0} days`} />
      </View>

      <View style={styles.row}>
        <StatCell label="Total Exercises" value={`${stats?.totalExercises ?? 0} exercises`} />
        <StatCell label="Calories Burned" value={`${formatCalories(stats?.totalCalories ?? 0)} kcal`} />
      </View>

      <View style={styles.rowCentered}>
        <StatCell label="Training Duration" value={formatDuration(stats?.totalDurationSeconds ?? 0)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
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
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "600",
  },
});
