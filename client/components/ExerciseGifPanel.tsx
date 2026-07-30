/**
 * ExerciseGifPanel
 *
 * Animated exercise demonstration panel for the session run screen.
 * Cycles between frame URLs at 600 ms intervals to simulate a looping GIF.
 *
 * Auto-fetch behaviour:
 * - When frameUrls is empty and exerciseName is provided, the component
 *   calls /api/exercise-lookup and shows the result automatically.
 * - Once fetched, onAutoFetched is called so the caller can persist the
 *   URLs and avoid re-fetching on the next render.
 *
 * - Returns null while no frames are available (loading or not found).
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
import { getApiUrl } from "@/lib/query-client";

const FRAME_MS = 600;
const GIF_HEIGHT = Math.round(Dimensions.get("window").height * 0.25);

interface Props {
  /** Explicit frame URLs. When non-empty these take priority over auto-fetch. */
  frameUrls: string[];
  /** Whether the panel body is currently expanded. */
  expanded: boolean;
  /** Called when the user taps the header row to toggle expand/collapse. */
  onToggle: () => void;
  /**
   * Exercise name used for automatic GIF lookup when frameUrls is empty.
   * Triggers a call to /api/exercise-lookup on the first render where
   * frameUrls is still empty.
   */
  exerciseName?: string;
  /**
   * Called once when frames are resolved via auto-fetch so the caller can
   * persist them (e.g. write back to taskTemplatesStorage).
   */
  onAutoFetched?: (frameUrls: string[]) => void;
}

export function ExerciseGifPanel({
  frameUrls,
  expanded,
  onToggle,
  exerciseName,
  onAutoFetched,
}: Props) {
  const { theme } = useTheme();
  const [frameIndex, setFrameIndex] = useState(0);
  const [autoFrameUrls, setAutoFrameUrls] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveUrls = frameUrls.length > 0 ? frameUrls : autoFrameUrls;
  const firstUrl = effectiveUrls[0] ?? "";

  // Auto-fetch when no explicit frameUrls and exerciseName is known
  useEffect(() => {
    if (frameUrls.length > 0 || !exerciseName) {
      setAutoFrameUrls([]);
      return;
    }
    let cancelled = false;
    fetch(
      `${getApiUrl()}/api/exercise-lookup?name=${encodeURIComponent(exerciseName)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (
          !cancelled &&
          json?.found &&
          Array.isArray(json.frameUrls) &&
          json.frameUrls.length > 0
        ) {
          setAutoFrameUrls(json.frameUrls);
          onAutoFetched?.(json.frameUrls);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [exerciseName, frameUrls.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch all frames and reset index when the URL set changes
  useEffect(() => {
    if (!firstUrl) return;
    effectiveUrls.forEach((url) => Image.prefetch(url));
    setFrameIndex(0);
  }, [firstUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start / stop the frame-cycling interval based on expanded state
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!expanded || effectiveUrls.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setFrameIndex((i) => (i + 1) % effectiveUrls.length);
    }, FRAME_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expanded, firstUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (effectiveUrls.length === 0) return null;

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
          key={effectiveUrls[frameIndex]}
          source={{ uri: effectiveUrls[frameIndex] }}
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
