import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { taskTemplatesStorage } from "@/lib/storage";
import { Spacing, BorderRadius, TaskModes, Typography } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskMode, TaskConfig, TaskTemplate } from "@/types";

type RoutePropType = RouteProp<RootStackParamList, "AddTask">;

const TASK_MODE_OPTIONS: { mode: TaskMode; label: string; icon: string }[] = [
  { mode: "strength", label: "Strength", icon: "target" },
  { mode: "distance", label: "Distance", icon: "navigation" },
  { mode: "interval", label: "Interval", icon: "clock" },
  { mode: "time", label: "Time", icon: "watch" },
  { mode: "notes", label: "Notes", icon: "file-text" },
];

export default function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { sessionTemplateId, taskId } = route.params;

  const [name, setName] = useState("");
  const [mode, setMode] = useState<TaskMode>("strength");
  const [groupLabel, setGroupLabel] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [trackMilestones, setTrackMilestones] = useState(false);
  const [config, setConfig] = useState<TaskConfig>({
    sets: 3,
    reps: 10,
    isBodyweight: false,
    workSeconds: 30,
    restSeconds: 30,
    rounds: 5,
  });

  const isEditing = !!taskId;

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) return;
    const task = await taskTemplatesStorage.getById(taskId);
    if (task) {
      setName(task.name);
      setMode(task.mode);
      setGroupLabel(task.groupLabel || "");
      setReferenceLink(task.referenceLink || "");
      setTrackMilestones(task.trackMilestones);
      setConfig(task.config);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (isEditing && taskId) {
      await taskTemplatesStorage.update(taskId, {
        name: name.trim(),
        mode,
        groupLabel: groupLabel.trim() || undefined,
        referenceLink: referenceLink.trim() || undefined,
        trackMilestones,
        config,
      });
    } else {
      await taskTemplatesStorage.create(sessionTemplateId, {
        name: name.trim(),
        mode,
        groupLabel: groupLabel.trim() || undefined,
        referenceLink: referenceLink.trim() || undefined,
        trackMilestones,
        config,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const updateConfig = (key: keyof TaskConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const renderConfigFields = () => {
    switch (mode) {
      case "strength":
        return (
          <>
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <ThemedText type="secondary" style={styles.label}>Sets</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.sets || "")}
                  onChangeText={(v) => updateConfig("sets", parseInt(v) || 0)}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.fieldHalf}>
                <ThemedText type="secondary" style={styles.label}>Reps</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.reps || "")}
                  onChangeText={(v) => updateConfig("reps", parseInt(v) || 0)}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
            <Pressable
              style={styles.toggle}
              onPress={() => updateConfig("isBodyweight", !config.isBodyweight)}
            >
              <View style={[styles.checkbox, config.isBodyweight && { backgroundColor: theme.link, borderColor: theme.link }]}>
                {config.isBodyweight ? <Feather name="check" size={14} color="#FFF" /> : null}
              </View>
              <ThemedText type="body">Bodyweight exercise</ThemedText>
            </Pressable>
          </>
        );
      case "distance":
        return (
          <>
            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <ThemedText type="secondary" style={styles.label}>Target Distance</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.targetDistance || "")}
                  onChangeText={(v) => updateConfig("targetDistance", parseFloat(v) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.fieldHalf}>
                <ThemedText type="secondary" style={styles.label}>Unit</ThemedText>
                <View style={styles.unitPicker}>
                  {(["km", "mi", "m"] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => updateConfig("distanceUnit", unit)}
                      style={[
                        styles.unitOption,
                        { backgroundColor: config.distanceUnit === unit ? theme.link : theme.backgroundDefault },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{ color: config.distanceUnit === unit ? "#FFF" : theme.text }}
                      >
                        {unit}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </>
        );
      case "interval":
        return (
          <>
            <View style={styles.row}>
              <View style={styles.fieldThird}>
                <ThemedText type="secondary" style={styles.label}>Work (s)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.workSeconds || "")}
                  onChangeText={(v) => updateConfig("workSeconds", parseInt(v) || 0)}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.fieldThird}>
                <ThemedText type="secondary" style={styles.label}>Rest (s)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.restSeconds || "")}
                  onChangeText={(v) => updateConfig("restSeconds", parseInt(v) || 0)}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.fieldThird}>
                <ThemedText type="secondary" style={styles.label}>Rounds</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={String(config.rounds || "")}
                  onChangeText={(v) => updateConfig("rounds", parseInt(v) || 0)}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
          </>
        );
      case "time":
        return (
          <ThemedText type="muted" style={styles.hint}>
            Log duration during the session
          </ThemedText>
        );
      case "notes":
        return (
          <ThemedText type="muted" style={styles.hint}>
            Free text notes during the session
          </ThemedText>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.field}>
        <ThemedText type="secondary" style={styles.label}>Task Name</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Bench Press"
          placeholderTextColor={theme.textMuted}
          autoFocus={!isEditing}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="secondary" style={styles.label}>Task Type</ThemedText>
        <View style={styles.modeGrid}>
          {TASK_MODE_OPTIONS.map((option) => {
            const modeConfig = TaskModes[option.mode];
            const isSelected = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setMode(option.mode)}
                style={[
                  styles.modeOption,
                  { backgroundColor: isSelected ? modeConfig.color + "20" : theme.backgroundDefault },
                  isSelected && { borderColor: modeConfig.color, borderWidth: 2 },
                ]}
              >
                <Feather name={option.icon as any} size={20} color={isSelected ? modeConfig.color : theme.textSecondary} />
                <ThemedText type="small" style={isSelected && { color: modeConfig.color }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>Configuration</ThemedText>
        {renderConfigFields()}
      </View>

      <View style={styles.field}>
        <ThemedText type="secondary" style={styles.label}>Group Label (optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={groupLabel}
          onChangeText={setGroupLabel}
          placeholder="e.g., Superset A"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="secondary" style={styles.label}>Reference Link (optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={referenceLink}
          onChangeText={setReferenceLink}
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <ThemedText type="muted" style={styles.hint}>
          Add a video or article link for exercise reference
        </ThemedText>
      </View>

      {(mode === "strength" || mode === "distance") ? (
        <Pressable
          style={styles.toggle}
          onPress={() => setTrackMilestones(!trackMilestones)}
        >
          <View style={[styles.checkbox, trackMilestones && { backgroundColor: theme.link, borderColor: theme.link }]}>
            {trackMilestones ? <Feather name="check" size={14} color="#FFF" /> : null}
          </View>
          <ThemedText type="body">Track milestones for badges</ThemedText>
        </Pressable>
      ) : null}

      <Button onPress={handleSave} disabled={!name.trim()} style={styles.saveButton}>
        {isEditing ? "Update Exercise" : "Add Exercise"}
      </Button>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  field: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  modeOption: {
    width: "31%",
    aspectRatio: 1.2,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldThird: {
    flex: 1,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
  },
  unitPicker: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  unitOption: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    paddingVertical: Spacing.sm,
  },
  saveButton: {
    marginTop: Spacing.xl,
  },
});
