import React, { forwardRef } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Typography } from "@/constants/theme";
import splashIcon from "../../assets/images/splash-icon.png";

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
const SCALE = 0.3;
const S = (v: number) => v / SCALE;

const PLAN_KIND_ICONS: Record<PlanKind, { name: string; lib: "feather" | "ionicons" }> = {
  strength: { name: "target", lib: "feather" },
  endurance: { name: "navigation", lib: "feather" },
  interval: { name: "clock", lib: "feather" },
  sport: { name: "activity", lib: "feather" },
};

export const SessionShareCard = forwardRef<View, SessionShareCardProps>(
  ({ exercisesCompleted, duration, rating, quote, sessionName, planKind }, ref) => {
    const icon = PLAN_KIND_ICONS[planKind] || PLAN_KIND_ICONS.strength;

    return (
      <View style={styles.outerWrapper} pointerEvents="none">
        <View ref={ref} style={styles.canvas} collapsable={false}>
          <LinearGradient
            colors={["transparent", "transparent", "rgba(10, 20, 60, 0.35)", "rgba(10, 20, 60, 0.60)"]}
            locations={[0, 0.5, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.spacer} />

          <View style={styles.bottomContent}>
            <View style={styles.iconCircle}>
              <Feather name={icon.name as any} size={S(28)} color="#FFFFFF" />
            </View>

            <Text style={styles.completedTitle}>Session Completed!</Text>
            <Text style={styles.sessionName}>{sessionName}</Text>

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
              {rating > 0 ? (
                <View style={styles.ratingRow}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Ionicons
                        key={v}
                        name={v <= rating ? "star" : "star-outline"}
                        size={S(24)}
                        color={v <= rating ? "#D4AF37" : "rgba(255,255,255,0.3)"}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={styles.quoteText}>"{quote}"</Text>

            <Image source={splashIcon} style={styles.logoImage} resizeMode="contain" />

            <View style={styles.blueBanner} />
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
    backgroundColor: "transparent",
    transform: [{ scale: SCALE }],
  },
  spacer: {
    flex: 3,
  },
  bottomContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: S(48),
  },
  iconCircle: {
    width: S(64),
    height: S(64),
    borderRadius: S(32),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S(12),
  },
  completedTitle: {
    fontSize: S(28),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: S(4),
  },
  sessionName: {
    fontSize: S(15),
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    fontFamily: Typography.body.fontFamily,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: S(16),
  },
  statsBox: {
    backgroundColor: "rgba(24, 27, 33, 0.88)",
    borderRadius: S(20),
    paddingVertical: S(24),
    paddingHorizontal: S(32),
    width: "100%",
    maxWidth: S(900),
    marginBottom: S(16),
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
    height: S(48),
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  statValue: {
    fontSize: S(32),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.stat.fontFamily,
  },
  statLabel: {
    fontSize: S(12),
    fontWeight: "400",
    color: "rgba(255,255,255,0.5)",
    fontFamily: Typography.body.fontFamily,
    marginTop: S(2),
  },
  ratingRow: {
    alignItems: "center",
    marginTop: S(16),
    paddingTop: S(14),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  starsRow: {
    flexDirection: "row",
    gap: S(6),
  },
  quoteText: {
    fontSize: S(14),
    fontStyle: "italic",
    color: "rgba(255,255,255,0.55)",
    fontFamily: Typography.body.fontFamily,
    textAlign: "center",
    paddingHorizontal: S(24),
    marginBottom: S(20),
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  logoImage: {
    width: S(180),
    height: S(50),
    marginBottom: S(16),
  },
  blueBanner: {
    backgroundColor: "#4C7DFF",
    height: S(56),
    width: S(CARD_WIDTH),
  },
});
