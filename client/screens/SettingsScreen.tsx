import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { settings, refresh, updateSettings } = useSettings();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleToggle = async (key: "showRPE" | "showRIR", value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ [key]: value });
  };

  const handleUnitChange = async (key: "weightUnit" | "distanceUnit", value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ [key]: value });
  };

  if (!settings) return null;

  const activeReminderCount =
    (settings.weightReminderEnabled ? 1 : 0) +
    (settings.trainingReminderEnabled ? 1 : 0);
  const reminderLabel =
    activeReminderCount === 0 ? "None" : `${activeReminderCount} active`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Units</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="target" size={20} color={theme.link} />
              <ThemedText type="body">Weight Unit</ThemedText>
            </View>
            <View style={styles.unitPicker}>
              {(["kg", "lb"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => handleUnitChange("weightUnit", unit)}
                  style={[
                    styles.unitOption,
                    { backgroundColor: settings.weightUnit === unit ? theme.link : theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: settings.weightUnit === unit ? theme.buttonText : theme.text }}
                  >
                    {unit}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="navigation" size={20} color={theme.link} />
              <ThemedText type="body">Distance Unit</ThemedText>
            </View>
            <View style={styles.unitPicker}>
              {(["km", "mi"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => handleUnitChange("distanceUnit", unit)}
                  style={[
                    styles.unitOption,
                    { backgroundColor: settings.distanceUnit === unit ? theme.link : theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: settings.distanceUnit === unit ? theme.buttonText : theme.text }}
                  >
                    {unit}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Strength Logging</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText type="body">Show RPE</ThemedText>
              <ThemedText type="muted">Rate of Perceived Exertion</ThemedText>
            </View>
            <Switch
              value={settings.showRPE}
              onValueChange={(value) => handleToggle("showRPE", value)}
              trackColor={{ false: theme.backgroundSecondary, true: theme.link }}
              thumbColor={theme.buttonText}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText type="body">Show RIR</ThemedText>
              <ThemedText type="muted">Reps in Reserve</ThemedText>
            </View>
            <Switch
              value={settings.showRIR}
              onValueChange={(value) => handleToggle("showRIR", value)}
              trackColor={{ false: theme.backgroundSecondary, true: theme.link }}
              thumbColor={theme.buttonText}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Notifications</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            testID="button-reminders"
            style={styles.settingRow}
            onPress={() => navigation.navigate("Reminders")}
          >
            <View style={styles.settingInfo}>
              <Feather name="bell" size={20} color={theme.link} />
              <ThemedText type="body">Reminders</ThemedText>
            </View>
            <View style={styles.reminderRight}>
              <ThemedText type="secondary">{reminderLabel}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>About</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.aboutRow}>
            <ThemedText type="body">Version</ThemedText>
            <ThemedText type="secondary">0.1.7</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <ThemedText type="body">Build</ThemedText>
            <ThemedText type="secondary">2026.02</ThemedText>
          </View>
        </View>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  settingInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  unitPicker: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  unitOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 50,
    alignItems: "center",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  reminderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
