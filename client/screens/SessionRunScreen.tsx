import React, { useState, useEffect, useRef } from "react";
import { View, FlatList, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { RestTimerSheet } from "@/components/RestTimerSheet";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { taskTemplatesStorage, completedSessionsStorage, completedTasksStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate, StrengthSetData, TaskDataJson } from "@/types";

type RoutePropType = RouteProp<RootStackParamList, "SessionRun">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TaskLogState {
  taskId: string;
  data: TaskDataJson;
}

export default function SessionRunScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { sessionTemplateId, sessionTemplateName, programId, programName } = route.params;

  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLogState[]>([]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const startTimeRef = useRef(new Date());
  const taskLogsRef = useRef<TaskLogState[]>([]);
  const tasksRef = useRef<TaskTemplate[]>([]);

  useEffect(() => {
    taskLogsRef.current = taskLogs;
  }, [taskLogs]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    loadTasks();
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton onPress={handleFinish}>
          <ThemedText type="link" style={{ fontWeight: "600" }}>Finish</ThemedText>
        </HeaderButton>
      ),
      headerLeft: () => (
        <HeaderButton onPress={handleCancel}>
          <Feather name="x" size={22} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, []);

  const loadTasks = async () => {
    const loadedTasks = await taskTemplatesStorage.getBySessionTemplateId(sessionTemplateId);
    setTasks(loadedTasks);
    initializeTaskLogs(loadedTasks);
  };

  const initializeTaskLogs = (loadedTasks: TaskTemplate[]) => {
    const logs = loadedTasks.map((task) => {
      const data: TaskDataJson = {};
      if (task.mode === "strength") {
        const sets: StrengthSetData[] = [];
        for (let i = 0; i < (task.config.sets || 3); i++) {
          sets.push({
            setNumber: i + 1,
            weight: task.config.weight,
            reps: task.config.reps,
            isCompleted: false,
          });
        }
        data.sets = sets;
      }
      if (task.mode === "distance") {
        data.distanceUnit = task.config.distanceUnit || "km";
      }
      if (task.mode === "interval") {
        data.totalRounds = task.config.rounds || 5;
        data.roundsCompleted = 0;
      }
      return { taskId: task.id, data };
    });
    setTaskLogs(logs);
  };

  const updateTaskLog = (taskId: string, updates: Partial<TaskDataJson>) => {
    console.log("[SessionRun] updateTaskLog called:", taskId, updates);
    setTaskLogs((prev) =>
      prev.map((log) =>
        log.taskId === taskId ? { ...log, data: { ...log.data, ...updates } } : log
      )
    );
  };

  const handleSetComplete = (taskId: string, setIndex: number, task: TaskTemplate) => {
    const log = taskLogs.find((l) => l.taskId === taskId);
    if (!log?.data.sets) return;

    const newSets = [...log.data.sets];
    newSets[setIndex] = { ...newSets[setIndex], isCompleted: !newSets[setIndex].isCompleted };
    updateTaskLog(taskId, { sets: newSets });

    if (newSets[setIndex].isCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRestSeconds(task.defaultRestSeconds || 90);
      setShowRestTimer(true);
    }
  };

  const handleSetUpdate = (taskId: string, setIndex: number, field: "weight" | "reps", value: string) => {
    const log = taskLogs.find((l) => l.taskId === taskId);
    if (!log?.data.sets) return;

    const newSets = [...log.data.sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: parseFloat(value) || 0 };
    updateTaskLog(taskId, { sets: newSets });
  };

  const handleStartInterval = (task: TaskTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Start Interval Timer",
      `${task.config.rounds} rounds of ${task.config.workSeconds}s work / ${task.config.restSeconds}s rest`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            const log = taskLogs.find((l) => l.taskId === task.id);
            if (log) {
              updateTaskLog(task.id, {
                roundsCompleted: task.config.rounds || 5,
                durationSeconds: ((task.config.workSeconds || 30) + (task.config.restSeconds || 30)) * (task.config.rounds || 5),
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Session",
      "Are you sure you want to discard this session?",
      [
        { text: "Keep Training", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleFinish = async () => {
    const currentTaskLogs = taskLogsRef.current;
    const currentTasks = tasksRef.current;
    console.log("[SessionRun] handleFinish - taskLogs:", JSON.stringify(currentTaskLogs, null, 2));
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000);

    const completedSession = await completedSessionsStorage.create({
      sessionTemplateId,
      sessionTemplateName,
      programId,
      programName,
      startedAt: startTimeRef.current.toISOString(),
      completedAt: endTime.toISOString(),
      durationSeconds,
    });

    for (const log of currentTaskLogs) {
      const task = currentTasks.find((t) => t.id === log.taskId);
      if (!task) continue;

      await completedTasksStorage.create({
        completedSessionId: completedSession.id,
        taskTemplateId: log.taskId,
        taskTemplateName: task.name,
        mode: task.mode,
        dataJson: log.data,
        completedAt: endTime.toISOString(),
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace("SessionSummary", { completedSessionId: completedSession.id });
  };

  const renderTask = ({ item: task }: { item: TaskTemplate }) => {
    const log = taskLogs.find((l) => l.taskId === task.id);
    const modeConfig = TaskModes[task.mode];

    return (
      <View style={[styles.taskCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.taskHeader}>
          <View style={[styles.modeIndicator, { backgroundColor: modeConfig.color + "20" }]}>
            <Feather name={modeConfig.icon as any} size={18} color={modeConfig.color} />
          </View>
          <ThemedText type="h4" style={styles.taskName}>{task.name}</ThemedText>
        </View>

        {task.mode === "strength" && log?.data.sets ? (
          <View style={styles.setsContainer}>
            {log.data.sets.map((set, index) => (
              <View key={index} style={styles.setRow}>
                <ThemedText type="muted" style={styles.setNumber}>{set.setNumber}</ThemedText>
                <TextInput
                  style={[styles.setInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={set.weight ? String(set.weight) : ""}
                  onChangeText={(v) => handleSetUpdate(task.id, index, "weight", v)}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  placeholderTextColor={theme.textMuted}
                />
                <TextInput
                  style={[styles.setInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={set.reps ? String(set.reps) : ""}
                  onChangeText={(v) => handleSetUpdate(task.id, index, "reps", v)}
                  keyboardType="number-pad"
                  placeholder="reps"
                  placeholderTextColor={theme.textMuted}
                />
                <Pressable
                  onPress={() => handleSetComplete(task.id, index, task)}
                  style={[
                    styles.checkButton,
                    set.isCompleted && { backgroundColor: Colors.dark.effort },
                    !set.isCompleted && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="check" size={18} color={set.isCompleted ? "#FFF" : theme.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {task.mode === "distance" ? (
          <View style={styles.distanceContainer}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceField}>
                <ThemedText type="muted" style={styles.distanceLabel}>Distance</ThemedText>
                <TextInput
                  testID={`input-distance-${task.id}`}
                  style={[styles.distanceInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={log?.data.distance ? String(log.data.distance) : ""}
                  onChangeText={(v) => updateTaskLog(task.id, { distance: parseFloat(v) || undefined })}
                  keyboardType="decimal-pad"
                  placeholder={task.config.distanceUnit || "km"}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.distanceField}>
                <ThemedText type="muted" style={styles.distanceLabel}>Duration (min)</ThemedText>
                <TextInput
                  testID={`input-duration-${task.id}`}
                  style={[styles.distanceInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={log?.data.durationSeconds ? String(Math.floor(log.data.durationSeconds / 60)) : ""}
                  onChangeText={(v) => updateTaskLog(task.id, { durationSeconds: (parseInt(v) || 0) * 60 })}
                  keyboardType="number-pad"
                  placeholder="min"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
            {log?.data.distance && log?.data.durationSeconds ? (
              <ThemedText type="secondary" style={styles.paceText}>
                Pace: {(log.data.durationSeconds / 60 / log.data.distance).toFixed(2)} min/{log.data.distanceUnit || "km"}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {task.mode === "interval" ? (
          <View style={styles.intervalContainer}>
            <ThemedText type="secondary">
              {task.config.rounds} rounds: {task.config.workSeconds}s work / {task.config.restSeconds}s rest
            </ThemedText>
            {log?.data.roundsCompleted ? (
              <View style={[styles.completedBadge, { backgroundColor: Colors.dark.success + "20" }]}>
                <Feather name="check-circle" size={16} color={Colors.dark.success} />
                <ThemedText type="secondary" style={{ color: Colors.dark.success }}>
                  Completed {log.data.roundsCompleted} rounds
                </ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={() => handleStartInterval(task)}
                style={[styles.startButton, { backgroundColor: modeConfig.color }]}
              >
                <Feather name="play" size={18} color="#FFF" />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>Start Timer</ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}

        {task.mode === "time" ? (
          <View style={styles.timeContainer}>
            <ThemedText type="muted" style={styles.distanceLabel}>Duration (minutes)</ThemedText>
            <TextInput
              style={[styles.distanceInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={log?.data.durationSeconds ? String(Math.floor(log.data.durationSeconds / 60)) : ""}
              onChangeText={(v) => updateTaskLog(task.id, { durationSeconds: (parseInt(v) || 0) * 60 })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        ) : null}

        {task.mode === "notes" ? (
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            value={log?.data.notes || ""}
            onChangeText={(v) => updateTaskLog(task.id, { notes: v })}
            placeholder="Add notes..."
            placeholderTextColor={theme.textMuted}
            multiline
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title="No Exercises"
            description="This session has no exercises yet. Go back and long-press the session to add tasks."
            actionLabel="Go Back"
            onAction={() => navigation.goBack()}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
          tasks.length === 0 && styles.emptyContent,
        ]}
      />

      <RestTimerSheet
        visible={showRestTimer}
        initialSeconds={restSeconds}
        onClose={() => setShowRestTimer(false)}
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
    flexGrow: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
  },
  taskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  modeIndicator: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskName: {
    flex: 1,
  },
  setsContainer: {
    gap: Spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  setNumber: {
    width: 24,
    textAlign: "center",
  },
  setInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  distanceContainer: {
    gap: Spacing.md,
  },
  distanceRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  distanceField: {
    flex: 1,
  },
  distanceLabel: {
    marginBottom: Spacing.xs,
  },
  distanceInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  paceText: {
    marginTop: Spacing.xs,
  },
  intervalContainer: {
    gap: Spacing.md,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  timeContainer: {
    gap: Spacing.xs,
  },
  notesInput: {
    minHeight: 80,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
});
