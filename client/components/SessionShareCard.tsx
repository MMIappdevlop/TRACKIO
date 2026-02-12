import React, { forwardRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/theme";
import { StrengthIcon } from "./icons/StrengthIcon";
import { IntervalIcon } from "./icons/IntervalIcon";
import { EnduranceIcon } from "./icons/EnduranceIcon";
import { SportIcon } from "./icons/SportIcon";
import { TrackioLogo } from "./icons/TrackioLogo";

type PlanKind = "strength" | "endurance" | "interval" | "sport";

interface SessionShareCardProps {
  exercisesCompleted: number;
  duration: string;
  rating: number;
  quote: string;
  sessionName: string;
  planKind: PlanKind;
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
  ({ exercisesCompleted, duration, planKind }, ref) => {
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

          <View style={styles.topSection}>
            <View style={styles.iconCircle}>
              {renderPlanIcon(planKind, S(80))}
            </View>
            <Text style={styles.completedTitle}>Session completed!</Text>
          </View>

          <View style={styles.centerSection}>
            <View style={styles.statsBox}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{exercisesCompleted}</Text>
                  <Text style={styles.statLabel}>Exercises</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{duration}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.logoSection}>
            <TrackioLogo
              width={S(520)}
              height={S(130)}
              color="#FFFFFF"
              accentColor="#4C7DFF"
            />
          </View>

          <View style={styles.bottomBanner} />
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
  topSection: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: S(40),
    flex: 3.5,
  },
  iconCircle: {
    width: S(120),
    height: S(120),
    borderRadius: S(60),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S(28),
  },
  completedTitle: {
    fontSize: S(44),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    textAlign: "center",
    letterSpacing: S(1),
  },
  centerSection: {
    alignItems: "center",
    paddingHorizontal: S(80),
    flex: 2,
    justifyContent: "flex-start",
  },
  statsBox: {
    backgroundColor: "rgba(15, 17, 33, 0.80)",
    borderRadius: S(28),
    paddingVertical: S(44),
    paddingHorizontal: S(56),
    width: "100%",
    borderWidth: S(1),
    borderColor: "rgba(255, 255, 255, 0.06)",
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
    height: S(70),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  statValue: {
    fontSize: S(64),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Typography.stat.fontFamily,
  },
  statLabel: {
    fontSize: S(22),
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.50)",
    fontFamily: Typography.body.fontFamily,
    marginTop: S(8),
    textTransform: "uppercase",
    letterSpacing: S(2),
  },
  logoSection: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBanner: {
    height: S(80),
    backgroundColor: "#4C7DFF",
    width: "100%",
  },
});
