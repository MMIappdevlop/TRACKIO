import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";

interface CalorieSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CalorieSetupModal({ visible, onClose }: CalorieSetupModalProps) {
  const { theme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState<"ask" | "form">("ask");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const weightUnit = settings?.weightUnit || "kg";
  const heightUnit = weightUnit === "lb" ? "ft" : "cm";

  const canSave =
    age.trim() !== "" && parseFloat(age) > 0 &&
    height.trim() !== "" && parseFloat(height) > 0 &&
    weight.trim() !== "" && parseFloat(weight) > 0;

  const handleEnable = () => {
    setStep("form");
  };

  const handleSkip = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    await updateSettings({ calorieSetupDismissed: true });
    setStep("ask");
    setAge("");
    setHeight("");
    setWeight("");
    onClose();
  };

  const handleSave = async () => {
    if (!canSave) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    const heightValue = parseFloat(height);
    const heightInCm = heightUnit === "ft" ? Math.round(heightValue * 30.48) : heightValue;

    await updateSettings({
      userAge: parseFloat(age),
      userHeight: heightInCm,
      userWeight: parseFloat(weight),
      calorieTrackingEnabled: true,
      calorieSetupDismissed: true,
    });

    setStep("ask");
    setAge("");
    setHeight("");
    setWeight("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleSkip} />
        <View style={[styles.content, { backgroundColor: theme.backgroundSecondary }]}>
          {step === "ask" ? (
            <>
              <View style={styles.iconRow}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.dark.effort + "20" }]}>
                  <Feather name="activity" size={28} color={Colors.dark.effort} />
                </View>
              </View>
              <ThemedText type="h2" style={styles.title}>
                Track Calories Burned?
              </ThemedText>
              <ThemedText type="secondary" style={styles.description}>
                Trackio can estimate calories burned after each session using your personal data. You can change this later in Settings.
              </ThemedText>
              <View style={styles.askButtons}>
                <Button onPress={handleEnable} style={styles.enableButton} testID="button-enable-calories">
                  Enable
                </Button>
                <Pressable onPress={handleSkip} style={styles.skipButton} testID="button-skip-calories">
                  <ThemedText type="secondary">Not Now</ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText type="h2" style={styles.title}>
                Your Details
              </ThemedText>
              <ThemedText type="secondary" style={styles.description}>
                All fields are required for accurate calorie estimates.
              </ThemedText>

              <View style={styles.fieldGroup}>
                <ThemedText type="secondary" style={styles.fieldLabel}>Age</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="e.g. 28"
                  placeholderTextColor={theme.textMuted}
                  testID="input-age"
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="secondary" style={styles.fieldLabel}>Height ({heightUnit})</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder={heightUnit === "cm" ? "e.g. 175" : "e.g. 5.9"}
                  placeholderTextColor={theme.textMuted}
                  testID="input-height"
                />
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="secondary" style={styles.fieldLabel}>Weight ({weightUnit})</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder={weightUnit === "kg" ? "e.g. 70" : "e.g. 154"}
                  placeholderTextColor={theme.textMuted}
                  testID="input-weight"
                />
              </View>

              <View style={styles.formButtons}>
                <Pressable onPress={handleSkip} style={styles.cancelButton}>
                  <ThemedText type="secondary">Cancel</ThemedText>
                </Pressable>
                <Button
                  onPress={handleSave}
                  disabled={!canSave}
                  style={styles.saveButton}
                  testID="button-save-calories"
                >
                  Save
                </Button>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  content: {
    width: "85%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  askButtons: {
    alignItems: "center",
    gap: Spacing.md,
  },
  enableButton: {
    width: "100%",
  },
  skipButton: {
    paddingVertical: Spacing.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    marginBottom: Spacing.xs,
    fontSize: 13,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  saveButton: {
    minWidth: 100,
  },
});
