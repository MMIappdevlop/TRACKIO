import { useState, useEffect, useCallback } from "react";
import {
  programsStorage,
  sessionTemplatesStorage,
  taskTemplatesStorage,
  completedSessionsStorage,
  completedTasksStorage,
  badgesStorage,
  settingsStorage,
} from "@/lib/storage";
import type {
  Program,
  SessionTemplate,
  TaskTemplate,
  CompletedSession,
  CompletedTask,
  BadgeAward,
  Settings,
  WeeklyStats,
} from "@/types";

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [archivedPrograms, setArchivedPrograms] = useState<Program[]>([]);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await programsStorage.getAll();
      setPrograms(all.filter((p) => !p.isArchived));
      setArchivedPrograms(all.filter((p) => p.isArchived));
      const active = await programsStorage.getActive();
      setActiveProgram(active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProgram = useCallback(
    async (name: string) => {
      const program = await programsStorage.create(name);
      await refresh();
      return program;
    },
    [refresh]
  );

  const setActive = useCallback(
    async (id: string) => {
      await programsStorage.setActive(id);
      await refresh();
    },
    [refresh]
  );

  const archiveProgram = useCallback(
    async (id: string) => {
      await programsStorage.archive(id);
      await refresh();
    },
    [refresh]
  );

  const updateProgram = useCallback(
    async (id: string, updates: Partial<Program>) => {
      await programsStorage.update(id, updates);
      await refresh();
    },
    [refresh]
  );

  const deleteProgram = useCallback(
    async (id: string) => {
      await programsStorage.delete(id);
      await refresh();
    },
    [refresh]
  );

  const unarchiveProgram = useCallback(
    async (id: string) => {
      await programsStorage.update(id, { isArchived: false });
      await refresh();
    },
    [refresh]
  );

  return {
    programs,
    archivedPrograms,
    activeProgram,
    loading,
    refresh,
    createProgram,
    setActive,
    archiveProgram,
    unarchiveProgram,
    deleteProgram,
    updateProgram,
  };
}

export function useSessionTemplates(programId: string | null) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!programId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await sessionTemplatesStorage.getByProgramId(programId);
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTemplate = useCallback(
    async (name: string, defaultRestSeconds = 90) => {
      if (!programId) return null;
      const template = await sessionTemplatesStorage.create(programId, name, defaultRestSeconds);
      await refresh();
      return template;
    },
    [programId, refresh]
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<SessionTemplate>) => {
      await sessionTemplatesStorage.update(id, updates);
      await refresh();
    },
    [refresh]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await sessionTemplatesStorage.delete(id);
      await refresh();
    },
    [refresh]
  );

  const reorderTemplates = useCallback(
    async (orderedIds: string[]) => {
      if (!programId) return;
      await sessionTemplatesStorage.reorder(programId, orderedIds);
      await refresh();
    },
    [programId, refresh]
  );

  return {
    templates,
    loading,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reorderTemplates,
  };
}

export function useTaskTemplates(sessionTemplateId: string | null) {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionTemplateId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await taskTemplatesStorage.getBySessionTemplateId(sessionTemplateId);
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [sessionTemplateId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTask = useCallback(
    async (data: Omit<TaskTemplate, "id" | "sessionTemplateId" | "order" | "createdAt" | "updatedAt">) => {
      if (!sessionTemplateId) return null;
      const task = await taskTemplatesStorage.create(sessionTemplateId, data);
      await refresh();
      return task;
    },
    [sessionTemplateId, refresh]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<TaskTemplate>) => {
      await taskTemplatesStorage.update(id, updates);
      await refresh();
    },
    [refresh]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await taskTemplatesStorage.delete(id);
      await refresh();
    },
    [refresh]
  );

  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      if (!sessionTemplateId) return;
      await taskTemplatesStorage.reorder(sessionTemplateId, orderedIds);
      await refresh();
    },
    [sessionTemplateId, refresh]
  );

  return {
    tasks,
    loading,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
  };
}

export function useCompletedSessions() {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await completedSessionsStorage.getRecent(50);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

function computeWeekStats(
  weekStart: Date,
  sessions: CompletedSession[],
  allTasks: CompletedTask[]
): WeeklyStats {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d >= weekStart && d < weekEnd;
  });

  let totalVolume = 0;
  let totalDistance = 0;
  let totalDuration = 0;
  let totalExercises = 0;
  let totalCalories = 0;

  for (const session of weekSessions) {
    totalDuration += session.durationSeconds;
    totalCalories += session.estimatedCalories ?? 0;
    const sessionTasks = allTasks.filter((t) => t.completedSessionId === session.id);
    totalExercises += sessionTasks.length;

    for (const task of sessionTasks) {
      if (task.mode === "strength" && task.dataJson.sets) {
        for (const set of task.dataJson.sets) {
          if (set.isCompleted && set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
      if (task.mode === "distance" && task.dataJson.distance) {
        totalDistance += task.dataJson.distance;
      }
    }
  }

  return {
    weekStart: weekStart.toISOString(),
    sessionsCount: weekSessions.length,
    totalDurationSeconds: totalDuration,
    totalVolume,
    totalDistance,
    totalExercises,
    totalCalories,
  };
}

export function useWeeklyStats() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [prevStats, setPrevStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const day = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      weekStart.setHours(0, 0, 0, 0);

      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);

      const allSessions = await completedSessionsStorage.getAll();
      const allTasks = await completedTasksStorage.getAll();

      setStats(computeWeekStats(weekStart, allSessions, allTasks));
      setPrevStats(computeWeekStats(prevWeekStart, allSessions, allTasks));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, prevStats, loading, refresh };
}

export function useBadges() {
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await badgesStorage.getAll();
      setBadges(data.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { badges, loading, refresh };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsStorage.get();
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const updated = await settingsStorage.update(updates);
      setSettings(updated);
      return updated;
    },
    []
  );

  return { settings, loading, refresh, updateSettings };
}
