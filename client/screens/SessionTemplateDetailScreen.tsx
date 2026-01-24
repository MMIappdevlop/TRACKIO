import React, { useState, useCallback } from "react";
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
import { useTheme } from "@/hooks/useTheme";
import { useTaskTemplates } from "@/hooks/useData";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate } from "@/types";

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

  const handleDeleteTask = (task: TaskTemplate) => {
    Alert.alert(
      "Delete Task",
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
      title="No Tasks"
      description="Add exercises and activities to this session"
      actionLabel="Add Task"
      onAction={handleAddTask}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={sortedGroups}
        keyExtractor={(item) => item || "ungrouped"}
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
                onLongPress={() => handleDeleteTask(task)}
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
                <ThemedText type="link">Add Task</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleStartWorkout}
                testID="button-start-workout"
                style={[styles.startButton, { backgroundColor: Colors.dark.primary }]}
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
});
