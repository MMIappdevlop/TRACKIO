import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { SessionTemplate } from "@/types";

interface MoveExerciseModalProps {
  visible: boolean;
  exerciseName: string;
  currentDayId: string;
  days: SessionTemplate[];
  onMove: (targetDayId: string) => void;
  onClose: () => void;
}

export function MoveExerciseModal({
  visible,
  exerciseName,
  currentDayId,
  days,
  onMove,
  onClose,
}: MoveExerciseModalProps) {
  const { theme } = useTheme();

  const availableDays = days.filter((d) => d.id !== currentDayId);

  const handleSelect = (dayId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMove(dayId);
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
            <ThemedText type="h2" style={styles.title}>
              Move Exercise
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          
          <ThemedText type="secondary" style={styles.subtitle}>
            Move "{exerciseName}" to:
          </ThemedText>

          <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
            {availableDays.length > 0 ? (
              availableDays.map((day) => (
                <Pressable
                  key={day.id}
                  onPress={() => handleSelect(day.id)}
                  style={[styles.dayItem, { backgroundColor: theme.backgroundDefault }]}
                >
                  <Feather name="calendar" size={20} color={theme.link} />
                  <ThemedText type="body" style={styles.dayName}>
                    {day.name}
                  </ThemedText>
                  <Feather name="chevron-right" size={20} color={theme.textMuted} />
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Feather name="info" size={24} color={theme.textMuted} />
                <ThemedText type="secondary" style={styles.emptyText}>
                  No other days available in this plan
                </ThemedText>
              </View>
            )}
          </ScrollView>
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
    maxHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.lg,
  },
  dayList: {
    flexGrow: 0,
  },
  dayItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  dayName: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
});
