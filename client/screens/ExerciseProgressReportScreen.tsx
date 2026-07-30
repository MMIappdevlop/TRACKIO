import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { completedSessionsStorage, completedTasksStorage, programsStorage } from "@/lib/storage";
import { getProgressReport, ReportDayGroup } from "@/lib/chartData";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import type { ProgressStackParamList } from "@/navigation/ProgressStackNavigator";
import type { CompletedSession, CompletedTask, Program } from "@/types";

type NavigationProp = NativeStackNavigationProp<ProgressStackParamList>;

// ─── Layout constants ────────────────────────────────────────────────────────
const EXERCISE_COL_WIDTH = 118;
const DATE_COL_WIDTH = 72;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 36;

// ─── Date preset helpers ─────────────────────────────────────────────────────
type DatePreset = "1w" | "2w" | "1m" | "3m" | "custom";

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "1W", value: "1w" },
  { label: "2W", value: "2w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "Custom", value: "custom" },
];

/** Subtract months without overflowing into the next month (e.g. Mar 31 − 1m → Feb 28). */
function subtractMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date);
  result.setDate(1);                                    // prevent mid-change overflow
  result.setMonth(result.getMonth() - months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));               // clamp to target month's last day
  return result;
}

function getPresetRange(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "1w": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    case "2w": {
      const from = new Date(today);
      from.setDate(from.getDate() - 13);
      return { from, to: today };
    }
    case "1m":
      return { from: subtractMonths(today, 1), to: today };
    case "3m":
      return { from: subtractMonths(today, 3), to: today };
    default:
      return { from: subtractMonths(today, 1), to: today };
  }
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtColDate(dateKey: string): string {
  const parts = dateKey.split("-");
  return `${parts[2]}/${parts[1]}`;
}

function fmtRangeLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const f = from.toLocaleDateString("en-GB", opts);
  const t = to.toLocaleDateString("en-GB", opts);
  const yr = to.getFullYear();
  return `${f} – ${t}, ${yr}`;
}

// ─── Delta helpers ────────────────────────────────────────────────────────────
type Delta = "up" | "down" | "same";

function getDelta(
  current: { rawValue: number } | null | undefined,
  previous: { rawValue: number } | null | undefined
): Delta | null {
  if (!current || !previous) return null;
  if (current.rawValue > previous.rawValue) return "up";
  if (current.rawValue < previous.rawValue) return "down";
  return "same";
}

function getPrevCell(
  row: { cells: { [d: string]: { rawValue: number } | null } },
  dates: string[],
  currentIdx: number
): { rawValue: number } | null {
  for (let i = currentIdx - 1; i >= 0; i--) {
    const c = row.cells[dates[i]];
    if (c) return c;
  }
  return null;
}

// ─── CSV generation ───────────────────────────────────────────────────────────
function generateCsv(groups: ReportDayGroup[], from: Date, to: Date): string {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const lines: string[] = [
    "Training Progress Report",
    `${fmtDate(from)} - ${fmtDate(to)}`,
  ];

  for (const group of groups) {
    lines.push("");
    lines.push(group.dayName);
    const dateCols = group.dates.map(fmtColDate);
    lines.push(["Exercise", ...dateCols].join(","));
    for (const ex of group.exercises) {
      const cells = group.dates.map((d) => {
        const c = ex.cells[d];
        return c ? c.display : "";
      });
      const safeName = ex.name.includes(",") ? `"${ex.name}"` : ex.name;
      lines.push([safeName, ...cells].join(","));
    }
  }

  return lines.join("\n");
}

// ─── Month names ─────────────────────────────────────────────────────────────
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ─── DayCalendar component ────────────────────────────────────────────────────
interface DayCalendarProps {
  fromDate: Date;
  toDate: Date;
  editing: "from" | "to";
  onSelectDate: (d: Date) => void;
}

