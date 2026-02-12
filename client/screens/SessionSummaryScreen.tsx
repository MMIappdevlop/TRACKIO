import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SessionShareCard } from "@/components/SessionShareCard";
import { useTheme } from "@/hooks/useTheme";
import { completedSessionsStorage, completedTasksStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { CompletedSession, CompletedTask } from "@/types";

type RoutePropType = RouteProp<RootStackParamList, "SessionSummary">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REFLECTIVE_QUOTES = [
  "Sessions like this build long-term capacity.",
  "Consistency matters more than intensity.",
  "Every rep counts toward your goal.",
  "Progress is measured in months, not days.",
  "The work you do today shapes tomorrow.",
  "Patience and persistence win every time.",
];

const INSIGHTS = {
  volumeUp: "Volume was higher than last time.",
  volumeDown: "Volume was lower than last time.",
  volumeSame: "Volume matched your previous session.",
  distanceUp: "Distance increased from last session.",
  distanceDown: "Distance was shorter than last session.",
  distanceSame: "Distance matched your previous session.",
  firstSession: "Great start with this session.",
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${Math.round(kg)}kg`;
}

export default function SessionSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { completedSessionId } = route.params;

  const [session, setSession] = useState<CompletedSession | null>(null);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [rating, setRating] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const quote = useMemo(
    () => REFLECTIVE_QUOTES[Math.floor(Math.random() * REFLECTIVE_QUOTES.length)],
    []
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedSession = await completedSessionsStorage.getById(completedSessionId);
    setSession(loadedSession);
    if (loadedSession) {
      const loadedTasks = await completedTasksStorage.getBySessionId(loadedSession.id);
      setTasks(loadedTasks);
    }
  };

  const calculateStats = () => {
    const tasksCompleted = tasks.length;
    let setsCompleted = 0;
    let totalVolume = 0;
    let totalDistance = 0;
    let totalActivityDuration = 0;

    for (const task of tasks) {
      if (task.mode === "strength" && task.dataJson.sets) {
        const completedSets = task.dataJson.sets.filter((s) => s.isCompleted);
        setsCompleted += completedSets.length;
        for (const set of completedSets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      } else if (task.mode === "distance" && task.dataJson.distance) {
        totalDistance += task.dataJson.distance;
        if (task.dataJson.durationSeconds) {
          totalActivityDuration += task.dataJson.durationSeconds;
        }
      } else if (task.mode === "interval") {
        if (task.dataJson.durationSeconds) {
          totalActivityDuration += task.dataJson.durationSeconds;
        }
      } else if (task.mode === "time" && task.dataJson.durationSeconds) {
        totalActivityDuration += task.dataJson.durationSeconds;
      }
    }

    return { tasksCompleted, setsCompleted, totalVolume, totalDistance, totalActivityDuration };
  };

  const captureShareImage = async (): Promise<string | null> => {
    if (!shareCardRef.current) return null;
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: 1080,
        height: 1920,
      });
      return uri;
    } catch (e) {
      console.error("Capture failed:", e);
      return null;
    }
  };

  const handleShare = async () => {
    setIsCapturing(true);
    try {
      const uri = await captureShareImage();
      if (!uri) {
        Alert.alert("Error", "Could not generate the share image. Please try again.");
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your session",
          UTI: "public.png",
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not supported on this device.");
      }
    } finally {
      setIsCapturing(false);
      setShowShareOptions(false);
    }
  };

  const handleSaveToPhotos = async () => {
    setIsCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photo library to save the image.");
        return;
      }
      const uri = await captureShareImage();
      if (!uri) {
        Alert.alert("Error", "Could not generate the share image. Please try again.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Image saved to your photo library.");
    } catch (e) {
      Alert.alert("Error", "Could not save image. Please try again.");
    } finally {
      setIsCapturing(false);
      setShowShareOptions(false);
    }
  };

  const handleCopyImage = async () => {
    setIsCapturing(true);
    try {
      const uri = await captureShareImage();
      if (!uri) {
        Alert.alert("Error", "Could not generate the share image. Please try again.");
        return;
      }
      if (Platform.OS === "web") {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Copied", "Image copied to clipboard.");
        } catch {
          Alert.alert("Error", "Could not copy image on this browser.");
        }
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Copy or share your session",
            UTI: "public.png",
          });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert("Error", "Could not copy image. Please try again.");
    } finally {
      setIsCapturing(false);
      setShowShareOptions(false);
    }
  };

  const handleRating = (value: number) => {
    setRating(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (session) {
      await completedSessionsStorage.update(session.id, { difficultyRating: rating });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.popToTop();
  };

  if (!session) return null;

  const stats = calculateStats();
  const insight = INSIGHTS.firstSession;
  const durationStr = formatDuration(stats.totalActivityDuration > 0 ? stats.totalActivityDuration : session.durationSeconds);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.successIcon, { backgroundColor: Colors.dark.success + "20" }]}>
            <Feather name="check-circle" size={48} color={Colors.dark.success} />
          </View>
          <ThemedText type="h1" style={styles.title}>Session Complete</ThemedText>
          <ThemedText type="secondary">{session.sessionTemplateName}</ThemedText>
        </View>

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <ThemedText type="stat">{stats.tasksCompleted}</ThemedText>
              <ThemedText type="muted">Exercises</ThemedText>
            </View>
            {stats.setsCompleted > 0 ? (
              <View style={styles.stat}>
                <ThemedText type="stat">{stats.setsCompleted}</ThemedText>
                <ThemedText type="muted">Sets</ThemedText>
              </View>
            ) : null}
            <View style={styles.stat}>
              <ThemedText type="stat">{durationStr}</ThemedText>
              <ThemedText type="muted">Duration</ThemedText>
            </View>
          </View>
          {stats.totalVolume > 0 || stats.totalDistance > 0 ? (
            <View style={styles.statRow}>
              {stats.totalVolume > 0 ? (
                <View style={styles.stat}>
                  <ThemedText type="stat">{formatVolume(stats.totalVolume)}</ThemedText>
                  <ThemedText type="muted">Volume</ThemedText>
                </View>
              ) : null}
              {stats.totalDistance > 0 ? (
                <View style={styles.stat}>
                  <ThemedText type="stat">{stats.totalDistance.toFixed(1)}km</ThemedText>
                  <ThemedText type="muted">Distance</ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="trending-up" size={20} color={theme.link} />
          <ThemedText type="body" style={styles.insightText}>{insight}</ThemedText>
        </View>

        <View style={styles.ratingSection}>
          <ThemedText type="h2" style={styles.ratingTitle}>How was it?</ThemedText>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => handleRating(value)} style={styles.starButton}>
                <Ionicons
                  name={value <= rating ? "star" : "star-outline"}
                  size={36}
                  color={value <= rating ? Colors.dark.gold : theme.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.quoteCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="secondary" style={styles.quoteText}>"{quote}"</ThemedText>
        </View>

        <Pressable
          onPress={() => setShowShareOptions(!showShareOptions)}
          style={[styles.shareButton, { backgroundColor: theme.link }]}
        >
          <Feather name="share" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={styles.shareButtonText}>Share</ThemedText>
        </Pressable>

        {showShareOptions ? (
          <View style={[styles.shareOptionsCard, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable onPress={handleShare} style={styles.shareOption} disabled={isCapturing}>
              <View style={[styles.shareOptionIcon, { backgroundColor: "rgba(76, 125, 255, 0.15)" }]}>
                <Feather name="send" size={20} color={theme.link} />
              </View>
              <View style={styles.shareOptionText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>Share to Story</ThemedText>
                <ThemedText type="muted">Instagram, Messages, and more</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>

            <View style={[styles.shareOptionDivider, { backgroundColor: theme.border }]} />

            <Pressable onPress={handleSaveToPhotos} style={styles.shareOption} disabled={isCapturing}>
              <View style={[styles.shareOptionIcon, { backgroundColor: "rgba(48, 209, 88, 0.15)" }]}>
                <Feather name="download" size={20} color={Colors.dark.success} />
              </View>
              <View style={styles.shareOptionText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>Save as PNG</ThemedText>
                <ThemedText type="muted">Save to your photo library</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>

            <View style={[styles.shareOptionDivider, { backgroundColor: theme.border }]} />

            <Pressable onPress={handleCopyImage} style={styles.shareOption} disabled={isCapturing}>
              <View style={[styles.shareOptionIcon, { backgroundColor: "rgba(255, 159, 10, 0.15)" }]}>
                <Feather name="copy" size={20} color={Colors.dark.warning} />
              </View>
              <View style={styles.shareOptionText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>Copy Image</ThemedText>
                <ThemedText type="muted">Copy to clipboard</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <Button onPress={handleSave} style={styles.saveButton}>
          Save Session
        </Button>
      </ScrollView>

      <SessionShareCard
        ref={shareCardRef}
        exercisesCompleted={stats.tasksCompleted}
        duration={durationStr}
        rating={rating}
        quote={quote}
        sessionName={session.sessionTemplateName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  statsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  stat: {
    alignItems: "center",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  insightText: {
    flex: 1,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  ratingTitle: {
    marginBottom: Spacing.md,
  },
  ratingStars: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  quoteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  quoteText: {
    fontStyle: "italic",
    textAlign: "center",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  shareOptionsCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  shareOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionText: {
    flex: 1,
    gap: 2,
  },
  shareOptionDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  saveButton: {
    marginTop: Spacing.sm,
  },
});
