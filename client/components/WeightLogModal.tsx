import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { weightLogStorage, settingsStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface WeightLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function WeightLogModal({
  visible,
  onClose,
  onSaved,
}: WeightLogModalProps) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible) {
      setValue(settings?.userWeight ? String(settings.userWeight) : "");
    }
  }, [visible, settings?.userWeight]);

  const unit = settings?.weightUnit ?? "kg";

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    await weightLogStorage.create(parsed);
    await settingsStorage.update({
      userWeight: parsed,
      hasEverLoggedWeight: true,
    });

    onClose();
    onSaved?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.content,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText type="h2" style={styles.title}>
            Log weight
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="0.0"
              placeholderTextColor={theme.textMuted}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
              testID="input-weight"
            />
            <ThemedText type="body" style={styles.unitLabel}>
              {unit}
            </ThemedText>
          </View>
          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <ThemedText type="secondary">Cancel</ThemedText>
            </Pressable>
            <Button
              onPress={handleSave}
              disabled={!value.trim() || isNaN(parseFloat(value)) || parseFloat(value) <= 0}
              style={styles.submitButton}
            >
              Save
            </Button>
          </View>
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
  },
  content: {
    width: "85%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  unitLabel: {
    minWidth: 28,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.lg,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  submitButton: {
    minWidth: 100,
  },
});
