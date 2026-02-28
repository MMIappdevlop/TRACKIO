import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface RestTimerSheetProps {
  visible: boolean;
  initialSeconds: number;
  onClose: () => void;
  onComplete?: () => void;
}

export function RestTimerSheet({
  visible,
  initialSeconds,
  onClose,
  onComplete,
}: RestTimerSheetProps) {
  const { theme } = useTheme();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setSeconds(initialSeconds);
      setIsRunning(false);
      progress.value = 1;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, initialSeconds]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete?.();
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds > 0]);

  useEffect(() => {
    if (initialSeconds > 0) {
      progress.value = withTiming(seconds / initialSeconds, {
        duration: 300,
        easing: Easing.linear,
      });
    }
  }, [seconds, initialSeconds]);

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  const addTime = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeconds((prev) => Math.max(0, prev + delta));
  };

  const skipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const effortColor = Colors.dark.effort;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={styles.handle} />
          <ThemedText type="h2" style={styles.title}>
            Rest Timer
          </ThemedText>

          <View style={styles.timerContainer}>
            <ThemedText
              type="stat"
              style={[
                styles.timerText,
                isRunning && { color: effortColor },
              ]}
            >
              {formatTime(seconds)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: isRunning ? effortColor : theme.link },
                progressStyle,
              ]}
            />
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={() => addTime(-15)}
              style={[styles.controlButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <ThemedText type="h4">-15s</ThemedText>
            </Pressable>

            <Pressable
              onPress={toggleTimer}
              style={[
                styles.playButton,
                { backgroundColor: isRunning ? effortColor : theme.link },
              ]}
            >
              <Feather
                name={isRunning ? "pause" : "play"}
                size={28}
                color={theme.buttonText}
              />
            </Pressable>

            <Pressable
              onPress={() => addTime(15)}
              style={[styles.controlButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <ThemedText type="h4">+15s</ThemedText>
            </Pressable>
          </View>

          <Pressable onPress={skipRest} style={styles.skipButton}>
            <ThemedText type="link">Skip</ThemedText>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["4xl"],
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.xl,
  },
  timerContainer: {
    marginBottom: Spacing.xl,
  },
  timerText: {
    fontSize: 64,
    lineHeight: 72,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  controlButton: {
    width: 72,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    paddingVertical: Spacing.md,
  },
});
