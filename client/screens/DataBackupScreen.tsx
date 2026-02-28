import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, Modal, TouchableWithoutFeedback } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { backupStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

export default function DataBackupScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await backupStorage.exportAll();
      const fileName = `trakio-backup-${new Date().toISOString().split("T")[0]}.json`;

      try {
        const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
        if (cacheDir) {
          const uri = `${cacheDir}${fileName}`;
          await FileSystem.writeAsStringAsync(uri, json, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/json",
              dialogTitle: "Save Trackio Backup",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
          }
        }
      } catch (_nativeErr) {}

      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
      const a = window.document.createElement("a");
      a.href = dataUri;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      const msg: string = error?.message ?? "";
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("dismiss")) {
        return;
      }
      console.error("Export failed:", error);
      Alert.alert("Export Failed", "Could not export backup. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === "ios"
          ? ["public.json", "application/json", "public.text", "text/plain"]
          : "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImporting(true);
      const pickedFile = result.assets[0];

      let content: string;
      if (Platform.OS === "web") {
        const response = await fetch(pickedFile.uri);
        if (!response.ok) throw new Error("Could not read file");
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(pickedFile.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const importResult = await backupStorage.importAll(content);

      if (importResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Import Complete", "Your data has been restored successfully.");
      } else {
        Alert.alert("Import Failed", importResult.error || "Invalid backup file.");
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      Alert.alert("Import Failed", "Could not read the backup file. Make sure it is a valid Trackio backup.");
    } finally {
      setImporting(false);
    }
  };

  const handleClearData = () => {
    if (Platform.OS === "web") {
      setShowClearConfirm(true);
    } else {
      Alert.alert(
        "Clear All Data",
        "This will permanently delete all your programs, sessions, and progress. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            style: "destructive",
            onPress: performClearData,
          },
        ]
      );
    }
  };

  const performClearData = async () => {
    setClearing(true);
    try {
      await backupStorage.clearAll();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowClearConfirm(false);
      if (Platform.OS === "web") {
        alert("Data Cleared: All data has been deleted.");
      } else {
        Alert.alert("Data Cleared", "All data has been deleted.");
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert("Error: Could not clear data.");
      } else {
        Alert.alert("Error", "Could not clear data.");
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.section}>
          <ThemedText type="h2" style={styles.sectionTitle}>Backup</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardContent}>
              <Feather name="download" size={24} color={theme.link} />
              <View style={styles.cardText}>
                <ThemedText type="h4">Export Backup</ThemedText>
                <ThemedText type="muted">
                  Save all your data to a file
                </ThemedText>
              </View>
            </View>
            <Button onPress={handleExport} disabled={exporting} style={styles.button}>
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h2" style={styles.sectionTitle}>Restore</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardContent}>
              <Feather name="upload" size={24} color={theme.link} />
              <View style={styles.cardText}>
                <ThemedText type="h4">Import Backup</ThemedText>
                <ThemedText type="muted">
                  Restore data from a backup file
                </ThemedText>
              </View>
            </View>
            <Button onPress={handleImport} disabled={importing} style={styles.button}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h2" style={styles.sectionTitle}>Danger Zone</ThemedText>
          <Pressable
            onPress={handleClearData}
            style={[styles.dangerCard, { backgroundColor: Colors.dark.error + "15" }]}
          >
            <Feather name="trash-2" size={24} color={Colors.dark.error} />
            <View style={styles.cardText}>
              <ThemedText type="h4" style={{ color: Colors.dark.error }}>Clear All Data</ThemedText>
              <ThemedText type="muted">
                Permanently delete all programs and history
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.dark.error} />
          </Pressable>
        </View>

        <View style={styles.info}>
          <Feather name="info" size={16} color={theme.textMuted} />
          <ThemedText type="muted" style={styles.infoText}>
            Backups include all programs, session templates, completed sessions, and settings.
            We recommend backing up regularly.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Custom confirmation modal for web */}
      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowClearConfirm(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="h2" style={styles.modalTitle}>Clear All Data</ThemedText>
                <ThemedText type="body" style={styles.modalMessage}>
                  This will permanently delete all your programs, sessions, and progress. This cannot be undone.
                </ThemedText>
                <View style={styles.modalButtons}>
                  <Pressable
                    onPress={() => setShowClearConfirm(false)}
                    style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <ThemedText type="body">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={performClearData}
                    disabled={clearing}
                    style={[styles.modalButton, styles.modalButtonDanger]}
                  >
                    <ThemedText type="body" style={{ color: theme.buttonText }}>
                      {clearing ? "Clearing..." : "Clear All"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
    padding: Spacing.lg,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardText: {
    flex: 1,
  },
  button: {
    marginTop: 0,
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    marginBottom: Spacing.md,
  },
  modalMessage: {
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalButtonDanger: {
    backgroundColor: Colors.dark.error,
  },
});
