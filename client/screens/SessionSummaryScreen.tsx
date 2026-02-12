import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { completedSessionsStorage, completedTasksStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompletedSession, CompletedTask } from "@/types";

type RoutePropType = RouteProp<RootStackParamList, "SessionSummary">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REFLECTIVE_QUOTES = [
  "Sessions like this build long-term capacity.",
  "Consistency matters more than intensity.",
  "Every rep counts toward your goal.",
  "Progress is measured in months, not days.",
  "The work you do today shapes tomorrow.",
  "Patience and persistence win every time.",
];

const INSIGHTS = {
  volumeUp: "Volume was higher than last time.",
  volumeDown: "Volume was lower than last time.",
  volumeSame: "Volume matched your previous session.",
  distanceUp: "Distance increased from last session.",
  distanceDown: "Distance was shorter than last session.",
  distanceSame: "Distance matched your previous session.",
  firstSession: "Great start with this session.",
};

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

export default function SessionSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { completedSessionId } = route.params;

  const [session, setSession] = useState<CompletedSession | null>(null);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedSession = await completedSessionsStorage.getById(completedSessionId);
    setSession(loadedSession);
    if (loadedSession) {
      const loadedTasks = await completedTasksStorage.getBySessionId(loadedSession.id);
      setTasks(loadedTasks);
    }
  };

  const calculateStats = () => {
    const tasksCompleted = tasks.length;
    let setsCompleted = 0;
    let totalVolume = 0;
    let totalDistance = 0;
    let totalActivityDuration = 0;

    for (const task of tasks) {
      if (task.mode === "strength" && task.dataJson.sets) {
        const completedSets = task.dataJson.sets.filter((s) => s.isCompleted);
        setsCompleted += completedSets.length;
        for (const set of completedSets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      } else if (task.mode === "distance" && task.dataJson.distance) {
        totalDistance += task.dataJson.distance;
        if (task.dataJson.durationSeconds) {
          totalActivityDuration += task.dataJson.durationSeconds;
        }
      } else if (task.mode === "interval") {
        if (task.dataJson.durationSeconds) {
          totalActivityDuration += task.dataJson.durationSeconds;
        }
      } else if (task.mode === "time" && task.dataJson.durationSeconds) {
        totalActivityDuration += task.dataJson.durationSeconds;
      }
    }

    return { tasksCompleted, setsCompleted, totalVolume, totalDistance, totalActivityDuration };
  };

  const handleRating = (value: number) => {
    setRating(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (session) {
      await completedSessionsStorage.update(session.id, { difficultyRating: rating });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.popToTop();
  };

  if (!session) return null;

  const stats = calculateStats();
  const quote = REFLECTIVE_QUOTES[Math.floor(Math.random() * REFLECTIVE_QUOTES.length)];
  const insight = INSIGHTS.firstSession;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.successIcon, { backgroundColor: Colors.dark.success + "20" }]}>
          <Feather name="check-circle" size={48} color={Colors.dark.success} />
        </View>
        <ThemedText type="h1" style={styles.title}>Session Complete</ThemedText>
        <ThemedText type="secondary">{session.sessionTemplateName}</ThemedText>
      </View>

      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <ThemedText type="stat">{stats.tasksCompleted}</ThemedText>
            <ThemedText type="muted">Exercises</ThemedText>
          </View>
          {stats.setsCompleted > 0 ? (
            <View style={styles.stat}>
              <ThemedText type="stat">{stats.setsCompleted}</ThemedText>
              <ThemedText type="muted">Sets</ThemedText>
            </View>
          ) : null}
          <View style={styles.stat}>
            <ThemedText type="stat">{formatDuration(stats.totalActivityDuration > 0 ? stats.totalActivityDuration : session.durationSeconds)}</ThemedText>
            <ThemedText type="muted">Duration</ThemedText>
          </View>
        </View>
        {stats.totalVolume > 0 || stats.totalDistance > 0 ? (
          <View style={styles.statRow}>
            {stats.totalVolume > 0 ? (
              <View style={styles.stat}>
                <ThemedText type="stat">{formatVolume(stats.totalVolume)}</ThemedText>
                <ThemedText type="muted">Volume</ThemedText>
              </View>
            ) : null}
            {stats.totalDistance > 0 ? (
              <View style={styles.stat}>
                <ThemedText type="stat">{stats.totalDistance.toFixed(1)}km</ThemedText>
                <ThemedText type="muted">Distance</ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="trending-up" size={20} color={theme.link} />
        <ThemedText type="body" style={styles.insightText}>{insight}</ThemedText>
      </View>

      <View style={styles.ratingSection}>
        <ThemedText type="h2" style={styles.ratingTitle}>How was it?</ThemedText>
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => handleRating(value)} style={styles.starButton}>
              <Ionicons
                name={value <= rating ? "star" : "star-outline"}
                size={36}
                color={value <= rating ? Colors.dark.gold : theme.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.quoteCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="secondary" style={styles.quoteText}>"{quote}"</ThemedText>
      </View>

      <Button onPress={handleSave} style={styles.saveButton}>
        Save Session
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  statsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  stat: {
    alignItems: "center",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  insightText: {
    flex: 1,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  ratingTitle: {
    marginBottom: Spacing.md,
  },
  ratingStars: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  quoteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  quoteText: {
    fontStyle: "italic",
    textAlign: "center",
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
