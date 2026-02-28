import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { SplitTime } from "@/types";

type TimerStatus = "idle" | "running" | "paused" | "break" | "stopped";

interface ExerciseTimerProps {
  mode: "time" | "interval";
  intervalConfig?: {
    workSeconds: number;
    restSeconds: number;
    rounds: number;
  };
  onComplete: (data: {
    durationSeconds: number;
    splits: SplitTime[];
    breakSeconds: number;
    roundsCompleted?: number;
  }) => void;
}

export function ExerciseTimer({ mode, intervalConfig, onComplete }: ExerciseTimerProps) {
  const { theme } = useTheme();

  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [splits, setSplits] = useState<SplitTime[]>([]);
  const [intervalRound, setIntervalRound] = useState(1);
  const [intervalPhase, setIntervalPhase] = useState<"work" | "rest">("work");
  const [phaseSeconds, setPhaseSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalBreakRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef(0);
  const breakStartRef = useRef<number>(0);
  const splitCountRef = useRef(0);

  const pulseScale = useSharedValue(1);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (status === "running") {
      startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000;
      intervalRef.current = setInterval(() => {
        const wallElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(wallElapsed);
        if (mode === "interval") {
          setPhaseSeconds((prev) => {
            const next = prev + 1;
            const limit =
              intervalPhase === "work"
                ? intervalConfig?.workSeconds || 30
                : intervalConfig?.restSeconds || 30;
            if (next >= limit) {
              handleIntervalPhaseEnd();
              return 0;
            }
            return next;
          });
        }
      }, 500);
    } else {
      if (status === "paused") {
        pausedElapsedRef.current = elapsed;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, intervalPhase, intervalRound]);

  useEffect(() => {
    if (status === "break") {
      breakStartRef.current = Date.now();
      breakIntervalRef.current = setInterval(() => {
        setBreakElapsed(Math.floor((Date.now() - breakStartRef.current) / 1000));
      }, 500);
    } else {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
    }
    return () => {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (status === "running") {
      pulseScale.value = withSpring(1.02, { damping: 8 });
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  const handleIntervalPhaseEnd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (intervalPhase === "work") {
      const totalRounds = intervalConfig?.rounds || 5;
      if (intervalRound >= totalRounds) {
        handleStop();
        return;
      }
      setIntervalPhase("rest");
      setSplits((prev) => [
        ...prev,
        {
          label: `Round ${intervalRound} work`,
          elapsedSeconds: elapsed + 1,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      setIntervalRound((prev) => prev + 1);
      setIntervalPhase("work");
    }
    setPhaseSeconds(0);
  };

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pausedElapsedRef.current = 0;
    setStatus("running");
    setElapsed(0);
    setBreakElapsed(0);
    setSplits([]);
    totalBreakRef.current = 0;
    splitCountRef.current = 0;
    if (mode === "interval") {
      setIntervalRound(1);
      setIntervalPhase("work");
      setPhaseSeconds(0);
    }
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus("paused");
  };

  const handleResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pausedElapsedRef.current = elapsed;
    setStatus("running");
  };

  const handleBreak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus("break");
    setBreakElapsed(0);
  };

  const handleEndBreak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    totalBreakRef.current += breakElapsed;
    setSplits((prev) => [
      ...prev,
      {
        label: `Break`,
        elapsedSeconds: breakElapsed,
        timestamp: new Date().toISOString(),
      },
    ]);
    setBreakElapsed(0);
    pausedElapsedRef.current = elapsed;
    setStatus("running");
  };

  const handleSplit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    splitCountRef.current += 1;
    setSplits((prev) => [
      ...prev,
      {
        label: `Split ${splitCountRef.current}`,
        elapsedSeconds: elapsed,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleStop = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearTimers();
    const finalBreak = totalBreakRef.current + (status === "break" ? breakElapsed : 0);
    setStatus("stopped");
    onComplete({
      durationSeconds: elapsed,
      splits,
      breakSeconds: finalBreak,
      roundsCompleted: mode === "interval" ? intervalRound : undefined,
    });
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearTimers();
    setStatus("idle");
    setElapsed(0);
    setBreakElapsed(0);
    setSplits([]);
    totalBreakRef.current = 0;
    splitCountRef.current = 0;
    if (mode === "interval") {
      setIntervalRound(1);
      setIntervalPhase("work");
      setPhaseSeconds(0);
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const timerScale = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isActive = status === "running" || status === "break";
  const accentColor = status === "running" ? Colors.dark.effort : status === "break" ? theme.link : theme.textMuted;

  const getIntervalProgress = () => {
    if (mode !== "interval" || !intervalConfig) return 0;
    const limit = intervalPhase === "work" ? intervalConfig.workSeconds : intervalConfig.restSeconds;
    return limit > 0 ? phaseSeconds / limit : 0;
  };

  if (status === "stopped") {
    return (
      <View style={styles.container}>
        <View style={[styles.completedCard, { backgroundColor: Colors.dark.success + "20" }]}>
          <Feather name="check-circle" size={24} color={Colors.dark.success} />
          <View style={styles.completedInfo}>
            <ThemedText type="body" style={{ color: Colors.dark.success, fontWeight: "600" }}>
              {mode === "interval" ? `${intervalRound} rounds completed` : "Timer completed"}
            </ThemedText>
            <ThemedText type="secondary">
              Total: {formatTime(elapsed)}
              {totalBreakRef.current + breakElapsed > 0
                ? ` (${formatTime(totalBreakRef.current + breakElapsed)} break)`
                : ""}
            </ThemedText>
          </View>
        </View>

        {splits.length > 0 ? (
          <View style={styles.splitsSection}>
            <ThemedText type="h3" style={styles.splitsTitle}>Splits</ThemedText>
            {splits.map((split, i) => (
              <View key={i} style={[styles.splitRow, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="secondary">{split.label}</ThemedText>
                <ThemedText type="body" style={styles.splitTime}>
                  {formatTime(split.elapsedSeconds)}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable onPress={handleReset} style={[styles.resetButton, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="rotate-ccw" size={16} color={theme.text} />
          <ThemedText type="body">Reset Timer</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mode === "interval" && status !== "idle" ? (
        <View style={styles.intervalInfo}>
          <View
            style={[
              styles.phaseTag,
              {
                backgroundColor:
                  (intervalPhase === "work" ? Colors.dark.effort : theme.link) + "20",
              },
            ]}
          >
            <ThemedText
              type="body"
              style={{
                color: intervalPhase === "work" ? Colors.dark.effort : theme.link,
                fontWeight: "600",
              }}
            >
              {intervalPhase === "work" ? "WORK" : "REST"}
            </ThemedText>
          </View>
          <ThemedText type="secondary">
            Round {intervalRound} of {intervalConfig?.rounds || 5}
          </ThemedText>
          <View style={[styles.phaseBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[
                styles.phaseFill,
                {
                  backgroundColor: intervalPhase === "work" ? Colors.dark.effort : theme.link,
                  width: `${getIntervalProgress() * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      <Animated.View style={[styles.timerDisplay, timerScale]}>
        {status === "break" ? (
          <>
            <ThemedText type="muted" style={styles.breakLabel}>BREAK</ThemedText>
            <ThemedText
              type="stat"
              style={[
                styles.timerText,
                { color: theme.link, fontVariant: ["tabular-nums"] },
              ]}
            >
              {formatTime(breakElapsed)}
            </ThemedText>
            <ThemedText type="muted" style={styles.activeTimeLabel}>
              Active: {formatTime(elapsed)}
            </ThemedText>
          </>
        ) : (
          <ThemedText
            type="stat"
            style={[
              styles.timerText,
              {
                color: status === "running" ? Colors.dark.effort : theme.text,
                fontVariant: ["tabular-nums"],
              },
            ]}
          >
            {formatTime(elapsed)}
          </ThemedText>
        )}
      </Animated.View>

      {status === "idle" ? (
        <Pressable
          onPress={handleStart}
          style={[styles.startButton, { backgroundColor: theme.effort }]}
          testID="button-start-timer"
        >
          <Feather name="play" size={20} color={theme.buttonText} />
          <ThemedText type="body" style={[styles.buttonText, { color: theme.buttonText }]}>Start Timer</ThemedText>
        </Pressable>
      ) : null}

      {status === "running" ? (
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handlePause}
            style={[styles.controlBtn, { backgroundColor: theme.backgroundSecondary }]}
            testID="button-pause"
          >
            <Feather name="pause" size={20} color={theme.text} />
            <ThemedText type="small">Pause</ThemedText>
          </Pressable>

          {mode === "time" ? (
            <Pressable
              onPress={handleSplit}
              style={[styles.controlBtn, { backgroundColor: theme.backgroundSecondary }]}
              testID="button-split"
            >
              <Feather name="flag" size={20} color={theme.link} />
              <ThemedText type="small">Split</ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleBreak}
            style={[styles.controlBtn, { backgroundColor: theme.backgroundSecondary }]}
            testID="button-break"
          >
            <Feather name="coffee" size={20} color={theme.link} />
            <ThemedText type="small">Break</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleStop}
            style={[styles.controlBtn, { backgroundColor: Colors.dark.error + "20" }]}
            testID="button-stop"
          >
            <Feather name="square" size={20} color={Colors.dark.error} />
            <ThemedText type="small" style={{ color: Colors.dark.error }}>Stop</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {status === "paused" ? (
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handleResume}
            style={[styles.controlBtn, { backgroundColor: Colors.dark.effort + "20" }]}
            testID="button-resume"
          >
            <Feather name="play" size={20} color={Colors.dark.effort} />
            <ThemedText type="small" style={{ color: Colors.dark.effort }}>Resume</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleStop}
            style={[styles.controlBtn, { backgroundColor: Colors.dark.error + "20" }]}
            testID="button-stop-paused"
          >
            <Feather name="square" size={20} color={Colors.dark.error} />
            <ThemedText type="small" style={{ color: Colors.dark.error }}>Stop</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {status === "break" ? (
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handleEndBreak}
            style={[styles.controlBtn, { backgroundColor: Colors.dark.effort + "20" }]}
            testID="button-end-break"
          >
            <Feather name="play" size={20} color={Colors.dark.effort} />
            <ThemedText type="small" style={{ color: Colors.dark.effort }}>End Break</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleStop}
            style={[styles.controlBtn, { backgroundColor: Colors.dark.error + "20" }]}
            testID="button-stop-break"
          >
            <Feather name="square" size={20} color={Colors.dark.error} />
            <ThemedText type="small" style={{ color: Colors.dark.error }}>Stop</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {splits.length > 0 ? (
        <View style={styles.liveSplits}>
          {splits.slice(-3).map((split, i) => (
            <View key={i} style={[styles.splitRow, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="secondary">{split.label}</ThemedText>
              <ThemedText type="body" style={styles.splitTime}>
                {formatTime(split.elapsedSeconds)}
              </ThemedText>
            </View>
          ))}
          {splits.length > 3 ? (
            <ThemedText type="muted" style={styles.moreSplits}>
              +{splits.length - 3} more
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    gap: Spacing.lg,
  },
  intervalInfo: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  phaseTag: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  phaseBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  phaseFill: {
    height: "100%",
    borderRadius: 3,
  },
  timerDisplay: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  timerText: {
    fontSize: 64,
    lineHeight: 72,
    fontFamily: "Inter_700Bold",
  },
  breakLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  activeTimeLabel: {
    marginTop: Spacing.sm,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  completedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  completedInfo: {
    flex: 1,
    gap: 2,
  },
  splitsSection: {
    gap: Spacing.sm,
  },
  splitsTitle: {
    marginBottom: Spacing.xs,
  },
  liveSplits: {
    gap: Spacing.sm,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  splitTime: {
    fontVariant: ["tabular-nums"],
    fontFamily: "Inter_500Medium",
  },
  moreSplits: {
    textAlign: "center",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.md,
  },
});
