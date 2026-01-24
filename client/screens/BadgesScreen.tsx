import React, { useCallback } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeCard } from "@/components/BadgeCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useBadges } from "@/hooks/useData";
import { Spacing } from "@/constants/theme";

export default function BadgesScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { badges, loading, refresh } = useBadges();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        image={require("../../assets/images/empty-badges.png")}
        title="No Badges Yet"
        description="Complete workouts and reach milestones to earn badges"
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => <BadgeCard badge={item} />}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={badges.length > 0 ? styles.row : undefined}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
          badges.length === 0 && styles.emptyContent,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    justifyContent: "space-between",
  },
});
