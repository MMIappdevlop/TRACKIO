import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface WeeklyComparisonCardProps {
  stats: WeeklyStats | null;
  prevStats: WeeklyStats | null;
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

function formatDurationDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function formatDistance(km: number): string {
  if (km >= 1) {
    return `${km.toFixed(1)} km`;
  }
  if (km > 0) {
    return `${Math.round(km * 1000)} m`;
  }
  return "0 km";
}

function formatDistanceDelta(km: number): string {
  const abs = Math.abs(km);
  if (abs >= 1) {
    return `${abs.toFixed(1)} km`;
  }
  if (abs > 0) {
    return `${Math.round(abs * 1000)} m`;
  }
  return "0";
}

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${Math.round(kg).toLocaleString()} kg`;
  }
  return `${Math.round(kg)} kg`;
}

function formatVolumeDelta(kg: number): string {
  const abs = Math.abs(kg);
  if (abs >= 1000) {
    return `${Math.round(abs).toLocaleString()} kg`;
  }
  return `${Math.round(abs)} kg`;
}

interface DeltaInfo {
  text: string;
  direction: "up" | "down" | "same";
}

function getDelta(current: number, previous: number, formatter: (v: number) => string): DeltaInfo {
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) {
    return { text: "same as last week", direction: "same" };
  }
  const arrow = diff > 0 ? "+" : "-";
  return {
    text: `${arrow}${formatter(diff)} vs last week`,
    direction: diff > 0 ? "up" : "down",
  };
}

function MetricCell({
  label,
  value,
  delta,
  centered,
}: {
  label: string;
  value: string;
  delta: DeltaInfo;
  centered?: boolean;
}) {
  const { theme } = useTheme();

  const deltaColor =
    delta.direction === "up"
      ? "#4CAF50"
      : delta.direction === "down"
        ? "#EF5350"
        : theme.textMuted;

  return (
    <View style={centered ? styles.cellCentered : styles.cell}>
      <ThemedText type="muted" style={styles.label}>{label}</ThemedText>
      <ThemedText type="h1" style={styles.value}>{value}</ThemedText>
      <ThemedText style={[styles.delta, { color: deltaColor }]}>
        {delta.direction === "up" ? "\u2191 " : delta.direction === "down" ? "\u2193 " : "\u2014 "}
        {delta.text}
      </ThemedText>
    </View>
  );
}

export function WeeklyComparisonCard({ stats, prevStats, userWeight, weightUnit = "kg" }: WeeklyComparisonCardProps) {
  const { theme } = useTheme();

  const cur = stats;
  const prev = prevStats;

  const distanceDelta = getDelta(cur?.totalDistance ?? 0, prev?.totalDistance ?? 0, formatDistanceDelta);
  const durationDelta = getDelta(cur?.totalDurationSeconds ?? 0, prev?.totalDurationSeconds ?? 0, formatDurationDelta);
  const sessionsDelta = getDelta(cur?.sessionsCount ?? 0, prev?.sessionsCount ?? 0, (v) => String(Math.abs(Math.round(v))));
  const volumeDelta = getDelta(cur?.totalVolume ?? 0, prev?.totalVolume ?? 0, formatVolumeDelta);

  const weightDelta: DeltaInfo = { text: "no previous data", direction: "same" };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="muted" style={styles.cardTitle}>vs Last Week</ThemedText>

      <View style={styles.row}>
        <MetricCell
          label="Distance"
          value={formatDistance(cur?.totalDistance ?? 0)}
          delta={distanceDelta}
        />
        <MetricCell
          label="Training Time"
          value={formatDuration(cur?.totalDurationSeconds ?? 0)}
          delta={durationDelta}
        />
      </View>

      <View style={styles.row}>
        <MetricCell
          label="Sessions"
          value={`${cur?.sessionsCount ?? 0} sessions`}
          delta={sessionsDelta}
        />
        <MetricCell
          label="Training Weight"
          value={formatVolume(cur?.totalVolume ?? 0)}
          delta={volumeDelta}
        />
      </View>

      <View style={styles.rowCentered}>
        <MetricCell
          label="Body Weight"
          value={userWeight ? `${userWeight} ${weightUnit}` : `-- ${weightUnit}`}
          delta={weightDelta}
          centered
        />
      </View>
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
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
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
  delta: {
    fontSize: 11,
    marginTop: 2,
  },
});
