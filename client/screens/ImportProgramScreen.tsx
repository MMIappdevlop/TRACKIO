import React, { useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import * as XLSX from "xlsx";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/hooks/useTheme";
import { programsStorage, sessionTemplatesStorage, taskTemplatesStorage } from "@/lib/storage";
import type { TaskMode } from "@/types";

import { SelectStep } from "./import-steps/SelectStep";
import { MappingStep } from "./import-steps/MappingStep";
import { PreviewStep } from "./import-steps/PreviewStep";
import {
  MAPPING_PRESETS_KEY,
  DEFAULT_MAPPING,
  type ColumnMapping,
  type MappingPreset,
  type ParsedRow,
} from "./import-steps/types";

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

  const [showTemplates, setShowTemplates] = useState(false);

  const getTemplateContent = (templateId: string): string => {
    switch (templateId) {
      case "strength":
        return `session,task,mode,sets,reps,weight,rest_seconds,notes,reference_link
Push Day,Bench Press,strength,4,8,60,90,Main compound lift,https://www.youtube.com/watch?v=example1
Push Day,Incline Dumbbell Press,strength,3,10,25,60,Focus on stretch,
Push Day,Overhead Press,strength,3,8,40,90,Strict form,https://www.youtube.com/watch?v=example2
Pull Day,Barbell Rows,strength,4,8,60,90,Main compound lift,
Pull Day,Pull-ups,strength,3,8,,60,Bodyweight,
Leg Day,Squats,strength,4,6,80,120,Main compound lift,https://www.youtube.com/watch?v=example3
Leg Day,Romanian Deadlifts,strength,3,10,60,90,Hamstring focus,`;
      case "endurance":
        return `session,task,mode,distance,distance_unit,duration_minutes,notes,reference_link
Easy Run,Morning Run,distance,5,km,30,Zone 2 heart rate,
Long Run,Weekend Long Run,distance,15,km,90,Build aerobic base,
Tempo Run,Warm Up Jog,distance,2,km,12,Easy pace,
Tempo Run,Tempo Effort,distance,5,km,25,Threshold pace,
Recovery,Light Jog,distance,3,km,25,Very easy effort,`;
      case "interval":
        return `session,task,mode,work_seconds,rest_seconds,rounds,notes,reference_link
HIIT Session,Jump Squats,interval,30,15,4,Explosive power,
HIIT Session,Burpees,interval,30,15,4,Full body cardio,
Tabata Core,Bicycle Crunches,interval,20,10,8,Classic tabata,
Sprint Intervals,Sprint,interval,30,90,6,Maximum effort,`;
      case "sports-drill":
        return `session,task,mode,sets,reps,duration_minutes,notes,reference_link
Basketball Practice,Layup Drills,time,,,10,Alternating sides,
Basketball Practice,Free Throw Practice,strength,5,10,,50 shots total,
Soccer Training,Passing Drills,time,,,15,Short and long range,
Soccer Training,Sprint Drills,interval,20,40,8,Game simulation,`;
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
    newMapping.reference_link = findColumn(["reference_link", "link", "url", "video"]) || "";

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
        referenceLink: getValue("reference_link") || undefined,
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
    if (parsedData.length === 0) {
      return;
    }

    const validRows = parsedData.filter((r) => !r.error);
    
    if (validRows.length === 0) {
      Alert.alert("Cannot Import", "All rows have validation errors. Please fix them first.");
      return;
    }

    setImporting(true);
    try {
      const finalName = programName.trim() || "Imported Program";
      const program = await programsStorage.create(finalName);

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
          referenceLink: row.referenceLink,
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
      
      // Close modal and go to Training home
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              state: {
                index: 0,
                routes: [{ name: "Training" }],
              },
            },
          ],
        })
      );
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Could not create the program. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  if (step === "select") {
    return (
      <SelectStep
        theme={theme}
        headerHeight={headerHeight}
        insets={insets}
        handlePickFile={handlePickFile}
        handleDownloadTemplate={handleDownloadTemplate}
        showTemplates={showTemplates}
        setShowTemplates={setShowTemplates}
      />
    );
  }

  if (step === "mapping") {
    return (
      <MappingStep
        theme={theme}
        headerHeight={headerHeight}
        insets={insets}
        columnMapping={columnMapping}
        setColumnMapping={setColumnMapping}
        detectedColumns={detectedColumns}
        showPresetInput={showPresetInput}
        setShowPresetInput={setShowPresetInput}
        presetName={presetName}
        setPresetName={setPresetName}
        savePreset={savePreset}
        presets={presets}
        applyPreset={applyPreset}
        deletePreset={deletePreset}
        handleProceedToPreview={handleProceedToPreview}
        setStep={setStep}
      />
    );
  }

  return (
    <PreviewStep
      theme={theme}
      headerHeight={headerHeight}
      insets={insets}
      programName={programName}
      setProgramName={setProgramName}
      parsedData={parsedData}
      errors={errors}
      handleImport={handleImport}
      importing={importing}
      setStep={setStep}
    />
  );
}
