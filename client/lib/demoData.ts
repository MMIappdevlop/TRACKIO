import type {
  Program,
  SessionTemplate,
  TaskTemplate,
  BadgeAward,
  Settings,
} from "@/types";

interface CompletedSessionData {
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

interface CompletedTaskData {
  id: string;
  completedSessionId: string;
  taskTemplateId: string;
  taskTemplateName: string;
  mode: string;
  dataJson: Record<string, unknown>;
  completedAt: string;
}

const PROGRAM_ID = "demo-prog-001";
const PROGRAM_NAME = "Strength & Cardio";

const ST_UPPER = "demo-st-upper";
const ST_LOWER = "demo-st-lower";
const ST_RUN = "demo-st-run";
const ST_HIIT = "demo-st-hiit";

const TT_BENCH = "demo-tt-bench";
const TT_OHP = "demo-tt-ohp";
const TT_ROW = "demo-tt-row";
const TT_CURL = "demo-tt-curl";
const TT_SQUAT = "demo-tt-squat";
const TT_RDL = "demo-tt-rdl";
const TT_LEGPRESS = "demo-tt-legpress";
const TT_CALF = "demo-tt-calf";
const TT_5K = "demo-tt-5k";
const TT_HIIT = "demo-tt-hiit";

function d(daysAgo: number, hour: number, min: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, min, 0, 0);
  return date;
}

function iso(date: Date): string {
  return date.toISOString();
}

function strengthSets(
  baseSets: number,
  baseReps: number,
  baseWeight: number,
  weekIndex: number
): Array<{ setNumber: number; weight: number; reps: number; isCompleted: boolean }> {
  const progression = weekIndex * 2.5;
  const sets = [];
  for (let i = 0; i < baseSets; i++) {
    const fatigue = i >= baseSets - 1 ? Math.max(0, Math.floor(Math.random() * 2)) : 0;
    sets.push({
      setNumber: i + 1,
      weight: baseWeight + progression,
      reps: baseReps - fatigue,
      isCompleted: true,
    });
  }
  return sets;
}

