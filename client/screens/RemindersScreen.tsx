import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

export default function RemindersScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { settings } = useSettings();

  const weightEnabled = settings?.weightReminderEnabled ?? false;
  const trainingEnabled = settings?.trainingReminderEnabled ?? false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          testID="button-weight-reminder"
          style={styles.row}
          onPress={() => navigation.navigate("WeightReminder")}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.linkBackground }]}>
            <Feather name="activity" size={18} color={theme.link} />
          </View>
          <View style={styles.rowContent}>
            <ThemedText type="body">Weight Reminder</ThemedText>
            <ThemedText type="muted" style={styles.rowSubtitle}>
              {weightEnabled ? "On" : "Off"}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textMuted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Pressable
          testID="button-training-reminder"
          style={styles.row}
          onPress={() => navigation.navigate("TrainingReminder")}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.linkBackground }]}>
            <Feather name="zap" size={18} color={theme.link} />
          </View>
          <View style={styles.rowContent}>
            <ThemedText type="body">Training Reminder</ThemedText>
            <ThemedText type="muted" style={styles.rowSubtitle}>
              {trainingEnabled ? "On" : "Off"}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowSubtitle: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
