import fs from "fs-extra";
import path from "node:path";
import type { Adapter } from "./types.ts";
import { ResourceType } from "../core/types.ts";

const TARGET_FOLDER: Record<ResourceType, string> = {
  skill: "skills",
  agent: "agents",
  command: "commands",
} as const;

export const codexAdapter: Adapter = {
  name: "codex",
  label: "Codex CLI",

  async detect(projectDir) {
    const hasCodexDir = await fs.pathExists(path.join(projectDir, ".codex"));
    return hasCodexDir;
  },

  destPath(resourceName, type, projectDir) {
    return path.join(projectDir, ".codex", TARGET_FOLDER[type], resourceName);
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);
    await fs.copy(resourceDir, dest);
  },
};
