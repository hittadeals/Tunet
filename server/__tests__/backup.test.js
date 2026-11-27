// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { listBackups, pruneBackups } from '../backup.js';

const dirs = [];

const makeDataDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'tunet-backup-'));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop(), { recursive: true, force: true });
});

describe('backup helpers', () => {
  it('lists backups newest first', () => {
    const dataDir = makeDataDir();
    const backupDir = join(dataDir, 'backups');
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, 'tunet-2026-01-01.db'), 'a');
    writeFileSync(join(backupDir, 'tunet-2026-01-02.db'), 'b');
    writeFileSync(join(backupDir, 'notes.txt'), 'ignore');

    const backups = listBackups(dataDir);
    expect(backups.map((entry) => entry.name)).toEqual([
      'tunet-2026-01-02.db',
      'tunet-2026-01-01.db',
    ]);
  });

  it('prunes old backups down to the keep limit', () => {
    const dataDir = makeDataDir();
    const backupDir = join(dataDir, 'backups');
    mkdirSync(backupDir, { recursive: true });
    for (let day = 1; day <= 5; day += 1) {
      writeFileSync(join(backupDir, `tunet-2026-01-0${day}.db`), 'x');
    }

    pruneBackups(dataDir, 2);

    expect(listBackups(dataDir)).toHaveLength(2);
  });
});
