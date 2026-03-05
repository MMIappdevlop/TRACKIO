import React, { forwardRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { TrackioLogo } from "./icons/TrackioLogo";
import { Typography } from "@/constants/theme";
import type { WeeklyStats } from "@/types";

interface ProgressShareCardProps {
  stats: WeeklyStats | null;
  prevStats: WeeklyStats | null;
  userWeight?: number;
  weightUnit?: string;
  weekNum: number;
  weekRange: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const SCALE = 0.25;
const S = (v: number) => v * SCALE;

const BG_ROOT = "#0F1115";
const BG_CARD = "#1F2430";
const TEXT_PRIMARY = "#E6E8EB";
const TEXT_SECONDARY = "#9AA0AA";
const TEXT_MUTED = "#6B7280";
const ACCENT = "#4C7DFF";
const GREEN = "#4CAF50";
const RED = "#EF5350";
const BORDER = "rgba(255,255,255,0.06)";

function fmtDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDurDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m} min`;
}

function fmtDist(km: number): string {
  if (km >= 1) return `${km.toFixed(1)} km`;
  if (km > 0) return `${Math.round(km * 1000)} m`;
  return "0 km";
}

function fmtDistDelta(km: number): string {
  const abs = Math.abs(km);
  if (abs >= 1) return `${abs.toFixed(1)} km`;
  if (abs > 0) return `${Math.round(abs * 1000)} m`;
  return "0";
}

function fmtVol(kg: number): string {
  return `${Math.round(kg).toLocaleString()} kg`;
}

function fmtVolDelta(kg: number): string {
  return `${Math.round(Math.abs(kg)).toLocaleString()} kg`;
}

function fmtCal(cal: number): string {
  if (cal >= 1000) return `${(cal / 1000).toFixed(1)}k`;
  return String(Math.round(cal));
}

type Direction = "up" | "down" | "same";

function delta(cur: number, prev: number, fmt: (v: number) => string): { text: string; dir: Direction } {
  const diff = cur - prev;
  if (prev === 0 && cur === 0) return { text: "no data", dir: "same" };
  if (Math.abs(diff) < 0.01) return { text: "same as last week", dir: "same" };
  const sign = diff > 0 ? "+" : "-";
  return { text: `${sign}${fmt(diff)} vs last week`, dir: diff > 0 ? "up" : "down" };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statCell}>
      <Text style={s.statCellLabel}>{label}</Text>
      <Text style={s.statCellValue}>{value}</Text>
    </View>
  );
}

function ComparisonRow({ label, value, deltaInfo, isLast }: { label: string; value: string; deltaInfo: { text: string; dir: Direction }; isLast?: boolean }) {
  const arrow = deltaInfo.dir === "up" ? "\u2191 " : deltaInfo.dir === "down" ? "\u2193 " : "";
  const color = deltaInfo.dir === "up" ? GREEN : deltaInfo.dir === "down" ? RED : TEXT_MUTED;

  return (
    <View style={[s.compRow, isLast ? null : { borderBottomWidth: S(1), borderBottomColor: BORDER }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.compLabel}>{label}</Text>
        <Text style={s.compValue}>{value}</Text>
      </View>
      <Text style={[s.compDelta, { color }]}>{arrow}{deltaInfo.text}</Text>
    </View>
  );
}

export const ProgressShareCard = forwardRef<View, ProgressShareCardProps>(
  ({ stats, prevStats, userWeight, weightUnit = "kg", weekNum, weekRange }, ref) => {
    const cur = stats;
    const prev = prevStats;

    const sessionsDelta = delta(cur?.sessionsCount ?? 0, prev?.sessionsCount ?? 0, (v) => String(Math.abs(Math.round(v))));
    const durationDelta = delta(cur?.totalDurationSeconds ?? 0, prev?.totalDurationSeconds ?? 0, fmtDurDelta);
    const distanceDelta = delta(cur?.totalDistance ?? 0, prev?.totalDistance ?? 0, fmtDistDelta);
    const volumeDelta = delta(cur?.totalVolume ?? 0, prev?.totalVolume ?? 0, fmtVolDelta);
    const weightDelta = { text: "no previous data", dir: "same" as Direction };

    return (
      <View style={s.outerWrapper}>
        <View ref={ref} style={s.canvas} collapsable={false}>
          <View style={s.headerSection}>
            <Text style={s.headerTitle}>My Progress</Text>
            <Text style={s.headerSubtitle}>Week {weekNum}</Text>
            <Text style={s.headerRange}>{weekRange}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>This Week</Text>
            <View style={s.gridRow}>
              <StatCell label="Weight" value={userWeight ? `${userWeight} ${weightUnit}` : `-- ${weightUnit}`} />
              <StatCell label="Workout Days" value={`${cur?.sessionsCount ?? 0} days`} />
            </View>
            <View style={s.gridRow}>
              <StatCell label="Total Exercises" value={`${cur?.totalExercises ?? 0} exercises`} />
              <StatCell label="Calories Burned" value={`${fmtCal(cur?.totalCalories ?? 0)} kcal`} />
            </View>
            <View style={[s.gridRow, { justifyContent: "center" }]}>
              <StatCell label="Training Duration" value={fmtDur(cur?.totalDurationSeconds ?? 0)} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>vs Last Week</Text>
            <ComparisonRow label="Sessions" value={`${cur?.sessionsCount ?? 0} sessions`} deltaInfo={sessionsDelta} />
            <ComparisonRow label="Training Time" value={fmtDur(cur?.totalDurationSeconds ?? 0)} deltaInfo={durationDelta} />
            <ComparisonRow label="Distance" value={fmtDist(cur?.totalDistance ?? 0)} deltaInfo={distanceDelta} />
            <ComparisonRow label="Training Weight" value={fmtVol(cur?.totalVolume ?? 0)} deltaInfo={volumeDelta} />
            <ComparisonRow label="Body Weight" value={userWeight ? `${userWeight} ${weightUnit}` : "Not logged"} deltaInfo={weightDelta} isLast />
          </View>

          <View style={s.logoSection}>
            <TrackioLogo width={S(400)} height={S(100)} color={TEXT_SECONDARY} accentColor={ACCENT} />
          </View>
        </View>
      </View>
    );
  }
);

const s = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 1,
    pointerEvents: "none",
  },
  canvas: {
    width: S(CARD_WIDTH),
    height: S(CARD_HEIGHT),
    backgroundColor: BG_ROOT,
    padding: S(60),
    justifyContent: "flex-start",
  },
  headerSection: {
    marginBottom: S(48),
    alignItems: "center",
  },
  headerTitle: {
    fontSize: S(56),
    fontWeight: "700",
    color: TEXT_PRIMARY,
    fontFamily: Typography.h1.fontFamily,
    marginBottom: S(8),
  },
  headerSubtitle: {
    fontSize: S(36),
    fontWeight: "600",
    color: ACCENT,
    fontFamily: Typography.h2.fontFamily,
  },
  headerRange: {
    fontSize: S(24),
    color: TEXT_MUTED,
    fontFamily: Typography.body.fontFamily,
    marginTop: S(4),
  },
  card: {
    backgroundColor: BG_CARD,
    borderRadius: S(24),
    padding: S(36),
    marginBottom: S(28),
    borderWidth: S(1),
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: S(22),
    fontWeight: "600",
    color: TEXT_MUTED,
    fontFamily: Typography.body.fontFamily,
    textTransform: "uppercase",
    letterSpacing: S(1.5),
    marginBottom: S(24),
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: S(20),
  },
  statCell: {
    flex: 1,
  },
  statCellLabel: {
    fontSize: S(18),
    color: TEXT_MUTED,
    fontFamily: Typography.body.fontFamily,
    marginBottom: S(4),
  },
  statCellValue: {
    fontSize: S(32),
    fontWeight: "600",
    color: TEXT_PRIMARY,
    fontFamily: Typography.stat.fontFamily,
  },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S(16),
  },
  compLabel: {
    fontSize: S(18),
    color: TEXT_MUTED,
    fontFamily: Typography.body.fontFamily,
    marginBottom: S(2),
  },
  compValue: {
    fontSize: S(28),
    fontWeight: "600",
    color: TEXT_PRIMARY,
    fontFamily: Typography.stat.fontFamily,
  },
  compDelta: {
    fontSize: S(16),
    fontFamily: Typography.body.fontFamily,
    textAlign: "right",
  },
  logoSection: {
    alignItems: "flex-end",
    marginTop: S(24),
  },
});
