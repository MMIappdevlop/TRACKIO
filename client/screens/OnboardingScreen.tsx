import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSettings } = useSettings();
  const [userName, setUserName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!userName.trim()) return;

    setIsSaving(true);
    try {
      await updateSettings({ userName: userName.trim() });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onComplete();
    } catch (error) {
      console.error("Error saving name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing["4xl"], paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="h1" style={styles.title}>Welcome to Trackio</ThemedText>
          <ThemedText type="secondary" style={styles.subtitle}>
            Your personal training log
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="body" style={styles.label}>What should we call you?</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            testID="onboarding-name-input"
          />
          <Button
            onPress={handleContinue}
            disabled={!userName.trim() || isSaving}
            style={styles.button}
          >
            {isSaving ? "Getting started..." : "Continue"}
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="muted" style={styles.footerText}>
            Bring your plan. Trackio records your training.
          </ThemedText>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: Spacing["4xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.sm,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    fontStyle: "italic",
  },
});
