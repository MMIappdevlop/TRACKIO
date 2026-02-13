import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { Spacing, BorderRadius } from "@/constants/theme";
import { TEMPLATE_INFO } from "./types";

interface SelectStepProps {
  theme: any;
  headerHeight: number;
  insets: { bottom: number };
  handlePickFile: () => void;
  handleDownloadTemplate: (templateId: string) => void;
  showTemplates: boolean;
  setShowTemplates: (value: boolean) => void;
}

export function SelectStep({
  theme,
  headerHeight,
  insets,
  handlePickFile,
  handleDownloadTemplate,
  showTemplates,
  setShowTemplates,
}: SelectStepProps) {
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
        <ThemedText type="h2" style={styles.sectionTitle}>Import Your Plan</ThemedText>
        <ThemedText type="secondary" style={styles.description}>
          Select a CSV or Excel file with your workout plan
        </ThemedText>

        <Button onPress={handlePickFile} style={styles.pickButton}>
          Choose File
        </Button>
      </View>

      <View style={styles.templateHelpSection}>
        <ThemedText type="secondary" style={styles.templateHelpText}>
          Not sure how to format your file?
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTemplates(!showTemplates);
          }}
          style={styles.templateToggle}
        >
          <Feather name="download" size={16} color={theme.link} />
          <ThemedText type="body" style={{ color: theme.link, fontWeight: "500" }}>
            Download a template
          </ThemedText>
          <Feather
            name={showTemplates ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.link}
          />
        </Pressable>

        {showTemplates ? (
          <View style={styles.templateList}>
            {TEMPLATE_INFO.map((template) => (
              <Pressable
                key={template.id}
                style={[styles.templateCard, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => handleDownloadTemplate(template.id)}
              >
                <View style={[styles.templateIcon, { backgroundColor: template.color + "20" }]}>
                  <ModeIcon mode={template.mode} size={20} color={template.color} />
                </View>
                <View style={styles.templateInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{template.name}</ThemedText>
                  <ThemedText type="muted">{template.description}</ThemedText>
                </View>
                <Feather name="download" size={18} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
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
  templateHelpSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  templateHelpText: {
    marginBottom: Spacing.sm,
  },
  templateToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  templateList: {
    marginTop: Spacing.md,
    width: "100%",
  },
  pickButton: {
    marginTop: 0,
  },
});
