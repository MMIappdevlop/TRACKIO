import React, { forwardRef } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/theme";
import { StrengthIcon } from "./icons/StrengthIcon";
import { IntervalIcon } from "./icons/IntervalIcon";
import { EnduranceIcon } from "./icons/EnduranceIcon";
import { SportIcon } from "./icons/SportIcon";
import trackioLogo from "../../assets/images/trackio-logo.png";

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
const CARD_HEIGHT = 1080;
const SCALE = 0.3;
const S = (v: number) => v / SCALE;

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
      <View style={styles.outerWrapper} pointerEvents="none">
        <View ref={ref} style={styles.canvas} collapsable={false}>
          <LinearGradient
            colors={["#5B8BFF", "#4C7DFF", "#2A4FCC", "#0F1530"]}
            locations={[0, 0.25, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.topSpacer} />

          <View style={styles.centerContent}>
            <View style={styles.completedRow}>
              {renderPlanIcon(planKind, S(48))}
              <Text style={styles.completedTitle}>Session completed!</Text>
            </View>

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

          <View style={styles.bottomSection}>
            <Image source={trackioLogo} style={styles.logoImage} resizeMode="contain" />
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
  },
  canvas: {
    width: S(CARD_WIDTH),
    height: S(CARD_HEIGHT),
    backgroundColor: "#0F1530",
    transform: [{ scale: SCALE }],
    overflow: "hidden",
  },
  topSpacer: {
    flex: 1.2,
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: S(64),
    flex: 2,
    justifyContent: "center",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S(16),
    marginBottom: S(32),
  },
  completedTitle: {
    fontSize: S(36),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    textAlign: "center",
  },
  statsBox: {
    backgroundColor: "rgba(15, 17, 30, 0.75)",
    borderRadius: S(24),
    paddingVertical: S(32),
    paddingHorizontal: S(48),
    width: "80%",
    maxWidth: S(700),
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
    width: 1,
    height: S(56),
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  statValue: {
    fontSize: S(48),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Typography.stat.fontFamily,
  },
  statLabel: {
    fontSize: S(16),
    fontWeight: "400",
    color: "rgba(255,255,255,0.55)",
    fontFamily: Typography.body.fontFamily,
    marginTop: S(4),
  },
  bottomSection: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: S(360),
    height: S(100),
  },
});
