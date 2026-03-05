import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Platform } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { WeeklyStatsCard } from "@/components/WeeklyStatsCard";
import { WeeklyComparisonCard } from "@/components/WeeklyComparisonCard";
import { WeeklySummaryCard } from "@/components/WeeklySummaryCard";
import { ProgressShareCard } from "@/components/ProgressShareCard";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";
import { useTheme } from "@/hooks/useTheme";
import { useWeeklyStats, useCompletedSessions, useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedSession } from "@/types";

type NavigationProp = NativeStackNavigationProp<ProgressStackParamList>;

function getMonWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ProgressHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const { stats, prevStats, loading: statsLoading, refresh: refreshStats } = useWeeklyStats();
  const { sessions, refresh: refreshSessions } = useCompletedSessions();
  const { settings, refresh: refreshSettings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const shareCardRef = useRef<View>(null);

  const weekInfo = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);

    const monStart = getMonWeekStart();
    const sunEnd = new Date(monStart);
    sunEnd.setDate(monStart.getDate() + 6);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const range = `${months[monStart.getMonth()]} ${monStart.getDate()} – ${months[sunEnd.getMonth()]} ${sunEnd.getDate()}`;
    return { weekNum, range };
  }, []);

  const thisWeekSessions = useMemo(() => {
    const weekStart = getMonWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return sessions.filter((s) => {
      const d = new Date(s.completedAt);
      return d >= weekStart && d < weekEnd;
    });
  }, [sessions]);

  useEffect(() => {
    navigation.setOptions({
      headerTransparent: false,
      headerTitleAlign: "left",
      headerStyle: { backgroundColor: theme.backgroundRoot },
      headerTitle: () => (
        <View>
          <ThemedText type="h2" style={{ fontSize: 18 }}>My Progress</ThemedText>
          <ThemedText type="muted" style={{ fontSize: 12 }}>
            {`Week ${weekInfo.weekNum} · ${weekInfo.range}`}
          </ThemedText>
        </View>
      ),
      headerRight: () => (
        <HeaderButton
          testID="button-calendar"
          onPress={() => navigation.navigate("TrainingCalendar")}
        >
          <Feather name="calendar" size={22} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, [weekInfo]);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      refreshSessions();
      refreshSettings();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshSessions(), refreshSettings()]);
    setRefreshing(false);
  };

  const handleSessionPress = (session: CompletedSession) => {
    navigation.navigate("SessionDetail", { sessionId: session.id });
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: 1080,
        height: 1920,
      });

      if (Platform.OS === "web") {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
        } catch {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: "image/png",
              dialogTitle: "Share your weekly progress",
              UTI: "public.png",
            });
          }
        }
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your weekly progress",
            UTI: "public.png",
          });
        }
      }
    } catch {
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
          />
        }
      >
        <WeeklyStatsCard stats={stats} loading={statsLoading} userWeight={settings?.userWeight} weightUnit={settings?.weightUnit || "kg"} />

        {thisWeekSessions.length > 0 ? (
          <View style={[styles.weekSessionsCard, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable
              testID="button-toggle-week-sessions"
              onPress={() => setExpanded((v) => !v)}
              style={styles.weekSessionsHeader}
            >
              <View style={styles.weekSessionsTitleRow}>
                <ThemedText type="h2">This Week</ThemedText>
                <View style={[styles.countBadge, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="muted" style={styles.countText}>{thisWeekSessions.length}</ThemedText>
                </View>
              </View>
              <Feather
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>

            {expanded ? (
              <View style={styles.weekSessionsList}>
                {thisWeekSessions.map((session) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    onPress={() => handleSessionPress(session)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <WeeklyComparisonCard
          stats={stats}
          prevStats={prevStats}
          userWeight={settings?.userWeight}
          weightUnit={settings?.weightUnit || "kg"}
        />

        <WeeklySummaryCard
          stats={stats}
          prevStats={prevStats}
          userWeight={settings?.userWeight}
          weightUnit={settings?.weightUnit || "kg"}
          weekNum={weekInfo.weekNum}
          weekRange={weekInfo.range}
          onShare={handleShare}
        />
      </ScrollView>

      <ProgressShareCard
        ref={shareCardRef}
        stats={stats}
        prevStats={prevStats}
        userWeight={settings?.userWeight}
        weightUnit={settings?.weightUnit || "kg"}
        weekNum={weekInfo.weekNum}
        weekRange={weekInfo.range}
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
  weekSessionsCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  weekSessionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  weekSessionsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weekSessionsList: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
