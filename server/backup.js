import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import db from './db.js';

const KEEP_BACKUPS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getBackupDir(dataDir) {
  return join(dataDir, 'backups');
}

export function listBackups(dataDir) {
  const dir = getBackupDir(dataDir);
  try {
    return readdirSync(dir)
      .filter((name) => name.startsWith('tunet-') && name.endsWith('.db'))
      .map((name) => {
        const path = join(dir, name);
        const stats = statSync(path);
        return {
          name,
          path,
          size: stats.size,
          created_at: stats.mtime.toISOString(),
        };
      })
      .sort(
        (a, b) =>
          b.created_at.localeCompare(a.created_at) || b.name.localeCompare(a.name)
      );
  } catch {
    return [];
  }
}

export async function createBackup({ database = db, dataDir, label } = {}) {
  const dir = getBackupDir(dataDir);
  mkdirSync(dir, { recursive: true });
  const day = label || new Date().toISOString().slice(0, 10);
  const destination = join(dir, `tunet-${day}.db`);
  await database.backup(destination);
  return destination;
}

export function pruneBackups(dataDir, keep = KEEP_BACKUPS) {
  const backups = listBackups(dataDir);
  for (const backup of backups.slice(keep)) {
    try {
      unlinkSync(backup.path);
    } catch {
      // A backup that cannot be removed is harmless; retry next day.
    }
  }
}

/**
 * Create one backup per day and keep the last week. The first check runs after
 * a short delay so a cold server start is not competing with the first paint.
 */
export function startBackupScheduler({ dataDir, intervalMs = 60 * 60 * 1000 } = {}) {
  if (!dataDir) return () => {};

  const run = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = listBackups(dataDir).find((entry) => entry.name === `tunet-${today}.db`);
    if (!existing) {
      try {
        await createBackup({ dataDir, label: today });
        console.info(`[backup] Wrote tunet-${today}.db`);
      } catch (error) {
        console.warn('[backup] Failed to write daily backup:', error);
      }
    }
    pruneBackups(dataDir);
  };

  const startTimer = setTimeout(run, 30_000);
  const interval = setInterval(run, Math.max(intervalMs, DAY_MS / 24));
  startTimer.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(startTimer);
    clearInterval(interval);
  };
}
