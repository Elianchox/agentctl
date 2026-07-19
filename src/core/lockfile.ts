import fs from "fs-extra";
import path from "node:path";
import type { LockFile, LockEntry, ToolLockEntry } from "./types.ts";

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

export async function getLockEntry(
  projectDir: string,
  resourceName: string
): Promise<LockEntry | undefined> {
  const lockFile = await readLockFile(projectDir);
  return lockFile.resources[resourceName];
}

export async function upsertToolLockEntry(
  projectDir: string,
  toolName: string,
  entry: ToolLockEntry
): Promise<void> {
  const lockFile = await readLockFile(projectDir);
  lockFile.tools = lockFile.tools ?? {};
  lockFile.tools[toolName] = entry;
  await writeLockFile(projectDir, lockFile);
}

export async function getToolLockEntry(
  projectDir: string,
  toolName: string
): Promise<ToolLockEntry | undefined> {
  const lockFile = await readLockFile(projectDir);
  return lockFile.tools?.[toolName];
}

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
