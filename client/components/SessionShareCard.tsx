import React, { forwardRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/theme";
import { StrengthIcon } from "./icons/StrengthIcon";
import { IntervalIcon } from "./icons/IntervalIcon";
import { EnduranceIcon } from "./icons/EnduranceIcon";
import { SportIcon } from "./icons/SportIcon";
import { TrackioLogo } from "./icons/TrackioLogo";

export type PlanKind = "strength" | "endurance" | "interval" | "sport";

interface SessionShareCardProps {
  exercisesCompleted: number;
  duration: string;
  planKind: PlanKind;
  estimatedCalories?: number;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const SCALE = 0.25;
const S = (v: number) => v * SCALE;

const renderPlanIcon = (planKind: PlanKind, iconSize: number) => {
  switch (planKind) {
    case "strength":
      return <StrengthIcon size={iconSize} color="#FFFFFF" />;
    case "endurance":
      return <EnduranceIcon size={iconSize} color="#FFFFFF" />;
    case "interval":
      return <IntervalIcon size={iconSize} color="#FFFFFF" />;
    case "sport":
    default:
      return <SportIcon size={iconSize} color="#FFFFFF" />;
  }
};

export const SessionShareCard = forwardRef<View, SessionShareCardProps>(
  ({ exercisesCompleted, duration, planKind, estimatedCalories }, ref) => {
    return (
      <View style={styles.outerWrapper}>
        <View ref={ref} style={styles.canvas} collapsable={false}>
          <LinearGradient
            colors={[
              "rgba(10, 15, 40, 0)",
              "rgba(10, 15, 40, 0)",
              "rgba(10, 15, 40, 0.15)",
              "rgba(10, 15, 40, 0.40)",
              "rgba(10, 15, 40, 0.60)",
            ]}
            locations={[0, 0.35, 0.55, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.topSpacer} />

          <View style={styles.bottomContent}>
            <View style={styles.completedRow}>
              {renderPlanIcon(planKind, S(64))}
              <Text style={styles.completedTitle}>Session completed!</Text>
            </View>

            <View style={styles.statsBox}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{exercisesCompleted}</Text>
                  <Text style={styles.statLabel}>Exercises</Text>
                </View>
                {estimatedCalories && estimatedCalories > 0 ? (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{estimatedCalories}</Text>
                      <Text style={styles.statLabel}>Est. Cal</Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{duration}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              </View>
            </View>

            <View style={styles.logoWrap}>
              <TrackioLogo
                width={S(440)}
                height={S(110)}
                color="#FFFFFF"
                accentColor="#0f52ba"
              />
            </View>

            <View style={styles.bottomBanner} />
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
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
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  topSpacer: {
    flex: 65,
  },
  bottomContent: {
    flex: 35,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S(16),
    marginBottom: S(56),
  },
  completedTitle: {
    fontSize: S(40),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    textAlign: "center",
    letterSpacing: S(0.5),
  },
  statsBox: {
    backgroundColor: "rgba(15, 17, 33, 0.80)",
    borderRadius: S(24),
    paddingVertical: S(36),
    paddingHorizontal: S(48),
    width: S(CARD_WIDTH - 360),
    borderWidth: S(1),
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: S(64),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: S(1.5),
    height: S(60),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  statValue: {
    fontSize: S(56),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Typography.stat.fontFamily,
  },
  statLabel: {
    fontSize: S(20),
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.50)",
    fontFamily: Typography.body.fontFamily,
    marginTop: S(6),
    textTransform: "uppercase",
    letterSpacing: S(2),
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: S(56),
  },
  bottomBanner: {
    height: S(72),
    backgroundColor: "#0f52ba",
    width: "100%",
  },
});
