import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { programsStorage, sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskMode } from "@/types";
import { SessionCard } from "./program-builder/SessionCard";
import type { TaskDraft, SessionDraft } from "./program-builder/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
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

          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              theme={theme}
              onToggleExpand={toggleSessionExpanded}
              onDeleteSession={handleDeleteSession}
              onStartAddTask={handleStartAddTask}
              onSelectTaskType={handleSelectTaskType}
              onSaveTask={handleSaveTask}
              onCancelTask={handleCancelTask}
              onDeleteTask={handleDeleteTask}
              newTaskName={newTaskName}
              setNewTaskName={setNewTaskName}
              newTaskSets={newTaskSets}
              setNewTaskSets={setNewTaskSets}
              newTaskReps={newTaskReps}
              setNewTaskReps={setNewTaskReps}
            />
          ))}

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
                    { backgroundColor: theme.link, opacity: newSessionName.trim() ? 1 : 0.5 },
                  ]}
                  onPress={handleSaveSession}
                  disabled={!newSessionName.trim()}
                >
                  <ThemedText type="body" style={{ color: theme.buttonText }}>
                    Save Day
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.addSessionButton, { backgroundColor: theme.link }]}
              onPress={handleAddSession}
            >
              <Feather name="plus-circle" size={20} color={theme.buttonText} />
              <ThemedText type="body" style={{ color: theme.buttonText }}>
                Add Day
              </ThemedText>
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>

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
  input: {
    fontSize: 14,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
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
