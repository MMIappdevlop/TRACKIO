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
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SessionShareCard } from "@/components/SessionShareCard";
import { useTheme } from "@/hooks/useTheme";
import { completedSessionsStorage, completedTasksStorage, settingsStorage } from "@/lib/storage";
import { estimateCalories, isCalorieTrackingReady } from "@/lib/calories";
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
  const { completedSessionId, completionRatio } = route.params;
  const isLowCompletion = completionRatio !== undefined && completionRatio < 0.6;

  const [session, setSession] = useState<CompletedSession | null>(null);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [rating, setRating] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [estCalories, setEstCalories] = useState(0);
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

      const settings = await settingsStorage.get();
      if (isCalorieTrackingReady(settings)) {
        const weightKg = settings.userWeight
          ? settings.weightUnit === "lb"
            ? settings.userWeight * 0.4536
            : settings.userWeight
          : undefined;
        const calories = estimateCalories(loadedTasks, loadedSession.durationSeconds, weightKg);
        setEstCalories(calories);

        if (calories > 0 && !loadedSession.estimatedCalories) {
          await completedSessionsStorage.update(loadedSession.id, { estimatedCalories: calories });
        }
      }
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

  const getDominantPlanKind = (): "strength" | "endurance" | "interval" | "sport" => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      const mode = task.mode;
      if (mode === "strength") counts["strength"] = (counts["strength"] || 0) + 1;
      else if (mode === "distance" || mode === "time") counts["endurance"] = (counts["endurance"] || 0) + 1;
      else if (mode === "interval") counts["interval"] = (counts["interval"] || 0) + 1;
      else counts["sport"] = (counts["sport"] || 0) + 1;
    }
    let max = 0;
    let kind: "strength" | "endurance" | "interval" | "sport" = "strength";
    for (const [k, v] of Object.entries(counts)) {
      if (v > max) {
        max = v;
        kind = k as typeof kind;
      }
    }
    return kind;
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
          {stats.totalVolume > 0 || stats.totalDistance > 0 || estCalories > 0 ? (
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
              {estCalories > 0 ? (
                <View style={styles.stat}>
                  <ThemedText type="stat">{estCalories}</ThemedText>
                  <ThemedText type="muted">Est. Calories</ThemedText>
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
          {isLowCompletion ? (
            <>
              <Feather name="heart" size={20} color={theme.link} style={styles.caringIcon} />
              <ThemedText type="body" style={styles.caringText}>
                We noticed a lighter session today. Everything alright? Rest well — we'll be here when you're ready.
              </ThemedText>
            </>
          ) : (
            <ThemedText type="secondary" style={styles.quoteText}>"{quote}"</ThemedText>
          )}
        </View>

        <View style={[styles.shareCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={styles.shareTitle}>Share Session</ThemedText>
          <ThemedText type="muted" style={styles.shareSubtitle}>{session.sessionTemplateName}</ThemedText>
          <View style={styles.shareButtons}>
            <Pressable onPress={handleSaveToPhotos} style={[styles.shareBtn, { backgroundColor: theme.backgroundSecondary }]} disabled={isCapturing}>
              <Feather name="download" size={18} color={theme.text} />
              <ThemedText type="body">Save PNG</ThemedText>
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.shareBtn, { backgroundColor: theme.link }]} disabled={isCapturing}>
              <Feather name="share" size={18} color={theme.buttonText} />
              <ThemedText type="body" style={{ color: theme.buttonText }}>Share</ThemedText>
            </Pressable>
          </View>
        </View>

        <Button onPress={handleSave} style={styles.saveButton}>
          Save Session
        </Button>
      </ScrollView>

      <SessionShareCard
        ref={shareCardRef}
        exercisesCompleted={stats.tasksCompleted}
        duration={durationStr}
        planKind={getDominantPlanKind()}
        estimatedCalories={estCalories}
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
    alignItems: "center",
  },
  quoteText: {
    fontStyle: "italic",
    textAlign: "center",
  },
  caringIcon: {
    marginBottom: Spacing.sm,
  },
  caringText: {
    textAlign: "center",
    lineHeight: 22,
  },
  shareCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  shareTitle: {
    marginBottom: Spacing.xs,
  },
  shareSubtitle: {
    marginBottom: Spacing.lg,
  },
  shareButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  saveButton: {
    marginTop: Spacing.sm,
  },
});
