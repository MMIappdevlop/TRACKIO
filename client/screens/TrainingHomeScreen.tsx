import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl, ScrollView, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { CalorieSetupModal } from "@/components/CalorieSetupModal";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms, useSessionTemplates, useSettings, useCompletedSessions, useWeeklyStats } from "@/hooks/useData";
import { activeSessionStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { SessionTemplate, ActiveSession } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList & RootStackParamList>;

interface GreetingEntry { text: string; emoji: string; hours?: [number, number]; isBazinga?: boolean; }
const GREETINGS: GreetingEntry[] = [
  { text: "Good morning",               emoji: "💪", hours: [5, 11]  },
  { text: "Good afternoon",             emoji: "☀️",  hours: [12, 16] },
  { text: "Good evening",               emoji: "🌙", hours: [17, 23] },
  { text: "Hey there",                  emoji: "👋" },
  { text: "Hello, buddy",               emoji: "😎" },
  { text: "What's up",                  emoji: "⚡" },
  { text: "Welcome back",               emoji: "🏆" },
  { text: "Ready to crush it",          emoji: "💥" },
  { text: "Looking strong",             emoji: "🔥" },
  { text: "Let's go",                   emoji: "🚀" },
  { text: "How you doin'?",             emoji: "😉" },
  { text: "Welcome to the real world!", emoji: "👩🏻‍🍳" },
  { text: "What's new?",                emoji: "👀" },
  { text: "Bazinga!",                   emoji: "🚂", isBazinga: true },
];
function pickGreeting(): GreetingEntry {
  const hour = new Date().getHours();
  const eligible = GREETINGS.filter(g => !g.hours || (hour >= g.hours[0] && hour <= g.hours[1]));
  return eligible[Math.floor(Math.random() * eligible.length)];
}
const SESSION_GREETING = pickGreeting();

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
  const { settings, refresh: refreshSettings } = useSettings();
  const { sessions, refresh: refreshSessions } = useCompletedSessions();
  const { stats: weeklyStats, refresh: refreshWeeklyStats } = useWeeklyStats();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [showCalorieSetup, setShowCalorieSetup] = useState(false);
  const [savedSession, setSavedSession] = useState<ActiveSession | null>(null);
  const [bazingaRevealed, setBazingaRevealed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPrograms();
      refreshTemplates();
      refreshSettings();
      refreshSessions();
      refreshWeeklyStats();
      activeSessionStorage.get().then(setSavedSession);
    }, [activeProgram?.id])
  );

  useFocusEffect(
    useCallback(() => {
      if (
        activeProgram &&
        settings &&
        !settings.calorieSetupDismissed &&
        !settings.calorieTrackingEnabled
      ) {
        setShowCalorieSetup(true);
      }
    }, [activeProgram?.id, settings?.calorieSetupDismissed, settings?.calorieTrackingEnabled])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshPrograms(), refreshTemplates(), refreshSettings(), refreshSessions(), refreshWeeklyStats()]);
    setRefreshing(false);
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

  const handleResumeSession = () => {
    if (!savedSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SessionRun", {
      sessionTemplateId: savedSession.sessionTemplateId,
      sessionTemplateName: savedSession.sessionTemplateName,
      programId: savedSession.programId,
      programName: savedSession.programName,
      resumeSession: true,
    });
  };

  const handleDiscardSession = async () => {
    await activeSessionStorage.clear();
    setSavedSession(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const lastSession = sessions.length > 0 ? sessions[0] : null;
  
  const todayDayOfWeek = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  
  // Always show all days, but start on today's assigned day if available
  const safeIndex = Math.min(selectedSessionIndex, Math.max(0, templates.length - 1));
  const selectedSession = templates.length > 0 ? templates[safeIndex] : null;
  const isSelectedForToday = selectedSession?.days?.includes(todayDayOfWeek);

  const handlePrevSession = () => {
    if (templates.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSessionIndex((prev) => (prev === 0 ? templates.length - 1 : prev - 1));
    }
  };

  const handleNextSession = () => {
    if (templates.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSessionIndex((prev) => (prev === templates.length - 1 ? 0 : prev + 1));
    }
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
            {SESSION_GREETING.isBazinga && !bazingaRevealed ? (
              <Pressable onPress={() => { setBazingaRevealed(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Text style={styles.greetingEmoji}>{SESSION_GREETING.emoji}</Text>
                <ThemedText type="h1" style={[styles.greeting, styles.blurredText]}>
                  {SESSION_GREETING.text}
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <Text style={styles.greetingEmoji}>{SESSION_GREETING.emoji}</Text>
                <ThemedText type="h1" style={styles.greeting}>
                  {SESSION_GREETING.text}
                </ThemedText>
              </>
            )}
            {activeProgram ? (
              <ThemedText type="secondary">
                Active Plan: {activeProgram.name}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Resume Banner */}
        {savedSession ? (
          <View style={[styles.resumeBanner, { backgroundColor: theme.backgroundDefault }]} testID="resume-session-banner">
            <View style={styles.resumeInfo}>
              <View style={styles.resumeHeader}>
                <View style={[styles.resumeDot, { backgroundColor: Colors.dark.effort }]} />
                <ThemedText type="secondary" style={styles.resumeLabel}>In Progress</ThemedText>
              </View>
              <ThemedText type="h3" style={styles.resumeName}>{savedSession.sessionTemplateName}</ThemedText>
              <ThemedText type="muted" style={styles.resumePlan}>{savedSession.programName}</ThemedText>
            </View>
            <View style={styles.resumeActions}>
              <Button onPress={handleResumeSession} style={styles.resumeButton} testID="button-resume-session">
                Resume
              </Button>
              <Pressable onPress={handleDiscardSession} style={styles.discardButton} testID="button-discard-session">
                <Feather name="trash-2" size={16} color={Colors.dark.error} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Today's Session Card */}
        <View style={[styles.sessionCard, { backgroundColor: theme.backgroundDefault }]}>
          {selectedSession && activeProgram ? (
            <>
              <View style={styles.sessionPicker}>
                <Pressable 
                  onPress={handlePrevSession} 
                  style={[styles.arrowButton, templates.length <= 1 && styles.arrowButtonDisabled]}
                  disabled={templates.length <= 1}
                >
                  <Feather name="chevron-left" size={28} color={templates.length > 1 ? theme.link : theme.textMuted} />
                </Pressable>
                <View style={styles.sessionNameContainer}>
                  <ThemedText type="h2" style={styles.sessionName}>{selectedSession.name}</ThemedText>
                  <ThemedText type="muted" style={styles.sessionCounter}>
                    {isSelectedForToday ? "Scheduled for today" : `${safeIndex + 1} of ${templates.length}`}
                  </ThemedText>
                </View>
                <Pressable 
                  onPress={handleNextSession} 
                  style={[styles.arrowButton, templates.length <= 1 && styles.arrowButtonDisabled]}
                  disabled={templates.length <= 1}
                >
                  <Feather name="chevron-right" size={28} color={templates.length > 1 ? theme.link : theme.textMuted} />
                </Pressable>
              </View>
              <Button
                onPress={() => handleStartSession(selectedSession)}
                style={styles.startButton}
              >
                Start Workout
              </Button>
            </>
          ) : activeProgram ? (
            <>
              <ThemedText type="secondary" style={styles.noSessionText}>
                No days in this plan yet
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("SessionTemplateDetail" as any, { programId: activeProgram.id })}
                style={styles.startButton}
              >
                Add Day
              </Button>
            </>
          ) : (
            <>
              <ThemedText type="secondary" style={styles.noSessionText}>
                No plan selected
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("ProgramBuilder" as any)}
                style={styles.startButton}
              >
                Create Plan
              </Button>
              <Pressable
                onPress={() => navigation.navigate("ImportProgram" as any)}
                style={styles.secondaryAction}
              >
                <ThemedText type="link">
                  Or import a plan
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => navigation.navigate("ProgramBuilder" as any)}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.link + "20" }]}>
              <Feather name="plus" size={20} color={theme.link} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>New Plan</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ProgramList")}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.success + "20" }]}>
              <Feather name="folder" size={20} color={Colors.dark.success} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>Plans</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ImportProgram" as any)}
            style={[styles.quickAction, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.warning + "20" }]}>
              <Feather name="upload" size={20} color={Colors.dark.warning} />
            </View>
            <ThemedText type="body" style={styles.quickActionLabel}>Import</ThemedText>
          </Pressable>
        </View>

        {/* Last Workout Summary */}
        {lastSession ? (
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
        {weeklyStats && weeklyStats.sessionsCount > 0 ? (
          <View style={styles.motivationSection}>
            <ThemedText type="secondary" style={styles.motivationText}>
              {weeklyStats.sessionsCount} workout{weeklyStats.sessionsCount !== 1 ? "s" : ""} this week
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
      <CalorieSetupModal
        visible={showCalorieSetup}
        onClose={() => {
          setShowCalorieSetup(false);
          refreshSettings();
        }}
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
  greetingEmoji: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  blurredText: {
    color: "transparent",
    textShadow: "0 0 12px #E6E8EB",
  },
  sessionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  sessionPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  sessionNameContainer: {
    flex: 1,
    alignItems: "center",
  },
  sessionName: {
    textAlign: "center",
  },
  sessionCounter: {
    textAlign: "center",
    marginTop: Spacing.xs,
    fontSize: 12,
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
  resumeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  resumeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resumeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  resumeName: {
    marginBottom: 2,
  },
  resumePlan: {
    fontSize: 12,
  },
  resumeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resumeButton: {
    paddingHorizontal: Spacing.lg,
  },
  discardButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
