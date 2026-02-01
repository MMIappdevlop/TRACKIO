import React, { useState, useCallback, useEffect } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { MoveExerciseModal } from "@/components/MoveExerciseModal";
import { useTheme } from "@/hooks/useTheme";
import { useTaskTemplates } from "@/hooks/useData";
import { sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate, DayOfWeek, SessionTemplate } from "@/types";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type RoutePropType = RouteProp<TrainingStackParamList, "SessionTemplateDetail">;
type NavigationProp = NativeStackNavigationProp<TrainingStackParamList & RootStackParamList>;

export default function SessionTemplateDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { templateId, templateName, programId, programName } = route.params;

  const { tasks, loading, refresh, deleteTask } = useTaskTemplates(templateId);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [allDays, setAllDays] = useState<SessionTemplate[]>([]);
  const [movingExercise, setMovingExercise] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    const loadSessionData = async () => {
      const session = await sessionTemplatesStorage.getById(templateId);
      if (session?.days) {
        setSelectedDays(session.days);
      }
      const days = await sessionTemplatesStorage.getByProgramId(programId);
      setAllDays(days);
    };
    loadSessionData();
  }, [templateId, programId]);

  const handleToggleDay = async (day: DayOfWeek) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    setSelectedDays(newDays);
    await sessionTemplatesStorage.update(templateId, { days: newDays });
  };

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SessionRun", {
      sessionTemplateId: templateId,
      sessionTemplateName: templateName,
      programId,
      programName,
    });
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleAddTask = () => {
    navigation.navigate("AddTask", { sessionTemplateId: templateId });
  };

  const handleEditTask = (task: TaskTemplate) => {
    navigation.navigate("AddTask", { sessionTemplateId: templateId, taskId: task.id });
  };

  const handleMoveTask = (task: TaskTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMovingExercise(task);
  };

  const handleDeleteTask = (task: TaskTemplate) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${task.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTask(task.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleMoveExercise = async (targetDayId: string) => {
    if (!movingExercise) return;
    
    await taskTemplatesStorage.moveToDay(movingExercise.id, targetDayId);
    setMovingExercise(null);
    await refresh();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      const group = task.groupLabel || "";
      if (!acc[group]) acc[group] = [];
      acc[group].push(task);
      return acc;
    },
    {} as Record<string, TaskTemplate[]>
  );

  const sortedGroups = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });

  const renderEmpty = () => (
    <EmptyState
      icon="plus-circle"
      title="No Exercises"
      description="Add exercises and activities to this day"
      actionLabel="Add Exercise"
      onAction={handleAddTask}
    />
  );

  const renderDayPicker = () => (
    <View style={[styles.dayPickerCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.dayPickerHeader}>
        <Feather name="calendar" size={16} color={theme.textSecondary} />
        <ThemedText type="secondary">Schedule Days</ThemedText>
      </View>
      <View style={styles.dayPickerRow}>
        {DAY_LABELS.map((label, index) => {
          const day = index as DayOfWeek;
          const isSelected = selectedDays.includes(day);
          return (
            <Pressable
              key={index}
              onPress={() => handleToggleDay(day)}
              style={[
                styles.dayButton,
                { 
                  backgroundColor: isSelected ? theme.link : theme.backgroundSecondary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={[
                  styles.dayLabel,
                  { color: isSelected ? "#FFF" : theme.textSecondary },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {selectedDays.length > 0 ? (
        <ThemedText type="muted" style={styles.dayHint}>
          {selectedDays.map((d) => DAY_NAMES[d]).join(", ")}
        </ThemedText>
      ) : (
        <ThemedText type="muted" style={styles.dayHint}>
          No days assigned - available anytime
        </ThemedText>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={sortedGroups}
        keyExtractor={(item) => item || "ungrouped"}
        ListHeaderComponent={renderDayPicker}
        renderItem={({ item: group }) => (
          <View style={styles.groupSection}>
            {group ? (
              <View style={[styles.groupHeader, { backgroundColor: theme.linkBackground }]}>
                <Feather name="layers" size={14} color={theme.link} />
                <ThemedText type="small" style={{ color: theme.link }}>
                  {group}
                </ThemedText>
              </View>
            ) : null}
            {groupedTasks[group].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => handleEditTask(task)}
                onMove={allDays.length > 1 ? () => handleMoveTask(task) : undefined}
                onDelete={() => handleDeleteTask(task)}
              />
            ))}
          </View>
        )}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          tasks.length === 0 && styles.emptyContent,
        ]}
        ListFooterComponent={
          tasks.length > 0 ? (
            <View style={styles.footerContainer}>
              <Pressable
                onPress={handleAddTask}
                style={[styles.createButton, { backgroundColor: theme.linkBackground }]}
              >
                <Feather name="plus" size={20} color={theme.link} />
                <ThemedText type="link">Add Exercise</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleStartWorkout}
                testID="button-start-workout"
                style={[styles.startButton, { backgroundColor: theme.link }]}
              >
                <Feather name="play" size={20} color="#FFF" />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>
                  Start Workout
                </ThemedText>
              </Pressable>
            </View>
          ) : null
        }
      />

      <MoveExerciseModal
        visible={movingExercise !== null}
        exerciseName={movingExercise?.name || ""}
        currentDayId={templateId}
        days={allDays}
        onMove={handleMoveExercise}
        onClose={() => setMovingExercise(null)}
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
  groupSection: {
    marginBottom: Spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  footerContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  dayPickerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dayPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayHint: {
    textAlign: "center",
    marginTop: Spacing.md,
    fontSize: 12,
  },
});
