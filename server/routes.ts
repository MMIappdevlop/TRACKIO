import type { Express } from "express";
import { createServer, type Server } from "node:http";
import express from "express";
import crypto from "node:crypto";

const backupStore = new Map<string, { data: string; createdAt: number }>();
const BACKUP_TTL_MS = 5 * 60 * 1000;
const MAX_BACKUP_ENTRIES = 20;
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

function cleanupExpiredBackups() {
  const now = Date.now();
  for (const [id, entry] of backupStore) {
    if (now - entry.createdAt > BACKUP_TTL_MS) {
      backupStore.delete(id);
    }
  }
}

setInterval(cleanupExpiredBackups, 60 * 1000);

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/backup", express.json({ limit: "10mb" }), (req, res) => {
    cleanupExpiredBackups();
    try {
      if (backupStore.size >= MAX_BACKUP_ENTRIES) {
        return res
          .status(429)
          .json({ error: "Too many pending backups. Try again shortly." });
      }
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid backup data" });
      }
      const id = crypto.randomUUID();
      const json = JSON.stringify(data, null, 2);
      if (json.length > MAX_BACKUP_SIZE) {
        return res.status(413).json({ error: "Backup data too large" });
      }
      backupStore.set(id, { data: json, createdAt: Date.now() });
      return res.json({ id, downloadUrl: `/api/backup/${id}/download` });
    } catch (err) {
      return res.status(500).json({ error: "Failed to store backup" });
    }
  });

  app.get("/api/backup/:id/download", (req, res) => {
    const entry = backupStore.get(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Backup not found or expired" });
    }
    const date = new Date().toISOString().split("T")[0];
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=trakio-backup-${date}.json`,
    );
    res.setHeader("Content-Type", "application/json");
    res.send(entry.data);
    backupStore.delete(req.params.id);
  });

  // ---------------------------------------------------------------------------
  // Exercise illustration lookup
  //
  // Uses the free-exercise-db dataset (yuhonas/free-exercise-db on GitHub).
  // The full ~800-exercise JSON is fetched once on first request and cached
  // in memory for the server lifetime.  No API key required.
  //
  // Images are served from GitHub raw CDN (static JPGs showing exercise form).
  // ---------------------------------------------------------------------------

  interface ExerciseDbEntry {
    id: string;
    name: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    images: string[]; // e.g. ["Bench_Press/0.jpg", "Bench_Press/1.jpg"]
  }

  const EXERCISE_DB_URL =
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
  const IMAGE_BASE =
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

  let exerciseDbCache: ExerciseDbEntry[] | null = null;
  let exerciseDbLoading: Promise<ExerciseDbEntry[] | null> | null = null;

  async function loadExerciseDb(): Promise<ExerciseDbEntry[] | null> {
    if (exerciseDbCache) return exerciseDbCache;
    if (exerciseDbLoading) return exerciseDbLoading;
    exerciseDbLoading = (async () => {
      try {
        const res = await fetch(EXERCISE_DB_URL, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        exerciseDbCache = (await res.json()) as ExerciseDbEntry[];
        return exerciseDbCache;
      } catch {
        return null;
      } finally {
        exerciseDbLoading = null;
      }
    })();
    return exerciseDbLoading;
  }

  // ---------------------------------------------------------------------------
  // Matching helpers
  // ---------------------------------------------------------------------------

  /** Normalise a name to lowercase tokens: "Bench Press - Powerlifting" → ["bench","press","powerlifting"] */
  function tokenize(name: string): string[] {
    return name
      .toLowerCase()
      .replace(/['\-–—]/g, " ")
      .split(/\W+/)
      .filter(Boolean);
  }

  /** Dice coefficient on token sets (0–1). */
  function diceSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const common = [...setA].filter((w) => setB.has(w)).length;
    const total = setA.size + setB.size;
    return total === 0 ? 0 : (2 * common) / total;
  }

  /**
   * True when the query tokens are the exact suffix of the exercise tokens.
   * "bench press" is a suffix of "barbell bench press" → true.
   * "squat"       is a suffix of "barbell squat"       → true.
   * "squat"       is NOT a suffix of "squat jerk"      → false.
   */
  function isSuffix(query: string[], exercise: string[]): boolean {
    if (query.length === 0 || query.length > exercise.length) return false;
    const tail = exercise.slice(exercise.length - query.length);
    return query.every((w, i) => tail[i] === w);
  }

  function scoreMatch(queryTokens: string[], exTokens: string[]): number {
    // Exact normalised match
    if (queryTokens.join(" ") === exTokens.join(" ")) return 1.0;
    // Suffix match: query words are the last N words of the exercise name.
    // This cleanly separates "Barbell Squat" (suffix) from "Squat Jerk" (not).
    if (isSuffix(queryTokens, exTokens)) return 0.9;
    // Fall back to word-set Dice similarity
    return diceSimilarity(queryTokens, exTokens);
  }

  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Exercise search — returns ranked list of matching exercise names + frames
  // ---------------------------------------------------------------------------
  app.get("/api/exercise-search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) {
      res.json({ results: [] });
      return;
    }
    const limit = Math.min(
      parseInt(String(req.query.limit || "8"), 10) || 8,
      20,
    );
    try {
      const db = await loadExerciseDb();
      if (!db || db.length === 0) {
        res.json({ results: [] });
        return;
      }
      const queryTokens = tokenize(q);
      const scored = db
        .map((ex) => ({
          ex,
          score: scoreMatch(queryTokens, tokenize(ex.name)),
          tokenLen: tokenize(ex.name).length,
        }))
        .filter(({ score }) => score >= 0.25)
        .sort(
          (a, b) => b.score - a.score || a.tokenLen - b.tokenLen,
        )
        .slice(0, limit);

      res.json({
        results: scored.map(({ ex }) => ({
          name: ex.name,
          frameUrls: ex.images.map((f) => IMAGE_BASE + f),
        })),
      });
    } catch {
      res.json({ results: [] });
    }
  });

  app.get("/api/exercise-lookup", async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name : "";
    if (!name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      const db = await loadExerciseDb();
      if (!db || db.length === 0) {
        res.json({ found: false });
        return;
      }

      const queryTokens = tokenize(name);
      let bestScore = 0;
      let bestTokenLen = Infinity; // tie-breaker: shorter name = more canonical
      let bestEx: ExerciseDbEntry | null = null;

      for (const ex of db) {
        const exTokens = tokenize(ex.name);
        const score = scoreMatch(queryTokens, exTokens);
        // Accept when strictly better OR same score with a shorter name.
        // "Barbell Bench Press" (3 tokens) beats "Barbell Guillotine Bench Press"
        // (4 tokens) when both end with "bench press" and score identically.
        if (
          score > bestScore ||
          (score === bestScore && exTokens.length < bestTokenLen)
        ) {
          bestScore = score;
          bestTokenLen = exTokens.length;
          bestEx = ex;
        }
      }

      // Require meaningful confidence — avoids spurious matches
      if (!bestEx || bestScore < 0.5) {
        res.json({ found: false });
        return;
      }

      const imageFile = bestEx.images[0];
      if (!imageFile) {
        res.json({ found: false });
        return;
      }

      // Return all frames so the client can cycle through them to animate the
      // exercise movement (free-exercise-db typically has 2 frames: start + end).
      const frameUrls = bestEx.images.map((f) => IMAGE_BASE + f);

      res.json({
        found: true,
        frameUrls, // all frames for client-side animation
        gifUrl: frameUrls[0], // first frame (backward-compat field name)
        targetMuscles: bestEx.primaryMuscles,
        secondaryMuscles: bestEx.secondaryMuscles,
      });
    } catch {
      res.json({ found: false });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
