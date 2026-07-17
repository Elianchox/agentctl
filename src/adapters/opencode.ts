import fs from "fs-extra";
import path from "node:path";
import type { Adapter } from "./types.ts";
import { ResourceType } from "../core/types.ts";

const TARGET_FOLDER: Record<ResourceType, string> = {
  skill: "skills",
  agent: "agents",
  command: "commands",
  plugin: "plugins"
} as const;

export const opencodeAdapter: Adapter = {
  name: "opencode",
  label: "OpenCode CLI",

  async detect(projectDir) {
    return fs.pathExists(path.join(projectDir, ".opencode"));
  },

  destPath(resourceName, type, projectDir) {
    const base = path.join(projectDir, ".opencode", TARGET_FOLDER[type]);
    return path.join(base, resourceName)
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);
    fs.copy(resourceDir, dest)
  },
};