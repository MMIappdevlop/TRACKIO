import React, { forwardRef } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "@/constants/theme";

interface SessionShareCardProps {
  exercisesCompleted: number;
  duration: string;
  rating: number;
  quote: string;
  sessionName: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const SCALE = 0.3;

export const SessionShareCard = forwardRef<View, SessionShareCardProps>(
  ({ exercisesCompleted, duration, rating, quote, sessionName }, ref) => {
    return (
      <View
        style={styles.outerWrapper}
        pointerEvents="none"
      >
        <View
          ref={ref}
          style={styles.canvas}
          collapsable={false}
        >
          <LinearGradient
            colors={["transparent", "transparent", "rgba(10, 20, 60, 0.35)", "rgba(10, 20, 60, 0.60)"]}
            locations={[0, 0.4, 0.7, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.topSection}>
            <Text style={styles.completedTitle}>Session Completed!</Text>
            <Text style={styles.sessionName}>{sessionName}</Text>
          </View>

          <View style={styles.middleSection}>
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
                        size={28 / SCALE}
                        color={v <= rating ? "#D4AF37" : "rgba(255,255,255,0.3)"}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.quoteText}>"{quote}"</Text>

            <View style={styles.bannerContainer}>
              <View style={styles.blueBanner}>
                <Text style={styles.logoText}>Trackio</Text>
              </View>
            </View>
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
    width: CARD_WIDTH / SCALE,
    height: CARD_HEIGHT / SCALE,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    transform: [{ scale: SCALE }],
  },
  topSection: {
    alignItems: "center",
    paddingTop: 320 / SCALE,
  },
  completedTitle: {
    fontSize: 32 / SCALE,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sessionName: {
    fontSize: 18 / SCALE,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)",
    fontFamily: Typography.body.fontFamily,
    marginTop: 12 / SCALE,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  middleSection: {
    paddingHorizontal: 48 / SCALE,
    alignItems: "center",
  },
  statsBox: {
    backgroundColor: "rgba(24, 27, 33, 0.85)",
    borderRadius: 24 / SCALE,
    paddingVertical: 32 / SCALE,
    paddingHorizontal: 40 / SCALE,
    width: "100%",
    maxWidth: 900 / SCALE,
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
    height: 60 / SCALE,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  statValue: {
    fontSize: 36 / SCALE,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Typography.stat.fontFamily,
  },
  statLabel: {
    fontSize: 14 / SCALE,
    fontWeight: "400",
    color: "rgba(255,255,255,0.5)",
    fontFamily: Typography.body.fontFamily,
    marginTop: 4 / SCALE,
  },
  ratingRow: {
    alignItems: "center",
    marginTop: 24 / SCALE,
    paddingTop: 20 / SCALE,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  starsRow: {
    flexDirection: "row",
    gap: 8 / SCALE,
  },
  bottomSection: {
    paddingBottom: 0,
  },
  quoteText: {
    fontSize: 16 / SCALE,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.6)",
    fontFamily: Typography.body.fontFamily,
    textAlign: "center",
    paddingHorizontal: 60 / SCALE,
    marginBottom: 48 / SCALE,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerContainer: {
    width: "100%",
  },
  blueBanner: {
    backgroundColor: "#4C7DFF",
    paddingVertical: 28 / SCALE,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22 / SCALE,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Typography.h1.fontFamily,
    letterSpacing: 2,
  },
});
