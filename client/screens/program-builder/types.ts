import type { TaskMode } from "@/types";

export interface TaskDraft {
  id: string;
  name: string;
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
  /** Frame URLs for the animated exercise GIF panel (set via "Link GIF" in the plan editor). */
  gifFrameUrls?: string[];
}

export interface SessionDraft {
  id: string;
  name: string;
  isExpanded: boolean;
  isAddingTask: boolean;
  selectedTaskType: TaskMode | null;
  tasks: TaskDraft[];
}

export const TASK_TYPES: { mode: TaskMode; label: string }[] = [
  { mode: "strength", label: "Strength" },
  { mode: "distance", label: "Distance" },
  { mode: "interval", label: "Interval" },
  { mode: "time", label: "Time" },
  { mode: "notes", label: "Notes" },
];
