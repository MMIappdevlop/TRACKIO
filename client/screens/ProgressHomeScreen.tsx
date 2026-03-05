import React, { useCallback, useEffect, useState } from "react";
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
import { useWeeklyStats, useCompletedSessions } from "@/hooks/useData";
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton
          testID="button-calendar"
          onPress={() => navigation.navigate("TrainingCalendar")}
        >
          <Feather name="calendar" size={22} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      refreshSessions();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshSessions()]);
    setRefreshing(false);
  };

  const handleSessionPress = (session: CompletedSession) => {
    navigation.navigate("SessionDetail", { sessionId: session.id });
  };

  const loading = statsLoading || sessionsLoading;

  const renderHeader = () => (
    <View style={styles.header}>
      <WeeklyStatsCard stats={stats} loading={statsLoading} completedSessions={sessions} />
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
