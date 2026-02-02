import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  KeyboardTypeOptions,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface InputModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function InputModal({
  visible,
  title,
  placeholder = "",
  initialValue = "",
  submitLabel = "Save",
  keyboardType = "default",
  onSubmit,
  onClose,
}: InputModalProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  const handleSubmit = () => {
    if (value.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSubmit(value.trim());
      onClose();
    }
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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.content, { backgroundColor: theme.backgroundSecondary }]}
        >
          <ThemedText type="h2" style={styles.title}>
            {title}
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            value={value}
            onChangeText={setValue}
            keyboardType={keyboardType}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <ThemedText type="secondary">Cancel</ThemedText>
            </Pressable>
            <Button
              onPress={handleSubmit}
              disabled={!value.trim()}
              style={styles.submitButton}
            >
              {submitLabel}
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    marginBottom: Spacing.xl,
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
