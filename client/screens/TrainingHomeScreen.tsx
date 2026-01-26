import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl, TextInput, ScrollView, Keyboard, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms, useSessionTemplates, useSettings, useCompletedSessions, useWeeklyStats } from "@/hooks/useData";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { SessionTemplate } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList & RootStackParamList>;

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function TrainingHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { activeProgram, loading: programsLoading, refresh: refreshPrograms } = usePrograms();
  const { templates, refresh: refreshTemplates } = useSessionTemplates(activeProgram?.id || null);
  const { settings, updateSettings, refresh: refreshSettings } = useSettings();
  const { sessions, refresh: refreshSessions } = useCompletedSessions();
  const { stats: weeklyStats, refresh: refreshWeeklyStats } = useWeeklyStats();

  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [isSettingName, setIsSettingName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPrograms();
      refreshTemplates();
      refreshSettings();
      refreshSessions();
      refreshWeeklyStats();
    }, [activeProgram?.id])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPrograms(), refreshTemplates(), refreshSettings(), refreshSessions(), refreshWeeklyStats()]);
    setRefreshing(false);
  };

  const handleSaveName = async () => {
    if (!userName.trim()) return;
    Keyboard.dismiss();
    setIsSettingName(true);
    try {
      await updateSettings({ userName: userName.trim() });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error saving name:", error);
    } finally {
      setIsSettingName(false);
    }
  };

  const handleStartSession = (template: SessionTemplate) => {
    if (!activeProgram) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SessionRun", {
      sessionTemplateId: template.id,
      sessionTemplateName: template.name,
      programId: activeProgram.id,
      programName: activeProgram.name,
    });
  };

  const hasUserName = settings?.userName && settings.userName.trim().length > 0;
  const lastSession = sessions.length > 0 ? sessions[0] : null;
  const todaySession = templates.length > 0 ? templates[0] : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing["4xl"] },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.link} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            {hasUserName ? (
              <>
                <ThemedText type="h1" style={styles.greeting}>
                  {getGreeting()}, {settings.userName}
                </ThemedText>
                {activeProgram ? (
                  <ThemedText type="secondary" style={styles.programLabel}>
                    Program: {activeProgram.name}
                  </ThemedText>
                ) : null}
              </>
            ) : (
              <>
                <ThemedText type="h1" style={styles.greeting}>Welcome to Trackio</ThemedText>
                <ThemedText type="secondary" style={styles.programLabel}>
                  Your training tracker
                </ThemedText>
              </>
            )}
          </View>
          <Pressable
            onPress={() => navigation.navigate("Settings" as any)}
            style={[styles.settingsButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="settings" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Name Input for new users */}
        {!hasUserName ? (
          <View style={[styles.nameCard, { backgroundColor: theme.backgroundDefault }]}>
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
              />
              <Pressable
                onPress={handleSaveName}
                disabled={!userName.trim() || isSettingName}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  styles.saveNameButton,
                  { 
                    backgroundColor: userName.trim() ? theme.link : theme.backgroundSecondary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="check" size={20} color={userName.trim() ? "#FFF" : theme.textMuted} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Today's Session Card */}
        <View style={[styles.sessionCard, { backgroundColor: theme.backgroundDefault }, !hasUserName && styles.cardDisabled]}>
          {todaySession && activeProgram ? (
            <>
              <ThemedText type="h2" style={styles.sessionName}>{todaySession.name}</ThemedText>
              <ThemedText type="secondary" style={styles.sessionMeta}>
                {templates.length} session{templates.length !== 1 ? "s" : ""} available
              </ThemedText>
              <Button
                onPress={() => handleStartSession(todaySession)}
                style={styles.startButton}
                disabled={!hasUserName}
              >
                Start Workout
              </Button>
            </>
          ) : activeProgram ? (
            <>
              <ThemedText type="secondary" style={styles.noSessionText}>
                No sessions in this program yet
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("SessionTemplateDetail" as any, { programId: activeProgram.id })}
                style={styles.startButton}
                disabled={!hasUserName}
              >
                Add Session
              </Button>
            </>
          ) : (
            <>
              <ThemedText type="secondary" style={styles.noSessionText}>
                No program selected
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("ProgramBuilder" as any)}
                style={styles.startButton}
                disabled={!hasUserName}
              >
                Create Program
              </Button>
              <Pressable
                onPress={() => navigation.navigate("ImportProgram" as any)}
                style={styles.secondaryAction}
                disabled={!hasUserName}
              >
                <ThemedText type="link" style={!hasUserName ? { color: theme.textMuted } : undefined}>
                  Or import a plan
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, !hasUserName && styles.cardDisabled]}>
          <Pressable
            onPress={() => navigation.navigate("ProgramBuilder" as any)}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
            disabled={!hasUserName}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.link + "20" }]}>
              <Feather name="plus" size={20} color={theme.link} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>New Program</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ProgramList")}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
            disabled={!hasUserName}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.success + "20" }]}>
              <Feather name="folder" size={20} color={Colors.dark.success} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>Programs</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ImportProgram" as any)}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
            disabled={!hasUserName}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.warning + "20" }]}>
              <Feather name="upload" size={20} color={Colors.dark.warning} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>Import</ThemedText>
          </Pressable>
        </View>

        {/* Last Workout Summary */}
        {lastSession && hasUserName ? (
          <View style={[styles.lastWorkoutCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.lastWorkoutHeader}>
              <ThemedText type="muted">Last Workout</ThemedText>
              <ThemedText type="muted">{formatRelativeDate(lastSession.completedAt)}</ThemedText>
            </View>
            <ThemedText type="h4" style={styles.lastWorkoutName}>{lastSession.sessionTemplateName}</ThemedText>
            <View style={styles.lastWorkoutStats}>
              <View style={styles.lastWorkoutStat}>
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText type="secondary">{formatDuration(lastSession.durationSeconds)}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {/* Motivation / Status Line */}
        {hasUserName && weeklyStats && weeklyStats.sessionsCount > 0 ? (
          <View style={styles.motivationSection}>
            <ThemedText type="secondary" style={styles.motivationText}>
              {weeklyStats.sessionsCount} workout{weeklyStats.sessionsCount !== 1 ? "s" : ""} this week
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
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
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
  programLabel: {},
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nameCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  saveNameButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  cardDisabled: {
    opacity: 0.5,
  },
  sessionName: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  sessionMeta: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  noSessionText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  startButton: {
    width: "100%",
  },
  secondaryAction: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  lastWorkoutCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  lastWorkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  lastWorkoutName: {
    marginBottom: Spacing.sm,
  },
  lastWorkoutStats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  lastWorkoutStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  motivationSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  motivationText: {
    fontStyle: "italic",
  },
});
