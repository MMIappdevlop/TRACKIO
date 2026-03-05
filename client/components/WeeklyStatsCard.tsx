import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WeeklyStats, CompletedSession } from "@/types";

interface WeeklyStatsCardProps {
  stats: WeeklyStats | null;
  loading?: boolean;
  completedSessions?: CompletedSession[];
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

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);
}

function getMonWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function calculateStreak(sessions: CompletedSession[]): number {
  if (sessions.length === 0) return 0;

  const sessionDates = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.completedAt);
    sessionDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const hasToday = sessionDates.has(todayKey);

  const startDate = new Date(today);
  if (!hasToday) {
    startDate.setDate(startDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const check = new Date(startDate);
    check.setDate(check.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (sessionDates.has(key)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function getWeekDaySessionFlags(sessions: CompletedSession[]): boolean[] {
  const weekStart = getMonWeekStart(new Date());
  const flags = [false, false, false, false, false, false, false];

  for (const s of sessions) {
    const d = new Date(s.completedAt);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - weekStart.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) {
      flags[diff] = true;
    }
  }

  return flags;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function WeeklyStatsCard({ stats, loading, completedSessions = [] }: WeeklyStatsCardProps) {
  const { theme } = useTheme();

  const weekNum = useMemo(() => getWeekNumber(new Date()), []);
  const weekRange = useMemo(() => {
    const start = getMonWeekStart(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }, []);

  const streak = useMemo(() => calculateStreak(completedSessions), [completedSessions]);
  const dayFlags = useMemo(() => getWeekDaySessionFlags(completedSessions), [completedSessions]);

  const statItems = [
    {
      icon: "calendar" as const,
      label: "Sessions",
      value: String(stats?.sessionsCount ?? 0),
    },
    {
      icon: "clock" as const,
      label: "Duration",
      value: stats ? formatDuration(stats.totalDurationSeconds) : "0m",
    },
    {
      icon: "target" as const,
      label: "Volume",
      value: stats ? formatVolume(stats.totalVolume) : "0kg",
    },
    {
      icon: "navigation" as const,
      label: "Distance",
      value: stats ? formatDistance(stats.totalDistance) : "0km",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.headerRow}>
        <ThemedText type="h2">Weekly Progress</ThemedText>
        <View style={styles.weekInfo}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {`Week ${weekNum}`}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted, marginLeft: Spacing.xs }}>
            {weekRange}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.streakRow, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.streakIconContainer, { backgroundColor: theme.linkBackground }]}>
          <Feather name="trending-up" size={18} color={theme.link} />
        </View>
        <ThemedText type="stat" style={styles.streakNumber}>
          {streak}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          day streak
        </ThemedText>
      </View>

      <View style={styles.dotsRow}>
        {DAY_LABELS.map((label, index) => (
          <View key={`day-${index}`} style={styles.dotItem}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: dayFlags[index] ? theme.link : "transparent",
                  borderColor: dayFlags[index] ? theme.link : theme.backgroundSecondary,
                  borderWidth: 2,
                },
              ]}
            />
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 11 }}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.statsRow}>
        {statItems.map((item) => (
          <View key={item.label} style={styles.statItem}>
            <Feather name={item.icon} size={14} color={theme.link} />
            <ThemedText type="statSmall" style={{ marginTop: 2 }}>
              {item.value}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 11 }}>
              {item.label}
            </ThemedText>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  weekInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  streakIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  streakNumber: {
    marginRight: Spacing.xs,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  dotItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
});
