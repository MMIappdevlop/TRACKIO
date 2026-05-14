import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { SessionComparisonCard } from "@/components/SessionComparisonCard";
import { useTheme } from "@/hooks/useTheme";
import { completedSessionsStorage, completedTasksStorage, settingsStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Colors } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedSession, CompletedTask } from "@/types";

type RoutePropType = RouteProp<ProgressStackParamList, "SessionDetail">;
type NavigationProp = NativeStackNavigationProp<ProgressStackParamList>;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function SessionDetailScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { sessionId } = route.params;

  const [session, setSession] = useState<CompletedSession | null>(null);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [prevSession, setPrevSession] = useState<CompletedSession | null>(null);
  const [prevTasks, setPrevTasks] = useState<CompletedTask[]>([]);
  const [weightUnit, setWeightUnit] = useState<string>("kg");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedSession, allSessions, settings] = await Promise.all([
      completedSessionsStorage.getById(sessionId),
      completedSessionsStorage.getAll(),
      settingsStorage.get(),
    ]);

    if (settings?.weightUnit) {
      setWeightUnit(settings.weightUnit);
    }

    setSession(loadedSession);

    if (loadedSession) {
      navigation.setOptions({ headerTitle: loadedSession.sessionTemplateName });

      const prior =
        allSessions
          .filter(
            (s) =>
              s.sessionTemplateId === loadedSession.sessionTemplateId &&
              s.id !== sessionId
          )
          .sort(
            (a, b) =>
              new Date(b.completedAt).getTime() -
              new Date(a.completedAt).getTime()
          )[0] ?? null;

      const [loadedTasks, pt] = await Promise.all([
        completedTasksStorage.getBySessionId(sessionId),
        prior ? completedTasksStorage.getBySessionId(prior.id) : Promise.resolve([]),
      ]);

      setTasks(loadedTasks);
      setPrevSession(prior);
      setPrevTasks(pt);
    }
  };

  const renderTask = ({ item: task }: { item: CompletedTask }) => {
    const modeConfig = TaskModes[task.mode];

    const renderData = () => {
      switch (task.mode) {
        case "strength":
          if (!task.dataJson.sets) return null;
          return (
            <View style={styles.setsContainer}>
              {task.dataJson.sets.map((set, index) => (
                <View key={index} style={styles.setRow}>
                  <ThemedText type="muted" style={styles.setNumber}>{set.setNumber}</ThemedText>
                  <ThemedText type="statSmall" style={styles.setValue}>
                    {set.weight || "-"}kg
                  </ThemedText>
                  <ThemedText type="muted">x</ThemedText>
                  <ThemedText type="statSmall" style={styles.setValue}>
                    {set.reps || "-"}
                  </ThemedText>
                  {set.isCompleted ? (
                    <Feather name="check" size={16} color={Colors.dark.success} />
                  ) : (
                    <Feather name="x" size={16} color={theme.textMuted} />
                  )}
                </View>
              ))}
            </View>
          );
        case "distance":
          return (
            <View style={styles.distanceData}>
              <ThemedText type="statSmall">
                {task.dataJson.distance || 0} {task.dataJson.distanceUnit || "km"}
              </ThemedText>
              {task.dataJson.durationSeconds ? (
                <ThemedText type="secondary">
                  in {formatDuration(task.dataJson.durationSeconds)}
                </ThemedText>
              ) : null}
            </View>
          );
        case "interval":
          return (
            <ThemedText type="secondary">
              Completed {task.dataJson.roundsCompleted || 0} / {task.dataJson.totalRounds || 0} rounds
            </ThemedText>
          );
        case "time":
          return (
            <ThemedText type="statSmall">
              {task.dataJson.durationSeconds ? formatDuration(task.dataJson.durationSeconds) : "-"}
            </ThemedText>
          );
        case "notes":
          return (
            <ThemedText type="secondary" style={styles.notesText}>
              {task.dataJson.notes || "No notes"}
            </ThemedText>
          );
      }
    };

    return (
      <View style={[styles.taskCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.taskHeader}>
          <View style={[styles.modeIndicator, { backgroundColor: modeConfig.color + "20" }]}>
            <ModeIcon mode={task.mode} size={16} color={modeConfig.color} />
          </View>
          <ThemedText type="h4">{task.taskTemplateName}</ThemedText>
        </View>
        {renderData()}
      </View>
    );
  };

  if (!session) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.metaCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.metaRow}>
                <Feather name="calendar" size={18} color={theme.textSecondary} />
                <ThemedText type="body">{formatDate(session.completedAt)}</ThemedText>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={18} color={theme.textSecondary} />
                <ThemedText type="body">
                  {formatTime(session.startedAt)} - {formatTime(session.completedAt)} ({formatDuration(session.durationSeconds)})
                </ThemedText>
              </View>
              {session.difficultyRating ? (
                <View style={styles.metaRow}>
                  <Feather name="star" size={18} color={Colors.dark.gold} />
                  <ThemedText type="body">{session.difficultyRating}/5 difficulty</ThemedText>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Feather name="folder" size={18} color={theme.textSecondary} />
                <ThemedText type="body">{session.programName}</ThemedText>
              </View>
            </View>

            <SessionComparisonCard
              session={session}
              prevSession={prevSession}
              tasks={tasks}
              prevTasks={prevTasks}
              weightUnit={weightUnit}
            />

            <ThemedText type="h2" style={styles.sectionTitle}>Exercises</ThemedText>
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
  metaCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  taskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  modeIndicator: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  setsContainer: {
    gap: Spacing.xs,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  setNumber: {
    width: 20,
  },
  setValue: {
    minWidth: 40,
  },
  distanceData: {
    gap: 2,
  },
  notesText: {
    fontStyle: "italic",
  },
});
