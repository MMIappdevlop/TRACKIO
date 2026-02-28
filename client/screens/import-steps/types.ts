import { Colors } from "@/constants/theme";
import type { TaskMode } from "@/types";

export const MAPPING_PRESETS_KEY = "@trakio/mapping_presets";

export interface ColumnMapping {
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

export interface MappingPreset {
  id: string;
  name: string;
  mapping: ColumnMapping;
}

export interface ParsedRow {
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

export const DEFAULT_MAPPING: ColumnMapping = {
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

export const TEMPLATE_INFO = [
  { 
    id: "strength", 
    name: "Strength Template", 
    description: "For weight training plans",
    mode: "strength" as const,
    color: "#0f52ba",
  },
  { 
    id: "endurance", 
    name: "Endurance Template", 
    description: "For running and cardio",
    mode: "distance" as const,
    color: Colors.dark.success,
  },
  { 
    id: "interval", 
    name: "Interval Template", 
    description: "For HIIT and tabata workouts",
    mode: "interval" as const,
    color: Colors.dark.effort,
  },
  { 
    id: "sports-drill", 
    name: "Sports Drill Template", 
    description: "For sport-specific training",
    mode: "time" as const,
    color: Colors.dark.warning,
  },
];

export const formatFieldLabel = (field: string): string => {
  const labelMap: Record<string, string> = {
    session: "Day",
    task: "Exercise",
    mode: "Mode",
    sets: "Sets",
    reps: "Reps",
    weight: "Weight",
    distance: "Distance",
    distance_unit: "Distance Unit",
    duration_minutes: "Duration (min)",
    work_seconds: "Work (sec)",
    rest_seconds: "Rest (sec)",
    rounds: "Rounds",
    notes: "Notes",
  };
  return labelMap[field] || field.replace(/_/g, " ");
};
