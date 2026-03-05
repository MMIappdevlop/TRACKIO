import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Switch, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeightReminderScreenProps {
  route?: { params?: { prefill?: boolean } };
}

export default function WeightReminderScreen({ route }: WeightReminderScreenProps) {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { settings, loading, refresh, updateSettings } = useSettings();
  const prefill = route?.params?.prefill;

  const [didPrefill, setDidPrefill] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  useEffect(() => {
    if (prefill && settings && !didPrefill) {
      setDidPrefill(true);
      updateSettings({
        weightReminderEnabled: true,
        weightReminderDays: [0],
        weightReminderTime: "09:00",
      });
    }
  }, [prefill, settings, didPrefill]);

  if (!settings) return null;

  const enabled = settings.weightReminderEnabled ?? false;
  const selectedDays = settings.weightReminderDays ?? [];
  const time = settings.weightReminderTime ?? "09:00";

  const [hours, minutes] = time.split(":").map(Number);

  const handleToggle = async (value: boolean) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await updateSettings({ weightReminderEnabled: value });
  };

  const handleDayToggle = async (dayIndex: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const current = [...selectedDays];
    const idx = current.indexOf(dayIndex);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(dayIndex);
    }
    await updateSettings({ weightReminderDays: current });
  };

  const formatTime = (h: number, m: number) => {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const adjustHour = async (delta: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const newH = (hours + delta + 24) % 24;
    await updateSettings({ weightReminderTime: formatTime(newH, minutes) });
  };

  const adjustMinute = async (delta: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const totalMinutes = hours * 60 + minutes + delta;
    const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
    const newH = Math.floor(wrapped / 60);
    const newM = wrapped % 60;
    await updateSettings({ weightReminderTime: formatTime(newH, newM) });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="bell" size={20} color={theme.link} />
              <ThemedText type="body">Weight Update Reminder</ThemedText>
            </View>
            <Switch
              testID="toggle-weight-reminder"
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: theme.backgroundSecondary, true: theme.link }}
              thumbColor={theme.buttonText}
            />
          </View>
        </View>
      </View>

      {enabled ? (
        <>
          <View style={styles.section}>
            <ThemedText type="h2" style={styles.sectionTitle}>Reminder Days</ThemedText>
            <View style={styles.dayPills}>
              {DAY_LABELS.map((label, index) => {
                const isSelected = selectedDays.includes(index);
                return (
                  <Pressable
                    key={index}
                    testID={`day-pill-${index}`}
                    onPress={() => handleDayToggle(index)}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor: isSelected ? theme.link : theme.backgroundDefault,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: isSelected ? theme.buttonText : theme.text }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="h2" style={styles.sectionTitle}>Reminder Time</ThemedText>
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.timePickerRow}>
                <View style={styles.timeUnit}>
                  <Pressable
                    testID="button-hour-up"
                    onPress={() => adjustHour(1)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-up" size={20} color={theme.text} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: theme.backgroundTertiary }]}>
                    <ThemedText type="stat">{String(hours).padStart(2, "0")}</ThemedText>
                  </View>
                  <Pressable
                    testID="button-hour-down"
                    onPress={() => adjustHour(-1)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-down" size={20} color={theme.text} />
                  </Pressable>
                </View>

                <ThemedText type="stat" style={styles.timeSeparator}>:</ThemedText>

                <View style={styles.timeUnit}>
                  <Pressable
                    testID="button-minute-up"
                    onPress={() => adjustMinute(5)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-up" size={20} color={theme.text} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: theme.backgroundTertiary }]}>
                    <ThemedText type="stat">{String(minutes).padStart(2, "0")}</ThemedText>
                  </View>
                  <Pressable
                    testID="button-minute-down"
                    onPress={() => adjustMinute(-5)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-down" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.infoContainer}>
        <Feather name="info" size={16} color={theme.textMuted} />
        <ThemedText type="muted" style={styles.infoText}>
          Reminder will appear when you open Trackio.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  settingInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dayPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dayPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    minWidth: 52,
    alignItems: "center",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  timeUnit: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepperButton: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  timeDisplay: {
    width: 64,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSeparator: {
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
});
