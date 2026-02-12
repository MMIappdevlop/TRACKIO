import React, { useState } from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, TaskModes } from "@/constants/theme";
import type { TaskTemplate } from "@/types";

interface TaskCardProps {
  task: TaskTemplate;
  onPress?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  showDragHandle?: boolean;
  showActions?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TaskCard({
  task,
  onPress,
  onMove,
  onDelete,
  showDragHandle = false,
  showActions = true,
}: TaskCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [expanded, setExpanded] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleOpenLink = async () => {
    if (task.referenceLink) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await Linking.openURL(task.referenceLink);
      } catch (error) {
        console.log("Failed to open link:", error);
      }
    }
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
    <View style={styles.cardWrapper}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
        testID={`card-exercise-${task.id}`}
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
          <ModeIcon mode={task.mode} size={18} color={modeConfig.color} />
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
        {showActions ? (
          <Pressable
            onPress={handleToggleExpand}
            style={styles.expandButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`button-expand-${task.id}`}
          >
            <Feather 
              name={expanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.textMuted} 
            />
          </Pressable>
        ) : (
          <Feather name="chevron-right" size={18} color={theme.textMuted} />
        )}
      </AnimatedPressable>

      {expanded && showActions ? (
        <View style={[styles.actionsRow, { backgroundColor: theme.backgroundSecondary }]}>
          {task.referenceLink ? (
            <Pressable
              onPress={handleOpenLink}
              style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
              testID={`button-link-${task.id}`}
            >
              <Feather name="external-link" size={16} color={theme.link} />
              <ThemedText type="small" style={{ color: theme.link }}>
                Reference
              </ThemedText>
            </Pressable>
          ) : null}
          {onMove ? (
            <Pressable
              onPress={onMove}
              style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
              testID={`button-move-${task.id}`}
            >
              <Feather name="move" size={16} color={theme.textSecondary} />
              <ThemedText type="small">Move</ThemedText>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
              testID={`button-delete-${task.id}`}
            >
              <Feather name="trash-2" size={16} color={theme.error} />
              <ThemedText type="small" style={{ color: theme.error }}>
                Delete
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: Spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
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
  expandButton: {
    padding: Spacing.xs,
    marginRight: -Spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    marginTop: -BorderRadius.md,
    paddingTop: BorderRadius.md + Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
