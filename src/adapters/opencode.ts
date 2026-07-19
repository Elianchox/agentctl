import * as p from "@clack/prompts";
import fs from "fs-extra";
import path from "node:path";
import type { Adapter } from "./types.ts";
import { ResourceType } from "../core/types.ts";
import { copyResourceContent } from "./utils.ts";

const TARGET_FOLDER: Record<ResourceType, string> = {
  skill: "skills",
  agent: "agents",
  command: "commands",
} as const;

export const opencodeAdapter: Adapter = {
  name: "opencode",
  label: "OpenCode CLI",

  async detect(projectDir) {
    const hasOpencodeDir = await fs.pathExists(path.join(projectDir, ".opencode"));
    return hasOpencodeDir;
  },

  destPath(resourceName, type, projectDir) {
    const base = path.join(projectDir, ".opencode", TARGET_FOLDER[type]);
    return path.join(base, resourceName)
  },

  async install(resourceDir, resourceName, type, projectDir) {
    const dest = this.destPath(resourceName, type, projectDir);
    await copyResourceContent(resourceDir, dest);
  },

  async installPlugin(pluginSpec, projectDir) {
    const configPath = path.join(projectDir, ".opencode", "opencode.json");

    await fs.ensureDir(path.join(projectDir, ".opencode"));

    let config: { plugin?: string[] } = {};
    if (await fs.pathExists(configPath)) {
      config = await fs.readJson(configPath);
    }

    config.plugin = config.plugin ?? [];

    if (!config.plugin.includes(pluginSpec)) {
      config.plugin.push(pluginSpec);
      await fs.writeJson(configPath, config, { spaces: 2 });
      p.log.info(`  Plugin registrado en OpenCode: ${pluginSpec}`);
    }
  },
};