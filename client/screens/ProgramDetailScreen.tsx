import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { InputModal } from "@/components/InputModal";
import { useTheme } from "@/hooks/useTheme";
import { useSessionTemplates, usePrograms } from "@/hooks/useData";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { SessionTemplate } from "@/types";

type RoutePropType = RouteProp<TrainingStackParamList, "ProgramDetail">;
type NavigationProp = NativeStackNavigationProp<TrainingStackParamList>;

export default function ProgramDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { programId } = route.params;

  const { templates, loading, refresh, createTemplate, updateTemplate, deleteTemplate } = useSessionTemplates(programId);
  const { programs, updateProgram, refresh: refreshPrograms } = usePrograms();
  const program = programs.find(p => p.id === programId);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPrograms();
    }, [])
  );

  const handleCreateSession = async (name: string) => {
    await createTemplate(name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEditTemplate = (template: SessionTemplate) => {
    setEditingTemplate(template);
  };

  const handleUpdateTemplate = async (name: string) => {
    if (!editingTemplate) return;
    await updateTemplate(editingTemplate.id, { name });
    setEditingTemplate(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteTemplate = (template: SessionTemplate) => {
    Alert.alert(
      "Delete Day",
      `Are you sure you want to delete "${template.name}"? This will also delete all exercises in this day.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTemplate(template.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleToggleBadges = async () => {
    if (!program) return;
    const newValue = !program.trackBadges;
    await updateProgram(program.id, { trackBadges: newValue });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderTemplate = ({ item }: { item: SessionTemplate }) => (
    <View style={[styles.templateCard, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable
        onPress={() => navigation.navigate("SessionTemplateDetail", { 
          templateId: item.id, 
          templateName: item.name,
          programId: route.params.programId,
          programName: route.params.programName,
        })}
        onLongPress={() => handleEditTemplate(item)}
        style={styles.templateCardNav}
      >
        <View style={styles.templateContent}>
          <ThemedText type="h4">{item.name}</ThemedText>
          {item.locationName ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={theme.textSecondary} />
              <ThemedText type="secondary" style={styles.locationText} numberOfLines={1}>
                {item.locationName}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText type="muted">Rest: {item.defaultRestSeconds}s</ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textMuted} />
      </Pressable>
      <Pressable
        onPress={() => handleDeleteTemplate(item)}
        style={styles.actionButton}
      >
        <Feather name="trash-2" size={18} color={theme.error} />
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="clipboard"
      title="No Days"
      description="Add day templates to organize your workouts"
      actionLabel="Add Day"
      onAction={() => setShowCreate(true)}
    />
  );

  const renderHeader = () => (
    <View>
      <Pressable
        onPress={handleToggleBadges}
        style={[styles.badgeToggle, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.badgeToggleContent}>
          <View style={[styles.badgeIcon, { backgroundColor: (program?.trackBadges ? Colors.dark.gold : theme.textMuted) + "20" }]}>
            <Feather name="award" size={20} color={program?.trackBadges ? Colors.dark.gold : theme.textMuted} />
          </View>
          <View style={styles.badgeToggleText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Track Badges</ThemedText>
            <ThemedText type="muted">
              {program?.trackBadges 
                ? "All exercises count toward badges" 
                : "Badge tracking is off for this plan"}
            </ThemedText>
          </View>
        </View>
        <View style={[
          styles.toggleSwitch, 
          { backgroundColor: program?.trackBadges ? theme.link : theme.backgroundSecondary }
        ]}>
          <View style={[
            styles.toggleKnob, 
            program?.trackBadges && styles.toggleKnobActive
          ]} />
        </View>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          templates.length === 0 && styles.emptyContent,
        ]}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          templates.length > 0 ? (
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.createButton, { backgroundColor: theme.linkBackground }]}
            >
              <Feather name="plus" size={20} color={theme.link} />
              <ThemedText type="link">Add Day</ThemedText>
            </Pressable>
          ) : null
        }
      />

      <InputModal
        visible={showCreate}
        title="New Day"
        placeholder="Day name"
        submitLabel="Create"
        onSubmit={handleCreateSession}
        onClose={() => setShowCreate(false)}
      />

      <InputModal
        visible={!!editingTemplate}
        title="Rename Day"
        placeholder="Day name"
        initialValue={editingTemplate?.name || ""}
        submitLabel="Save"
        onSubmit={handleUpdateTemplate}
        onClose={() => setEditingTemplate(null)}
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
  badgeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  badgeToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeToggleText: {
    flex: 1,
    gap: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  templateCardNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  templateContent: {
    flex: 1,
    gap: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  templateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
});
