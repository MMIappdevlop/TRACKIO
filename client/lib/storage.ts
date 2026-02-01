import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type {
  Program,
  SessionTemplate,
  TaskTemplate,
  CompletedSession,
  CompletedTask,
  BadgeAward,
  Settings,
} from "@/types";

const STORAGE_KEYS = {
  PROGRAMS: "@trakio/programs",
  SESSION_TEMPLATES: "@trakio/session_templates",
  TASK_TEMPLATES: "@trakio/task_templates",
  COMPLETED_SESSIONS: "@trakio/completed_sessions",
  COMPLETED_TASKS: "@trakio/completed_tasks",
  BADGES: "@trakio/badges",
  SETTINGS: "@trakio/settings",
};

async function getItem<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
}

async function setItem<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
}

export const programsStorage = {
  async getAll(): Promise<Program[]> {
    return getItem<Program>(STORAGE_KEYS.PROGRAMS);
  },

  async getActive(): Promise<Program | null> {
    const programs = await this.getAll();
    return programs.find((p) => p.isActive && !p.isArchived) || null;
  },

  async create(name: string): Promise<Program> {
    const programs = await this.getAll();
    const newProgram: Program = {
      id: uuidv4(),
      name,
      isActive: programs.length === 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.PROGRAMS, [...programs, newProgram]);
    return newProgram;
  },

  async update(id: string, updates: Partial<Program>): Promise<Program | null> {
    const programs = await this.getAll();
    const index = programs.findIndex((p) => p.id === id);
    if (index === -1) return null;

    programs[index] = {
      ...programs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.PROGRAMS, programs);
    return programs[index];
  },

  async setActive(id: string): Promise<void> {
    const programs = await this.getAll();
    const updated = programs.map((p) => ({
      ...p,
      isActive: p.id === id,
      updatedAt: new Date().toISOString(),
    }));
    await setItem(STORAGE_KEYS.PROGRAMS, updated);
  },

  async archive(id: string): Promise<void> {
    await this.update(id, { isArchived: true, isActive: false });
  },

  async delete(id: string): Promise<void> {
    const programs = await this.getAll();
    await setItem(
      STORAGE_KEYS.PROGRAMS,
      programs.filter((p) => p.id !== id)
    );
    await sessionTemplatesStorage.deleteByProgramId(id);
  },
};

export const sessionTemplatesStorage = {
  async getAll(): Promise<SessionTemplate[]> {
    return getItem<SessionTemplate>(STORAGE_KEYS.SESSION_TEMPLATES);
  },

  async getByProgramId(programId: string): Promise<SessionTemplate[]> {
    const templates = await this.getAll();
    return templates
      .filter((t) => t.programId === programId)
      .sort((a, b) => a.order - b.order);
  },

  async getById(id: string): Promise<SessionTemplate | null> {
    const templates = await this.getAll();
    return templates.find((t) => t.id === id) || null;
  },

  async create(
    programId: string,
    name: string,
    defaultRestSeconds = 90
  ): Promise<SessionTemplate> {
    const templates = await this.getAll();
    const programTemplates = templates.filter((t) => t.programId === programId);
    const newTemplate: SessionTemplate = {
      id: uuidv4(),
      programId,
      name,
      order: programTemplates.length,
      defaultRestSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.SESSION_TEMPLATES, [...templates, newTemplate]);
    return newTemplate;
  },

  async update(
    id: string,
    updates: Partial<SessionTemplate>
  ): Promise<SessionTemplate | null> {
    const templates = await this.getAll();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) return null;

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.SESSION_TEMPLATES, templates);
    return templates[index];
  },

  async reorder(programId: string, orderedIds: string[]): Promise<void> {
    const templates = await this.getAll();
    const updated = templates.map((t) => {
      if (t.programId === programId) {
        const newOrder = orderedIds.indexOf(t.id);
        return { ...t, order: newOrder >= 0 ? newOrder : t.order };
      }
      return t;
    });
    await setItem(STORAGE_KEYS.SESSION_TEMPLATES, updated);
  },

  async delete(id: string): Promise<void> {
    const templates = await this.getAll();
    await setItem(
      STORAGE_KEYS.SESSION_TEMPLATES,
      templates.filter((t) => t.id !== id)
    );
    await taskTemplatesStorage.deleteBySessionTemplateId(id);
  },

  async deleteByProgramId(programId: string): Promise<void> {
    const templates = await this.getAll();
    const toDelete = templates.filter((t) => t.programId === programId);
    for (const t of toDelete) {
      await taskTemplatesStorage.deleteBySessionTemplateId(t.id);
    }
    await setItem(
      STORAGE_KEYS.SESSION_TEMPLATES,
      templates.filter((t) => t.programId !== programId)
    );
  },
};

