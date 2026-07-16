import fs from "fs-extra";
import path from "node:path";
import type { Adapter } from "./types.ts";

/**
 * Adapter de ejemplo para Codex CLI. Ajustá las rutas reales según
 * la convención que use la versión de Codex que uses — este es un
 * punto de partida razonable: todo bajo .codex/<tipo>/.
 */
export const codexAdapter: Adapter = {
  name: "codex",
  label: "Codex CLI",

  async detect(projectDir) {
    const hasCodexDir = await fs.pathExists(path.join(projectDir, ".codex"));
    const hasAgentsMd = await fs.pathExists(
      path.join(projectDir, "AGENTS.md")
    );
    return hasCodexDir || hasAgentsMd;
  },

  destPath(resourceName, type, projectDir) {
    return path.join(projectDir, ".codex", `${type}s`, resourceName);
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);
    await fs.copy(resourceDir, dest);
  },
};
