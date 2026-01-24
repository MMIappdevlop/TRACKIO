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
import type { TaskTemplate } from "@/types";

interface TaskCardProps {
  task: TaskTemplate;
  onPress?: () => void;
  onLongPress?: () => void;
  showDragHandle?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TaskCard({
  task,
  onPress,
  onLongPress,
  showDragHandle = false,
}: TaskCardProps) {
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

  const modeConfig = TaskModes[task.mode];
  const getTaskDetails = () => {
    const details: string[] = [];
    switch (task.mode) {
      case "strength":
        if (task.config.sets) details.push(`${task.config.sets} sets`);
        if (task.config.reps) details.push(`${task.config.reps} reps`);
        if (task.config.weight) details.push(`${task.config.weight}kg`);
        if (task.config.isBodyweight) details.push("bodyweight");
        break;
      case "distance":
        if (task.config.targetDistance) {
          details.push(`${task.config.targetDistance} ${task.config.distanceUnit || "km"}`);
        }
        break;
      case "interval":
        if (task.config.rounds) details.push(`${task.config.rounds} rounds`);
        if (task.config.workSeconds) details.push(`${task.config.workSeconds}s work`);
        if (task.config.restSeconds) details.push(`${task.config.restSeconds}s rest`);
        break;
      case "time":
        details.push("Duration");
        break;
      case "notes":
        details.push("Free notes");
        break;
    }
    return details.join(" · ");
  };

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
      {showDragHandle ? (
        <View style={styles.dragHandle}>
          <Feather name="menu" size={18} color={theme.textMuted} />
        </View>
      ) : null}
      <View
        style={[
          styles.modeIndicator,
          { backgroundColor: modeConfig.color + "20" },
        ]}
      >
        <Feather name={modeConfig.icon as any} size={18} color={modeConfig.color} />
      </View>
      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={1}>
          {task.name}
        </ThemedText>
        {task.groupLabel ? (
          <View style={[styles.groupBadge, { backgroundColor: theme.linkBackground }]}>
            <ThemedText type="small" style={{ color: theme.link }}>
              {task.groupLabel}
            </ThemedText>
          </View>
        ) : null}
        <ThemedText type="muted" numberOfLines={1} style={styles.details}>
          {getTaskDetails()}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dragHandle: {
    paddingRight: Spacing.xs,
  },
  modeIndicator: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  groupBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: 4,
  },
  details: {
    marginTop: 2,
  },
});