function DayCalendar({ fromDate, toDate, editing, onSelectDate }: DayCalendarProps) {
  const { theme } = useTheme();
  const now = new Date();
  const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const initDate = editing === "to" ? toDate : fromDate;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  // Jump to the relevant date when the user switches from/to
  useEffect(() => {
    const target = editing === "to" ? toDate : fromDate;
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Normalize to midnight for comparisons
  const fromTime = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
  const toTime   = new Date(toDate.getFullYear(),   toDate.getMonth(),   toDate.getDate()).getTime();
  const [rangeMin, rangeMax] = fromTime <= toTime ? [fromTime, toTime] : [toTime, fromTime];

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
  };

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  return (
    <View style={calStyles.container}>
      {/* Month / year header */}
      <View style={calStyles.monthNav}>
        <Pressable onPress={goToPrevMonth} hitSlop={10} style={calStyles.navBtn}>
          <Feather name="chevron-left" size={18} color={theme.textSecondary} />
        </Pressable>
        <ThemedText style={calStyles.monthLabel}>
          {MONTH_SHORT[viewMonth]} {viewYear}
        </ThemedText>
        <Pressable onPress={goToNextMonth} hitSlop={10} style={calStyles.navBtn}>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Day-of-week header */}
      <View style={calStyles.weekRow}>
        {DOW_SHORT.map((d) => (
          <View key={d} style={calStyles.weekCell}>
            <ThemedText style={[calStyles.weekText, { color: theme.textMuted }]}>{d}</ThemedText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.grid}>
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstDow + 1;
          if (day < 1 || day > daysInMonth) {
            return <View key={`pad-${i}`} style={calStyles.dayCell} />;
          }
          const cellTime    = new Date(viewYear, viewMonth, day).getTime();
          const isFrom      = cellTime === fromTime;
          const isTo        = cellTime === toTime;
          const isSelected  = isFrom || isTo;
          const inRange     = cellTime > rangeMin && cellTime < rangeMax;
          const isRangeEdge = (cellTime === rangeMin || cellTime === rangeMax) && fromTime !== toTime;
          const isToday     = cellTime === todayTime;
          const col         = i % 7; // 0=Sun … 6=Sat
          const isFirstCol  = col === 0;
          const isLastCol   = col === 6;

          return (
            <Pressable
              key={day}
              style={calStyles.dayCell}
              onPress={() => onSelectDate(new Date(viewYear, viewMonth, day))}
            >
              {/* Range highlight strip */}
              {(inRange || isRangeEdge) ? (
                <View
                  style={[
                    calStyles.rangeBg,
                    { backgroundColor: theme.linkBackground },
                    (isFrom && fromTime < toTime) || (isTo && toTime < fromTime) || isFirstCol
                      ? calStyles.rangeEdgeLeft : null,
                    (isTo && toTime > fromTime) || (isFrom && fromTime > toTime) || isLastCol
                      ? calStyles.rangeEdgeRight : null,
                  ]}
                />
              ) : null}
              {/* Selected circle */}
              {isSelected ? (
                <View style={[calStyles.selectedCircle, { backgroundColor: theme.link }]} />
              ) : null}
              <ThemedText
                style={[
                  calStyles.dayText,
                  {
                    color: isSelected ? "#fff" : isToday ? theme.link : theme.text,
                    fontWeight: isSelected || isToday ? "700" : "400",
                  },
                ]}
              >
                {day}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { gap: 4 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Typography.body.fontFamily,
  },
  weekRow: { flexDirection: "row" },
  weekCell: { flex: 1, alignItems: "center", paddingVertical: 3 },
  weekText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Typography.body.fontFamily,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.285714%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBg: {
    position: "absolute",
    top: "15%",
    bottom: "15%",
    left: 0,
    right: 0,
  },
  rangeEdgeLeft:  { left: "50%", borderTopLeftRadius: 99, borderBottomLeftRadius: 99 },
  rangeEdgeRight: { right: "50%", borderTopRightRadius: 99, borderBottomRightRadius: 99 },
  selectedCircle: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dayText: {
    fontSize: 13,
    fontFamily: Typography.body.fontFamily,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExerciseProgressReportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [preset, setPreset] = useState<DatePreset>("1m");

  // Custom range stored as specific days
  const [customFrom, setCustomFrom] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1); // first of this month
  });
  const [customTo, setCustomTo] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // today
  });
  const [editing, setEditing] = useState<"from" | "to">("from");

  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState<CompletedSession[]>([]);
  const [allTasks, setAllTasks] = useState<CompletedTask[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // ── Date range ──────────────────────────────────────────────────────────────
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      // Normalise to midnight and swap if user picked end before start
      const f = new Date(customFrom.getFullYear(), customFrom.getMonth(), customFrom.getDate());
      const t = new Date(customTo.getFullYear(),   customTo.getMonth(),   customTo.getDate());
      return f <= t ? { from: f, to: t } : { from: t, to: f };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [sessions, tasks, programs] = await Promise.all([
      completedSessionsStorage.getAll(),
      completedTasksStorage.getAll(),
      programsStorage.getAll(),
    ]);
    setAllSessions(sessions);
    setAllTasks(tasks);
    setAllPrograms(programs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Programs that have sessions in the selected range ───────────────────────
  const programsInRange = useMemo(() => {
    const fromMs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const toMs   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate(), 23, 59, 59, 999).getTime();
    const ids = new Set(
      allSessions
        .filter((s) => {
          const t = new Date(s.completedAt).getTime();
          return t >= fromMs && t <= toMs;
        })
        .map((s) => s.programId)
    );
    return allPrograms.filter((p) => ids.has(p.id));
  }, [allSessions, allPrograms, from, to]);

  // Reset selectedProgramId if it's no longer in range
  useEffect(() => {
    if (selectedProgramId && !programsInRange.some((p) => p.id === selectedProgramId)) {
      setSelectedProgramId(null);
    }
  }, [programsInRange, selectedProgramId]);

  // ── Compute report ──────────────────────────────────────────────────────────
  const reportData = useMemo(
    () => getProgressReport(allTasks, allSessions, from, to, selectedProgramId ?? undefined),
    [allTasks, allSessions, from, to, selectedProgramId]
  );

  // Default-expand all day groups when data changes
  useEffect(() => {
    setExpandedDays(new Set(reportData.map((g) => g.sessionTemplateId)));
  }, [reportData]);

  // ── Header export button ────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleExport}
          style={{ paddingHorizontal: Spacing.md }}
          hitSlop={8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Feather name="share" size={20} color={reportData.length > 0 ? theme.text : theme.textMuted} />
          )}
        </Pressable>
      ),
    });
  }, [reportData, exporting, theme]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (reportData.length === 0) return;
    setExporting(true);
    try {
      const csv = generateCsv(reportData, from, to);
      const fileName = `progress_${toDateString(from)}_${toDateString(to)}.csv`;

      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(csv);
        Alert.alert("Copied", "CSV report copied to clipboard.");
      } else {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) throw new Error("Cache directory unavailable");
        const fileUri = cacheDir + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Export Progress Report",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          await Clipboard.setStringAsync(csv);
          Alert.alert("Copied", "CSV report copied to clipboard.");
        }
      }
    } catch {
      Alert.alert("Export failed", "Could not export the report.");
    }
    setExporting(false);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const toggleDay = (id: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderDayGroup = (group: ReportDayGroup) => {
    const expanded = expandedDays.has(group.sessionTemplateId);
    return (
      <View
        key={group.sessionTemplateId}
        style={[styles.dayCard, { backgroundColor: theme.backgroundDefault }]}
      >
        {/* Section header */}
        <Pressable
          style={styles.dayHeader}
          onPress={() => toggleDay(group.sessionTemplateId)}
        >
          <View style={styles.dayHeaderLeft}>
            <ThemedText type="h3" style={styles.dayName}>
              {group.dayName}
            </ThemedText>
            <View style={[styles.countPill, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="muted" style={styles.countPillText}>
                {group.dates.length}×
              </ThemedText>
            </View>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.tableContainer}>
            {/* Divider */}
            <View style={[styles.tableDivider, { backgroundColor: theme.border }]} />

            <View style={styles.tableRow}>
              {/* Fixed left column — exercise names */}
              <View style={[styles.leftCol, { borderRightColor: theme.border }]}>
                {/* empty header cell */}
                <View style={[styles.nameHeaderCell, { borderBottomColor: theme.border }]} />
                {group.exercises.map((ex) => (
                  <View key={ex.name} style={styles.nameCell}>
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.nameText, { color: theme.textSecondary }]}
                    >
                      {ex.name}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Scrollable date columns */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollableCols}
              >
                <View>
                  {/* Date header row */}
                  <View
                    style={[
                      styles.dateHeaderRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    {group.dates.map((d) => (
                      <View key={d} style={styles.dateHeaderCell}>
                        <ThemedText style={[styles.dateHeaderText, { color: theme.textMuted }]}>
                          {fmtColDate(d)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>

                  {/* Data rows */}
                  {group.exercises.map((ex) => (
                    <View key={ex.name} style={styles.dataRow}>
                      {group.dates.map((d, di) => {
                        const cell = ex.cells[d];
                        const prevCell = getPrevCell(ex, group.dates, di);
                        const delta = getDelta(cell, prevCell);

                        let deltaColor = theme.textMuted;
                        let deltaSymbol = "";
                        if (delta === "up") {
                          deltaColor = theme.success;
                          deltaSymbol = "↑";
                        } else if (delta === "down") {
                          deltaColor = theme.error;
                          deltaSymbol = "↓";
                        } else if (delta === "same") {
                          deltaColor = theme.textMuted;
                          deltaSymbol = "=";
                        }

                        return (
                          <Pressable
                            key={d}
                            style={({ pressed }) => [
                              styles.dataCell,
                              pressed && cell
                                ? { backgroundColor: theme.backgroundSecondary }
                                : undefined,
                            ]}
                            onPress={() => {
                              if (cell) {
                                navigation.navigate("SessionDetail", {
                                  sessionId: cell.sessionId,
                                });
                              }
                            }}
                            disabled={!cell}
                          >
                            {cell ? (
                              <>
                                <ThemedText style={styles.cellValue}>
                                  {cell.display}
                                </ThemedText>
                                {deltaSymbol ? (
                                  <ThemedText
                                    style={[styles.cellDelta, { color: deltaColor }]}
                                  >
                                    {deltaSymbol}
                                  </ThemedText>
                                ) : null}
                              </>
                            ) : (
                              <ThemedText
                                style={[styles.cellEmpty, { color: theme.textMuted }]}
                              >
                                —
                              </ThemedText>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing["4xl"],
        },
      ]}
    >
      {/* Date range picker */}
      <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {PRESETS.map((p) => {
            const active = preset === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPreset(p.value)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: active ? theme.link : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.presetPillText,
                    { color: active ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {p.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Plan filter — only shown when more than one program has sessions */}
        {programsInRange.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            <Pressable
              onPress={() => setSelectedProgramId(null)}
              style={[
                styles.presetPill,
                {
                  backgroundColor:
                    selectedProgramId === null ? theme.link : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.presetPillText,
                  { color: selectedProgramId === null ? "#fff" : theme.textSecondary },
                ]}
              >
                All plans
              </ThemedText>
            </Pressable>
            {programsInRange.map((p) => {
              const active = selectedProgramId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedProgramId(p.id)}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: active ? theme.link : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.presetPillText,
                      { color: active ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {p.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Custom day-level picker */}
        {preset === "custom" ? (
          <View style={[styles.customSection, { borderTopColor: theme.border }]}>
            {/* From / To selector buttons */}
            <View style={styles.customDateRow}>
              <Pressable
                onPress={() => setEditing("from")}
                style={[
                  styles.customDateBtn,
                  { backgroundColor: editing === "from" ? theme.link : theme.backgroundSecondary },
                ]}
              >
                <ThemedText style={[styles.customDateLabel, { color: editing === "from" ? "#fff" : theme.textMuted }]}>
                  FROM
                </ThemedText>
                <ThemedText style={[styles.customDateValue, { color: editing === "from" ? "#fff" : theme.text }]}>
                  {customFrom.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </ThemedText>
              </Pressable>
              <Feather name="arrow-right" size={14} color={theme.textMuted} />
              <Pressable
                onPress={() => setEditing("to")}
                style={[
                  styles.customDateBtn,
                  { backgroundColor: editing === "to" ? theme.link : theme.backgroundSecondary },
                ]}
              >
                <ThemedText style={[styles.customDateLabel, { color: editing === "to" ? "#fff" : theme.textMuted }]}>
                  TO
                </ThemedText>
                <ThemedText style={[styles.customDateValue, { color: editing === "to" ? "#fff" : theme.text }]}>
                  {customTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </ThemedText>
              </Pressable>
            </View>

            {/* Calendar */}
            <DayCalendar
              fromDate={customFrom}
              toDate={customTo}
              editing={editing}
              onSelectDate={(d) => {
                if (editing === "from") {
                  setCustomFrom(d);
                  setEditing("to"); // auto-advance to picking the end date
                } else {
                  setCustomTo(d);
                }
              }}
            />
          </View>
        ) : null}

        <ThemedText type="muted" style={styles.rangeLabel}>
          {fmtRangeLabel(from, to)}
        </ThemedText>
      </View>

      {/* Report content */}
      {loading ? (
        <ActivityIndicator color={theme.link} style={{ marginTop: Spacing["4xl"] }} />
      ) : reportData.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={40} color={theme.textMuted} />
          <ThemedText type="muted" style={styles.emptyText}>
            No workouts found for this period
          </ThemedText>
        </View>
      ) : (
        <View style={styles.dayList}>
          {reportData.map(renderDayGroup)}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // Picker card
  pickerCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  presetRow: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  presetPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  presetPillText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Typography.body.fontFamily,
  },

  // Custom day picker layout
  customSection: {
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  customDateBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 2,
  },
  customDateLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    fontFamily: Typography.body.fontFamily,
  },
  customDateValue: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Typography.body.fontFamily,
  },

  rangeLabel: {
    fontSize: 12,
    textAlign: "center",
  },

  // Empty / loading
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing["4xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },

  // Day list
  dayList: {
    gap: Spacing.md,
  },
  dayCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayName: {
    fontSize: 15,
  },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Table
  tableDivider: {
    height: StyleSheet.hairlineWidth,
  },
  tableContainer: {},
  tableRow: {
    flexDirection: "row",
  },

  // Fixed left column
  leftCol: {
    width: EXERCISE_COL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  nameHeaderCell: {
    height: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameCell: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  nameText: {
    fontSize: 12,
  },

  // Scrollable date columns
  scrollableCols: {
    flex: 1,
  },
  dateHeaderRow: {
    flexDirection: "row",
    height: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateHeaderCell: {
    width: DATE_COL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dataRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
  },
  dataCell: {
    width: DATE_COL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  cellValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  cellDelta: {
    fontSize: 10,
    fontWeight: "600",
  },
  cellEmpty: {
    fontSize: 14,
  },
});
