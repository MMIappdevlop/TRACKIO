/**
 * ExerciseIllustration
 *
 * Animates through exercise frames (start/end pose) fetched from the
 * server-side /api/exercise-lookup proxy, creating a looping motion effect.
 * Frames are preloaded via expo-image so the cycle is smooth from the start.
 * Data is cached in AsyncStorage so subsequent views are instant + offline-capable.
 *
 * Usage (non-collapsible, e.g. history screen):
 *   <ExerciseIllustration exerciseName={task.name} />
 *
 * Usage (collapsible, e.g. session run screen):
 *   <ExerciseIllustration exerciseName={task.name} collapsible />
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  lookupExercise,
  ExerciseIllustrationData,
} from "@/lib/exerciseIllustrations";
import { Spacing, BorderRadius } from "@/constants/theme";

/** ms per frame.  Two frames at 600 ms each ≈ a clear start→end→start loop. */
const FRAME_MS = 600;

interface Props {
  exerciseName: string;
  /** When true, wraps content in a toggleable "Form guide" row. */
  collapsible?: boolean;
  /** Initial expansion state when collapsible (default: false). */
  defaultExpanded?: boolean;
}

export function ExerciseIllustration({
  exerciseName,
  collapsible = false,
  defaultExpanded = false,
}: Props) {
  const { theme } = useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "empty">(
    "loading",
  );
  const [data, setData] = useState<ExerciseIllustrationData | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch + cache illustration data
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setData(null);
    setFrameIndex(0);
    fadeAnim.setValue(0);

    lookupExercise(exerciseName).then((result) => {
      if (cancelled) return;
      setData(result);
      setStatus(result ? "ready" : "empty");
      if (result) {
        // Prefetch all frames so the animation is smooth from the first cycle
        result.frameUrls.forEach((url) => Image.prefetch(url));
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseName]);

  // Frame-cycling animation — only runs when data has more than one frame
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!data || data.frameUrls.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setFrameIndex((i) => (i + 1) % data.frameUrls.length);
    }, FRAME_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data]);

  if (status !== "ready" || !data) return null;

  const currentFrameUri = data.frameUrls[frameIndex] ?? data.gifUrl;

  const muscles = [
    ...data.targetMuscles.map((m) => ({ label: capitalize(m), primary: true })),
    ...data.secondaryMuscles.map((m) => ({
      label: capitalize(m),
      primary: false,
    })),
  ];

  const illustration = (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Animated exercise illustration — cycles through start/end pose frames */}
      <Image
        key={currentFrameUri}
        source={{ uri: currentFrameUri }}
        style={styles.frame}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={100}
      />

      {muscles.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {muscles.map((m, i) => (
            <View
              key={i}
              style={[
                styles.chip,
                {
                  backgroundColor: m.primary
                    ? theme.linkBackground
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: m.primary ? theme.link : theme.textSecondary },
                ]}
              >
                {m.label}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </Animated.View>
  );

  if (!collapsible) {
    return (
      <View
        style={[
          styles.staticContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        {illustration}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.collapsibleContainer,
        { backgroundColor: theme.backgroundSecondary },
      ]}
    >
      <Pressable
        style={styles.toggleRow}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={8}
      >
        <Feather name="play-circle" size={14} color={theme.link} />
        <ThemedText style={[styles.toggleLabel, { color: theme.link }]}>
          Form guide
        </ThemedText>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.link}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.expandedContent}>{illustration}</View>
      ) : null}
    </View>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  staticContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginTop: Spacing.md,
  },
  collapsibleContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  expandedContent: {
    paddingBottom: Spacing.sm,
  },
  frame: {
    width: "100%",
    height: 220,
  },
  chips: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
