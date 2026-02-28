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
      
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `trakio-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const fileName = `trakio-backup-${new Date().toISOString().split("T")[0]}.json`;
        const uri = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(uri, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Save Trackio Backup",
          UTI: "public.json",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert("Export Failed: Could not create backup file.");
      } else {
        Alert.alert("Export Failed", "Could not create backup file.");
      }
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImporting(true);
      const pickedFile = result.assets[0];
      const content = await FileSystem.readAsStringAsync(pickedFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const importResult = await backupStorage.importAll(content);

      if (importResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS === "web") {
          alert("Import Complete: Your data has been restored.");
        } else {
          Alert.alert("Import Complete", "Your data has been restored.");
        }
      } else {
        if (Platform.OS === "web") {
          alert("Import Failed: " + (importResult.error || "Invalid backup file."));
        } else {
          Alert.alert("Import Failed", importResult.error || "Invalid backup file.");
        }
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert("Import Failed: Could not read backup file.");
      } else {
        Alert.alert("Import Failed", "Could not read backup file.");
      }
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
