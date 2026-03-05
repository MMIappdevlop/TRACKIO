import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface WeeklySummaryCardProps {
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

interface DeltaResult {
  text: string;
}

function getDelta(current: number, previous: number, formatter: (v: number) => string): DeltaResult {
  const diff = current - previous;
  if (previous === 0 && current === 0) return { text: "\u2014 vs last week" };
  if (Math.abs(diff) < 0.01) return { text: "\u2014 vs last week" };
  const sign = diff > 0 ? "+" : "-";
  return { text: `${sign}${formatter(diff)} vs last week` };
}

function SummaryRow({ label, value, delta }: { label: string; value: string; delta: string }) {
  const { theme } = useTheme();
  return (
    <View style={[rowStyles.row, { borderBottomColor: theme.border }]}>
      <View style={rowStyles.left}>
        <ThemedText type="muted" style={rowStyles.label}>{label}</ThemedText>
        <ThemedText type="h2" style={rowStyles.value}>{value}</ThemedText>
      </View>
      <ThemedText type="muted" style={rowStyles.delta}>{delta}</ThemedText>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
  },
  delta: {
    fontSize: 12,
    textAlign: "right",
  },
});

export function WeeklySummaryCard({
  stats,
  prevStats,
  userWeight,
  weightUnit = "kg",
  weekNum,
  weekRange,
  onShare,
}: WeeklySummaryCardProps) {
  const { theme } = useTheme();

  const weightValue = userWeight ? `${userWeight} ${weightUnit}` : "Not logged";
  const weightDelta = "\u2014 vs last week";

  const sessionsDelta = getDelta(stats?.sessionsCount ?? 0, prevStats?.sessionsCount ?? 0, (v) => String(Math.abs(Math.round(v))));
  const durationDelta = getDelta(stats?.totalDurationSeconds ?? 0, prevStats?.totalDurationSeconds ?? 0, formatDurationDelta);
  const distanceDelta = getDelta(stats?.totalDistance ?? 0, prevStats?.totalDistance ?? 0, formatDistanceDelta);
  const volumeDelta = getDelta(stats?.totalVolume ?? 0, prevStats?.totalVolume ?? 0, formatVolumeDelta);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <View>
          <ThemedText type="h2" style={styles.weekTitle}>Week {weekNum}</ThemedText>
          <ThemedText type="muted" style={styles.weekRange}>{weekRange}</ThemedText>
        </View>
        <Pressable testID="button-share-summary-icon" onPress={onShare} hitSlop={12}>
          <Feather name="share" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <SummaryRow label="Body Weight" value={weightValue} delta={weightDelta} />
      <SummaryRow label="Sessions" value={`${stats?.sessionsCount ?? 0}`} delta={sessionsDelta.text} />
      <SummaryRow label="Training Time" value={formatDuration(stats?.totalDurationSeconds ?? 0)} delta={durationDelta.text} />
      <SummaryRow label="Distance" value={formatDistance(stats?.totalDistance ?? 0)} delta={distanceDelta.text} />
      <View style={styles.lastRow}>
        <SummaryRow label="Training Weight" value={formatVolume(stats?.totalVolume ?? 0)} delta={volumeDelta.text} />
      </View>

      <Pressable
        testID="button-share-summary"
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
  lastRow: {
    marginBottom: 4,
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
