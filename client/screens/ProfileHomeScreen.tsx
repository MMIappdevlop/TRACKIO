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

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

const MENU_ITEMS = [
  { id: "badges", title: "Badges", icon: "award", screen: "Badges" as const },
  { id: "settings", title: "Settings", icon: "settings", screen: "Settings" as const },
  { id: "backup", title: "Data & Backup", icon: "database", screen: "DataBackup" as const },
  { id: "import", title: "Import Program", icon: "upload", screen: "ImportProgram" as const },
];

export default function ProfileHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const { settings, refresh: refreshSettings, updateSettings } = useSettings();
  const { badges, refresh: refreshBadges } = useBadges();
  const [showNameModal, setShowNameModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshSettings();
      refreshBadges();
    }, [])
  );

  const handleUpdateName = async (name: string) => {
    await updateSettings({ userName: name });
    setShowNameModal(false);
  };

  const recentBadges = badges.slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing["4xl"] },
      ]}
    >
      <Pressable
        style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }]}
        onPress={() => setShowNameModal(true)}
      >
        <View style={styles.profileInfo}>
          <ThemedText type="h2">{settings?.userName || "Athlete"}</ThemedText>
          <ThemedText type="muted">Tap to edit name</ThemedText>
        </View>
        <Feather name="edit-2" size={18} color={theme.textSecondary} />
      </Pressable>

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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  profileInfo: {
    flex: 1,
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
