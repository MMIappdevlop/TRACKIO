import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, FlatList, Alert, Pressable, TextInput, Platform } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import * as XLSX from "xlsx";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { programsStorage, sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { TaskMode } from "@/types";

const MAPPING_PRESETS_KEY = "@trakio/mapping_presets";

interface ColumnMapping {
  session: string;
  task: string;
  mode: string;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  distance_unit: string;
  duration_minutes: string;
  work_seconds: string;
  rest_seconds: string;
  rounds: string;
  notes: string;
}

interface MappingPreset {
  id: string;
  name: string;
  mapping: ColumnMapping;
}

interface ParsedRow {
  session: string;
  task: string;
  mode: TaskMode;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  distanceUnit?: string;
  durationMinutes?: number;
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
  notes?: string;
  error?: string;
  rowNumber: number;
}

const DEFAULT_MAPPING: ColumnMapping = {
  session: "session",
  task: "task",
  mode: "mode",
  sets: "sets",
  reps: "reps",
  weight: "weight",
  distance: "distance",
  distance_unit: "distance_unit",
  duration_minutes: "duration_minutes",
  work_seconds: "work_seconds",
  rest_seconds: "rest_seconds",
  rounds: "rounds",
  notes: "notes",
};

const TEMPLATE_INFO = [
  { 
    id: "strength", 
    name: "Strength Template", 
    description: "For weight training programs",
    icon: "target" as const,
    color: "#4C7DFF",
  },
  { 
    id: "endurance", 
    name: "Endurance Template", 
    description: "For running and cardio",
    icon: "activity" as const,
    color: Colors.dark.success,
  },
  { 
    id: "interval", 
    name: "Interval Template", 
    description: "For HIIT and tabata workouts",
    icon: "zap" as const,
    color: Colors.dark.effort,
  },
  { 
    id: "sports-drill", 
    name: "Sports Drill Template", 
    description: "For sport-specific training",
    icon: "award" as const,
    color: Colors.dark.warning,
  },
];

export default function ImportProgramScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"select" | "mapping" | "preview">("select");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [programName, setProgramName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [presets, setPresets] = useState<MappingPreset[]>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const data = await AsyncStorage.getItem(MAPPING_PRESETS_KEY);
      if (data) {
        setPresets(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;

    const newPreset: MappingPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      mapping: columnMapping,
    };

    const updated = [...presets, newPreset];
    await AsyncStorage.setItem(MAPPING_PRESETS_KEY, JSON.stringify(updated));
    setPresets(updated);
    setPresetName("");
    setShowPresetInput(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deletePreset = async (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    await AsyncStorage.setItem(MAPPING_PRESETS_KEY, JSON.stringify(updated));
    setPresets(updated);
  };

  const applyPreset = (preset: MappingPreset) => {
    setColumnMapping(preset.mapping);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDownloadTemplate = async (templateId: string) => {
    const templateContent = getTemplateContent(templateId);
    const fileName = `${templateId}-template.csv`;
    
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([templateContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const file = new File(Paths.cache, fileName);
        await file.write(templateContent);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "text/csv",
            dialogTitle: "Save Template",
            UTI: "public.comma-separated-values-text",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            "Sharing Not Available",
            "File sharing is not supported on this device. The template content is shown above - you can manually create your spreadsheet based on it."
          );
        }
      }
    } catch (error) {
      console.error("Template download error:", error);
      Alert.alert(
        "Download Failed", 
        "Could not save the template file. Please try again."
      );
    }
  };

  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const getTemplateContent = (templateId: string): string => {
    switch (templateId) {
      case "strength":
        return `session,task,mode,sets,reps,weight,rest_seconds,notes
Push Day,Bench Press,strength,4,8,60,90,Main compound lift
Push Day,Incline Dumbbell Press,strength,3,10,25,60,Focus on stretch
Push Day,Overhead Press,strength,3,8,40,90,Strict form
Pull Day,Barbell Rows,strength,4,8,60,90,Main compound lift
Pull Day,Pull-ups,strength,3,8,,60,Bodyweight
Leg Day,Squats,strength,4,6,80,120,Main compound lift
Leg Day,Romanian Deadlifts,strength,3,10,60,90,Hamstring focus`;
      case "endurance":
        return `session,task,mode,distance,distance_unit,duration_minutes,notes
Easy Run,Morning Run,distance,5,km,30,Zone 2 heart rate
Long Run,Weekend Long Run,distance,15,km,90,Build aerobic base
Tempo Run,Warm Up Jog,distance,2,km,12,Easy pace
Tempo Run,Tempo Effort,distance,5,km,25,Threshold pace
Recovery,Light Jog,distance,3,km,25,Very easy effort`;
      case "interval":
        return `session,task,mode,work_seconds,rest_seconds,rounds,notes
HIIT Session,Jump Squats,interval,30,15,4,Explosive power
HIIT Session,Burpees,interval,30,15,4,Full body cardio
Tabata Core,Bicycle Crunches,interval,20,10,8,Classic tabata
Sprint Intervals,Sprint,interval,30,90,6,Maximum effort`;
      case "sports-drill":
        return `session,task,mode,sets,reps,duration_minutes,notes
Basketball Practice,Layup Drills,time,,,10,Alternating sides
Basketball Practice,Free Throw Practice,strength,5,10,,50 shots total
Soccer Training,Passing Drills,time,,,15,Short and long range
Soccer Training,Sprint Drills,interval,20,40,8,Game simulation`;
      default:
        return "";
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setFileName(file.name);

      let content: string;
      
      if (Platform.OS === "web") {
        // On web, fetch the blob URL and convert to base64
        const response = await fetch(file.uri);
        const blob = await response.blob();
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // On native, use FileSystem
        const fsFile = new File(file.uri);
        content = await fsFile.base64();
      }

      const workbook = XLSX.read(content, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        Alert.alert("Error", "File is empty or could not be read");
        return;
      }

      setRawData(jsonData);
      
      const columns = Object.keys(jsonData[0] as object);
      setDetectedColumns(columns);
      
      autoDetectMapping(columns);
      setStep("mapping");
    } catch (error) {
      console.error("File read error:", error);
      Alert.alert("Error", "Could not read the file. Please try a different format.");
    }
  };

  const autoDetectMapping = (columns: string[]) => {
    const lowerColumns = columns.map(c => c.toLowerCase());
    const newMapping = { ...DEFAULT_MAPPING };

    const findColumn = (keywords: string[]): string => {
      for (const col of columns) {
        const lower = col.toLowerCase();
        if (keywords.some(k => lower.includes(k))) {
          return col;
        }
      }
      return "";
    };

    newMapping.session = findColumn(["session", "day", "workout"]) || columns[0] || "";
    newMapping.task = findColumn(["task", "exercise", "name", "activity"]) || columns[1] || "";
    newMapping.mode = findColumn(["mode", "type", "category"]) || "";
    newMapping.sets = findColumn(["sets", "set"]) || "";
    newMapping.reps = findColumn(["reps", "rep", "repetitions"]) || "";
    newMapping.weight = findColumn(["weight", "load", "kg", "lb"]) || "";
    newMapping.distance = findColumn(["distance", "dist"]) || "";
    newMapping.distance_unit = findColumn(["unit", "distance_unit"]) || "";
    newMapping.duration_minutes = findColumn(["duration", "time", "minutes"]) || "";
    newMapping.work_seconds = findColumn(["work", "work_seconds"]) || "";
    newMapping.rest_seconds = findColumn(["rest", "rest_seconds"]) || "";
    newMapping.rounds = findColumn(["rounds", "round", "cycles"]) || "";
    newMapping.notes = findColumn(["notes", "note", "comment", "description"]) || "";

    setColumnMapping(newMapping);
  };

  const handleProceedToPreview = () => {
    parseDataWithMapping();
    setStep("preview");
  };

  const parseDataWithMapping = () => {
    const rows: ParsedRow[] = [];
    const validationErrors: string[] = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2;
      
      const getValue = (field: keyof ColumnMapping): string => {
        const col = columnMapping[field];
        return col ? String(row[col] || "").trim() : "";
      };

      const session = getValue("session");
      const task = getValue("task");
      const modeStr = getValue("mode") || "strength";

      const parsed: ParsedRow = {
        rowNumber: rowNum,
        session,
        task,
        mode: validateMode(modeStr),
        sets: parseInt(getValue("sets")) || undefined,
        reps: parseInt(getValue("reps")) || undefined,
        weight: parseFloat(getValue("weight")) || undefined,
        distance: parseFloat(getValue("distance")) || undefined,
        distanceUnit: getValue("distance_unit") || undefined,
        durationMinutes: parseInt(getValue("duration_minutes")) || undefined,
        workSeconds: parseInt(getValue("work_seconds")) || undefined,
        restSeconds: parseInt(getValue("rest_seconds")) || undefined,
        rounds: parseInt(getValue("rounds")) || undefined,
        notes: getValue("notes") || undefined,
      };

      if (!parsed.session) {
        parsed.error = `Row ${rowNum}: Session name is required`;
        validationErrors.push(parsed.error);
      }

      if (!parsed.task) {
        parsed.error = `Row ${rowNum}: Task/exercise name is required`;
        validationErrors.push(parsed.error);
      }

      if (parsed.mode === "strength" && !parsed.sets && !parsed.reps) {
        if (!parsed.error) {
          parsed.error = `Row ${rowNum}: Strength tasks need sets or reps`;
          validationErrors.push(parsed.error);
        }
      }

      if (parsed.mode === "interval" && (!parsed.workSeconds || !parsed.rounds)) {
        if (!parsed.error) {
          parsed.error = `Row ${rowNum}: Interval tasks need work_seconds and rounds`;
          validationErrors.push(parsed.error);
        }
      }

      rows.push(parsed);
    });

    setParsedData(rows);
    setErrors(validationErrors);

    if (rows.length > 0) {
      const sessions = [...new Set(rows.map((r) => r.session).filter(Boolean))];
      setProgramName(`Imported (${sessions.length} sessions)`);
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
    console.log("Import button pressed, parsedData:", parsedData.length);
    
    if (parsedData.length === 0) {
      console.log("No parsed data");
      return;
    }

    const validRows = parsedData.filter((r) => !r.error);
    console.log("Valid rows:", validRows.length);
    
    if (validRows.length === 0) {
      Alert.alert("Cannot Import", "All rows have validation errors. Please fix them first.");
      return;
    }

    setImporting(true);
    try {
      const program = await programsStorage.create(programName || "Imported Program");
      console.log("Created program:", program.name);

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
            targetDistance: row.distance,
            distanceUnit: row.distanceUnit as any,
            workSeconds: row.workSeconds,
            restSeconds: row.restSeconds,
            rounds: row.rounds,
          },
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Import Complete",
        `Successfully imported "${programName || "Imported Program"}" with ${sessions.length} sessions and ${validRows.length} exercises.`,
        [
          {
            text: "Go to Training",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "MainTabs" }],
                })
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Could not create the program. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const renderSelectStep = () => (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Example Templates</ThemedText>
        <ThemedText type="secondary" style={styles.description}>
          Tap a template to see the expected format for your data
        </ThemedText>

        {TEMPLATE_INFO.map((template) => (
          <View key={template.id}>
            <Pressable
              style={[styles.templateCard, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedTemplate(expandedTemplate === template.id ? null : template.id);
              }}
            >
              <View style={[styles.templateIcon, { backgroundColor: template.color + "20" }]}>
                <Feather name={template.icon} size={20} color={template.color} />
              </View>
              <View style={styles.templateInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{template.name}</ThemedText>
                <ThemedText type="muted">{template.description}</ThemedText>
              </View>
              <Feather 
                name={expandedTemplate === template.id ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.link} 
              />
            </Pressable>
            {expandedTemplate === template.id ? (
              <View style={[styles.templatePreview, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="muted" style={{ marginBottom: Spacing.sm }}>
                  Required columns: {getTemplateContent(template.id).split('\n')[0]}
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <ThemedText type="body" style={styles.templateCode}>
                    {getTemplateContent(template.id)}
                  </ThemedText>
                </ScrollView>
                <Button
                  onPress={() => handleDownloadTemplate(template.id)}
                  style={{ marginTop: Spacing.md }}
                >
                  Download Template
                </Button>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Import Your File</ThemedText>
        <ThemedText type="secondary" style={styles.description}>
          Select a CSV or Excel file with your workout program
        </ThemedText>

        <Button onPress={handlePickFile} style={styles.pickButton}>
          Choose File
        </Button>
      </View>
    </ScrollView>
  );

  const renderMappingStep = () => (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="h2">Column Mapping</ThemedText>
          <Pressable
            onPress={() => setShowPresetInput(true)}
            style={[styles.smallButton, { backgroundColor: theme.linkBackground }]}
          >
            <Feather name="save" size={16} color={theme.link} />
            <ThemedText type="small" style={{ color: theme.link }}>Save</ThemedText>
          </Pressable>
        </View>
        <ThemedText type="secondary" style={styles.description}>
          Map your file columns to the required fields
        </ThemedText>

        {showPresetInput ? (
          <View style={[styles.presetInput, { backgroundColor: theme.backgroundDefault }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Preset name..."
              placeholderTextColor={theme.textMuted}
            />
            <Pressable onPress={savePreset} style={[styles.saveBtn, { backgroundColor: "#4C7DFF" }]}>
              <ThemedText type="small" style={{ color: "#FFF" }}>Save</ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowPresetInput(false)}>
              <Feather name="x" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {presets.length > 0 ? (
          <View style={styles.presetsRow}>
            {presets.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => applyPreset(preset)}
                onLongPress={() => {
                  Alert.alert("Delete Preset", `Delete "${preset.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deletePreset(preset.id) },
                  ]);
                }}
                style={[styles.presetChip, { backgroundColor: theme.linkBackground }]}
              >
                <ThemedText type="small" style={{ color: theme.link }}>{preset.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {Object.entries(columnMapping).map(([field, value]) => (
          <View key={field} style={styles.mappingRow}>
            <ThemedText type="body" style={styles.fieldLabel}>
              {field.replace(/_/g, " ")}
            </ThemedText>
            <View style={[styles.dropdown, { backgroundColor: theme.backgroundSecondary }]}>
              <Pressable
                style={styles.dropdownButton}
                onPress={() => {
                  Alert.alert(
                    `Select column for ${field}`,
                    "Choose a column from your file",
                    [
                      { text: "(none)", onPress: () => setColumnMapping(prev => ({ ...prev, [field]: "" })) },
                      ...detectedColumns.map((col) => ({
                        text: col,
                        onPress: () => setColumnMapping(prev => ({ ...prev, [field]: col })),
                      })),
                    ]
                  );
                }}
              >
                <ThemedText type="body" numberOfLines={1}>
                  {value || "(not mapped)"}
                </ThemedText>
                <Feather name="chevron-down" size={16} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Button variant="secondary" onPress={() => setStep("select")} style={styles.flexButton}>
          Back
        </Button>
        <Button onPress={handleProceedToPreview} style={styles.flexButton}>
          Preview Import
        </Button>
      </View>
    </ScrollView>
  );

  const renderPreviewStep = () => (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>Preview</ThemedText>
        <ThemedText type="secondary" style={styles.description}>
          {parsedData.length} rows found, {errors.length} with errors
        </ThemedText>

        <View style={[styles.previewHeader, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.previewCell}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>Row</ThemedText>
          </View>
          <View style={styles.previewCellWide}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>Session</ThemedText>
          </View>
          <View style={styles.previewCellWide}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>Task</ThemedText>
          </View>
          <View style={styles.previewCell}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>Status</ThemedText>
          </View>
        </View>

        {parsedData.slice(0, 15).map((row, index) => (
          <View
            key={index}
            style={[
              styles.previewRow,
              { backgroundColor: row.error ? Colors.dark.error + "15" : theme.backgroundDefault },
            ]}
          >
            <View style={styles.previewCell}>
              <ThemedText type="small">{row.rowNumber}</ThemedText>
            </View>
            <View style={styles.previewCellWide}>
              <ThemedText type="small" numberOfLines={1}>{row.session}</ThemedText>
            </View>
            <View style={styles.previewCellWide}>
              <ThemedText type="small" numberOfLines={1}>{row.task}</ThemedText>
            </View>
            <View style={styles.previewCell}>
              {row.error ? (
                <Feather name="alert-circle" size={14} color={Colors.dark.error} />
              ) : (
                <Feather name="check-circle" size={14} color={Colors.dark.success} />
              )}
            </View>
          </View>
        ))}

        {parsedData.length > 15 ? (
          <ThemedText type="muted" style={styles.moreText}>
            ...and {parsedData.length - 15} more rows
          </ThemedText>
        ) : null}
      </View>

      {errors.length > 0 ? (
        <View style={[styles.errorSection, { backgroundColor: Colors.dark.error + "10" }]}>
          <View style={styles.errorHeader}>
            <Feather name="alert-triangle" size={18} color={Colors.dark.error} />
            <ThemedText type="body" style={{ color: Colors.dark.error, fontWeight: "600" }}>
              {errors.length} Error{errors.length > 1 ? "s" : ""} Found
            </ThemedText>
          </View>
          {errors.slice(0, 5).map((err, i) => (
            <ThemedText key={i} type="small" style={styles.errorText}>
              {err}
            </ThemedText>
          ))}
          {errors.length > 5 ? (
            <ThemedText type="muted" style={{ marginTop: Spacing.sm }}>
              ...and {errors.length - 5} more errors
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="body" style={styles.fieldLabel}>Program Name</ThemedText>
        <TextInput
          style={[styles.programNameInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
          value={programName}
          onChangeText={setProgramName}
          placeholder="Enter program name"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button variant="secondary" onPress={() => setStep("mapping")} style={styles.flexButton}>
          Back
        </Button>
        <Button
          onPress={handleImport}
          disabled={importing || parsedData.filter((r) => !r.error).length === 0}
          style={styles.flexButton}
        >
          {importing ? "Importing..." : "Import Program"}
        </Button>
      </View>
    </ScrollView>
  );

  return step === "select" ? renderSelectStep() : step === "mapping" ? renderMappingStep() : renderPreviewStep();
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  templateInfo: {
    flex: 1,
  },
  templatePreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  templateCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 18,
  },
  pickButton: {
    marginTop: 0,
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  presetInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  mappingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  fieldLabel: {
    width: 100,
    textTransform: "capitalize",
  },
  dropdown: {
    flex: 1,
    borderRadius: BorderRadius.sm,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  flexButton: {
    flex: 1,
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
    width: 40,
    alignItems: "center",
  },
  previewCellWide: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  moreText: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  errorSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    marginTop: 4,
  },
  programNameInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
