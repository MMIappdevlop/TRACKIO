import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { ParsedRow } from "./types";

interface PreviewStepProps {
  theme: any;
  headerHeight: number;
  insets: { bottom: number };
  programName: string;
  setProgramName: (value: string) => void;
  parsedData: ParsedRow[];
  errors: string[];
  handleImport: () => void;
  importing: boolean;
  setStep: (step: "select" | "mapping" | "preview") => void;
}

export function PreviewStep({
  theme,
  headerHeight,
  insets,
  programName,
  setProgramName,
  parsedData,
  errors,
  handleImport,
  importing,
  setStep,
}: PreviewStepProps) {
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
        <ThemedText type="body" style={styles.fieldLabel}>Plan Name</ThemedText>
        <TextInput
          style={[styles.programNameInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
          value={programName}
          onChangeText={setProgramName}
          placeholder="Enter plan name"
          placeholderTextColor={theme.textMuted}
        />
      </View>

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
            <ThemedText type="small" style={{ fontWeight: "600" }}>Day</ThemedText>
          </View>
          <View style={styles.previewCellWide}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>Exercise</ThemedText>
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
              <View style={styles.statusIcons}>
                {row.error ? (
                  <Feather name="alert-circle" size={14} color={Colors.dark.error} />
                ) : (
                  <Feather name="check-circle" size={14} color={Colors.dark.success} />
                )}
                {row.referenceLink ? (
                  <Feather name="link" size={12} color={theme.link} />
                ) : null}
              </View>
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

      <View style={styles.buttonRow}>
        <Button variant="secondary" onPress={() => setStep("mapping")} style={styles.flexButton}>
          Back
        </Button>
        <Button
          onPress={handleImport}
          disabled={importing || parsedData.filter((r) => !r.error).length === 0}
          style={styles.flexButton}
        >
          {importing ? "Importing..." : "Import Plan"}
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
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    width: 100,
    textTransform: "capitalize",
  },
  programNameInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
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
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  flexButton: {
    flex: 1,
  },
});
