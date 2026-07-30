import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  AppState,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { WeightLogModal } from "@/components/WeightLogModal";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { weightLogStorage } from "@/lib/storage";
import { getNotificationPermissionStatus } from "@/lib/notifications";
import { Spacing, BorderRadius } from "@/constants/theme";

interface WeightReminderPopupProps {
  onShown?: () => void;
}

export function WeightReminderPopup({ onShown }: WeightReminderPopupProps) {
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [visible, setVisible] = useState(false);
  const [showWeightLog, setShowWeightLog] = useState(false);
  const checkedRef = useRef(false);

  const checkConditions = useCallback(async () => {
    if (!settings) return false;
    if (settings.weightReminderEnabled !== true) return false;

    const permStatus = await getNotificationPermissionStatus();
    if (permStatus === "granted") return false;

    const days = settings.weightReminderDays ?? [];
    if (days.length === 0) return false;

    const now = new Date();
    const todayDow = now.getDay();
    if (!days.includes(todayDow)) return false;

    const reminderTime = settings.weightReminderTime ?? "09:00";
    const [rH, rM] = reminderTime.split(":").map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const reminderMinutes = rH * 60 + rM;
    if (currentMinutes < reminderMinutes) return false;

    const todayStr = now.toISOString().split("T")[0];
    if (settings.lastReminderShownDate === todayStr) return false;

    const todayEntry = await weightLogStorage.getByDate(todayStr);
    if (todayEntry) return false;

    return true;
  }, [settings]);

  useEffect(() => {
    if (checkedRef.current) return;
    const timer = setTimeout(async () => {
      const shouldShow = await checkConditions();
      if (shouldShow) {
        checkedRef.current = true;
        setVisible(true);
        const todayStr = new Date().toISOString().split("T")[0];
        await updateSettings({ lastReminderShownDate: todayStr });
        onShown?.();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [checkConditions, updateSettings, onShown]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && !checkedRef.current) {
        const shouldShow = await checkConditions();
        if (shouldShow) {
          checkedRef.current = true;
          setVisible(true);
          const todayStr = new Date().toISOString().split("T")[0];
          await updateSettings({ lastReminderShownDate: todayStr });
          onShown?.();
        }
      }
    });
    return () => subscription.remove();
  }, [checkConditions, updateSettings, onShown]);

  const handleLogWeight = () => {
    setVisible(false);
    setShowWeightLog(true);
  };

  const handleDismiss = async () => {
    setVisible(false);
    const todayStr = new Date().toISOString().split("T")[0];
    await updateSettings({ lastReminderDismissedDate: todayStr });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlay }]}
            onPress={handleDismiss}
          />
          <View style={[styles.content, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.linkBackground }]}>
              <Feather name="bell" size={28} color={theme.link} />
            </View>
            <ThemedText type="h2" style={styles.title}>
              Update weight
            </ThemedText>
            <ThemedText type="secondary" style={styles.description}>
              Log today's weight to keep your progress accurate.
            </ThemedText>
            <View style={styles.buttons}>
              <Button testID="button-log-weight-reminder" onPress={handleLogWeight}>
                Log weight
              </Button>
              <Pressable testID="button-dismiss-reminder" onPress={handleDismiss} style={styles.dismissButton}>
                <ThemedText type="secondary">Not now</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <WeightLogModal
        visible={showWeightLog}
        onClose={() => setShowWeightLog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "85%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  buttons: {
    width: "100%",
    gap: Spacing.md,
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
