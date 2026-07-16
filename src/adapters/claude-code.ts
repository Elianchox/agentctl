import fs from "fs-extra";
import path from "node:path";
import type { Adapter } from "./types.js";

const TARGET_FOLDER = {
  skill: "skills",
  agent: "agents",
  command: "commands",
} as const;

export const claudeCodeAdapter: Adapter = {
  name: "claude-code",
  label: "Claude Code",

  async detect(projectDir) {
    return fs.pathExists(path.join(projectDir, ".claude"));
  },

  destPath(resourceName, type, projectDir) {
    const base = path.join(projectDir, ".claude", TARGET_FOLDER[type]);
    return type === "command"
      ? path.join(base, `${resourceName}.md`)
      : path.join(base, resourceName);
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);

    if (type === "command") {
      await fs.ensureDir(path.dirname(dest));
      const mdFile = path.join(resourceDir, `${resourceName}.md`);
      if (await fs.pathExists(mdFile)) {
        await fs.copy(mdFile, dest);
      } else {
        // fallback: copiar toda la carpeta si no sigue la convención de un solo .md
        await fs.copy(resourceDir, dest);
      }
    } else {
      await fs.copy(resourceDir, dest);
    }
  },
};
