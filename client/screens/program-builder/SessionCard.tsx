import React from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TaskMode } from "@/types";
import { SessionDraft, TASK_TYPES } from "./types";

interface SessionCardProps {
  session: SessionDraft;
  theme: {
    text: string;
    textSecondary: string;
    textMuted: string;
    backgroundDefault: string;
    backgroundSecondary: string;
    link: string;
    buttonText: string;
  };
  onToggleExpand: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartAddTask: (sessionId: string) => void;
  onSelectTaskType: (sessionId: string, mode: TaskMode) => void;
  onSaveTask: (sessionId: string) => void;
  onCancelTask: (sessionId: string) => void;
  onDeleteTask: (sessionId: string, taskId: string) => void;
  newTaskName: string;
  setNewTaskName: (value: string) => void;
  newTaskSets: string;
  setNewTaskSets: (value: string) => void;
  newTaskReps: string;
  setNewTaskReps: (value: string) => void;
}

function TaskTypeSelector({
  sessionId,
  theme,
  onSelectTaskType,
}: {
  sessionId: string;
  theme: SessionCardProps["theme"];
  onSelectTaskType: (sessionId: string, mode: TaskMode) => void;
}) {
  return (
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
            onPress={() => onSelectTaskType(sessionId, type.mode)}
          >
            <ModeIcon mode={type.mode} size={18} color={theme.link} />
            <ThemedText type="body" style={[styles.taskTypeText, { color: theme.text }]}>
              {type.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TaskForm({
  session,
  theme,
  newTaskName,
  setNewTaskName,
  newTaskSets,
  setNewTaskSets,
  newTaskReps,
  setNewTaskReps,
  onSaveTask,
  onCancelTask,
}: {
  session: SessionDraft;
  theme: SessionCardProps["theme"];
  newTaskName: string;
  setNewTaskName: (value: string) => void;
  newTaskSets: string;
  setNewTaskSets: (value: string) => void;
  newTaskReps: string;
  setNewTaskReps: (value: string) => void;
  onSaveTask: (sessionId: string) => void;
  onCancelTask: (sessionId: string) => void;
}) {
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
          onPress={() => onCancelTask(session.id)}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.formButton,
            styles.saveButton,
            { backgroundColor: theme.link, opacity: newTaskName.trim() ? 1 : 0.5 },
          ]}
          onPress={() => onSaveTask(session.id)}
          disabled={!newTaskName.trim()}
        >
          <ThemedText type="body" style={{ color: theme.buttonText }}>
            Save Task
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export function SessionCard({
  session,
  theme,
  onToggleExpand,
  onDeleteSession,
  onStartAddTask,
  onSelectTaskType,
  onSaveTask,
  onCancelTask,
  onDeleteTask,
  newTaskName,
  setNewTaskName,
  newTaskSets,
  setNewTaskSets,
  newTaskReps,
  setNewTaskReps,
}: SessionCardProps) {
  return (
    <View
      style={[styles.sessionCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <Pressable
        style={styles.sessionHeader}
        onPress={() => onToggleExpand(session.id)}
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
          onPress={() => onDeleteSession(session.id)}
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
                    <ModeIcon mode={task.mode} size={14} color={theme.link} />
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
                    onPress={() => onDeleteTask(session.id, task.id)}
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
              <TaskForm
                session={session}
                theme={theme}
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
                newTaskSets={newTaskSets}
                setNewTaskSets={setNewTaskSets}
                newTaskReps={newTaskReps}
                setNewTaskReps={setNewTaskReps}
                onSaveTask={onSaveTask}
                onCancelTask={onCancelTask}
              />
            ) : (
              <TaskTypeSelector
                sessionId={session.id}
                theme={theme}
                onSelectTaskType={onSelectTaskType}
              />
            )
          ) : (
            <Pressable
              style={[styles.addTaskButton, { backgroundColor: theme.link }]}
              onPress={() => onStartAddTask(session.id)}
            >
              <Feather name="plus" size={16} color={theme.buttonText} />
              <ThemedText type="body" style={{ color: theme.buttonText }}>
                Add Exercise
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
