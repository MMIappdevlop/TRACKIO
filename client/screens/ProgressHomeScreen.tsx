import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight, HeaderButton } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { WeeklyStatsCard } from "@/components/WeeklyStatsCard";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useWeeklyStats, useCompletedSessions, useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedSession } from "@/types";

type NavigationProp = NativeStackNavigationProp<ProgressStackParamList>;

export default function ProgressHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { stats, loading: statsLoading, refresh: refreshStats } = useWeeklyStats();
  const { sessions, loading: sessionsLoading, refresh: refreshSessions } = useCompletedSessions();
  const { settings, refresh: refreshSettings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);

  const weekInfo = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);

    const day = now.getDay();
    const monStart = new Date(now);
    monStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monStart.setHours(0, 0, 0, 0);
    const sunEnd = new Date(monStart);
    sunEnd.setDate(monStart.getDate() + 6);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const range = `${months[monStart.getMonth()]} ${monStart.getDate()} – ${months[sunEnd.getMonth()]} ${sunEnd.getDate()}`;
    return { weekNum, range };
  }, []);

  useEffect(() => {
    navigation.setOptions({
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

  const loading = statsLoading || sessionsLoading;

  const renderHeader = () => (
    <View style={styles.header}>
      <WeeklyStatsCard stats={stats} loading={statsLoading} userWeight={settings?.userWeight} weightUnit={settings?.weightUnit || "kg"} />
      {sessions.length > 0 ? (
        <View style={styles.sectionTitleRow}>
          <ThemedText type="h2">Recent Sessions</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="muted" style={styles.countText}>{sessions.length}</ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title="No Sessions Yet"
        description="Complete your first workout to see your progress here"
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionHistoryCard session={item} onPress={() => handleSessionPress(item)} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
          sessions.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
          />
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
  },
  header: {
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
