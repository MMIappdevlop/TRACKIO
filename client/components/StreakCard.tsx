import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CompletedSession } from "@/types";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeStreaks(sessions: CompletedSession[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const daySet = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.completedAt);
    daySet.add(toDateKey(d));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let currentStreak = 0;
  if (daySet.has(todayKey) || daySet.has(yesterdayKey)) {
    const anchor = daySet.has(todayKey) ? today : yesterday;
    const cursor = new Date(anchor);
    while (daySet.has(toDateKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const allDays = Array.from(daySet).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;

  for (const key of allDays) {
    const [y, m, day] = key.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    if (prev !== null) {
      const diff = (d.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        run += 1;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  return { currentStreak, longestStreak };
}

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const { theme } = useTheme();

  const accentColor = currentStreak > 0 ? "#E76F51" : theme.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <Feather name="zap" size={18} color={accentColor} />
        <ThemedText type="h2" style={styles.title}>Training Streak</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <ThemedText
            style={[styles.statValue, { color: currentStreak > 0 ? accentColor : theme.text }]}
          >
            {currentStreak}
          </ThemedText>
          <ThemedText type="muted" style={styles.statLabel}>
            {currentStreak === 1 ? "day current" : "days current"}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.statCell}>
          <ThemedText style={[styles.statValue, { color: theme.text }]}>
            {longestStreak}
          </ThemedText>
          <ThemedText type="muted" style={styles.statLabel}>
            {longestStreak === 1 ? "day best" : "days best"}
          </ThemedText>
        </View>
      </View>

      {currentStreak === 0 ? (
        <ThemedText type="muted" style={styles.hint}>
          Log a session today to start your streak.
        </ThemedText>
      ) : currentStreak >= longestStreak && longestStreak > 1 ? (
        <ThemedText style={[styles.hint, { color: accentColor }]}>
          Personal best — keep going!
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCell: {
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 42,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    marginHorizontal: Spacing.lg,
  },
  hint: {
    fontSize: 12,
    marginTop: 12,
  },
});
