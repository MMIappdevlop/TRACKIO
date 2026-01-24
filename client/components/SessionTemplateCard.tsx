import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, TaskModes } from "@/constants/theme";
import type { SessionTemplate, TaskTemplate } from "@/types";

interface SessionTemplateCardProps {
  template: SessionTemplate;
  tasks?: TaskTemplate[];
  onPress?: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SessionTemplateCard({
  template,
  tasks = [],
  onPress,
  onLongPress,
}: SessionTemplateCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const tasksByMode = tasks.reduce(
    (acc, task) => {
      acc[task.mode] = (acc[task.mode] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="h4" numberOfLines={1} style={styles.title}>
            {template.name}
          </ThemedText>
          <Feather name="chevron-right" size={20} color={theme.textMuted} />
        </View>
        {tasks.length > 0 ? (
          <View style={styles.taskSummary}>
            {Object.entries(tasksByMode).map(([mode, count]) => {
              const modeConfig = TaskModes[mode as keyof typeof TaskModes];
              if (!modeConfig) return null;
              return (
                <View key={mode} style={styles.taskBadge}>
                  <Feather
                    name={modeConfig.icon as any}
                    size={12}
                    color={modeConfig.color}
                  />
                  <ThemedText type="small" style={styles.taskCount}>
                    {count}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ) : (
          <ThemedText type="muted" style={styles.emptyText}>
            No tasks yet
          </ThemedText>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  taskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskCount: {
    opacity: 0.7,
  },
  emptyText: {
    marginTop: Spacing.xs,
  },
});