export function generateDemoData(): string {
  const now = new Date();
  const createdAt = iso(d(30, 9, 0));

  const programs: Program[] = [
    {
      id: PROGRAM_ID,
      name: PROGRAM_NAME,
      isActive: true,
      isArchived: false,
      trackBadges: true,
      createdAt,
      updatedAt: iso(now),
    },
  ];

  const sessionTemplates: SessionTemplate[] = [
    {
      id: ST_UPPER,
      programId: PROGRAM_ID,
      name: "Upper Body",
      order: 0,
      defaultRestSeconds: 90,
      days: [1, 4],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: ST_LOWER,
      programId: PROGRAM_ID,
      name: "Lower Body",
      order: 1,
      defaultRestSeconds: 120,
      days: [2, 5],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: ST_RUN,
      programId: PROGRAM_ID,
      name: "5K Run",
      order: 2,
      defaultRestSeconds: 0,
      days: [3],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: ST_HIIT,
      programId: PROGRAM_ID,
      name: "HIIT Cardio",
      order: 3,
      defaultRestSeconds: 15,
      days: [6],
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const taskTemplates: TaskTemplate[] = [
    { id: TT_BENCH, sessionTemplateId: ST_UPPER, name: "Bench Press", mode: "strength", order: 0, config: { sets: 3, reps: 10, weight: 60 }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_OHP, sessionTemplateId: ST_UPPER, name: "Overhead Press", mode: "strength", order: 1, config: { sets: 3, reps: 8, weight: 40 }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_ROW, sessionTemplateId: ST_UPPER, name: "Barbell Row", mode: "strength", order: 2, config: { sets: 3, reps: 10, weight: 50 }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_CURL, sessionTemplateId: ST_UPPER, name: "Bicep Curls", mode: "strength", order: 3, config: { sets: 3, reps: 12, weight: 12 }, trackMilestones: false, createdAt, updatedAt: createdAt },
    { id: TT_SQUAT, sessionTemplateId: ST_LOWER, name: "Squats", mode: "strength", order: 0, config: { sets: 4, reps: 8, weight: 80 }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_RDL, sessionTemplateId: ST_LOWER, name: "Romanian Deadlift", mode: "strength", order: 1, config: { sets: 3, reps: 10, weight: 60 }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_LEGPRESS, sessionTemplateId: ST_LOWER, name: "Leg Press", mode: "strength", order: 2, config: { sets: 3, reps: 12, weight: 120 }, trackMilestones: false, createdAt, updatedAt: createdAt },
    { id: TT_CALF, sessionTemplateId: ST_LOWER, name: "Calf Raises", mode: "strength", order: 3, config: { sets: 3, reps: 15, weight: 40 }, trackMilestones: false, createdAt, updatedAt: createdAt },
    { id: TT_5K, sessionTemplateId: ST_RUN, name: "5K Run", mode: "distance", order: 0, config: { targetDistance: 5, distanceUnit: "km" }, trackMilestones: true, createdAt, updatedAt: createdAt },
    { id: TT_HIIT, sessionTemplateId: ST_HIIT, name: "HIIT Circuit", mode: "interval", order: 0, config: { rounds: 8, workSeconds: 30, restSeconds: 15 }, trackMilestones: false, createdAt, updatedAt: createdAt },
  ];

  const completedSessions: CompletedSessionData[] = [];
  const completedTasks: CompletedTaskData[] = [];

  const schedule = [
    { dayOfWeek: 1, stId: ST_UPPER, stName: "Upper Body", type: "upper" },
    { dayOfWeek: 2, stId: ST_LOWER, stName: "Lower Body", type: "lower" },
    { dayOfWeek: 3, stId: ST_RUN, stName: "5K Run", type: "run" },
    { dayOfWeek: 6, stId: ST_HIIT, stName: "HIIT Cardio", type: "hiit" },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();

  for (let week = 3; week >= 0; week--) {
    for (const slot of schedule) {
      let daysAgo = (todayDay - slot.dayOfWeek + 7) % 7 + week * 7;
      if (daysAgo === 0 && week > 0) daysAgo = 7 * week;
      if (daysAgo < 0) continue;

      const startTime = d(daysAgo, 7 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 30));
      const weekIndex = 3 - week;
      let durationSec: number;
      let calories: number;

      const sessionId = `demo-cs-w${week}-${slot.type}`;

      if (slot.type === "upper") {
        durationSec = 3300 + Math.floor(Math.random() * 600);
        calories = 280 + Math.floor(Math.random() * 60);
      } else if (slot.type === "lower") {
        durationSec = 3600 + Math.floor(Math.random() * 600);
        calories = 350 + Math.floor(Math.random() * 80);
      } else if (slot.type === "run") {
        durationSec = 1680 - weekIndex * 60 + Math.floor(Math.random() * 120);
        calories = 300 + Math.floor(Math.random() * 50);
      } else {
        durationSec = 1200 + Math.floor(Math.random() * 300);
        calories = 220 + Math.floor(Math.random() * 40);
      }

      const endTime = new Date(startTime.getTime() + durationSec * 1000);

      completedSessions.push({
        id: sessionId,
        sessionTemplateId: slot.stId,
        sessionTemplateName: slot.stName,
        programId: PROGRAM_ID,
        programName: PROGRAM_NAME,
        startedAt: iso(startTime),
        completedAt: iso(endTime),
        durationSeconds: durationSec,
        estimatedCalories: calories,
        difficultyRating: 3 + Math.floor(Math.random() * 2),
      });

      if (slot.type === "upper") {
        const tasks = [
          { ttId: TT_BENCH, name: "Bench Press", sets: 3, reps: 10, weight: 60 },
          { ttId: TT_OHP, name: "Overhead Press", sets: 3, reps: 8, weight: 40 },
          { ttId: TT_ROW, name: "Barbell Row", sets: 3, reps: 10, weight: 50 },
          { ttId: TT_CURL, name: "Bicep Curls", sets: 3, reps: 12, weight: 12 },
        ];
        for (const t of tasks) {
          completedTasks.push({
            id: `${sessionId}-${t.ttId}`,
            completedSessionId: sessionId,
            taskTemplateId: t.ttId,
            taskTemplateName: t.name,
            mode: "strength",
            dataJson: { sets: strengthSets(t.sets, t.reps, t.weight, weekIndex) },
            completedAt: iso(endTime),
          });
        }
      } else if (slot.type === "lower") {
        const tasks = [
          { ttId: TT_SQUAT, name: "Squats", sets: 4, reps: 8, weight: 80 },
          { ttId: TT_RDL, name: "Romanian Deadlift", sets: 3, reps: 10, weight: 60 },
          { ttId: TT_LEGPRESS, name: "Leg Press", sets: 3, reps: 12, weight: 120 },
          { ttId: TT_CALF, name: "Calf Raises", sets: 3, reps: 15, weight: 40 },
        ];
        for (const t of tasks) {
          completedTasks.push({
            id: `${sessionId}-${t.ttId}`,
            completedSessionId: sessionId,
            taskTemplateId: t.ttId,
            taskTemplateName: t.name,
            mode: "strength",
            dataJson: { sets: strengthSets(t.sets, t.reps, t.weight, weekIndex) },
            completedAt: iso(endTime),
          });
        }
      } else if (slot.type === "run") {
        const runDuration = 1680 - weekIndex * 60 + Math.floor(Math.random() * 60);
        completedTasks.push({
          id: `${sessionId}-${TT_5K}`,
          completedSessionId: sessionId,
          taskTemplateId: TT_5K,
          taskTemplateName: "5K Run",
          mode: "distance",
          dataJson: {
            distance: 5,
            distanceUnit: "km",
            durationSeconds: runDuration,
          },
          completedAt: iso(endTime),
        });
      } else {
        completedTasks.push({
          id: `${sessionId}-${TT_HIIT}`,
          completedSessionId: sessionId,
          taskTemplateId: TT_HIIT,
          taskTemplateName: "HIIT Circuit",
          mode: "interval",
          dataJson: {
            roundsCompleted: 7 + Math.min(weekIndex, 1),
            totalRounds: 8,
            notes: `Completed ${7 + Math.min(weekIndex, 1)} of 8 rounds`,
          },
          completedAt: iso(endTime),
        });
      }
    }
  }

  const badges: BadgeAward[] = [
    {
      id: "demo-badge-001",
      badgeType: "training_days",
      badgeTier: "bronze",
      value: 10,
      earnedAt: iso(d(7, 10, 0)),
      description: "Completed 10 training days",
    },
    {
      id: "demo-badge-002",
      badgeType: "strength_milestone",
      badgeTier: "bronze",
      taskTemplateId: TT_BENCH,
      value: 65,
      earnedAt: iso(d(14, 10, 0)),
      description: "Bench Press: 65 kg",
    },
    {
      id: "demo-badge-003",
      badgeType: "distance_milestone",
      badgeTier: "silver",
      taskTemplateId: TT_5K,
      value: 5,
      earnedAt: iso(d(21, 10, 0)),
      description: "5K Run completed",
    },
  ];

  const settings: Settings = {
    id: "demo-settings",
    weightUnit: "kg",
    distanceUnit: "km",
    showRPE: false,
    showRIR: false,
    autoBackupEnabled: false,
    calorieTrackingEnabled: true,
    calorieSetupDismissed: true,
    userName: "Alex",
    userWeight: 78,
    userHeight: 178,
    userAge: 28,
  };

  const backup = {
    version: "1.0",
    programs,
    sessionTemplates,
    taskTemplates,
    completedSessions,
    completedTasks,
    badges,
    settings,
    exportedAt: iso(now),
  };

  return JSON.stringify(backup);
}
