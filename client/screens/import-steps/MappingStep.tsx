import React from "react";
import { View, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ColumnMapping, MappingPreset } from "./types";
import { formatFieldLabel } from "./types";

interface MappingStepProps {
  theme: any;
  headerHeight: number;
  insets: { bottom: number };
  columnMapping: ColumnMapping;
  setColumnMapping: React.Dispatch<React.SetStateAction<ColumnMapping>>;
  detectedColumns: string[];
  showPresetInput: boolean;
  setShowPresetInput: (value: boolean) => void;
  presetName: string;
  setPresetName: (value: string) => void;
  savePreset: () => void;
  presets: MappingPreset[];
  applyPreset: (preset: MappingPreset) => void;
  deletePreset: (id: string) => void;
  handleProceedToPreview: () => void;
  setStep: (step: "select" | "mapping" | "preview") => void;
}

export function MappingStep({
  theme,
  headerHeight,
  insets,
  columnMapping,
  setColumnMapping,
  detectedColumns,
  showPresetInput,
  setShowPresetInput,
  presetName,
  setPresetName,
  savePreset,
  presets,
  applyPreset,
  deletePreset,
  handleProceedToPreview,
  setStep,
}: MappingStepProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
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
            <Pressable onPress={savePreset} style={[styles.saveBtn, { backgroundColor: "#0f52ba" }]}>
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
              {formatFieldLabel(field)}
            </ThemedText>
            <View style={[styles.dropdown, { backgroundColor: theme.backgroundSecondary }]}>
              <Pressable
                style={styles.dropdownButton}
                onPress={() => {
                  Alert.alert(
                    `Select column for ${formatFieldLabel(field)}`,
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
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  section: {
    marginBottom: Spacing.xl,
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
});
