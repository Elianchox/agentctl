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

export const claudeCodeAdapter: Adapter = {
  name: "claude-code",
  label: "Claude Code",

  async detect(projectDir) {
    const hasClaudeDir = await fs.pathExists(path.join(projectDir, ".claude"));
    return hasClaudeDir;
  },

  destPath(resourceName, type, projectDir) {
    const base = path.join(projectDir, ".claude", TARGET_FOLDER[type]);
    return path.join(base, resourceName)
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);

    if (type === "command") {
      await fs.ensureDir(path.dirname(dest));
      const mdFile = path.join(resourceDir, `${resourceName}.md`);
      if (await fs.pathExists(mdFile)) {
        await fs.copy(mdFile, dest);
      } else {
        await fs.copy(resourceDir, dest);
      }
    } else {
      await fs.copy(resourceDir, dest);
    }
  },
};
