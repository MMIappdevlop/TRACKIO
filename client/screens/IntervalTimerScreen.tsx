import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RoutePropType = RouteProp<RootStackParamList, "IntervalTimer">;

type Phase = "work" | "rest" | "complete";

export default function IntervalTimerScreen() {
  const navigation = useNavigation();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { taskName, workSeconds, restSeconds, rounds } = route.params;

  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("work");
  const [seconds, setSeconds] = useState(workSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  const phaseSeconds = phase === "work" ? workSeconds : restSeconds;

  useEffect(() => {
    if (isRunning && phase !== "complete") {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, phase, currentRound]);

  useEffect(() => {
    progress.value = withTiming(seconds / phaseSeconds, {
      duration: 300,
      easing: Easing.linear,
    });
  }, [seconds, phaseSeconds]);

  const handlePhaseComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (phase === "work") {
      if (currentRound >= rounds) {
        setPhase("complete");
        setIsRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setPhase("rest");
        setSeconds(restSeconds);
      }
    } else if (phase === "rest") {
      setCurrentRound((prev) => prev + 1);
      setPhase("work");
      setSeconds(workSeconds);
    }
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  const skipPhase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    handlePhaseComplete();
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.goBack();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const backgroundColor = phase === "work" ? Colors.dark.effort : phase === "rest" ? theme.link : Colors.dark.success;

  if (phase === "complete") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <View style={styles.completeContent}>
          <View style={[styles.completeIcon, { backgroundColor: Colors.dark.success + "20" }]}>
            <Feather name="check-circle" size={64} color={Colors.dark.success} />
          </View>
          <ThemedText type="h1" style={styles.completeTitle}>Complete!</ThemedText>
          <ThemedText type="secondary" style={styles.completeStats}>
            {rounds} rounds in {formatTime(totalElapsed)}
          </ThemedText>
          <Pressable onPress={handleFinish} style={[styles.doneButton, { backgroundColor: theme.link }]}>
            <ThemedText type="body" style={{ color: theme.buttonText, fontWeight: "600" }}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleFinish} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">{taskName}</ThemedText>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.phaseIndicator, { backgroundColor: backgroundColor + "20" }]}>
          <ThemedText type="h2" style={{ color: backgroundColor }}>
            {phase === "work" ? "WORK" : "REST"}
          </ThemedText>
        </View>

        <ThemedText type="stat" style={[styles.timerText, { color: backgroundColor }]}>
          {formatTime(seconds)}
        </ThemedText>

        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor }, progressStyle]}
          />
        </View>

        <ThemedText type="h4" style={styles.roundText}>
          Round {currentRound} of {rounds}
        </ThemedText>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={skipPhase} style={[styles.controlButton, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="skip-forward" size={24} color={theme.text} />
          <ThemedText type="small">Skip</ThemedText>
        </Pressable>

        <Pressable onPress={toggleTimer} style={[styles.playButton, { backgroundColor }]}>
          <Feather name={isRunning ? "pause" : "play"} size={36} color={theme.buttonText} />
        </Pressable>

        <Pressable onPress={handleFinish} style={[styles.controlButton, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="stop-circle" size={24} color={theme.text} />
          <ThemedText type="small">Stop</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  phaseIndicator: {
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["3xl"],
  },
  timerText: {
    fontSize: 96,
    lineHeight: 108,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
    marginBottom: Spacing.xl,
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  roundText: {
    opacity: 0.7,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  completeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  completeIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  completeTitle: {
    marginBottom: Spacing.md,
  },
  completeStats: {
    marginBottom: Spacing["3xl"],
  },
  doneButton: {
    paddingHorizontal: Spacing["4xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
