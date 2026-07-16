import fs from "fs-extra";
import path from "node:path";
import type { LockFile, LockEntry } from "./types.js";

const LOCK_FILENAME = "agentctl.lock.json";

export function lockFilePath(projectDir: string): string {
  return path.join(projectDir, LOCK_FILENAME);
}

export async function readLockFile(projectDir: string): Promise<LockFile> {
  const filePath = lockFilePath(projectDir);
  if (!(await fs.pathExists(filePath))) {
    return { resources: {} };
  }
  return fs.readJson(filePath);
}

export async function writeLockFile(
  projectDir: string,
  lockFile: LockFile
): Promise<void> {
  await fs.writeJson(lockFilePath(projectDir), lockFile, { spaces: 2 });
}

export async function upsertLockEntry(
  projectDir: string,
  resourceName: string,
  entry: LockEntry
): Promise<void> {
  const lockFile = await readLockFile(projectDir);
  lockFile.resources[resourceName] = entry;
  await writeLockFile(projectDir, lockFile);
}

/**
 * Compara el hash actual del recurso instalado contra el hash guardado
 * en el lockfile. Devuelve:
 * - "not-installed" si nunca se instaló
 * - "modified" si el hash difiere (alguien lo editó a mano, o hay update disponible)
 * - "up-to-date" si coincide
 */
export async function checkResourceStatus(
  projectDir: string,
  resourceName: string,
  currentHash: string
): Promise<"not-installed" | "modified" | "up-to-date"> {
  const lockFile = await readLockFile(projectDir);
  const entry = lockFile.resources[resourceName];
  if (!entry) return "not-installed";
  return entry.hash === currentHash ? "up-to-date" : "modified";
}
