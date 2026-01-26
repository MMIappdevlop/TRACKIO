import React, { useState, useCallback, useMemo } from "react";
import { View, FlatList, StyleSheet, Pressable, RefreshControl, TextInput, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { SessionTemplateCard } from "@/components/SessionTemplateCard";
import { InputModal } from "@/components/InputModal";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms, useSessionTemplates, useSettings } from "@/hooks/useData";
import { taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import type { TaskTemplate } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList & RootStackParamList & ProfileStackParamList>;

export default function TrainingHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { programs, activeProgram, loading: programsLoading, refresh: refreshPrograms, createProgram } = usePrograms();
  const { templates, loading: templatesLoading, refresh: refreshTemplates, createTemplate } = useSessionTemplates(activeProgram?.id || null);
  const { settings, updateSettings, refresh: refreshSettings } = useSettings();

  const [allTasks, setAllTasks] = useState<TaskTemplate[]>([]);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [isSettingName, setIsSettingName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPrograms();
      refreshTemplates();
      refreshSettings();
      loadAllTasks();
    }, [activeProgram?.id])
  );

  const loadAllTasks = async () => {
    const tasks = await taskTemplatesStorage.getAll();
    setAllTasks(tasks);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPrograms(), refreshTemplates(), refreshSettings(), loadAllTasks()]);
    setRefreshing(false);
  };

  const handleSaveName = async () => {
    if (!userName.trim()) return;
    setIsSettingName(true);
    await updateSettings({ userName: userName.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSettingName(false);
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
    if (!activeProgram) return;
    navigation.navigate("SessionTemplateDetail", {
      templateId: template.id,
      templateName: template.name,
      programId: activeProgram.id,
      programName: activeProgram.name,
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

  const renderWelcome = () => {
    const hasUserName = settings?.userName && settings.userName.trim().length > 0;

    return (
      <View style={styles.welcomeContainer}>
        <View style={[styles.welcomeCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h1" style={styles.welcomeTitle}>
            {hasUserName ? `Hey, ${settings.userName}` : "Welcome to Trakio"}
          </ThemedText>
          <ThemedText type="secondary" style={styles.welcomeSubtitle}>
            Your training tracker
          </ThemedText>

          {!hasUserName ? (
            <View style={styles.nameInputSection}>
              <ThemedText type="body" style={styles.nameLabel}>What should we call you?</ThemedText>
              <View style={styles.nameInputRow}>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Your name"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={handleSaveName}
                  disabled={!userName.trim() || isSettingName}
                  style={[
                    styles.saveNameButton,
                    { backgroundColor: userName.trim() ? Colors.dark.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="check" size={20} color={userName.trim() ? "#FFF" : theme.textMuted} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.getStartedSection, !hasUserName && styles.sectionDisabled]}>
          <ThemedText type="h2" style={[styles.sectionLabel, !hasUserName && { color: theme.textMuted }]}>Get Started</ThemedText>
          <ThemedText type="secondary" style={[styles.getStartedText, !hasUserName && { color: theme.textMuted }]}>
            Bring your own workout program or create one from scratch
          </ThemedText>

          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => navigation.navigate("ProgramBuilder" as any)}
              style={[styles.actionCard, { backgroundColor: theme.backgroundDefault }]}
              disabled={!hasUserName}
            >
              <View style={[styles.actionIcon, { backgroundColor: hasUserName ? "#4C7DFF" : theme.textMuted }]}>
                <Feather name="plus" size={24} color={hasUserName ? "#FFFFFF" : theme.backgroundDefault} />
              </View>
              <ThemedText type="h4" style={!hasUserName ? { color: theme.textMuted } : undefined}>Create Program</ThemedText>
              <ThemedText type="muted" style={styles.actionDescription}>
                Start fresh with a new program
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("ImportProgram" as any)}
              style={[styles.actionCard, { backgroundColor: theme.backgroundDefault }]}
              disabled={!hasUserName}
            >
              <View style={[styles.actionIcon, { backgroundColor: hasUserName ? Colors.dark.success + "20" : theme.textMuted }]}>
                <Feather name="upload" size={24} color={hasUserName ? Colors.dark.success : theme.backgroundDefault} />
              </View>
              <ThemedText type="h4" style={!hasUserName ? { color: theme.textMuted } : undefined}>Import Plan</ThemedText>
              <ThemedText type="muted" style={styles.actionDescription}>
                From CSV or Excel file
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const emptySessionsContent = useMemo(() => (
    <View style={styles.emptySessionsContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.linkBackground }]}>
        <Feather name="clipboard" size={32} color={theme.link} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>No Sessions</ThemedText>
      <ThemedText type="secondary" style={styles.emptyDescription}>
        Add session templates to this program
      </ThemedText>
      <Button onPress={() => setShowCreateSession(true)} style={styles.addSessionButton}>
        Add Session
      </Button>
    </View>
  ), [theme]);

  const renderEmpty = () => {
    if (loading) return null;

    if (!activeProgram) {
      return renderWelcome();
    }

    return emptySessionsContent;
  };

  if (!activeProgram && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing["4xl"] }]}
        >
          {renderWelcome()}
        </ScrollView>
        <InputModal
          visible={showCreateProgram}
          title="New Program"
          placeholder="Program name"
          submitLabel="Create"
          onSubmit={handleCreateProgram}
          onClose={() => setShowCreateProgram(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SessionTemplateCard
            template={item}
            tasks={allTasks.filter((t) => t.sessionTemplateId === item.id)}
            onPress={() => handleStartSession(item)}
            onLongPress={() => handleEditSession(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={emptySessionsContent}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
          templates.length === 0 && styles.emptyContent,
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
  welcomeContainer: {
    flex: 1,
  },
  welcomeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    marginBottom: 0,
  },
  nameInputSection: {
    marginTop: Spacing.xl,
  },
  nameLabel: {
    marginBottom: Spacing.sm,
  },
  nameInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  saveNameButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedSection: {
    marginBottom: Spacing.xl,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionLabel: {
    marginBottom: Spacing.xs,
  },
  getStartedText: {
    marginBottom: Spacing.lg,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  actionDescription: {
    marginTop: Spacing.xs,
  },
  emptySessionsContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  addSessionButton: {
    minWidth: 160,
  },
});
