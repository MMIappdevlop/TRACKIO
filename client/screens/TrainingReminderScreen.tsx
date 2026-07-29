import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Switch, Pressable, Platform, Linking } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleWeeklyReminders,
  cancelNotificationsByPrefix,
  TRAINING_REMINDER_PREFIX,
  type NotificationPermissionStatus,
} from "@/lib/notifications";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrainingReminderScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { settings, refresh, updateSettings } = useSettings();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [justDenied, setJustDenied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getNotificationPermissionStatus().then(setPermissionStatus);
    }, [])
  );

  if (!settings) return null;

  const enabled = settings.trainingReminderEnabled ?? false;
  const selectedDays = settings.trainingReminderDays ?? [];
  const time = settings.trainingReminderTime ?? "08:00";
  const [hours, minutes] = time.split(":").map(Number);

  const syncNotifications = async (
    isEnabled: boolean,
    days: number[],
    h: number,
    m: number
  ) => {
    if (!isEnabled || days.length === 0) {
      await cancelNotificationsByPrefix(TRAINING_REMINDER_PREFIX);
      return;
    }
    await scheduleWeeklyReminders({
      prefix: TRAINING_REMINDER_PREFIX,
      title: "Trackio",
      body: "Time to train",
      days,
      hour: h,
      minute: m,
    });
  };

  const handleToggle = async (value: boolean) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    if (value && permissionStatus !== "granted") {
      const status = await requestNotificationPermission();
      setPermissionStatus(status);
      if (status !== "granted") {
        setJustDenied(true);
        await updateSettings({ trainingReminderEnabled: false });
        return;
      }
    }

    setJustDenied(false);
    await updateSettings({ trainingReminderEnabled: value });
    const [h, m] = time.split(":").map(Number);
    await syncNotifications(value, selectedDays, h, m);
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
    await updateSettings({ trainingReminderDays: current });
    const [h, m] = time.split(":").map(Number);
    await syncNotifications(enabled, current, h, m);
  };

  const formatTime = (h: number, m: number) => {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const adjustHour = async (delta: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const newH = (hours + delta + 24) % 24;
    const newTime = formatTime(newH, minutes);
    await updateSettings({ trainingReminderTime: newTime });
    await syncNotifications(enabled, selectedDays, newH, minutes);
  };

  const adjustMinute = async (delta: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const totalMinutes = hours * 60 + minutes + delta;
    const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
    const newH = Math.floor(wrapped / 60);
    const newM = wrapped % 60;
    const newTime = formatTime(newH, newM);
    await updateSettings({ trainingReminderTime: newTime });
    await syncNotifications(enabled, selectedDays, newH, newM);
  };

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch {}
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      {Platform.OS === "web" ? (
        <View style={[styles.webBanner, { backgroundColor: theme.backgroundDefault, borderRadius: BorderRadius.lg }]}>
          <Feather name="smartphone" size={16} color={theme.textMuted} />
          <ThemedText type="muted" style={styles.infoText}>
            Notifications require the Trackio mobile app.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="zap" size={20} color={theme.link} />
              <ThemedText type="body">Training Reminder</ThemedText>
            </View>
            <Switch
              testID="toggle-training-reminder"
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: theme.backgroundSecondary, true: theme.link }}
              thumbColor={theme.buttonText}
            />
          </View>
        </View>
      </View>

      {(justDenied || (enabled && permissionStatus === "denied")) ? (
        <View style={[styles.permissionBanner, { backgroundColor: theme.backgroundDefault, borderRadius: BorderRadius.lg }]}>
          <Feather name="alert-circle" size={16} color={theme.textMuted} />
          <ThemedText type="muted" style={styles.infoText}>
            Notifications are blocked. Enable them in device settings.
          </ThemedText>
          {Platform.OS !== "web" ? (
            <Pressable onPress={handleOpenSettings}>
              <ThemedText type="small" style={{ color: theme.link }}>Open Settings</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
                    testID={`training-day-pill-${index}`}
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
                    testID="button-training-hour-up"
                    onPress={() => adjustHour(1)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-up" size={20} color={theme.text} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: theme.backgroundTertiary }]}>
                    <ThemedText type="stat">{String(hours).padStart(2, "0")}</ThemedText>
                  </View>
                  <Pressable
                    testID="button-training-hour-down"
                    onPress={() => adjustHour(-1)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-down" size={20} color={theme.text} />
                  </Pressable>
                </View>

                <ThemedText type="stat" style={styles.timeSeparator}>:</ThemedText>

                <View style={styles.timeUnit}>
                  <Pressable
                    testID="button-training-minute-up"
                    onPress={() => adjustMinute(5)}
                    style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="chevron-up" size={20} color={theme.text} />
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: theme.backgroundTertiary }]}>
                    <ThemedText type="stat">{String(minutes).padStart(2, "0")}</ThemedText>
                  </View>
                  <Pressable
                    testID="button-training-minute-down"
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

      {Platform.OS !== "web" ? (
        <View style={styles.infoContainer}>
          <Feather name="info" size={16} color={theme.textMuted} />
          <ThemedText type="muted" style={styles.infoText}>
            {permissionStatus === "granted"
              ? "You will receive a device notification on selected days."
              : "Enable notifications in device settings to receive reminders."}
          </ThemedText>
        </View>
      ) : null}
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
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  webBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
