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
import { useSessionTemplates } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
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
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
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
      "Delete Session",
      `Are you sure you want to delete "${template.name}"? This will also delete all tasks in this session.`,
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

  const renderTemplate = ({ item }: { item: SessionTemplate }) => (
    <Pressable
      onPress={() => navigation.navigate("SessionTemplateDetail", { 
        templateId: item.id, 
        templateName: item.name,
        programId: route.params.programId,
        programName: route.params.programName,
      })}
      onLongPress={() => handleEditTemplate(item)}
      style={[styles.templateCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.templateContent}>
        <ThemedText type="h4">{item.name}</ThemedText>
        <ThemedText type="muted">Rest: {item.defaultRestSeconds}s</ThemedText>
      </View>
      <View style={styles.templateActions}>
        <Pressable
          onPress={() => handleDeleteTemplate(item)}
          style={styles.actionButton}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
        <Feather name="chevron-right" size={20} color={theme.textMuted} />
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="clipboard"
      title="No Sessions"
      description="Add session templates to organize your workouts"
      actionLabel="Add Session"
      onAction={() => setShowCreate(true)}
    />
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
        ListFooterComponent={
          templates.length > 0 ? (
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.createButton, { backgroundColor: theme.linkBackground }]}
            >
              <Feather name="plus" size={20} color={theme.link} />
              <ThemedText type="link">Add Session</ThemedText>
            </Pressable>
          ) : null
        }
      />

      <InputModal
        visible={showCreate}
        title="New Session"
        placeholder="Session name"
        submitLabel="Create"
        onSubmit={handleCreateSession}
        onClose={() => setShowCreate(false)}
      />

      <InputModal
        visible={!!editingTemplate}
        title="Rename Session"
        placeholder="Session name"
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
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  templateContent: {
    flex: 1,
    gap: 2,
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
