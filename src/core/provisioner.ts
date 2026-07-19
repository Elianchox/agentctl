import * as p from "@clack/prompts";
import fs from "fs-extra";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Adapter } from "../adapters/types.ts";
import type {
  AgentctlConfig,
  InstallMethod,
  ToolConfig,
} from "./types.ts";
import { getToolLockEntry, upsertToolLockEntry } from "./lockfile.ts";

const CONFIG_FILE = "agentctl.json";

export async function readAgentctlConfig(
  resourcesRoot: string
): Promise<AgentctlConfig | null> {
  const configPath = path.join(resourcesRoot, CONFIG_FILE);
  if (!(await fs.pathExists(configPath))) return null;
  return fs.readJson(configPath);
}

/** Provisiona todos los tools declarados en agentctl.json */
export async function provisionTools(
  config: AgentctlConfig,
  targets: Adapter[],
  projectDir: string
): Promise<void> {
  if (config.tools.length === 0) {
    p.log.info("No hay tools configurados en agentctl.json");
    return;
  }

  for (const tool of config.tools) {
    const matchingTargets = targets.filter((t) => {
      if (!tool.targets) return true;
      return tool.targets.includes(t.name);
    });

    if (matchingTargets.length === 0) continue;

    p.log.info(`\n📦 ${tool.name}${tool.desc ? ` — ${tool.desc}` : ""}`);

    // 1. Instalar binario si hace falta
    if (tool.install) {
      await ensureBinary(tool.name, tool.install);
    }

    // 2. Ejecutar setup + plugin por cada target
    for (const target of matchingTargets) {
      const lockState = await getToolLockEntry(projectDir, tool.name);
      const targetState = lockState?.targets?.[target.name];

      await runSetup(tool, target.name, projectDir, targetState);

      if (tool.plugin?.[target.name] && target.installPlugin) {
        const alreadyRegistered = targetState?.pluginRegistered === true;
        if (!alreadyRegistered) {
          await target.installPlugin(tool.plugin[target.name], projectDir);
        }
      }
    }

    await updateToolLock(projectDir, tool, matchingTargets);
  }
}

async function ensureBinary(
  toolName: string,
  method: InstallMethod
): Promise<void> {
  if (isBinaryInstalled(toolName)) return;

  const cmd = installCommand(method);
  if (!cmd) return;

  p.log.info(`  Instalando ${toolName}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    p.log.error(`  Error instalando ${toolName}. Instalalo manualmente.`);
  }
}

function isBinaryInstalled(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function installCommand(method: InstallMethod): string | null {
  if ("brew" in method) {
    validatePM("brew");
    return `brew install ${method.brew}`;
  }
  if ("npm" in method) {
    validatePM("npm");
    return `npm install -g ${method.npm}`;
  }
  if ("uv" in method) {
    validatePM("uv");
    return `uv tool install ${method.uv}`;
  }
  if ("pipx" in method) {
    validatePM("pipx");
    return `pipx install ${method.pipx}`;
  }
  if ("script" in method) {
    return method.script;
  }
  return null;
}

function validatePM(name: string): void {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
  } catch {
    p.log.warn(
      `  ${name} no está instalado en el sistema. No se puede instalar el binario.`
    );
  }
}

/** Ejecuta los setup commands si no se han corrido antes para este target */
async function runSetup(
  tool: ToolConfig,
  targetName: string,
  projectDir: string,
  targetState?: { setupDone: boolean }
): Promise<void> {
  if (!tool.setup || tool.setup.length === 0) return;
  if (targetState?.setupDone) return;

  for (const cmd of tool.setup) {
    const resolved = cmd.replace(/\{\{target\}\}/g, targetName);
    try {
      execSync(resolved, { stdio: "inherit", cwd: projectDir });
    } catch {
      p.log.warn(
        `  Setup step failed for ${tool.name} on ${targetName}: ${resolved}`
      );
    }
  }
}

/** Actualiza la entrada del tool en el lockfile */
async function updateToolLock(
  projectDir: string,
  tool: ToolConfig,
  targets: Adapter[]
): Promise<void> {
  let binaryPath: string | undefined;
  try {
    binaryPath = execSync(`which ${tool.name}`, { encoding: "utf-8" })
      .toString()
      .trim();
  } catch {
    // no binary, that's ok (e.g. superpowers is plugin-only)
  }

  const entry = {
    version: "latest",
    binaryPath,
    targets: Object.fromEntries(
      targets.map((t) => [
        t.name,
        {
          setupDone: (tool.setup?.length ?? 0) > 0,
          pluginRegistered: tool.plugin?.[t.name] != null,
        },
      ])
    ),
    installedAt: new Date().toISOString(),
  };

  await upsertToolLockEntry(projectDir, tool.name, entry);
}
