import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";
import { useTheme } from "@/hooks/useTheme";
import { useCompletedSessions } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedSession } from "@/types";

type NavigationProp = NativeStackNavigationProp<ProgressStackParamList>;

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function TrainingCalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { sessions, refresh } = useCompletedSessions();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const sessionsByDate = useMemo(() => {
    const map: Record<string, CompletedSession[]> = {};
    for (const s of sessions) {
      const key = toDateKey(new Date(s.completedAt));
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  const cells = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedDateKey = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const selectedSessions = selectedDateKey ? sessionsByDate[selectedDateKey] ?? [] : [];

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDay(null);
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const handleSessionPress = (session: CompletedSession) => {
    navigation.navigate("SessionDetail", { sessionId: session.id });
  };

  const renderCalendar = () => (
    <View style={{ paddingTop: headerHeight + Spacing.md }}>
      <View style={[styles.calendarCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrevMonth} hitSlop={12} testID="button-prev-month">
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </ThemedText>
          <Pressable onPress={goToNextMonth} hitSlop={12} testID="button-next-month">
            <Feather name="chevron-right" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.dayLabelsRow}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={styles.dayLabelCell}>
              <ThemedText type="muted" style={styles.dayLabelText}>
                {label}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day === null) {
              return <View key={`empty-${i}`} style={styles.dayCell} />;
            }
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasSessions = Boolean(sessionsByDate[dateKey]);
            const isSelected = selectedDay === day;
            const isTodayCell = isToday(day);

            return (
              <Pressable
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: theme.linkBackground },
                  isTodayCell && !isSelected && {
                    borderWidth: 2,
                    borderColor: theme.link,
                  },
                ]}
                onPress={() => setSelectedDay(day)}
                testID={`button-day-${day}`}
              >
                <ThemedText
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                >
                  {day}
                </ThemedText>
                {hasSessions ? (
                  <View style={[styles.dot, { backgroundColor: theme.link }]} />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedDay !== null ? (
        <View style={styles.sessionsSection}>
          <ThemedText type="h3" style={styles.sessionsTitle}>
            {selectedSessions.length > 0
              ? `${selectedSessions.length} Session${selectedSessions.length !== 1 ? "s" : ""}`
              : "No Sessions"}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={selectedSessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderCalendar}
        renderItem={({ item }) => (
          <View style={styles.sessionItem}>
            <SessionHistoryCard
              session={item}
              onPress={() => handleSessionPress(item)}
            />
          </View>
        )}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["4xl"] },
        ]}
        testID="calendar-sessions-list"
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
  calendarCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: "center",
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "500",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  sessionsSection: {
    marginBottom: Spacing.md,
  },
  sessionsTitle: {
    marginBottom: Spacing.xs,
  },
  sessionItem: {
    marginBottom: 0,
  },
});
