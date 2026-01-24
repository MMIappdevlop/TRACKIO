import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Share } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await backupStorage.exportAll();
      const fileName = `trakio-backup-${new Date().toISOString().split("T")[0]}.json`;
      const filePath = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(filePath, json);

      await Share.share({
        url: filePath,
        title: "Trakio Backup",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Export Failed", "Could not create backup file.");
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
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);

      const importResult = await backupStorage.importAll(content);

      if (importResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Import Complete", "Your data has been restored.");
      } else {
        Alert.alert("Import Failed", importResult.error || "Invalid backup file.");
      }
    } catch (error) {
      Alert.alert("Import Failed", "Could not read backup file.");
    } finally {
      setImporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your programs, sessions, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await backupStorage.clearAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Data Cleared", "All data has been deleted.");
          },
        },
      ]
    );
  };

  return (
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
});
