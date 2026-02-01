import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export interface ActionSheetOption {
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export function ActionSheet({
  visible,
  title,
  subtitle,
  options,
  onClose,
}: ActionSheetProps) {
  const { theme } = useTheme();

  const handleSelect = (option: ActionSheetOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => option.onPress(), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.content, { backgroundColor: theme.backgroundSecondary }]}
        >
          <View style={styles.header}>
            <ThemedText type="h3" style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText type="secondary" style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleSelect(option)}
                style={[
                  styles.optionItem,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                testID={`action-${option.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {option.icon ? (
                  <Feather
                    name={option.icon as any}
                    size={20}
                    color={option.destructive ? theme.error : theme.text}
                  />
                ) : null}
                <ThemedText
                  type="body"
                  style={[
                    styles.optionLabel,
                    option.destructive && { color: theme.error },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.cancelButton, { backgroundColor: theme.backgroundDefault }]}
            testID="action-cancel"
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  header: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  optionLabel: {
    flex: 1,
  },
  cancelButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
});
