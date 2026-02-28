import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Modal } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { InputModal } from "@/components/InputModal";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { usePrograms } from "@/hooks/useData";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TrainingStackParamList } from "@/navigation/TrainingStackNavigator";
import type { Program } from "@/types";

type NavigationProp = NativeStackNavigationProp<TrainingStackParamList>;

type Tab = "active" | "archived";

export default function ProgramListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { 
    programs, 
    archivedPrograms, 
    activeProgram, 
    loading, 
    refresh, 
    createProgram, 
    setActive, 
    archiveProgram, 
    unarchiveProgram,
    deleteProgram,
    updateProgram 
  } = usePrograms();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("active");

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

  const handleArchiveProgram = async (program: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await archiveProgram(program.id);
  };

  const handleUnarchiveProgram = async (program: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await unarchiveProgram(program.id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProgram) return;
    await deleteProgram(deletingProgram.id);
    setDeletingProgram(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderProgram = ({ item }: { item: Program }) => {
    const isActive = item.id === activeProgram?.id;
    const isArchived = item.isArchived;
    
    return (
      <Pressable
        onPress={() => isArchived ? null : handleSetActive(item)}
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
          {!isArchived ? (
            <>
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
            </>
          ) : (
            <>
              <Pressable
                onPress={() => handleUnarchiveProgram(item)}
                style={styles.actionButton}
              >
                <Feather name="refresh-cw" size={18} color={theme.link} />
              </Pressable>
            </>
          )}
          <Pressable
            onPress={() => setDeletingProgram(item)}
            style={styles.actionButton}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmptyActive = () => (
    <EmptyState
      icon="clipboard"
      title="No Plans"
      description="Create a training plan to get started"
      actionLabel="Create Plan"
      onAction={() => setShowCreate(true)}
    />
  );

  const renderEmptyArchived = () => (
    <EmptyState
      icon="archive"
      title="No Archived Plans"
      description="Archived plans will appear here"
    />
  );

  const currentData = activeTab === "active" ? programs : archivedPrograms;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.tabBar, { paddingTop: headerHeight + Spacing.md }]}>
        <Pressable
          onPress={() => setActiveTab("active")}
          style={[
            styles.tab,
            activeTab === "active" && { backgroundColor: theme.linkBackground },
          ]}
        >
          <ThemedText 
            type="body" 
            style={[
              styles.tabText, 
              { color: activeTab === "active" ? theme.link : theme.textSecondary }
            ]}
          >
            Active Plans
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("archived")}
          style={[
            styles.tab,
            activeTab === "archived" && { backgroundColor: theme.linkBackground },
          ]}
        >
          <ThemedText 
            type="body" 
            style={[
              styles.tabText, 
              { color: activeTab === "archived" ? theme.link : theme.textSecondary }
            ]}
          >
            Archived
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
          currentData.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={!loading ? (activeTab === "active" ? renderEmptyActive : renderEmptyArchived) : null}
        ListHeaderComponent={
          activeTab === "active" && programs.length > 0 ? (
            <View style={styles.header}>
              <ThemedText type="secondary" style={styles.description}>
                Tap to set active. Long press to rename.
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          activeTab === "active" && programs.length > 0 ? (
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.createButton, { backgroundColor: theme.linkBackground }]}
            >
              <Feather name="plus" size={20} color={theme.link} />
              <ThemedText type="link">Create New Plan</ThemedText>
            </Pressable>
          ) : null
        }
      />

      <InputModal
        visible={showCreate}
        title="New Plan"
        placeholder="Plan name"
        submitLabel="Create"
        onSubmit={handleCreateProgram}
        onClose={() => setShowCreate(false)}
      />

      <InputModal
        visible={!!editingProgram}
        title="Rename Plan"
        placeholder="Plan name"
        initialValue={editingProgram?.name || ""}
        submitLabel="Save"
        onSubmit={handleUpdateProgram}
        onClose={() => setEditingProgram(null)}
      />

      <Modal
        visible={!!deletingProgram}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingProgram(null)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={() => setDeletingProgram(null)}>
          <View style={[styles.deleteModal, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.deleteIcon, { backgroundColor: Colors.dark.error + "20" }]}>
              <Feather name="alert-triangle" size={32} color={Colors.dark.error} />
            </View>
            <ThemedText type="h2" style={styles.deleteTitle}>Delete Plan?</ThemedText>
            <ThemedText type="secondary" style={styles.deleteMessage}>
              Are you sure you want to delete "{deletingProgram?.name}"?
            </ThemedText>
            <ThemedText type="body" style={[styles.deleteWarning, { color: Colors.dark.error }]}>
              This action cannot be undone. The plan and all its days and exercises will be permanently deleted.
            </ThemedText>
            <View style={styles.deleteButtons}>
              <Button 
                variant="secondary" 
                onPress={() => setDeletingProgram(null)}
                style={styles.deleteButton}
              >
                Cancel
              </Button>
              <Pressable
                onPress={handleConfirmDelete}
                style={[styles.deleteConfirmButton, { backgroundColor: Colors.dark.error }]}
              >
                <ThemedText type="body" style={{ color: "#fff", fontWeight: "600" }}>
                  Delete Forever
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  tabText: {
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModal: {
    width: "85%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  deleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  deleteTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  deleteMessage: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  deleteWarning: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  deleteButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  deleteButton: {
    flex: 1,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
