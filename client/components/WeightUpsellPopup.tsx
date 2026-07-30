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
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";

interface WeightUpsellPopupProps {
  onNavigateToReminder: () => void;
}

export function WeightUpsellPopup({ onNavigateToReminder }: WeightUpsellPopupProps) {
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [visible, setVisible] = useState(false);
  // Prevent re-entry: once we've shown (or decided not to) in this session, skip further checks.
  const shownRef = useRef(false);

  const checkConditions = useCallback(async () => {
    if (shownRef.current) return;
    if (!settings) return;

    if (settings.weightReminderEnabled === true) return;
    if (settings.hasEverLoggedWeight === true) return;
    if (!settings.firstWorkoutCompletedAt) return;

    const now = new Date();
    const dismissed = settings.weightReminderUpsellDismissedAt;

    if (!dismissed) {
      shownRef.current = true;
      setVisible(true);
      await updateSettings({
        weightReminderUpsellLastShownAt: now.toISOString(),
      });
      return;
    }

    const dismissedDate = new Date(dismissed);
    const tenDaysLater = new Date(dismissedDate.getTime() + 10 * 24 * 60 * 60 * 1000);

    if (now < tenDaysLater) return;

    const lastShown = settings.weightReminderUpsellLastShownAt;
    if (lastShown) {
      const lastShownDate = new Date(lastShown);
      const tenDaysAfterShown = new Date(lastShownDate.getTime() + 10 * 24 * 60 * 60 * 1000);
      if (now < tenDaysAfterShown) return;
    }

    shownRef.current = true;
    setVisible(true);
    await updateSettings({
      weightReminderUpsellLastShownAt: now.toISOString(),
    });
  }, [settings, updateSettings]);

  useEffect(() => {
    checkConditions();
  }, [checkConditions]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkConditions();
      }
    });
    return () => subscription.remove();
  }, [checkConditions]);

  const handleEnable = async () => {
    setVisible(false);
    onNavigateToReminder();
  };

  const handleDismiss = async () => {
    setVisible(false);
    await updateSettings({
      weightReminderUpsellDismissedAt: new Date().toISOString(),
    });
  };

  return (
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
            <Feather name="trending-up" size={28} color={theme.link} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Track your weight?
          </ThemedText>
          <ThemedText type="secondary" style={styles.description}>
            Enable reminders to log your weight on your schedule. This helps your weekly progress stay accurate.
          </ThemedText>
          <View style={styles.buttons}>
            <Button testID="button-enable-weight-reminder" onPress={handleEnable}>
              Enable
            </Button>
            <Pressable testID="button-dismiss-weight-upsell" onPress={handleDismiss} style={styles.dismissButton}>
              <ThemedText type="secondary">Not now</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    borderRadius: BorderRadius.full,
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
