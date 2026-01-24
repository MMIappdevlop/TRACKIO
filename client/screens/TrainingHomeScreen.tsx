import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { SessionTemplateCard } from "@/components/SessionTemplateCard";
import { InputModal } from "@/components/InputModal";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms, useSessionTemplates, useTaskTemplates } from "@/hooks/useData";
import { taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskTemplate } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList & RootStackParamList>;

export default function TrainingHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { programs, activeProgram, loading: programsLoading, refresh: refreshPrograms, createProgram } = usePrograms();
  const { templates, loading: templatesLoading, refresh: refreshTemplates, createTemplate } = useSessionTemplates(activeProgram?.id || null);

  const [allTasks, setAllTasks] = useState<TaskTemplate[]>([]);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPrograms();
      refreshTemplates();
      loadAllTasks();
    }, [activeProgram?.id])
  );

  const loadAllTasks = async () => {
    const tasks = await taskTemplatesStorage.getAll();
    setAllTasks(tasks);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPrograms(), refreshTemplates(), loadAllTasks()]);
    setRefreshing(false);
  };

  const handleCreateProgram = async (name: string) => {
    await createProgram(name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCreateSession = async (name: string) => {
    await createTemplate(name);
    await loadAllTasks();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleStartSession = (template: typeof templates[0]) => {
    if (!activeProgram) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SessionRun", {
      sessionTemplateId: template.id,
      sessionTemplateName: template.name,
      programId: activeProgram.id,
      programName: activeProgram.name,
    });
  };

  const handleEditSession = (template: typeof templates[0]) => {
    navigation.navigate("SessionTemplateDetail", {
      templateId: template.id,
      templateName: template.name,
    });
  };

  const loading = programsLoading || templatesLoading;

  const renderHeader = () => (
    <View style={styles.header}>
      {activeProgram ? (
        <Pressable
          style={styles.programSelector}
          onPress={() => navigation.navigate("ProgramList")}
        >
          <View style={styles.programInfo}>
            <ThemedText type="muted" style={styles.activeLabel}>
              Active Program
            </ThemedText>
            <View style={styles.programNameRow}>
              <ThemedText type="h2">{activeProgram.name}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </View>
        </Pressable>
      ) : null}

      {templates.length > 0 ? (
        <View style={styles.sectionHeader}>
          <ThemedText type="h2">Sessions</ThemedText>
          <Pressable
            onPress={() => setShowCreateSession(true)}
            style={[styles.addButton, { backgroundColor: theme.linkBackground }]}
          >
            <Feather name="plus" size={18} color={theme.link} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    if (!activeProgram) {
      return (
        <EmptyState
          image={require("../../assets/images/empty-training.png")}
          title="No Programs Yet"
          description="Create your first training program to start logging workouts"
          actionLabel="Create Program"
          onAction={() => setShowCreateProgram(true)}
        />
      );
    }

    return (
      <EmptyState
        icon="clipboard"
        title="No Sessions"
        description="Add session templates to this program"
        actionLabel="Add Session"
        onAction={() => setShowCreateSession(true)}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionTemplateCard
            template={item}
            tasks={allTasks.filter((t) => t.sessionTemplateId === item.id)}
            onPress={() => handleStartSession(item)}
            onLongPress={() => handleEditSession(item)}
          />
        )}
        ListHeaderComponent={activeProgram ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
          templates.length === 0 && !activeProgram && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
          />
        }
      />

      <InputModal
        visible={showCreateProgram}
        title="New Program"
        placeholder="Program name"
        submitLabel="Create"
        onSubmit={handleCreateProgram}
        onClose={() => setShowCreateProgram(false)}
      />

      <InputModal
        visible={showCreateSession}
        title="New Session"
        placeholder="Session name"
        submitLabel="Create"
        onSubmit={handleCreateSession}
        onClose={() => setShowCreateSession(false)}
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
  header: {
    marginBottom: Spacing.lg,
  },
  programSelector: {
    marginBottom: Spacing.xl,
  },
  programInfo: {},
  activeLabel: {
    marginBottom: 2,
  },
  programNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
