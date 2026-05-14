import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { ChartEmptyState } from "@/components/charts/ChartEmptyState";
import { useTheme } from "@/hooks/useTheme";
import {
  completedSessionsStorage,
  completedTasksStorage,
  weightLogStorage,
  settingsStorage,
} from "@/lib/storage";
import {
  getWorkoutFrequency,
  getStrengthProgression,
  getWeeklyVolume,
  getWeeklyDistance,
  getBodyWeightTrend,
  getUniqueStrengthExercises,
  type ChartRange,
} from "@/lib/chartData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CompletedSession, CompletedTask, WeightLogEntry } from "@/types";

const RANGES: { label: string; value: ChartRange }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "All", value: "all" },
];

function RangePills({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (r: ChartRange) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.rangePills}>
      {RANGES.map((r) => {
        const active = r.value === value;
        return (
          <Pressable
            key={r.value}
            onPress={() => onChange(r.value)}
            style={[
              styles.rangePill,
              {
                backgroundColor: active ? theme.link : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.rangePillText,
                { color: active ? theme.buttonText : theme.textSecondary },
              ]}
            >
              {r.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeader({
  title,
  range,
  onRangeChange,
}: {
  title: string;
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="h3">{title}</ThemedText>
      <RangePills value={range} onChange={onRangeChange} />
    </View>
  );
}

export default function LongTermProgressScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chartWidth = width - Spacing.lg * 2;

  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState<CompletedSession[]>([]);
  const [allTasks, setAllTasks] = useState<CompletedTask[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightLogEntry[]>([]);
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");

  const [freqRange, setFreqRange] = useState<ChartRange>("3m");
  const [strengthRange, setStrengthRange] = useState<ChartRange>("3m");
  const [volumeRange, setVolumeRange] = useState<ChartRange>("3m");
  const [distRange, setDistRange] = useState<ChartRange>("3m");
  const [bwRange, setBwRange] = useState<ChartRange>("3m");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [sessions, tasks, weights, settings] = await Promise.all([
        completedSessionsStorage.getAll(),
        completedTasksStorage.getAll(),
        weightLogStorage.getAll(),
        settingsStorage.get(),
      ]);
      setAllSessions(sessions);
      setAllTasks(tasks);
      setWeightEntries(weights);
      setDistanceUnit(settings.distanceUnit || "km");
      const exercises = getUniqueStrengthExercises(tasks);
      if (exercises.length > 0) setSelectedExercise(exercises[0]);
      setLoading(false);
    };
    load();
  }, []);

  const freqData = useMemo(
    () => getWorkoutFrequency(allSessions, freqRange),
    [allSessions, freqRange]
  );
  const strengthData = useMemo(
    () =>
      selectedExercise
        ? getStrengthProgression(allTasks, selectedExercise, strengthRange)
        : [],
    [allTasks, selectedExercise, strengthRange]
  );
  const volumeData = useMemo(
    () => getWeeklyVolume(allTasks, allSessions, volumeRange),
    [allTasks, allSessions, volumeRange]
  );
  const distData = useMemo(
    () => getWeeklyDistance(allTasks, distRange),
    [allTasks, distRange]
  );
  const bwData = useMemo(
    () => getBodyWeightTrend(weightEntries, bwRange),
    [weightEntries, bwRange]
  );

  const strengthExercises = useMemo(
    () => getUniqueStrengthExercises(allTasks),
    [allTasks]
  );

  const fmtVolume = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  const fmtWeight = (v: number) => `${v.toFixed(1)}`;
  const fmtDist = (v: number) => `${v.toFixed(1)}`;

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator color={theme.link} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["4xl"],
        },
      ]}
    >
      {/* Workout Frequency */}
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <SectionHeader
          title="Workout Frequency"
          range={freqRange}
          onRangeChange={setFreqRange}
        />
        <ThemedText type="muted" style={styles.sectionSubtitle}>
          Workouts per week
        </ThemedText>
        {freqData.length > 0 ? (
          <BarChart data={freqData} color={theme.link} width={chartWidth} />
        ) : (
          <ChartEmptyState message="Complete workouts to see your frequency trend" />
        )}
      </View>

      {/* Strength Progression */}
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <SectionHeader
          title="Strength Progression"
          range={strengthRange}
          onRangeChange={setStrengthRange}
        />
        <ThemedText type="muted" style={styles.sectionSubtitle}>
          Max weight per session · tap a point for value
        </ThemedText>
        {strengthExercises.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.exercisePicker}
              contentContainerStyle={styles.exercisePickerContent}
            >
              {strengthExercises.map((name) => {
                const active = name === selectedExercise;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setSelectedExercise(name)}
                    style={[
                      styles.exercisePill,
                      {
                        backgroundColor: active
                          ? theme.effort + "22"
                          : theme.backgroundSecondary,
                        borderColor: active ? theme.effort : "transparent",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.exercisePillText,
                        { color: active ? theme.effort : theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {strengthData.length > 0 ? (
              <LineChart
                data={strengthData}
                color={theme.effort}
                width={chartWidth}
                showTooltip
                formatValue={fmtWeight}
              />
            ) : (
              <ChartEmptyState message="No strength data for this exercise in range" />
            )}
          </>
        ) : (
          <ChartEmptyState message="Log strength exercises to track progression" />
        )}
      </View>

      {/* Weekly Volume */}
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <SectionHeader
          title="Weekly Volume"
          range={volumeRange}
          onRangeChange={setVolumeRange}
        />
        <ThemedText type="muted" style={styles.sectionSubtitle}>
          Total training weight per week (sets x reps x weight)
        </ThemedText>
        {volumeData.length > 0 ? (
          <BarChart
            data={volumeData}
            color={theme.link}
            width={chartWidth}
            formatValue={fmtVolume}
          />
        ) : (
          <ChartEmptyState message="Log strength sets to see weekly volume" />
        )}
      </View>

      {/* Distance / Cardio */}
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <SectionHeader
          title="Distance / Cardio"
          range={distRange}
          onRangeChange={setDistRange}
        />
        <ThemedText type="muted" style={styles.sectionSubtitle}>
          {`Total distance per week (${distanceUnit})`}
        </ThemedText>
        {distData.length > 0 ? (
          <LineChart
            data={distData}
            color={theme.success}
            width={chartWidth}
            formatValue={fmtDist}
          />
        ) : (
          <ChartEmptyState message="Log distance exercises to see cardio trends" />
        )}
      </View>

      {/* Body Weight */}
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <SectionHeader
          title="Body Weight"
          range={bwRange}
          onRangeChange={setBwRange}
        />
        <ThemedText type="muted" style={styles.sectionSubtitle}>
          Weight log entries over time
        </ThemedText>
        {bwData.length > 0 ? (
          <LineChart
            data={bwData}
            color={theme.warning}
            width={chartWidth}
            formatValue={fmtWeight}
          />
        ) : (
          <ChartEmptyState message="Log your weight to track body weight trends" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  rangePills: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  rangePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  exercisePicker: {
    marginBottom: Spacing.md,
  },
  exercisePickerContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  exercisePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 200,
  },
  exercisePillText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
