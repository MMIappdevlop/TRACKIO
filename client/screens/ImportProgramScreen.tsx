import React, { useState } from "react";
import { View, StyleSheet, ScrollView, FlatList, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as XLSX from "xlsx";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { programsStorage, sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TaskMode } from "@/types";

interface ParsedRow {
  session: string;
  task: string;
  mode: TaskMode;
  sets?: number;
  reps?: number;
  weight?: number;
  error?: string;
}

export default function ImportProgramScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [fileName, setFileName] = useState<string | null>(null);
  const [programName, setProgramName] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setFileName(file.name);

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(content, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      parseData(jsonData);
    } catch (error) {
      Alert.alert("Error", "Could not read the file. Please try a different format.");
    }
  };

  const parseData = (data: any[]) => {
    const rows: ParsedRow[] = [];
    const validationErrors: string[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2;
      const parsed: ParsedRow = {
        session: String(row.session || row.Session || "").trim(),
        task: String(row.task || row.Task || row.exercise || row.Exercise || "").trim(),
        mode: validateMode(row.mode || row.Mode || row.type || row.Type || "strength"),
        sets: parseInt(row.sets || row.Sets || "0") || undefined,
        reps: parseInt(row.reps || row.Reps || "0") || undefined,
        weight: parseFloat(row.weight || row.Weight || "0") || undefined,
      };

      if (!parsed.session) {
        parsed.error = `Row ${rowNum}: session is missing`;
        validationErrors.push(parsed.error);
      }

      if (!parsed.task) {
        parsed.error = `Row ${rowNum}: task is missing`;
        validationErrors.push(parsed.error);
      }

      if (!["strength", "distance", "interval", "time", "notes"].includes(parsed.mode)) {
        parsed.error = `Row ${rowNum}: invalid mode "${parsed.mode}"`;
        parsed.mode = "strength";
        validationErrors.push(parsed.error);
      }

      rows.push(parsed);
    });

    setParsedData(rows);
    setErrors(validationErrors);

    if (rows.length > 0) {
      const sessions = [...new Set(rows.map((r) => r.session))];
      setProgramName(`Imported Program (${sessions.length} sessions)`);
    }
  };

  const validateMode = (mode: string): TaskMode => {
    const normalized = mode.toLowerCase().trim();
    if (["strength", "distance", "interval", "time", "notes"].includes(normalized)) {
      return normalized as TaskMode;
    }
    return "strength";
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    const validRows = parsedData.filter((r) => !r.error);
    if (validRows.length === 0) {
      Alert.alert("Cannot Import", "All rows have validation errors.");
      return;
    }

    setImporting(true);
    try {
      const program = await programsStorage.create(programName || "Imported Program");

      const sessions = [...new Set(validRows.map((r) => r.session))];
      const sessionMap = new Map<string, string>();

      for (const sessionName of sessions) {
        const template = await sessionTemplatesStorage.create(program.id, sessionName);
        sessionMap.set(sessionName, template.id);
      }

      for (const row of validRows) {
        const sessionTemplateId = sessionMap.get(row.session);
        if (!sessionTemplateId) continue;

        await taskTemplatesStorage.create(sessionTemplateId, {
          name: row.task,
          mode: row.mode,
          trackMilestones: false,
          config: {
            sets: row.sets,
            reps: row.reps,
            weight: row.weight,
          },
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Import Complete", `Created "${program.name}" with ${sessions.length} sessions.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Import Failed", "Could not create the program.");
    } finally {
      setImporting(false);
    }
  };

  const renderPreviewRow = ({ item, index }: { item: ParsedRow; index: number }) => (
    <View
      style={[
        styles.previewRow,
        { backgroundColor: item.error ? Colors.dark.error + "15" : theme.backgroundDefault },
      ]}
    >
      <View style={styles.previewCell}>
        <ThemedText type="small" numberOfLines={1}>{item.session}</ThemedText>
      </View>
      <View style={styles.previewCell}>
        <ThemedText type="small" numberOfLines={1}>{item.task}</ThemedText>
      </View>
      <View style={styles.previewCellSmall}>
        <ThemedText type="small">{item.mode}</ThemedText>
      </View>
      {item.error ? (
        <Feather name="alert-circle" size={14} color={Colors.dark.error} />
      ) : (
        <Feather name="check" size={14} color={Colors.dark.success} />
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Import from CSV/Excel</ThemedText>
        <ThemedText type="secondary" style={styles.description}>
          Import a program from a spreadsheet file. Your file should have columns: session, task, mode, sets, reps, weight.
        </ThemedText>

        <Button onPress={handlePickFile} style={styles.pickButton}>
          {fileName ? `Selected: ${fileName}` : "Choose File"}
        </Button>
      </View>

      {parsedData.length > 0 ? (
        <>
          <View style={styles.section}>
            <ThemedText type="h2" style={styles.sectionTitle}>Preview</ThemedText>
            <View style={[styles.previewHeader, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.previewCell}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>Session</ThemedText>
              </View>
              <View style={styles.previewCell}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>Task</ThemedText>
              </View>
              <View style={styles.previewCellSmall}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>Mode</ThemedText>
              </View>
            </View>
            <FlatList
              data={parsedData.slice(0, 10)}
              keyExtractor={(_, index) => String(index)}
              renderItem={renderPreviewRow}
              scrollEnabled={false}
            />
            {parsedData.length > 10 ? (
              <ThemedText type="muted" style={styles.moreText}>
                ...and {parsedData.length - 10} more rows
              </ThemedText>
            ) : null}
          </View>

          {errors.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h4" style={{ color: Colors.dark.error }}>
                {errors.length} Validation Error{errors.length > 1 ? "s" : ""}
              </ThemedText>
              {errors.slice(0, 5).map((err, i) => (
                <ThemedText key={i} type="muted" style={styles.errorText}>
                  {err}
                </ThemedText>
              ))}
            </View>
          ) : null}

          <Button
            onPress={handleImport}
            disabled={importing || parsedData.filter((r) => !r.error).length === 0}
            style={styles.importButton}
          >
            {importing ? "Importing..." : "Import Program"}
          </Button>
        </>
      ) : (
        <EmptyState
          icon="file-text"
          title="No File Selected"
          description="Choose a CSV or Excel file to preview and import"
        />
      )}
    </ScrollView>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  pickButton: {
    marginTop: 0,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: 2,
  },
  previewCell: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  previewCellSmall: {
    width: 60,
  },
  moreText: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  importButton: {
    marginTop: Spacing.lg,
  },
});
