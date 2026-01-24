import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface WeeklyStatsCardProps {
  stats: WeeklyStats | null;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${Math.round(kg)}kg`;
}

function formatDistance(km: number): string {
  if (km >= 1) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km * 1000)}m`;
}

export function WeeklyStatsCard({ stats, loading }: WeeklyStatsCardProps) {
  const { theme } = useTheme();

  const statItems = [
    {
      icon: "calendar",
      label: "Sessions",
      value: stats?.sessionsCount ?? 0,
      unit: "",
    },
    {
      icon: "clock",
      label: "Duration",
      value: stats ? formatDuration(stats.totalDurationSeconds) : "0m",
      unit: "",
    },
    {
      icon: "target",
      label: "Volume",
      value: stats ? formatVolume(stats.totalVolume) : "0kg",
      unit: "",
    },
    {
      icon: "navigation",
      label: "Distance",
      value: stats ? formatDistance(stats.totalDistance) : "0km",
      unit: "",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="h2" style={styles.title}>
        This Week
      </ThemedText>
      <View style={styles.statsGrid}>
        {statItems.map((item) => (
          <View key={item.label} style={styles.statItem}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.linkBackground },
              ]}
            >
              <Feather name={item.icon as any} size={16} color={theme.link} />
            </View>
            <ThemedText type="stat" style={styles.statValue}>
              {typeof item.value === "number" ? item.value : item.value}
            </ThemedText>
            <ThemedText type="muted">{item.label}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statItem: {
    width: "47%",
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    marginBottom: 2,
  },
});