export const taskTemplatesStorage = {
  async getAll(): Promise<TaskTemplate[]> {
    return getItem<TaskTemplate>(STORAGE_KEYS.TASK_TEMPLATES);
  },

  async getBySessionTemplateId(sessionTemplateId: string): Promise<TaskTemplate[]> {
    const tasks = await this.getAll();
    return tasks
      .filter((t) => t.sessionTemplateId === sessionTemplateId)
      .sort((a, b) => a.order - b.order);
  },

  async getById(id: string): Promise<TaskTemplate | null> {
    const tasks = await this.getAll();
    return tasks.find((t) => t.id === id) || null;
  },

  async create(
    sessionTemplateId: string,
    data: Omit<TaskTemplate, "id" | "sessionTemplateId" | "order" | "createdAt" | "updatedAt">
  ): Promise<TaskTemplate> {
    const tasks = await this.getAll();
    const sessionTasks = tasks.filter((t) => t.sessionTemplateId === sessionTemplateId);
    const newTask: TaskTemplate = {
      id: uuidv4(),
      sessionTemplateId,
      order: sessionTasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    await setItem(STORAGE_KEYS.TASK_TEMPLATES, [...tasks, newTask]);
    return newTask;
  },

  async update(id: string, updates: Partial<TaskTemplate>): Promise<TaskTemplate | null> {
    const tasks = await this.getAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.TASK_TEMPLATES, tasks);
    return tasks[index];
  },

  async reorder(sessionTemplateId: string, orderedIds: string[]): Promise<void> {
    const tasks = await this.getAll();
    const updated = tasks.map((t) => {
      if (t.sessionTemplateId === sessionTemplateId) {
        const newOrder = orderedIds.indexOf(t.id);
        return { ...t, order: newOrder >= 0 ? newOrder : t.order };
      }
      return t;
    });
    await setItem(STORAGE_KEYS.TASK_TEMPLATES, updated);
  },

  async delete(id: string): Promise<void> {
    const tasks = await this.getAll();
    await setItem(
      STORAGE_KEYS.TASK_TEMPLATES,
      tasks.filter((t) => t.id !== id)
    );
  },

  async deleteBySessionTemplateId(sessionTemplateId: string): Promise<void> {
    const tasks = await this.getAll();
    await setItem(
      STORAGE_KEYS.TASK_TEMPLATES,
      tasks.filter((t) => t.sessionTemplateId !== sessionTemplateId)
    );
  },

  async moveToDay(taskId: string, newSessionTemplateId: string): Promise<TaskTemplate | null> {
    const tasks = await this.getAll();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return null;

    const targetDayTasks = tasks.filter((t) => t.sessionTemplateId === newSessionTemplateId);
    const newOrder = targetDayTasks.length;

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      sessionTemplateId: newSessionTemplateId,
      order: newOrder,
      updatedAt: new Date().toISOString(),
    };
    await setItem(STORAGE_KEYS.TASK_TEMPLATES, tasks);
    return tasks[taskIndex];
  },
};

export const completedSessionsStorage = {
  async getAll(): Promise<CompletedSession[]> {
    return getItem<CompletedSession>(STORAGE_KEYS.COMPLETED_SESSIONS);
  },

  async getRecent(limit = 20): Promise<CompletedSession[]> {
    const sessions = await this.getAll();
    return sessions
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  },

  async getById(id: string): Promise<CompletedSession | null> {
    const sessions = await this.getAll();
    return sessions.find((s) => s.id === id) || null;
  },

  async getByWeek(weekStart: Date): Promise<CompletedSession[]> {
    const sessions = await this.getAll();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return sessions.filter((s) => {
      const date = new Date(s.completedAt);
      return date >= weekStart && date < weekEnd;
    });
  },

  async create(data: Omit<CompletedSession, "id">): Promise<CompletedSession> {
    const sessions = await this.getAll();
    const newSession: CompletedSession = {
      id: uuidv4(),
      ...data,
    };
    await setItem(STORAGE_KEYS.COMPLETED_SESSIONS, [...sessions, newSession]);
    return newSession;
  },

  async update(id: string, updates: Partial<CompletedSession>): Promise<CompletedSession | null> {
    const sessions = await this.getAll();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) return null;

    sessions[index] = { ...sessions[index], ...updates };
    await setItem(STORAGE_KEYS.COMPLETED_SESSIONS, sessions);
    return sessions[index];
  },

  async delete(id: string): Promise<void> {
    const sessions = await this.getAll();
    await setItem(
      STORAGE_KEYS.COMPLETED_SESSIONS,
      sessions.filter((s) => s.id !== id)
    );
    await completedTasksStorage.deleteBySessionId(id);
  },
};

