import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface ChartEmptyStateProps {
  message?: string;
}

export function ChartEmptyState({ message = "No data yet" }: ChartEmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Feather name="bar-chart-2" size={28} color={theme.textMuted} />
      <ThemedText type="muted" style={styles.text}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  text: {
    fontSize: 13,
  },
});
