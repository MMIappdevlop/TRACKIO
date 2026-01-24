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
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CompletedSession } from "@/types";

interface SessionHistoryCardProps {
  session: CompletedSession;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SessionHistoryCard({ session, onPress }: SessionHistoryCardProps) {
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

  return (
    <AnimatedPressable
      onPress={onPress}
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
            {session.sessionTemplateName}
          </ThemedText>
          <ThemedText type="muted">{formatDate(session.completedAt)}</ThemedText>
        </View>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="secondary" style={styles.metaText}>
              {formatDuration(session.durationSeconds)}
            </ThemedText>
          </View>
          {session.difficultyRating ? (
            <View style={styles.metaItem}>
              <Feather name="activity" size={14} color={theme.textSecondary} />
              <ThemedText type="secondary" style={styles.metaText}>
                {session.difficultyRating}/5
              </ThemedText>
            </View>
          ) : null}
          <ThemedText type="muted" style={styles.programName}>
            {session.programName}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  programName: {
    fontSize: 12,
  },
});