export const completedTasksStorage = {
  async getAll(): Promise<CompletedTask[]> {
    return getItem<CompletedTask>(STORAGE_KEYS.COMPLETED_TASKS);
  },

  async getBySessionId(sessionId: string): Promise<CompletedTask[]> {
    const tasks = await this.getAll();
    return tasks.filter((t) => t.completedSessionId === sessionId);
  },

  async getByTaskTemplateId(taskTemplateId: string): Promise<CompletedTask[]> {
    const tasks = await this.getAll();
    return tasks
      .filter((t) => t.taskTemplateId === taskTemplateId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  },

  async create(data: Omit<CompletedTask, "id">): Promise<CompletedTask> {
    const tasks = await this.getAll();
    const newTask: CompletedTask = {
      id: uuidv4(),
      ...data,
    };
    await setItem(STORAGE_KEYS.COMPLETED_TASKS, [...tasks, newTask]);
    return newTask;
  },

  async deleteBySessionId(sessionId: string): Promise<void> {
    const tasks = await this.getAll();
    await setItem(
      STORAGE_KEYS.COMPLETED_TASKS,
      tasks.filter((t) => t.completedSessionId !== sessionId)
    );
  },
};

export const badgesStorage = {
  async getAll(): Promise<BadgeAward[]> {
    return getItem<BadgeAward>(STORAGE_KEYS.BADGES);
  },

  async create(data: Omit<BadgeAward, "id">): Promise<BadgeAward> {
    const badges = await this.getAll();
    const newBadge: BadgeAward = {
      id: uuidv4(),
      ...data,
    };
    await setItem(STORAGE_KEYS.BADGES, [...badges, newBadge]);
    return newBadge;
  },

  async getByType(badgeType: string): Promise<BadgeAward[]> {
    const badges = await this.getAll();
    return badges.filter((b) => b.badgeType === badgeType);
  },
};

export const settingsStorage = {
  async get(): Promise<Settings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return JSON.parse(data);
    } catch (error) {
      console.error("Error reading settings:", error);
    }
    return {
      id: uuidv4(),
      weightUnit: "kg",
      distanceUnit: "km",
      showRPE: false,
      showRIR: false,
      autoBackupEnabled: false,
    };
  },

  async update(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },
};

export const backupStorage = {
  async exportAll(): Promise<string> {
    const data = {
      programs: await programsStorage.getAll(),
      sessionTemplates: await sessionTemplatesStorage.getAll(),
      taskTemplates: await taskTemplatesStorage.getAll(),
      completedSessions: await completedSessionsStorage.getAll(),
      completedTasks: await completedTasksStorage.getAll(),
      badges: await badgesStorage.getAll(),
      settings: await settingsStorage.get(),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    return JSON.stringify(data, null, 2);
  },

  async importAll(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version) {
        return { success: false, error: "Invalid backup file format" };
      }

      if (data.programs) {
        await AsyncStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(data.programs));
      }
      if (data.sessionTemplates) {
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TEMPLATES, JSON.stringify(data.sessionTemplates));
      }
      if (data.taskTemplates) {
        await AsyncStorage.setItem(STORAGE_KEYS.TASK_TEMPLATES, JSON.stringify(data.taskTemplates));
      }
      if (data.completedSessions) {
        await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_SESSIONS, JSON.stringify(data.completedSessions));
      }
      if (data.completedTasks) {
        await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(data.completedTasks));
      }
      if (data.badges) {
        await AsyncStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(data.badges));
      }
      if (data.settings) {
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to parse backup file" };
    }
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  },
};
