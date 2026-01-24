export type TaskMode = "strength" | "distance" | "interval" | "time" | "notes";

export interface Program {
  id: string;
  name: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionTemplate {
  id: string;
  programId: string;
  name: string;
  order: number;
  defaultRestSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  sessionTemplateId: string;
  name: string;
  mode: TaskMode;
  order: number;
  groupLabel?: string;
  defaultRestSeconds?: number;
  config: TaskConfig;
  trackMilestones: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskConfig {
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

export interface CompletedSession {
  id: string;
  sessionTemplateId: string;
  sessionTemplateName: string;
  programId: string;
  programName: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  difficultyRating?: number;
  notes?: string;
}

export interface CompletedTask {
  id: string;
  completedSessionId: string;
  taskTemplateId: string;
  taskTemplateName: string;
  mode: TaskMode;
  dataJson: TaskDataJson;
  completedAt: string;
}

export interface StrengthSetData {
  setNumber: number;
  weight?: number;
  reps?: number;
  isCompleted: boolean;
  rpe?: number;
  rir?: number;
}

export interface TaskDataJson {
  sets?: StrengthSetData[];
  distance?: number;
  distanceUnit?: "km" | "mi" | "m";
  durationSeconds?: number;
  pace?: string;
  roundsCompleted?: number;
  totalRounds?: number;
  notes?: string;
  rating?: number;
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
  backupUri?: string;
  userName?: string;
}

export interface WeeklyStats {
  weekStart: string;
  sessionsCount: number;
  totalDurationSeconds: number;
  totalVolume: number;
  totalDistance: number;
}
