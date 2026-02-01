import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { InputModal } from "@/components/InputModal";
import { useTheme } from "@/hooks/useTheme";
import { useSettings, useBadges } from "@/hooks/useData";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList & RootStackParamList>;

const MENU_ITEMS = [
  { id: "badges", title: "Badges", icon: "award", screen: "Badges" as const },
  { id: "settings", title: "Settings", icon: "settings", screen: "Settings" as const },
  { id: "backup", title: "Data & Backup", icon: "database", screen: "DataBackup" as const },
  { id: "import", title: "Import Plan", icon: "upload", screen: "ImportProgram" as const },
];

export default function ProfileHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { settings, refresh: refreshSettings, updateSettings } = useSettings();
  const { badges, refresh: refreshBadges } = useBadges();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshSettings();
      refreshBadges();
    }, [])
  );

  const handleUpdateName = async (name: string) => {
    await updateSettings({ userName: name });
    await refreshSettings();
    setShowNameModal(false);
  };

  const handleUpdateWeight = async (value: string) => {
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight > 0) {
      await updateSettings({ userWeight: weight });
      await refreshSettings();
    }
    setShowWeightModal(false);
  };

  const handleUpdateHeight = async (value: string) => {
    const height = parseFloat(value);
    if (!isNaN(height) && height > 0) {
      await updateSettings({ userHeight: height });
      await refreshSettings();
    }
    setShowHeightModal(false);
  };

  const handleUpdateAge = async (value: string) => {
    const age = parseInt(value);
    if (!isNaN(age) && age > 0) {
      await updateSettings({ userAge: age });
      await refreshSettings();
    }
    setShowAgeModal(false);
  };

  const weightUnit = settings?.weightUnit || "kg";
  const heightUnit = settings?.weightUnit === "lb" ? "ft" : "cm";

  const recentBadges = badges.slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing["4xl"] },
      ]}
    >
      <View style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          style={styles.profileNameRow}
          onPress={() => setShowNameModal(true)}
        >
          <View style={styles.profileInfo}>
            <ThemedText type="h2">{settings?.userName || "Athlete"}</ThemedText>
            <ThemedText type="muted">Tap to edit name</ThemedText>
          </View>
          <Feather name="edit-2" size={18} color={theme.textSecondary} />
        </Pressable>

        <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
          <Pressable style={styles.statItem} onPress={() => setShowWeightModal(true)}>
            <ThemedText type="h3">
              {settings?.userWeight ? `${settings.userWeight}` : "--"}
            </ThemedText>
            <ThemedText type="muted">{weightUnit}</ThemedText>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.statItem} onPress={() => setShowHeightModal(true)}>
            <ThemedText type="h3">
              {settings?.userHeight ? `${settings.userHeight}` : "--"}
            </ThemedText>
            <ThemedText type="muted">{heightUnit}</ThemedText>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.statItem} onPress={() => setShowAgeModal(true)}>
            <ThemedText type="h3">
              {settings?.userAge ? `${settings.userAge}` : "--"}
            </ThemedText>
            <ThemedText type="muted">years</ThemedText>
          </Pressable>
        </View>
      </View>

      {recentBadges.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h2">Recent Badges</ThemedText>
            <Pressable onPress={() => navigation.navigate("Badges")}>
              <ThemedText type="link">See All</ThemedText>
            </Pressable>
          </View>
          <View style={styles.badgesPreview}>
            {recentBadges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgePreviewItem,
                  { backgroundColor: theme.backgroundDefault, borderColor: Colors.dark[badge.badgeTier] },
                ]}
              >
                <Feather name="award" size={20} color={Colors.dark[badge.badgeTier]} />
              </View>
            ))}
            {recentBadges.length < 3 ? (
              <View style={[styles.badgePreviewItem, { backgroundColor: theme.backgroundDefault, opacity: 0.5 }]}>
                <Feather name="plus" size={20} color={theme.textMuted} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Menu</ThemedText>
        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate(item.screen)}
              style={[
                styles.menuItem,
                index < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.linkBackground }]}>
                <Feather name={item.icon as any} size={18} color={theme.link} />
              </View>
              <ThemedText type="body" style={styles.menuTitle}>{item.title}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

      <InputModal
        visible={showNameModal}
        title="Your Name"
        placeholder="Enter your name"
        initialValue={settings?.userName || ""}
        submitLabel="Save"
        onSubmit={handleUpdateName}
        onClose={() => setShowNameModal(false)}
      />

      <InputModal
        visible={showWeightModal}
        title={`Weight (${weightUnit})`}
        placeholder={`Enter weight in ${weightUnit}`}
        initialValue={settings?.userWeight?.toString() || ""}
        submitLabel="Save"
        keyboardType="decimal-pad"
        onSubmit={handleUpdateWeight}
        onClose={() => setShowWeightModal(false)}
      />

      <InputModal
        visible={showHeightModal}
        title={`Height (${heightUnit})`}
        placeholder={`Enter height in ${heightUnit}`}
        initialValue={settings?.userHeight?.toString() || ""}
        submitLabel="Save"
        keyboardType="decimal-pad"
        onSubmit={handleUpdateHeight}
        onClose={() => setShowHeightModal(false)}
      />

      <InputModal
        visible={showAgeModal}
        title="Age"
        placeholder="Enter your age"
        initialValue={settings?.userAge?.toString() || ""}
        submitLabel="Save"
        keyboardType="number-pad"
        onSubmit={handleUpdateAge}
        onClose={() => setShowAgeModal(false)}
      />
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
  profileCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  badgesPreview: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  badgePreviewItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    flex: 1,
  },
  });
