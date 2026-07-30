import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, Pressable, Modal, ActivityIndicator, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ModeIcon } from "@/components/icons/ModeIcon";
import { useTheme } from "@/hooks/useTheme";
import { taskTemplatesStorage } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, TaskModes, Typography, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TaskMode, TaskConfig } from "@/types";

type RoutePropType = RouteProp<RootStackParamList, "AddTask">;

const TASK_MODE_OPTIONS: { mode: TaskMode; label: string }[] = [
  { mode: "strength", label: "Strength" },
  { mode: "distance", label: "Distance" },
  { mode: "interval", label: "Interval" },
  { mode: "time", label: "Time" },
  { mode: "notes", label: "Notes" },
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
  const [config, setConfig] = useState<TaskConfig>({
    sets: 3,
    reps: 10,
    isBodyweight: false,
    workSeconds: 30,
    restSeconds: 30,
    rounds: 5,
  });
  const [targetDistanceStr, setTargetDistanceStr] = useState<string | null>(null);
  const [gifFrameUrls, setGifFrameUrls] = useState<string[]>([]);
  const [gifModal, setGifModal] = useState<{
    searchQuery: string;
    searchResults: { name: string; frameUrls: string[] }[];
    searchLoading: boolean;
    selectedFrameUrls: string[];
  } | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; frameUrls: string[] }[]>([]);
  const nameSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gifSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameSearchCounterRef = useRef(0);
  const gifSearchCounterRef = useRef(0);

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
      setConfig(task.config);
      setGifFrameUrls(task.gifFrameUrls ?? []);
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
        trackMilestones: false,
        gifFrameUrls: gifFrameUrls.length ? gifFrameUrls : undefined,
        config,
      });
    } else {
      await taskTemplatesStorage.create(sessionTemplateId, {
        name: name.trim(),
        mode,
        groupLabel: groupLabel.trim() || undefined,
        referenceLink: referenceLink.trim() || undefined,
        trackMilestones: false,
        gifFrameUrls: gifFrameUrls.length ? gifFrameUrls : undefined,
        config,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setGifFrameUrls([]); // clear any previously linked GIF when user edits name manually
    setSuggestions([]);
    if (nameSearchTimerRef.current) clearTimeout(nameSearchTimerRef.current);
    const reqId = ++nameSearchCounterRef.current; // always increment to invalidate in-flight requests
    if (text.trim().length < 2) return;
    nameSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${getApiUrl()}api/exercise-search?q=${encodeURIComponent(text.trim())}&limit=6`,
        );
        if (!res.ok || reqId !== nameSearchCounterRef.current) return;
        const json = await res.json();
        if (reqId === nameSearchCounterRef.current) {
          setSuggestions(json.results as { name: string; frameUrls: string[] }[]);
        }
      } catch {}
    }, 300);
  };

  const handleGifModalSearch = (query: string) => {
    setGifModal((prev) =>
      prev
        ? { ...prev, searchQuery: query, searchLoading: !!query.trim(), searchResults: query.trim() ? prev.searchResults : [] }
        : prev,
    );
    if (gifSearchTimerRef.current) clearTimeout(gifSearchTimerRef.current);
    const reqId = ++gifSearchCounterRef.current; // always increment to invalidate in-flight requests
    if (!query.trim()) return;
    gifSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${getApiUrl()}api/exercise-search?q=${encodeURIComponent(query.trim())}&limit=8`,
        );
        if (!res.ok || reqId !== gifSearchCounterRef.current) return;
        const json = await res.json();
        if (reqId === gifSearchCounterRef.current) {
          setGifModal((prev) =>
            prev ? { ...prev, searchLoading: false, searchResults: json.results } : prev,
          );
        }
      } catch {
        if (reqId === gifSearchCounterRef.current) {
          setGifModal((prev) => prev ? { ...prev, searchLoading: false } : prev);
        }
      }
    }, 300);
  };

  const handleOpenGifModal = async () => {
    const query = name.trim();
    const reqId = ++gifSearchCounterRef.current;
    setGifModal({ searchQuery: query, searchResults: [], searchLoading: true, selectedFrameUrls: gifFrameUrls });
    try {
      const res = await fetch(
        `${getApiUrl()}api/exercise-search?q=${encodeURIComponent(query)}&limit=8`,
      );
      if (!res.ok || reqId !== gifSearchCounterRef.current) return;
      const json = await res.json();
      if (reqId !== gifSearchCounterRef.current) return;
      const results = json.results as { name: string; frameUrls: string[] }[];
      setGifModal((prev) =>
        prev
          ? {
              ...prev,
              searchLoading: false,
              searchResults: results,
              selectedFrameUrls: prev.selectedFrameUrls.length === 0 && results.length > 0
                ? results[0].frameUrls
                : prev.selectedFrameUrls,
            }
          : prev,
      );
    } catch {
      if (reqId === gifSearchCounterRef.current) {
        setGifModal((prev) => prev ? { ...prev, searchLoading: false } : prev);
      }
    }
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
                {config.isBodyweight ? <Feather name="check" size={14} color={theme.buttonText} /> : null}
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
                  value={targetDistanceStr !== null ? targetDistanceStr : String(config.targetDistance || "")}
                  onChangeText={(v) => {
                    setTargetDistanceStr(v);
                    const parsed = parseFloat(v);
                    if (!isNaN(parsed)) {
                      updateConfig("targetDistance", parsed);
                    }
                  }}
                  onBlur={() => setTargetDistanceStr(null)}
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
                        style={{ color: config.distanceUnit === unit ? theme.buttonText : theme.text }}
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
    <>
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <View style={styles.field}>
        <ThemedText type="secondary" style={styles.label}>Exercise Name</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
          value={name}
          onChangeText={handleNameChange}
          placeholder="e.g., Bench Press"
          placeholderTextColor={theme.textMuted}
          autoFocus={!isEditing}
        />
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 ? (
          <View style={[styles.suggestionsBox, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            {suggestions.map((s) => (
              <Pressable
                key={s.name}
                style={[styles.suggestionRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setName(s.name);
                  setGifFrameUrls(s.frameUrls);
                  setSuggestions([]);
                }}
              >
                {s.frameUrls.length > 0 ? (
                  <Image
                    source={{ uri: s.frameUrls[0] }}
                    style={styles.suggestionThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Feather name="film" size={16} color={theme.textMuted} />
                )}
                <ThemedText type="body" style={[styles.suggestionText, { color: theme.text }]} numberOfLines={1}>
                  {s.name}
                </ThemedText>
                <Feather name="arrow-up-left" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {/* GIF pill button */}
        <Pressable
          style={({ pressed }) => [
            styles.gifButton,
            gifFrameUrls.length
              ? { backgroundColor: theme.link + "18", borderColor: theme.link }
              : { backgroundColor: "transparent", borderColor: theme.textMuted + "55" },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOpenGifModal}
          disabled={!name.trim()}
        >
          {gifFrameUrls.length ? (
            <>
              <Image
                source={{ uri: gifFrameUrls[0] }}
                style={styles.gifThumb}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <ThemedText type="secondary" style={[styles.gifButtonLabel, { color: theme.link }]}>
                GIF linked
              </ThemedText>
              <Feather name="check-circle" size={12} color={theme.link} />
            </>
          ) : (
            <>
              <Feather name="film" size={12} color={name.trim() ? theme.textMuted : theme.textMuted + "55"} />
              <ThemedText type="secondary" style={[styles.gifButtonLabel, { color: name.trim() ? theme.textMuted : theme.textMuted + "55" }]}>
                Link demonstration GIF
              </ThemedText>
            </>
          )}
        </Pressable>
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
                <ModeIcon mode={option.mode} size={20} color={isSelected ? modeConfig.color : theme.textSecondary} />
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

      <Button onPress={handleSave} disabled={!name.trim()} style={styles.saveButton}>
        {isEditing ? "Update Exercise" : "Add Exercise"}
      </Button>
    </KeyboardAwareScrollView>

    {/* GIF modal sheet */}
    <Modal
      visible={gifModal !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setGifModal(null)}
    >
      <Pressable
        style={[styles.gifModalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={() => setGifModal(null)}
      >
        <Pressable
          style={[styles.gifModalSheet, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => {}}
        >
          <View style={[styles.gifModalHandle, { backgroundColor: theme.textMuted }]} />

          {/* Search bar */}
          <View style={[styles.gifSearchRow, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.gifSearchInput, { color: theme.text }]}
              value={gifModal?.searchQuery ?? ""}
              onChangeText={handleGifModalSearch}
              placeholder="Search exercises…"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {gifModal?.searchLoading ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : null}
          </View>

          {/* Results list */}
          {!gifModal?.searchLoading && (gifModal?.searchResults ?? []).length === 0 ? (
            <View style={styles.gifModalEmpty}>
              <ThemedText type="secondary">No results — try a different name</ThemedText>
            </View>
          ) : (
            <ScrollView
              style={styles.gifResultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {(gifModal?.searchResults ?? []).map((result) => {
                const isSelected = gifModal?.selectedFrameUrls[0] === result.frameUrls[0];
                return (
                  <Pressable
                    key={result.name}
                    style={[
                      styles.gifResultRow,
                      isSelected && { backgroundColor: theme.link + "15" },
                    ]}
                    onPress={() =>
                      setGifModal((prev) =>
                        prev ? { ...prev, selectedFrameUrls: result.frameUrls } : prev,
                      )
                    }
                  >
                    <Image
                      source={{ uri: result.frameUrls[0] }}
                      style={styles.gifResultThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <ThemedText
                      type="body"
                      style={[
                        styles.gifResultName,
                        { color: isSelected ? theme.link : theme.text },
                        isSelected && { fontWeight: "600" },
                      ]}
                      numberOfLines={2}
                    >
                      {result.name}
                    </ThemedText>
                    {isSelected ? (
                      <Feather name="check-circle" size={18} color={theme.link} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Selected preview */}
          {gifModal?.selectedFrameUrls.length ? (
            <Image
              source={{ uri: gifModal.selectedFrameUrls[0] }}
              style={[styles.gifModalPreview, { backgroundColor: theme.backgroundSecondary }]}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}

          {/* Confirm */}
          <Pressable
            style={[
              styles.gifModalPrimaryBtn,
              {
                backgroundColor: theme.link,
                opacity: (gifModal?.selectedFrameUrls.length ?? 0) > 0 ? 1 : 0.4,
              },
            ]}
            onPress={() => {
              if (gifModal?.selectedFrameUrls.length) {
                setGifFrameUrls(gifModal.selectedFrameUrls);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              setGifModal(null);
            }}
            disabled={!gifModal?.selectedFrameUrls.length}
          >
            <ThemedText type="body" style={{ color: theme.buttonText, fontWeight: "700" }}>
              Use this GIF
            </ThemedText>
          </Pressable>

          {gifFrameUrls.length > 0 ? (
            <Pressable
              style={styles.gifModalSecondaryBtn}
              onPress={() => { setGifFrameUrls([]); setGifModal(null); }}
            >
              <ThemedText type="secondary" style={{ color: theme.error }}>Remove GIF</ThemedText>
            </Pressable>
          ) : null}

          <Pressable style={styles.gifModalSecondaryBtn} onPress={() => setGifModal(null)}>
            <ThemedText type="secondary">Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
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
    borderColor: Colors.dark.textMuted,
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
  gifButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  gifThumb: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.xs,
  },
  gifButtonLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  gifModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  gifModalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.md,
  },
  gifModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    alignSelf: "center",
  },
  gifModalPreview: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.lg,
  },
  gifModalPrimaryBtn: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  gifModalSecondaryBtn: {
    width: "100%",
    padding: Spacing.md,
    alignItems: "center",
  },
  gifModalEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  gifSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  gifSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  gifResultsList: {
    maxHeight: 200,
  },
  gifResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  gifResultThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  gifResultName: {
    flex: 1,
    fontSize: 14,
  },
  suggestionsBox: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginTop: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionThumb: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
  },
});
