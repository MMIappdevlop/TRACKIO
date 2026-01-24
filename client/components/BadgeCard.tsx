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
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { BadgeAward } from "@/types";

interface BadgeCardProps {
  badge: BadgeAward;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BADGE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  training_days: "calendar",
  strength_milestone: "target",
  distance_milestone: "navigation",
  lifetime_volume: "bar-chart-2",
  lifetime_distance: "trending-up",
  program_completion: "award",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const tierColor = Colors.dark[badge.badgeTier] || theme.link;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const iconName = BADGE_ICONS[badge.badgeType] || "award";

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
      <View style={[styles.iconContainer, { borderColor: tierColor }]}>
        <Feather name={iconName} size={24} color={tierColor} />
      </View>
      <ThemedText type="h4" style={styles.title} numberOfLines={2}>
        {badge.description}
      </ThemedText>
      <ThemedText type="muted" style={styles.date}>
        {formatDate(badge.earnedAt)}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: 11,
    textAlign: "center",
  },
});
