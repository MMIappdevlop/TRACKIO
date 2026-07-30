/**
 * ExerciseGifPanel
 *
 * Animated exercise demonstration panel for the session run screen.
 * Cycles between frame URLs at 600 ms intervals to simulate a looping GIF.
 * Frames are prefetched via expo-image on first render so the animation is
 * smooth from the very first cycle.
 *
 * - Returns null when frameUrls is empty — no placeholder, no empty space.
 * - Controlled expand/collapse: caller tracks state (use a ref map so state
 *   survives exercise navigation without triggering re-renders).
 * - Height is ~25 % of the screen so it never dominates the sets below.
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const FRAME_MS = 600;
const GIF_HEIGHT = Math.round(Dimensions.get("window").height * 0.25);

interface Props {
  /** Ordered frame URLs.  Component renders nothing when this is empty. */
  frameUrls: string[];
  /** Whether the panel body is currently expanded. */
  expanded: boolean;
  /** Called when the user taps the header row to toggle expand/collapse. */
  onToggle: () => void;
}

export function ExerciseGifPanel({ frameUrls, expanded, onToggle }: Props) {
  const { theme } = useTheme();
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prefetch all frames whenever the URL set changes so the first cycle is smooth
  useEffect(() => {
    if (!frameUrls || frameUrls.length === 0) return;
    frameUrls.forEach((url) => Image.prefetch(url));
    setFrameIndex(0);
  }, [frameUrls]);

  // Start / stop the frame-cycling interval based on expanded state
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!expanded || !frameUrls || frameUrls.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frameUrls.length);
    }, FRAME_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expanded, frameUrls]);

  if (!frameUrls || frameUrls.length === 0) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
    >
      {/* Tap the header row to collapse / expand */}
      <Pressable style={styles.header} onPress={onToggle} hitSlop={8}>
        <Feather name="play-circle" size={14} color={theme.link} />
        <ThemedText style={[styles.label, { color: theme.link }]}>
          Form guide
        </ThemedText>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.link}
        />
      </Pressable>

      {expanded ? (
        <Image
          key={frameUrls[frameIndex]}
          source={{ uri: frameUrls[frameIndex] }}
          style={[styles.frame, { height: GIF_HEIGHT }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={100}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  frame: {
    width: "100%",
  },
});
