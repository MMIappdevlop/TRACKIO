import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { InputModal } from "@/components/InputModal";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms } from "@/hooks/useData";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { Program } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList>;

export default function ProgramListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { programs, activeProgram, loading, refresh, createProgram, setActive, archiveProgram, updateProgram } = usePrograms();
  const [showCreate, setShowCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleCreateProgram = async (name: string) => {
    await createProgram(name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSetActive = async (program: Program) => {
    if (program.id === activeProgram?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActive(program.id);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
  };

  const handleUpdateProgram = async (name: string) => {
    if (!editingProgram) return;
    await updateProgram(editingProgram.id, { name });
    setEditingProgram(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleArchiveProgram = (program: Program) => {
    Alert.alert(
      "Archive Program",
      `Are you sure you want to archive "${program.name}"? It will be removed from rotation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            await archiveProgram(program.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderProgram = ({ item }: { item: Program }) => {
    const isActive = item.id === activeProgram?.id;
    return (
      <Pressable
        onPress={() => handleSetActive(item)}
        onLongPress={() => handleEditProgram(item)}
        style={[
          styles.programCard,
          { backgroundColor: theme.backgroundDefault },
          isActive && { borderColor: theme.link, borderWidth: 2 },
        ]}
      >
        <View style={styles.programContent}>
          <ThemedText type="h4">{item.name}</ThemedText>
          {isActive ? (
            <View style={[styles.activeBadge, { backgroundColor: theme.linkBackground }]}>
              <ThemedText type="small" style={{ color: theme.link }}>
                Active
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.programActions}>
          <Pressable
            onPress={() => navigation.navigate("ProgramDetail", { programId: item.id, programName: item.name })}
            style={styles.actionButton}
          >
            <Feather name="edit-2" size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => handleArchiveProgram(item)}
            style={styles.actionButton}
          >
            <Feather name="archive" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="secondary" style={styles.description}>
              Tap to set active. Long press to rename.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => setShowCreate(true)}
            style={[styles.createButton, { backgroundColor: theme.linkBackground }]}
          >
            <Feather name="plus" size={20} color={theme.link} />
            <ThemedText type="link">Create New Program</ThemedText>
          </Pressable>
        }
      />

      <InputModal
        visible={showCreate}
        title="New Program"
        placeholder="Program name"
        submitLabel="Create"
        onSubmit={handleCreateProgram}
        onClose={() => setShowCreate(false)}
      />

      <InputModal
        visible={!!editingProgram}
        title="Rename Program"
        placeholder="Program name"
        initialValue={editingProgram?.name || ""}
        submitLabel="Save"
        onSubmit={handleUpdateProgram}
        onClose={() => setEditingProgram(null)}
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
  },
  header: {
    marginBottom: Spacing.lg,
  },
  description: {
    marginBottom: Spacing.sm,
  },
  programCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  programContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  activeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  programActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
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
