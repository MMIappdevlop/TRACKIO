import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface WeeklyComparisonCardProps {
  stats: WeeklyStats | null;
  prevStats: WeeklyStats | null;
  userWeight?: number;
  weightUnit?: string;
  weekNum: number;
  weekRange: string;
  onShare: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDurationDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes} min`;
}

function formatDistance(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`;
  if (km > 0) return `${Math.round(km * 1000)} m`;
  return "0 km";
}

function formatDistanceDelta(km: number): string {
  const abs = Math.abs(km);
  if (abs >= 1) return `${abs.toFixed(1)} km`;
  if (abs > 0) return `${Math.round(abs * 1000)} m`;
  return "0";
}

function formatVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString()} kg`;
}

function formatVolumeDelta(kg: number): string {
  return `${Math.round(Math.abs(kg)).toLocaleString()} kg`;
}

type Direction = "up" | "down" | "same";

interface DeltaInfo {
  text: string;
  direction: Direction;
}

function getDelta(current: number, previous: number, formatter: (v: number) => string): DeltaInfo {
  const diff = current - previous;
  if (previous === 0 && current === 0) return { text: "no data", direction: "same" };
  if (Math.abs(diff) < 0.01) return { text: "same as last week", direction: "same" };
  const sign = diff > 0 ? "+" : "-";
  return {
    text: `${sign}${formatter(diff)} vs last week`,
    direction: diff > 0 ? "up" : "down",
  };
}

function MetricRow({ label, value, delta, isLast }: { label: string; value: string; delta: DeltaInfo; isLast?: boolean }) {
  const { theme } = useTheme();

  const deltaColor =
    delta.direction === "up"
      ? "#4CAF50"
      : delta.direction === "down"
        ? "#EF5350"
        : theme.textMuted;

  const arrow =
    delta.direction === "up"
      ? "\u2191 "
      : delta.direction === "down"
        ? "\u2193 "
        : "";

  return (
    <View style={[styles.metricRow, isLast ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={styles.metricLeft}>
        <ThemedText type="muted" style={styles.metricLabel}>{label}</ThemedText>
        <ThemedText type="h2" style={styles.metricValue}>{value}</ThemedText>
      </View>
      <ThemedText style={[styles.metricDelta, { color: deltaColor }]}>
        {arrow}{delta.text}
      </ThemedText>
    </View>
  );
}

export function WeeklyComparisonCard({
  stats,
  prevStats,
  userWeight,
  weightUnit = "kg",
  weekNum,
  weekRange,
  onShare,
}: WeeklyComparisonCardProps) {
  const { theme } = useTheme();

  const sessionsDelta = getDelta(stats?.sessionsCount ?? 0, prevStats?.sessionsCount ?? 0, (v) => String(Math.abs(Math.round(v))));
  const durationDelta = getDelta(stats?.totalDurationSeconds ?? 0, prevStats?.totalDurationSeconds ?? 0, formatDurationDelta);
  const distanceDelta = getDelta(stats?.totalDistance ?? 0, prevStats?.totalDistance ?? 0, formatDistanceDelta);
  const volumeDelta = getDelta(stats?.totalVolume ?? 0, prevStats?.totalVolume ?? 0, formatVolumeDelta);
  const weightDelta: DeltaInfo = { text: "no previous data", direction: "same" };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <View>
          <ThemedText type="h2" style={styles.weekTitle}>Week {weekNum}</ThemedText>
          <ThemedText type="muted" style={styles.weekRange}>{weekRange}</ThemedText>
        </View>
        <Pressable testID="button-share-progress-icon" onPress={onShare} hitSlop={12}>
          <Feather name="share" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <MetricRow label="Sessions" value={`${stats?.sessionsCount ?? 0} sessions`} delta={sessionsDelta} />
      <MetricRow label="Training Time" value={formatDuration(stats?.totalDurationSeconds ?? 0)} delta={durationDelta} />
      <MetricRow label="Distance" value={formatDistance(stats?.totalDistance ?? 0)} delta={distanceDelta} />
      <MetricRow label="Training Weight" value={formatVolume(stats?.totalVolume ?? 0)} delta={volumeDelta} />
      <MetricRow label="Body Weight" value={userWeight ? `${userWeight} ${weightUnit}` : "Not logged"} delta={weightDelta} isLast />

      <Pressable
        testID="button-share-progress"
        onPress={onShare}
        style={[styles.shareButton, { backgroundColor: theme.link }]}
      >
        <Feather name="share" size={16} color={theme.buttonText} />
        <ThemedText type="body" style={{ color: theme.buttonText, fontWeight: "600" }}>
          Share as PNG
        </ThemedText>
      </Pressable>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  weekTitle: {
    fontSize: 18,
  },
  weekRange: {
    fontSize: 12,
    marginTop: 2,
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
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
});
