export type ExerciseMode = "strength" | "distance" | "interval" | "time" | "notes";

export interface Plan {
  id: string;
  name: string;
  isActive: boolean;
  isArchived: boolean;
  trackBadges: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayTemplate {
  id: string;
  programId: string;
  name: string;
  order: number;
  defaultRestSeconds: number;
  days?: DayOfWeek[];
  locationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTemplate {
  id: string;
  sessionTemplateId: string;
  name: string;
  mode: ExerciseMode;
  order: number;
  groupLabel?: string;
  defaultRestSeconds?: number;
  config: ExerciseConfig;
  trackMilestones: boolean;
  referenceLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseConfig {
  sets?: number;
  reps?: number;
  weight?: number;
  isBodyweight?: boolean;
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
  targetDistance?: number;
  distanceUnit?: "km" | "mi" | "m";
}

export interface CompletedDay {
  id: string;
  sessionTemplateId: string;
  sessionTemplateName: string;
  programId: string;
  programName: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  estimatedCalories?: number;
  difficultyRating?: number;
  notes?: string;
}

export interface CompletedExercise {
  id: string;
  completedSessionId: string;
  taskTemplateId: string;
  taskTemplateName: string;
  mode: ExerciseMode;
  dataJson: ExerciseDataJson;
  completedAt: string;
}

// Backward compatibility aliases
export type CompletedSession = CompletedDay;
export type CompletedTask = CompletedExercise;
export type TaskMode = ExerciseMode;
export type Program = Plan;
export type SessionTemplate = DayTemplate;
export type TaskTemplate = ExerciseTemplate;
export type TaskConfig = ExerciseConfig;
export type TaskDataJson = ExerciseDataJson;

export interface StrengthSetData {
  setNumber: number;
  weight?: number;
  reps?: number;
  isCompleted: boolean;
  rpe?: number;
  rir?: number;
}

export interface SplitTime {
  label?: string;
  elapsedSeconds: number;
  timestamp: string;
}

export interface ExerciseDataJson {
  sets?: StrengthSetData[];
  distance?: number;
  distanceUnit?: "km" | "mi" | "m";
  durationSeconds?: number;
  pace?: string;
  roundsCompleted?: number;
  totalRounds?: number;
  notes?: string;
  rating?: number;
  splits?: SplitTime[];
  breakSeconds?: number;
}

export interface BadgeAward {
  id: string;
  badgeType: string;
  badgeTier: "bronze" | "silver" | "steel" | "gold";
  taskTemplateId?: string;
  value: number;
  earnedAt: string;
  description: string;
}

export interface Settings {
  id: string;
  weightUnit: "kg" | "lb";
  distanceUnit: "km" | "mi";
  showRPE: boolean;
  showRIR: boolean;
  autoBackupEnabled: boolean;
  calorieTrackingEnabled: boolean;
  calorieSetupDismissed: boolean;
  backupUri?: string;
  userName?: string;
  userWeight?: number;
  userHeight?: number;
  userAge?: number;
  weightReminderEnabled?: boolean;
  weightReminderDays?: number[];
  weightReminderTime?: string;
  lastReminderShownDate?: string;
  lastReminderDismissedDate?: string;
  hasEverLoggedWeight?: boolean;
  firstWorkoutCompletedAt?: string;
  weightReminderUpsellDismissedAt?: string;
  weightReminderUpsellLastShownAt?: string;
  trainingReminderEnabled?: boolean;
  trainingReminderDays?: number[];
  trainingReminderTime?: string;
}

export interface WeightLogEntry {
  id: string;
  date: string;
  weight: number;
  timestamp: string;
}

export interface ActiveSession {
  sessionTemplateId: string;
  sessionTemplateName: string;
  programId: string;
  programName: string;
  startedAt: string;
  taskLogs: { taskId: string; data: ExerciseDataJson }[];
  currentTaskIndex: number;
}

export interface WeeklyStats {
  weekStart: string;
  sessionsCount: number;
  totalDurationSeconds: number;
  totalVolume: number;
  totalDistance: number;
  totalExercises: number;
  totalCalories: number;
}
