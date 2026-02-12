import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { programsStorage, sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskMode } from "@/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TaskDraft {
  id: string;
  name: string;
  mode: TaskMode;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  distanceUnit?: string;
  durationMinutes?: number;
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
}

interface SessionDraft {
  id: string;
  name: string;
  isExpanded: boolean;
  isAddingTask: boolean;
  selectedTaskType: TaskMode | null;
  tasks: TaskDraft[];
}

const TASK_TYPES: { mode: TaskMode; label: string }[] = [
  { mode: "strength", label: "Strength" },
  { mode: "distance", label: "Distance" },
  { mode: "interval", label: "Interval" },
  { mode: "time", label: "Time" },
  { mode: "notes", label: "Notes" },
];

export default function ProgramBuilderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [programName, setProgramName] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [saving, setSaving] = useState(false);

  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskSets, setNewTaskSets] = useState("");
  const [newTaskReps, setNewTaskReps] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  const canFinish =
    programName.trim().length > 0 &&
    sessions.length > 0 &&
    sessions.some((s) => s.tasks.length > 0);

  const getHelperText = () => {
    if (!programName.trim()) return "Enter a plan name to continue";
    if (sessions.length === 0) return "Add at least one day to continue";
    if (!sessions.some((s) => s.tasks.length > 0)) return "Add at least one exercise to continue";
    return "";
  };

  const handleAddSession = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddingSession(true);
    setNewSessionName("");
  };

  const handleSaveSession = () => {
    if (!newSessionName.trim()) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSession: SessionDraft = {
      id: Date.now().toString(),
      name: newSessionName.trim(),
      isExpanded: true,
      isAddingTask: false,
      selectedTaskType: null,
      tasks: [],
    };
    setSessions([...sessions, newSession]);
    setIsAddingSession(false);
    setNewSessionName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCancelSession = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddingSession(false);
    setNewSessionName("");
  };

  const toggleSessionExpanded = (sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(
      sessions.map((s) =>
        s.id === sessionId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );
  };

  const handleStartAddTask = (sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(
      sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isAddingTask: true, selectedTaskType: null }
          : s
      )
    );
    setNewTaskName("");
    setNewTaskSets("");
    setNewTaskReps("");
  };

  const handleSelectTaskType = (sessionId: string, mode: TaskMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(
      sessions.map((s) =>
        s.id === sessionId ? { ...s, selectedTaskType: mode } : s
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveTask = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !session.selectedTaskType || !newTaskName.trim()) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newTask: TaskDraft = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      mode: session.selectedTaskType,
      sets: newTaskSets ? parseInt(newTaskSets) : undefined,
      reps: newTaskReps ? parseInt(newTaskReps) : undefined,
    };

    setSessions(
      sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              tasks: [...s.tasks, newTask],
              isAddingTask: false,
              selectedTaskType: null,
            }
          : s
      )
    );
    setNewTaskName("");
    setNewTaskSets("");
    setNewTaskReps("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCancelTask = (sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(
      sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isAddingTask: false, selectedTaskType: null }
          : s
      )
    );
    setNewTaskName("");
    setNewTaskSets("");
    setNewTaskReps("");
  };

  const handleDeleteTask = (sessionId: string, taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(
      sessions.map((s) =>
        s.id === sessionId
          ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
          : s
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteSession = (sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessions(sessions.filter((s) => s.id !== sessionId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFinish = async () => {
    if (!canFinish) return;

    setSaving(true);
    try {
      const program = await programsStorage.create(programName.trim());

      for (const session of sessions) {
        const template = await sessionTemplatesStorage.create(program.id, session.name);

        for (const task of session.tasks) {
          await taskTemplatesStorage.create(template.id, {
            name: task.name,
            mode: task.mode,
            trackMilestones: false,
            config: {
              sets: task.sets,
              reps: task.reps,
              weight: task.weight,
              targetDistance: task.distance,
              distanceUnit: task.distanceUnit as any,
              workSeconds: task.workSeconds,
              restSeconds: task.restSeconds,
              rounds: task.rounds,
            },
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to create program:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderTaskTypeSelector = (sessionId: string) => (
    <View style={styles.taskTypeSelector}>
      <ThemedText type="body" style={[styles.taskTypeLabel, { color: theme.text }]}>
        Select task type:
      </ThemedText>
      <View style={styles.taskTypeGrid}>
        {TASK_TYPES.map((type) => (
          <Pressable
            key={type.mode}
            style={[
              styles.taskTypeButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={() => handleSelectTaskType(sessionId, type.mode)}
          >
            <ModeIcon mode={type.mode} size={18} color="#4C7DFF" />
            <ThemedText type="body" style={[styles.taskTypeText, { color: theme.text }]}>
              {type.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderTaskForm = (session: SessionDraft) => {
    const isStrength = session.selectedTaskType === "strength";

    return (
      <View style={[styles.taskForm, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText type="body" style={[styles.formLabel, { color: theme.text }]}>
          {session.selectedTaskType ? session.selectedTaskType.charAt(0).toUpperCase() + session.selectedTaskType.slice(1) : ""} Exercise
        </ThemedText>

        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
          value={newTaskName}
          onChangeText={setNewTaskName}
          placeholder="Exercise name (e.g. Bench Press)"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="words"
        />

        {isStrength ? (
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <ThemedText type="body" style={[styles.inputLabel, { color: theme.textSecondary }]}>Sets</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={newTaskSets}
                onChangeText={setNewTaskSets}
                placeholder="3"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputHalf}>
              <ThemedText type="body" style={[styles.inputLabel, { color: theme.textSecondary }]}>Reps</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={newTaskReps}
                onChangeText={setNewTaskReps}
                placeholder="10"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.formActions}>
          <Pressable
            style={[styles.formButton, styles.cancelButton]}
            onPress={() => handleCancelTask(session.id)}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.formButton,
              styles.saveButton,
              { backgroundColor: "#4C7DFF", opacity: newTaskName.trim() ? 1 : 0.5 },
            ]}
            onPress={() => handleSaveTask(session.id)}
            disabled={!newTaskName.trim()}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF" }}>
              Save Task
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSession = (session: SessionDraft) => (
    <View
      key={session.id}
      style={[styles.sessionCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <Pressable
        style={styles.sessionHeader}
        onPress={() => toggleSessionExpanded(session.id)}
      >
        <View style={styles.sessionTitleRow}>
          <Feather
            name={session.isExpanded ? "chevron-down" : "chevron-right"}
            size={20}
            color={theme.text}
          />
          <ThemedText type="body" style={styles.sessionName}>
            {session.name}
          </ThemedText>
          <View style={[styles.taskCount, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {session.tasks.length} {session.tasks.length === 1 ? "exercise" : "exercises"}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={() => handleDeleteSession(session.id)}
          hitSlop={8}
          style={styles.deleteButton}
        >
          <Feather name="trash-2" size={16} color={Colors.dark.error} />
        </Pressable>
      </Pressable>

      {session.isExpanded ? (
        <View style={styles.sessionContent}>
          {session.tasks.length > 0 ? (
            <View style={styles.taskList}>
              {session.tasks.map((task) => (
                <View
                  key={task.id}
                  style={[styles.taskItem, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <View style={styles.taskInfo}>
                    <ModeIcon mode={task.mode} size={14} color="#4C7DFF" />
                    <ThemedText type="body" style={styles.taskName}>
                      {task.name}
                    </ThemedText>
                    {task.sets || task.reps ? (
                      <ThemedText type="body" style={[styles.taskDetails, { color: theme.textSecondary }]}>
                        {task.sets ? `${task.sets} sets` : ""}{task.sets && task.reps ? " x " : ""}{task.reps ? `${task.reps} reps` : ""}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleDeleteTask(session.id, task.id)}
                    hitSlop={8}
                  >
                    <Feather name="x" size={16} color={theme.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {session.isAddingTask ? (
            session.selectedTaskType ? (
              renderTaskForm(session)
            ) : (
              renderTaskTypeSelector(session.id)
            )
          ) : (
            <Pressable
              style={[styles.addTaskButton, { backgroundColor: "#4C7DFF" }]}
              onPress={() => handleStartAddTask(session.id)}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                Add Exercise
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h2" style={styles.sectionTitle}>
            Plan Name
          </ThemedText>
          <TextInput
            style={[styles.programInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            value={programName}
            onChangeText={setProgramName}
            placeholder="My Training Plan"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />
          <ThemedText type="body" style={[styles.helperText, { color: theme.textSecondary }]}>
            You can change this anytime
          </ThemedText>
        </View>

        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h2">Days</ThemedText>
          </View>

          {sessions.length === 0 && !isAddingSession ? (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="calendar" size={32} color={theme.textMuted} />
              <ThemedText type="h3" style={[styles.emptyText, { color: theme.textSecondary }]}>
                No days yet
              </ThemedText>
              <ThemedText type="body" style={[styles.emptyHint, { color: theme.textMuted }]}>
                Add days like "Push Day" or "Cardio"
              </ThemedText>
            </View>
          ) : null}

          {sessions.map(renderSession)}

          {isAddingSession ? (
            <View style={[styles.addSessionCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="body" style={[styles.addSessionLabel, { color: theme.text }]}>
                Day Name
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                value={newSessionName}
                onChangeText={setNewSessionName}
                placeholder="e.g. Push Day, Legs, Cardio"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
                autoFocus
              />
              <View style={styles.formActions}>
                <Pressable
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={handleCancelSession}
                >
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.formButton,
                    styles.saveButton,
                    { backgroundColor: "#4C7DFF", opacity: newSessionName.trim() ? 1 : 0.5 },
                  ]}
                  onPress={handleSaveSession}
                  disabled={!newSessionName.trim()}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                    Save Day
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.addSessionButton, { backgroundColor: "#4C7DFF" }]}
              onPress={handleAddSession}
            >
              <Feather name="plus-circle" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                Add Day
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        {!canFinish ? (
          <ThemedText type="body" style={[styles.bottomHelper, { color: theme.textSecondary }]}>
            {getHelperText()}
          </ThemedText>
        ) : null}
        <Button
          onPress={handleFinish}
          disabled={!canFinish || saving}
          style={styles.finishButton}
        >
          {saving ? "Creating..." : "Finish & Start Training"}
        </Button>
      </View>
    </KeyboardAvoidingView>
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
    gap: Spacing.lg,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  programInput: {
    fontSize: 16,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontFamily: "Inter_500Medium",
  },
  helperText: {
    marginTop: Spacing.xs,
  },
  sessionsSection: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    marginTop: Spacing.sm,
  },
  emptyHint: {
    textAlign: "center",
  },
  sessionCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  sessionName: {
    fontWeight: "600",
    flex: 1,
  },
  taskCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  sessionContent: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  taskList: {
    gap: Spacing.xs,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  taskName: {
    flex: 1,
  },
  taskDetails: {
    fontSize: 12,
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  taskTypeSelector: {
    gap: Spacing.sm,
  },
  taskTypeLabel: {
    marginBottom: Spacing.xs,
  },
  taskTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  taskTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  taskTypeText: {
    fontWeight: "500",
  },
  taskForm: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  formLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: 14,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    fontSize: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  formButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelButton: {},
  saveButton: {},
  addSessionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  addSessionLabel: {
    fontWeight: "500",
  },
  addSessionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  bottomHelper: {
    textAlign: "center",
  },
  finishButton: {
    width: "100%",
  },
});
