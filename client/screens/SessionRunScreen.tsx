import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Modal } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { useTheme } from "@/hooks/useTheme";
import { taskTemplatesStorage, completedSessionsStorage, completedTasksStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate, StrengthSetData, TaskDataJson, SplitTime } from "@/types";

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
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [showFinishModal, setShowFinishModal] = useState(false);
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

  const handleAddSet = (taskId: string) => {
    const log = taskLogs.find((l) => l.taskId === taskId);
    if (!log?.data.sets) return;

    const newSets = [...log.data.sets];
    const lastSet = newSets[newSets.length - 1];
    newSets.push({
      setNumber: newSets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 8,
      isCompleted: false,
    });
    updateTaskLog(taskId, { sets: newSets });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveSet = (taskId: string, setIndex: number) => {
    const log = taskLogs.find((l) => l.taskId === taskId);
    if (!log?.data.sets || log.data.sets.length <= 1) return;

    const newSets = log.data.sets.filter((_, i) => i !== setIndex).map((set, i) => ({
      ...set,
      setNumber: i + 1,
    }));
    updateTaskLog(taskId, { sets: newSets });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTimerComplete = (taskId: string, data: {
    durationSeconds: number;
    splits: SplitTime[];
    breakSeconds: number;
    roundsCompleted?: number;
  }) => {
    updateTaskLog(taskId, {
      durationSeconds: data.durationSeconds,
      splits: data.splits,
      breakSeconds: data.breakSeconds,
      roundsCompleted: data.roundsCompleted,
    });
  };

  const isExerciseComplete = useCallback((task: TaskTemplate, log: TaskLogState): boolean => {
    switch (task.mode) {
      case "strength":
        return (log.data.sets || []).some((s) => s.isCompleted);
      case "distance":
        return (log.data.distance !== undefined && log.data.distance > 0) ||
          (log.data.durationSeconds !== undefined && log.data.durationSeconds > 0);
      case "interval":
        return (log.data.roundsCompleted !== undefined && log.data.roundsCompleted > 0) ||
          (log.data.durationSeconds !== undefined && log.data.durationSeconds > 0);
      case "time":
        return log.data.durationSeconds !== undefined && log.data.durationSeconds > 0;
      case "notes":
        return log.data.notes !== undefined && log.data.notes.trim().length > 0;
      default:
        return false;
    }
  }, []);

  const handleCancel = () => {
    Alert.alert("End Session", "Are you sure you want to end this session? Your progress will not be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "End Session", style: "destructive", onPress: () => navigation.goBack() },
    ]);
  };

  const handleFinish = () => {
    const currentTaskLogs = taskLogsRef.current;
    const currentTasks = tasksRef.current;

    const hasIncomplete = currentTasks.some((task) => {
      const log = currentTaskLogs.find((l) => l.taskId === task.id);
      return !log || !isExerciseComplete(task, log);
    });

    if (hasIncomplete) {
      setShowFinishModal(true);
    } else {
      saveAndFinish();
    }
  };

  const saveAndFinish = async () => {
    setShowFinishModal(false);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000);

    const currentTaskLogs = taskLogsRef.current;
    const currentTasks = tasksRef.current;

    let completedCount = 0;
    const totalCount = currentTasks.length;

    const completedSession = await completedSessionsStorage.create({
      programId,
      programName,
      sessionTemplateId,
      sessionTemplateName,
      durationSeconds,
      startedAt: startTimeRef.current.toISOString(),
      completedAt: endTime.toISOString(),
    });

    for (const log of currentTaskLogs) {
      const task = currentTasks.find((t) => t.id === log.taskId);
      if (!task) continue;

      const completed = isExerciseComplete(task, log);
      if (completed) completedCount++;

      if (completed) {
        await completedTasksStorage.create({
          completedSessionId: completedSession.id,
          taskTemplateId: task.id,
          taskTemplateName: task.name,
          mode: task.mode,
          dataJson: log.data,
          completedAt: new Date().toISOString(),
        });
      }
    }

    const completionRatio = totalCount > 0 ? completedCount / totalCount : 1;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace("SessionSummary", { completedSessionId: completedSession.id, completionRatio });
  };

  const handlePrevious = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const currentTask = tasks[currentTaskIndex];
  const currentLog = taskLogs.find((l) => l.taskId === currentTask?.id);
  const progressPercent = tasks.length > 0 ? ((currentTaskIndex + 1) / tasks.length) * 100 : 0;

  const getTargetText = (task: TaskTemplate) => {
    if (task.mode === "strength") {
      return `${task.config.sets || 3} sets × ${task.config.reps || 8} reps`;
    }
    if (task.mode === "distance") {
      return `${task.config.targetDistance || 0} ${task.config.distanceUnit || "km"}`;
    }
    if (task.mode === "interval") {
      return `${task.config.rounds || 5} rounds`;
    }
    if (task.mode === "time") {
      return "Timed activity";
    }
    return "";
  };

  if (tasks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg }]}>
          <EmptyState
            icon="clipboard"
            title="No Exercises"
            description="This session has no exercises yet."
            actionLabel="Go Back"
            onAction={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: 100 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        {/* Task Counter */}
        <ThemedText type="secondary" style={styles.taskCounter}>
          {currentTaskIndex + 1}/{tasks.length}
        </ThemedText>

        {/* Task Name */}
        <ThemedText type="h1" style={styles.taskName}>{currentTask.name}</ThemedText>

        {/* Target */}
        <ThemedText type="secondary" style={styles.targetText}>
          {getTargetText(currentTask)}
        </ThemedText>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <ThemedText type="secondary" style={styles.progressLabel}>
            Exercise {currentTaskIndex + 1} of {tasks.length}
          </ThemedText>
          <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: Colors.dark.success }]}
            />
          </View>
        </View>

        {/* Strength Mode - Sets */}
        {currentTask.mode === "strength" && currentLog?.data.sets ? (
          <View style={styles.setsSection}>
            <View style={styles.setsHeader}>
              <ThemedText type="h3">Sets</ThemedText>
              <Pressable
                onPress={() => handleAddSet(currentTask.id)}
                style={[styles.addSetButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="plus" size={16} color={theme.text} />
                <ThemedText type="body" style={[styles.addSetText, { color: theme.text }]}>Add Set</ThemedText>
              </Pressable>
            </View>

            {currentLog.data.sets.map((set, index) => (
              <View key={index} style={[styles.setCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.setCardInner}>
                  {/* Weight */}
                  <View style={styles.setField}>
                    <ThemedText type="muted" style={styles.setFieldLabel}>Weight</ThemedText>
                    <TextInput
                      style={[styles.setInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                      value={set.weight ? String(set.weight) : "0"}
                      onChangeText={(v) => handleSetUpdate(currentTask.id, index, "weight", v)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                  </View>

                  <ThemedText type="muted" style={styles.separator}>-</ThemedText>

                  {/* Set Number */}
                  <View style={styles.setField}>
                    <ThemedText type="muted" style={styles.setFieldLabel}>Set</ThemedText>
                    <View style={[styles.setNumberBox, { backgroundColor: theme.backgroundDefault }]}>
                      <ThemedText type="body" style={styles.setNumberText}>{set.setNumber}</ThemedText>
                    </View>
                  </View>

                  <ThemedText type="muted" style={styles.separator}>-</ThemedText>

                  {/* Reps */}
                  <View style={styles.setField}>
                    <ThemedText type="muted" style={styles.setFieldLabel}>Reps</ThemedText>
                    <TextInput
                      style={[styles.setInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                      value={set.reps ? String(set.reps) : "0"}
                      onChangeText={(v) => handleSetUpdate(currentTask.id, index, "reps", v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>

                  {/* Delete Button - only show if more than 1 set */}
                  {currentLog.data.sets!.length > 1 ? (
                    <Pressable
                      onPress={() => handleRemoveSet(currentTask.id, index)}
                      style={styles.deleteButton}
                    >
                      <Feather name="x" size={18} color={Colors.dark.error} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Distance Mode */}
        {currentTask.mode === "distance" ? (
          <View style={styles.modeSection}>
            <View style={styles.distanceRow}>
              <View style={styles.distanceField}>
                <ThemedText type="muted" style={styles.fieldLabel}>Distance</ThemedText>
                <TextInput
                  style={[styles.largeInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={currentLog?.data.distance ? String(currentLog.data.distance) : ""}
                  onChangeText={(v) => updateTaskLog(currentTask.id, { distance: parseFloat(v) || undefined })}
                  keyboardType="decimal-pad"
                  placeholder={currentTask.config.distanceUnit || "km"}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.distanceField}>
                <ThemedText type="muted" style={styles.fieldLabel}>Duration (min)</ThemedText>
                <TextInput
                  style={[styles.largeInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={currentLog?.data.durationSeconds ? String(Math.floor(currentLog.data.durationSeconds / 60)) : ""}
                  onChangeText={(v) => updateTaskLog(currentTask.id, { durationSeconds: (parseInt(v) || 0) * 60 })}
                  keyboardType="number-pad"
                  placeholder="min"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Interval Mode */}
        {currentTask.mode === "interval" ? (
          <View style={styles.modeSection}>
            <ThemedText type="secondary" style={styles.intervalInfo}>
              {currentTask.config.rounds} rounds: {currentTask.config.workSeconds}s work / {currentTask.config.restSeconds}s rest
            </ThemedText>
            <ExerciseTimer
              key={`interval-${currentTask.id}`}
              mode="interval"
              intervalConfig={{
                workSeconds: currentTask.config.workSeconds || 30,
                restSeconds: currentTask.config.restSeconds || 30,
                rounds: currentTask.config.rounds || 5,
              }}
              onComplete={(data) => handleTimerComplete(currentTask.id, data)}
            />
          </View>
        ) : null}

        {/* Time Mode */}
        {currentTask.mode === "time" ? (
          <View style={styles.modeSection}>
            <ExerciseTimer
              key={`time-${currentTask.id}`}
              mode="time"
              onComplete={(data) => handleTimerComplete(currentTask.id, data)}
            />
          </View>
        ) : null}

        {/* Notes Mode */}
        {currentTask.mode === "notes" ? (
          <View style={styles.modeSection}>
            <TextInput
              style={[styles.notesInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={currentLog?.data.notes || ""}
              onChangeText={(v) => updateTaskLog(currentTask.id, { notes: v })}
              placeholder="Add notes..."
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          onPress={handlePrevious}
          disabled={currentTaskIndex === 0}
          style={[styles.navButton, styles.prevButton]}
        >
          <Feather name="chevron-left" size={20} color={currentTaskIndex === 0 ? theme.textMuted : theme.text} />
          <ThemedText
            type="body"
            style={[styles.navButtonText, currentTaskIndex === 0 && { color: theme.textMuted }]}
          >
            Previous
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={currentTaskIndex === tasks.length - 1}
          style={[styles.navButton, styles.nextButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <ThemedText
            type="body"
            style={[styles.navButtonText, currentTaskIndex === tasks.length - 1 && { color: theme.textMuted }]}
          >
            Next
          </ThemedText>
          <Feather
            name="chevron-right"
            size={20}
            color={currentTaskIndex === tasks.length - 1 ? theme.textMuted : theme.text}
          />
        </Pressable>
      </View>

      <Modal
        visible={showFinishModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFinishModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="alert-circle" size={40} color={theme.link} style={styles.modalIcon} />
            <ThemedText type="h2" style={styles.modalTitle}>Some exercises still need your input</ThemedText>
            <Pressable
              onPress={() => setShowFinishModal(false)}
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.link }]}
              testID="button-not-done-yet"
            >
              <ThemedText type="body" style={styles.modalPrimaryText}>I'm Not Done Yet</ThemedText>
            </Pressable>
            <Pressable
              onPress={saveAndFinish}
              style={styles.modalSecondaryBtn}
              testID="button-finish-anyway"
            >
              <ThemedText type="secondary">Finish Session</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  taskCounter: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  taskName: {
    marginBottom: Spacing.xs,
  },
  targetText: {
    marginBottom: Spacing.lg,
  },
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressLabel: {
    marginBottom: Spacing.sm,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  setsSection: {
    gap: Spacing.md,
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addSetText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  setCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  setCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setField: {
    alignItems: "center",
    flex: 1,
  },
  setFieldLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  setInput: {
    width: 60,
    height: 48,
    borderRadius: BorderRadius.md,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  setNumberBox: {
    width: 60,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  separator: {
    fontSize: 16,
    marginHorizontal: Spacing.xs,
  },
  deleteButton: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSection: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  distanceRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  distanceField: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  largeInput: {
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  intervalInfo: {
    marginBottom: Spacing.md,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  prevButton: {
    backgroundColor: "transparent",
  },
  nextButton: {
    flex: 1.5,
  },
  navButtonText: {
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalPrimaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  modalSecondaryBtn: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
