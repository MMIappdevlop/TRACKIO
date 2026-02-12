import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { useTheme } from "@/hooks/useTheme";
import { completedTasksStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Colors } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedTask, TaskTemplate } from "@/types";

type RoutePropType = RouteProp<ProgressStackParamList, "TaskDetail">;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function TaskDetailScreen() {
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { taskTemplateId } = route.params;

  const [task, setTask] = useState<TaskTemplate | null>(null);
  const [history, setHistory] = useState<CompletedTask[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedTask = await taskTemplatesStorage.getById(taskTemplateId);
    setTask(loadedTask);
    const loadedHistory = await completedTasksStorage.getByTaskTemplateId(taskTemplateId);
    setHistory(loadedHistory);
  };

  const calculateBest = () => {
    if (!task) return null;

    if (task.mode === "strength") {
      let maxWeight = 0;
      let maxVolume = 0;
      for (const entry of history) {
        if (entry.dataJson.sets) {
          for (const set of entry.dataJson.sets) {
            if (set.isCompleted) {
              if (set.weight && set.weight > maxWeight) {
                maxWeight = set.weight;
              }
              if (set.weight && set.reps) {
                const volume = set.weight * set.reps;
                if (volume > maxVolume) {
                  maxVolume = volume;
                }
              }
            }
          }
        }
      }
      return { maxWeight, maxVolume };
    }

    if (task.mode === "distance") {
      let maxDistance = 0;
      let bestPace = Infinity;
      for (const entry of history) {
        if (entry.dataJson.distance && entry.dataJson.distance > maxDistance) {
          maxDistance = entry.dataJson.distance;
        }
        if (entry.dataJson.distance && entry.dataJson.durationSeconds) {
          const pace = entry.dataJson.durationSeconds / 60 / entry.dataJson.distance;
          if (pace < bestPace) {
            bestPace = pace;
          }
        }
      }
      return { maxDistance, bestPace: bestPace === Infinity ? null : bestPace };
    }

    return null;
  };

  const renderHistoryItem = ({ item }: { item: CompletedTask }) => {
    const modeConfig = TaskModes[item.mode];

    const renderData = () => {
      switch (item.mode) {
        case "strength":
          if (!item.dataJson.sets) return null;
          const completedSets = item.dataJson.sets.filter((s) => s.isCompleted);
          const topSet = completedSets.reduce(
            (best, set) => {
              const weight = set.weight || 0;
              const reps = set.reps || 0;
              if (weight > (best.weight || 0)) {
                return set;
              }
              return best;
            },
            { weight: 0, reps: 0 }
          );
          return (
            <ThemedText type="body">
              Top: {topSet.weight}kg x {topSet.reps} ({completedSets.length} sets)
            </ThemedText>
          );
        case "distance":
          return (
            <ThemedText type="body">
              {item.dataJson.distance} {item.dataJson.distanceUnit}
            </ThemedText>
          );
        default:
          return null;
      }
    };

    return (
      <View style={[styles.historyCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.historyHeader}>
          <ThemedText type="secondary">{formatDate(item.completedAt)}</ThemedText>
        </View>
        {renderData()}
      </View>
    );
  };

  if (!task) return null;

  const best = calculateBest();
  const modeConfig = TaskModes[task.mode];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.modeIndicator, { backgroundColor: modeConfig.color + "20" }]}>
                <ModeIcon mode={task.mode} size={24} color={modeConfig.color} />
              </View>
              <ThemedText type="h2" style={styles.taskName}>{task.name}</ThemedText>
              <ThemedText type="muted">{history.length} logged sessions</ThemedText>

              {best && task.mode === "strength" ? (
                <View style={styles.bestStats}>
                  <View style={styles.bestStat}>
                    <ThemedText type="stat">{best.maxWeight}kg</ThemedText>
                    <ThemedText type="muted">Best Weight</ThemedText>
                  </View>
                  <View style={styles.bestStat}>
                    <ThemedText type="stat">{Math.round(best.maxVolume)}kg</ThemedText>
                    <ThemedText type="muted">Best Set Volume</ThemedText>
                  </View>
                </View>
              ) : null}

              {best && task.mode === "distance" && best.maxDistance ? (
                <View style={styles.bestStats}>
                  <View style={styles.bestStat}>
                    <ThemedText type="stat">{best.maxDistance}{task.config.distanceUnit || "km"}</ThemedText>
                    <ThemedText type="muted">Longest</ThemedText>
                  </View>
                  {best.bestPace ? (
                    <View style={styles.bestStat}>
                      <ThemedText type="stat">{best.bestPace.toFixed(2)}</ThemedText>
                      <ThemedText type="muted">Best Pace</ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {history.length > 0 ? (
              <ThemedText type="h2" style={styles.sectionTitle}>History</ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText type="secondary">No history yet</ThemedText>
          </View>
        }
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      />
    </View>
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
    marginBottom: Spacing.md,
  },
  statsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modeIndicator: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  taskName: {
    marginBottom: Spacing.xs,
  },
  bestStats: {
    flexDirection: "row",
    marginTop: Spacing.xl,
    gap: Spacing["3xl"],
  },
  bestStat: {
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  historyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    marginBottom: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
});
