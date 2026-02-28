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
        return res.status(429).json({ error: "Too many pending backups. Try again shortly." });
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
    res.setHeader("Content-Disposition", `attachment; filename=trakio-backup-${date}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(entry.data);
    backupStore.delete(req.params.id);
  });

  const httpServer = createServer(app);

  return httpServer;
}
