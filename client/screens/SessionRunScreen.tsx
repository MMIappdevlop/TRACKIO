import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";

import { ThemedText } from "@/components/ThemedText";
import { ExerciseIllustration } from "@/components/ExerciseIllustration";
import { RestTimerSheet } from "@/components/RestTimerSheet";
import { EmptyState } from "@/components/EmptyState";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { taskTemplatesStorage, completedSessionsStorage, completedTasksStorage, activeSessionStorage, settingsStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate, StrengthSetData, TaskDataJson, SplitTime, ExerciseMode } from "@/types";

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
  useKeepAwake();
  const { settings } = useSettings();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { sessionTemplateId, sessionTemplateName, programId, programName, resumeSession } = route.params;

  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLogState[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adhocName, setAdhocName] = useState("");
  const [adhocMode, setAdhocMode] = useState<ExerciseMode>("strength");
  const [adhocSets, setAdhocSets] = useState(3);
  const [previousData, setPreviousData] = useState<Record<string, StrengthSetData[]>>({});
  const [distanceInputStr, setDistanceInputStr] = useState<Record<string, string>>({});
  const [durationInputStr, setDurationInputStr] = useState<Record<string, string>>({});
  const startTimeRef = useRef(new Date());
  const taskLogsRef = useRef<TaskLogState[]>([]);
  const tasksRef = useRef<TaskTemplate[]>([]);
  const handleFinishRef = useRef<() => void>(() => {});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const exitingRef = useRef(false);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    handleFinishRef.current = handleFinish;
  });

  useEffect(() => {
    loadSession();
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton onPress={() => handleFinishRef.current()}>
          <ThemedText type="link" style={{ fontWeight: "600" }}>Finish</ThemedText>
        </HeaderButton>
      ),
      headerLeft: () => (
        <HeaderButton onPress={handleCancel}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </HeaderButton>
      ),
    });
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current || exitingRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (exitingRef.current) return;
      activeSessionStorage.save({
        sessionTemplateId,
        sessionTemplateName,
        programId,
        programName,
        startedAt: startTimeRef.current.toISOString(),
        taskLogs: taskLogsRef.current,
        currentTaskIndex,
      });
    }, 2000);
  }, [taskLogs, currentTaskIndex]);

  const loadSession = async () => {
    const loadedTasks = await taskTemplatesStorage.getBySessionTemplateId(sessionTemplateId);
    tasksRef.current = loadedTasks;
    setTasks(loadedTasks);

    if (resumeSession) {
      const saved = await activeSessionStorage.get();
      if (saved && saved.sessionTemplateId === sessionTemplateId) {
        startTimeRef.current = new Date(saved.startedAt);
        taskLogsRef.current = saved.taskLogs;
        setTaskLogs(saved.taskLogs);
        setCurrentTaskIndex(saved.currentTaskIndex);
        initializedRef.current = true;
        loadPreviousData(loadedTasks);
        return;
      }
    }

    initializeTaskLogs(loadedTasks);
    loadPreviousData(loadedTasks);
    initializedRef.current = true;

    activeSessionStorage.save({
      sessionTemplateId,
      sessionTemplateName,
      programId,
      programName,
      startedAt: startTimeRef.current.toISOString(),
      taskLogs: taskLogsRef.current,
      currentTaskIndex: 0,
    });
  };

  const loadPreviousData = async (loadedTasks: TaskTemplate[]) => {
    const prevMap: Record<string, StrengthSetData[]> = {};
    const strengthTasks = loadedTasks.filter((t) => t.mode === "strength");
    if (strengthTasks.length === 0) {
      setPreviousData(prevMap);
      return;
    }

    const allCompleted = await completedTasksStorage.getAll();
    const byName = new Map<string, typeof allCompleted>();
    for (const ct of allCompleted) {
      if (ct.mode !== "strength") continue;
      const key = ct.taskTemplateName.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(ct);
    }

    for (const task of strengthTasks) {
      const key = task.name.trim().toLowerCase();
      const history = byName.get(key);
      if (!history || history.length === 0) continue;
      history.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      const mostRecent = history[0];
      if (mostRecent.dataJson.sets) {
        const completedSets = mostRecent.dataJson.sets.filter((s) => s.isCompleted);
        if (completedSets.length > 0) {
          prevMap[task.id] = completedSets;
        }
      }
    }

    setPreviousData(prevMap);
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
    taskLogsRef.current = logs;
    setTaskLogs(logs);
  };

  const updateTaskLog = (taskId: string, updates: Partial<TaskDataJson>) => {
    setTaskLogs((prev) => {
      const updated = prev.map((log) =>
        log.taskId === taskId ? { ...log, data: { ...log.data, ...updates } } : log
      );
      taskLogsRef.current = updated;
      return updated;
    });
  };

  const getTaskLog = (taskId: string) => taskLogsRef.current.find((l) => l.taskId === taskId);

  const handleSetComplete = (taskId: string, setIndex: number, task: TaskTemplate) => {
    const log = getTaskLog(taskId);
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

  const [setInputStrings, setSetInputStrings] = useState<Record<string, string>>({});

  const getSetInputKey = (taskId: string, setIndex: number, field: string) => `${taskId}-${setIndex}-${field}`;

  const handleSetInputChange = (taskId: string, setIndex: number, field: "weight" | "reps", value: string) => {
    const key = getSetInputKey(taskId, setIndex, field);
    const normalized = value.replace(",", ".");
    setSetInputStrings((prev) => ({ ...prev, [key]: normalized }));

    if (normalized === "" || normalized.trim() === "") {
      const log = getTaskLog(taskId);
      if (!log?.data.sets) return;
      const newSets = [...log.data.sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: 0 };
      updateTaskLog(taskId, { sets: newSets });
      return;
    }
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      const log = getTaskLog(taskId);
      if (!log?.data.sets) return;
      const newSets = [...log.data.sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: parsed };
      updateTaskLog(taskId, { sets: newSets });
    }
  };

  const handleSetInputBlur = (taskId: string, setIndex: number, field: "weight" | "reps") => {
    const key = getSetInputKey(taskId, setIndex, field);
    setSetInputStrings((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const getSetInputValue = (taskId: string, setIndex: number, field: "weight" | "reps", numericValue?: number) => {
    const key = getSetInputKey(taskId, setIndex, field);
    if (setInputStrings[key] !== undefined) return setInputStrings[key];
    return numericValue ? String(numericValue) : "0";
  };

  const handleAddSet = (taskId: string) => {
    const log = getTaskLog(taskId);
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
    const log = getTaskLog(taskId);
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

  const stopAutoSave = () => {
    exitingRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  const handleAddAdhocExercise = () => {
    const id = `adhoc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const newTask: TaskTemplate = {
      id,
      sessionTemplateId,
      name: adhocName.trim(),
      mode: adhocMode,
      order: tasksRef.current.length,
      config: adhocMode === "strength" ? { sets: adhocSets } : {},
      trackMilestones: false,
      createdAt: now,
      updatedAt: now,
    };
    const initialData: TaskDataJson = {};
    if (adhocMode === "strength") {
      initialData.sets = Array.from({ length: adhocSets }, (_, i) => ({
        setNumber: i + 1,
        weight: undefined,
        reps: undefined,
        isCompleted: false,
      }));
    }
    const newLog: TaskLogState = { taskId: id, data: initialData };
    const newIndex = tasksRef.current.length;
    setTasks((prev) => [...prev, newTask]);
    setTaskLogs((prev) => {
      const updated = [...prev, newLog];
      taskLogsRef.current = updated;
      return updated;
    });
    setCurrentTaskIndex(newIndex);
    setShowAddModal(false);
    setAdhocName("");
    setAdhocMode("strength");
    setAdhocSets(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCancel = () => {
    setShowPauseModal(true);
  };

  const handleSaveAndExit = async () => {
    setShowPauseModal(false);
    stopAutoSave();
    try {
      await activeSessionStorage.save({
        sessionTemplateId,
        sessionTemplateName,
        programId,
        programName,
        startedAt: startTimeRef.current.toISOString(),
        taskLogs: taskLogsRef.current,
        currentTaskIndex,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Could not save draft", "Something went wrong. Please try again.");
    }
  };

  const handleDiscard = async () => {
    setShowPauseModal(false);
    stopAutoSave();
    try {
      await activeSessionStorage.clear();
      navigation.goBack();
    } catch (e) {
      navigation.goBack();
    }
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
    stopAutoSave();
    try {
      await activeSessionStorage.clear();
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

      const currentSettings = await settingsStorage.get();
      if (!currentSettings.firstWorkoutCompletedAt) {
        await settingsStorage.update({
          firstWorkoutCompletedAt: new Date().toISOString(),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("SessionSummary", { completedSessionId: completedSession.id, completionRatio });
    } catch (e) {
      Alert.alert("Could not save session", "Something went wrong. Please try again.");
    }
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

        {/* Task Name + Add Exercise */}
        <View style={styles.taskNameRow}>
          <ThemedText type="h1" style={styles.taskName} numberOfLines={1}>{currentTask.name}</ThemedText>
          <Pressable
            testID="button-add-exercise"
            onPress={() => setShowAddModal(true)}
            style={[styles.addExerciseButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="plus" size={16} color={theme.text} />
            <ThemedText type="body" style={[styles.addSetText, { color: theme.text }]}>Add</ThemedText>
          </Pressable>
        </View>

        {currentTask.referenceLink ? (
          <Pressable
            testID="button-reference-link"
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                await Linking.openURL(currentTask.referenceLink!);
              } catch (e) {
                console.error("Failed to open link:", e);
              }
            }}
            style={[styles.referenceLinkButton, { backgroundColor: theme.linkBackground }]}
          >
            <Feather name="external-link" size={14} color={theme.link} />
            <ThemedText type="small" style={{ color: theme.link }}>Reference</ThemedText>
          </Pressable>
        ) : null}

        {/* Exercise illustration — collapsible form guide */}
        <ExerciseIllustration exerciseName={currentTask.name} collapsible />

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

            {currentLog.data.sets.map((set, index) => {
              const prevSets = previousData[currentTask.id];
              const prevSet = prevSets && prevSets[index];
              const weightUnit = settings?.weightUnit || "kg";
              return (
                <View key={index} style={[styles.setCard, { backgroundColor: set.isCompleted ? Colors.dark.success + "15" : theme.backgroundSecondary }]}>
                  <View style={styles.setCardInner}>
                    <Pressable
                      onPress={() => handleSetComplete(currentTask.id, index, currentTask)}
                      style={styles.setCheckbox}
                      testID={`set-complete-${index}`}
                    >
                      <Feather
                        name={set.isCompleted ? "check-circle" : "circle"}
                        size={24}
                        color={set.isCompleted ? Colors.dark.success : theme.textMuted}
                      />
                    </Pressable>

                    <View style={styles.setField}>
                      <ThemedText type="muted" style={styles.setFieldLabel}>Weight</ThemedText>
                      <TextInput
                        style={[styles.setInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                        value={getSetInputValue(currentTask.id, index, "weight", set.weight)}
                        onChangeText={(v) => handleSetInputChange(currentTask.id, index, "weight", v)}
                        onBlur={() => handleSetInputBlur(currentTask.id, index, "weight")}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>

                    <ThemedText type="muted" style={styles.separator}>x</ThemedText>

                    <View style={styles.setField}>
                      <ThemedText type="muted" style={styles.setFieldLabel}>Reps</ThemedText>
                      <TextInput
                        style={[styles.setInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                        value={getSetInputValue(currentTask.id, index, "reps", set.reps)}
                        onChangeText={(v) => handleSetInputChange(currentTask.id, index, "reps", v)}
                        onBlur={() => handleSetInputBlur(currentTask.id, index, "reps")}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>

                    {currentLog.data.sets!.length > 1 ? (
                      <Pressable
                        onPress={() => handleRemoveSet(currentTask.id, index)}
                        style={styles.deleteButton}
                      >
                        <Feather name="x" size={18} color={Colors.dark.error} />
                      </Pressable>
                    ) : null}
                  </View>
                  {prevSet && (prevSet.weight || prevSet.reps) ? (
                    <ThemedText style={styles.previousHint}>
                      Last: {prevSet.weight ? `${prevSet.weight} ${weightUnit}` : ""}{prevSet.weight && prevSet.reps ? " x " : ""}{prevSet.reps ? `${prevSet.reps} reps` : ""}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
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
                  value={distanceInputStr[currentTask.id] !== undefined ? distanceInputStr[currentTask.id] : (currentLog?.data.distance ? String(currentLog.data.distance) : "")}
                  onChangeText={(v) => {
                    setDistanceInputStr((prev) => ({ ...prev, [currentTask.id]: v }));
                    const parsed = parseFloat(v);
                    if (!isNaN(parsed)) {
                      updateTaskLog(currentTask.id, { distance: parsed });
                    }
                  }}
                  onBlur={() => {
                    setDistanceInputStr((prev) => {
                      const updated = { ...prev };
                      delete updated[currentTask.id];
                      return updated;
                    });
                  }}
                  keyboardType="decimal-pad"
                  placeholder={currentTask.config.distanceUnit || "km"}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.distanceField}>
                <ThemedText type="muted" style={styles.fieldLabel}>Duration (mm:ss)</ThemedText>
                <TextInput
                  style={[styles.largeInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={durationInputStr[currentTask.id] !== undefined ? durationInputStr[currentTask.id] : (currentLog?.data.durationSeconds ? `${Math.floor(currentLog.data.durationSeconds / 60)}:${(currentLog.data.durationSeconds % 60).toString().padStart(2, "0")}` : "")}
                  onChangeText={(v) => {
                    let cleaned = v.replace(/[^0-9:]/g, "");
                    const colonIdx = cleaned.indexOf(":");
                    if (colonIdx !== -1) {
                      cleaned = cleaned.substring(0, colonIdx + 1) + cleaned.substring(colonIdx + 1).replace(/:/g, "");
                    }
                    setDurationInputStr((prev) => ({ ...prev, [currentTask.id]: cleaned }));
                    if (cleaned === "" || cleaned === ":") {
                      updateTaskLog(currentTask.id, { durationSeconds: 0 });
                      return;
                    }
                    const parts = cleaned.split(":");
                    if (parts.length === 2) {
                      const mins = parseInt(parts[0]) || 0;
                      const secs = Math.min(parseInt(parts[1]) || 0, 59);
                      updateTaskLog(currentTask.id, { durationSeconds: mins * 60 + secs });
                    } else if (parts.length === 1 && parts[0]) {
                      const mins = parseInt(parts[0]) || 0;
                      updateTaskLog(currentTask.id, { durationSeconds: mins * 60 });
                    }
                  }}
                  onBlur={() => {
                    setDurationInputStr((prev) => {
                      const updated = { ...prev };
                      delete updated[currentTask.id];
                      return updated;
                    });
                  }}
                  keyboardType="default"
                  placeholder="mm:ss"
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
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={() => setShowFinishModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
            <Feather name="alert-circle" size={40} color={theme.link} style={styles.modalIcon} />
            <ThemedText type="h2" style={styles.modalTitle}>Some exercises still need your input</ThemedText>
            <Pressable
              onPress={() => setShowFinishModal(false)}
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.link }]}
              testID="button-not-done-yet"
            >
              <ThemedText type="body" style={[styles.modalPrimaryText, { color: theme.buttonText }]}>I'm Not Done Yet</ThemedText>
            </Pressable>
            <Pressable
              onPress={saveAndFinish}
              style={styles.modalSecondaryBtn}
              testID="button-finish-anyway"
            >
              <ThemedText type="secondary" style={{ color: theme.error }}>Finish Session</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPauseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPauseModal(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={() => setShowPauseModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
            <Feather name="pause-circle" size={40} color={theme.link} style={styles.modalIcon} />
            <ThemedText type="h2" style={styles.modalTitle}>Pause Session</ThemedText>
            <ThemedText type="secondary" style={styles.pauseDescription}>
              Your progress will be saved and you can resume later.
            </ThemedText>
            <Pressable
              onPress={() => setShowPauseModal(false)}
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.link }]}
              testID="button-pause-resume"
            >
              <ThemedText type="body" style={[styles.modalPrimaryText, { color: theme.buttonText }]}>Resume</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSaveAndExit}
              style={styles.modalSecondaryBtn}
              testID="button-save-exit"
            >
              <ThemedText type="link">Save & Exit</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleDiscard}
              style={styles.modalSecondaryBtn}
              testID="button-discard-session"
            >
              <ThemedText type="secondary" style={{ color: theme.error }}>Discard</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <Pressable style={[styles.addModalOverlay, { backgroundColor: theme.overlay }]} onPress={() => setShowAddModal(false)}>
          <Pressable style={[styles.addModalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
            <View style={[styles.addModalHandle, { backgroundColor: theme.textMuted }]} />
            <ThemedText type="h2" style={styles.addModalTitle}>Add Exercise</ThemedText>

            <TextInput
              style={[styles.addModalInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Exercise name"
              placeholderTextColor={theme.textMuted}
              value={adhocName}
              onChangeText={setAdhocName}
              autoFocus
              returnKeyType="done"
            />

            <ThemedText type="secondary" style={styles.addModalLabel}>Type</ThemedText>
            <View style={styles.modePills}>
              {(["strength", "distance", "interval", "time", "notes"] as ExerciseMode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setAdhocMode(m)}
                  style={[styles.modePill, { backgroundColor: adhocMode === m ? theme.link : theme.backgroundSecondary }]}
                >
                  <ThemedText
                    type="secondary"
                    style={[styles.modePillText, { color: adhocMode === m ? theme.buttonText : theme.textSecondary }]}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {adhocMode === "strength" ? (
              <>
                <ThemedText type="secondary" style={styles.addModalLabel}>Sets</ThemedText>
                <View style={styles.setCountRow}>
                  <Pressable
                    onPress={() => setAdhocSets((prev) => Math.max(1, prev - 1))}
                    style={[styles.setCountBtn, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="minus" size={18} color={theme.text} />
                  </Pressable>
                  <ThemedText type="h1" style={styles.setCountNum}>{adhocSets}</ThemedText>
                  <Pressable
                    onPress={() => setAdhocSets((prev) => Math.min(10, prev + 1))}
                    style={[styles.setCountBtn, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="plus" size={18} color={theme.text} />
                  </Pressable>
                </View>
              </>
            ) : null}

            <Pressable
              onPress={handleAddAdhocExercise}
              disabled={adhocName.trim().length === 0}
              style={[
                styles.addModalBtn,
                { backgroundColor: adhocName.trim().length > 0 ? theme.link : theme.backgroundSecondary },
              ]}
              testID="button-add-adhoc-exercise"
            >
              <ThemedText
                type="body"
                style={[styles.addModalBtnText, { color: adhocName.trim().length > 0 ? theme.buttonText : theme.textMuted }]}
              >
                Add to Workout
              </ThemedText>
            </Pressable>

            <Pressable onPress={() => setShowAddModal(false)} style={styles.addModalCancel}>
              <ThemedText type="secondary">Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
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
  taskNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  taskName: {
    flex: 1,
  },
  referenceLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
  previousHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: Spacing.xs,
    textAlign: "center",
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
  pauseDescription: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
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
    fontWeight: "700",
    fontSize: 16,
  },
  modalSecondaryBtn: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  setCheckbox: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  addModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  addModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  addModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
    opacity: 0.4,
  },
  addModalTitle: {
    marginBottom: Spacing.lg,
  },
  addModalLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  addModalInput: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  modePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  setCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  setCountBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  setCountNum: {
    minWidth: 40,
    textAlign: "center",
  },
  addModalBtn: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  addModalBtnText: {
    fontWeight: "700",
    fontSize: 16,
  },
  addModalCancel: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});
