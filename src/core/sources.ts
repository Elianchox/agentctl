import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import type { UserSourcesFile } from "./types.ts";

const run = promisify(execFile);

const OFFICIAL_REPO = "agentctl/agentctl-resources";
const OFFICIAL_ALIAS = "_oficial";

const ALIAS_RE = /^[a-zA-Z0-9_-]+$/;
function validateAlias(alias: string): void {
  if (!alias) throw new Error("El alias no puede estar vacío.");
  if (!ALIAS_RE.test(alias))
    throw new Error(`El alias "${alias}" contiene caracteres no válidos. Solo se permiten letras, números, guiones y guiones bajos.`);
}

function sourcesJsonPath(): string {
  return path.join(os.homedir(), ".agentctl", "sources.json");
}

function cacheDirFor(alias: string): string {
  return path.join(os.homedir(), ".agentctl", "cache", alias);
}

async function readUserSources(): Promise<UserSourcesFile> {
  const p = sourcesJsonPath();
  if (!(await fs.pathExists(p))) return { sources: [] };
  try {
    return await fs.readJson(p);
  } catch {
    return { sources: [] };
  }
}

async function writeUserSources(data: UserSourcesFile): Promise<void> {
  const p = sourcesJsonPath();
  await fs.ensureDir(path.dirname(p));
  await fs.writeJson(p, data, { spaces: 2 });
}

export interface SourceEntry {
  alias: string;
  repo: string;
  dir: string;
  isBuiltin: boolean;
}

/** Retorna todas las fuentes: oficial (siempre primera) + las de usuario. */
export async function getSources(): Promise<SourceEntry[]> {
  const official: SourceEntry = {
    alias: OFFICIAL_ALIAS,
    repo: OFFICIAL_REPO,
    dir: cacheDirFor(OFFICIAL_ALIAS),
    isBuiltin: true,
  };
  const userSources = await readUserSources();
  const user: SourceEntry[] = userSources.sources.map((s) => ({
    alias: s.alias,
    repo: s.repo,
    dir: cacheDirFor(s.alias),
    isBuiltin: false,
  }));
  return [official, ...user];
}

/** Retorna la fuente a usar en init: default de usuario, u oficial. */
export async function getInitSource(): Promise<SourceEntry> {
  const userSources = await readUserSources();
  if (userSources.default) {
    const match = userSources.sources.find((s) => s.alias === userSources.default);
    if (match) {
      return {
        alias: match.alias,
        repo: match.repo,
        dir: cacheDirFor(match.alias),
        isBuiltin: false,
      };
    }
  }
  return {
    alias: OFFICIAL_ALIAS,
    repo: OFFICIAL_REPO,
    dir: cacheDirFor(OFFICIAL_ALIAS),
    isBuiltin: true,
  };
}

async function refreshOne(source: SourceEntry): Promise<void> {
  const { dir, repo } = source;
  if (await fs.pathExists(path.join(dir, ".git"))) {
    await run("git", ["-C", dir, "fetch", "--depth", "1", "origin", "main"]);
    await run("git", ["-C", dir, "reset", "--hard", "origin/main"]);
  } else {
    await fs.ensureDir(path.dirname(dir));
    await run("git", ["clone", "--depth", "1", "--branch", "main", repo, dir]);
  }
}

export async function refreshAllSources(): Promise<void> {
  const sources = await getSources();
  const results = await Promise.allSettled(sources.map(refreshOne));
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected")
      console.warn(`Error al refrescar fuente "${sources[i].alias}":`, r.reason);
  }
}

export async function refreshInitSource(): Promise<void> {
  const source = await getInitSource();
  await refreshOne(source);
}

export async function addUserSource(alias: string, repo: string): Promise<void> {
  validateAlias(alias);
  const data = await readUserSources();
  if (data.sources.some((s) => s.alias === alias)) {
    throw new Error(`El alias "${alias}" ya existe. Usá "source remove" primero.`);
  }
  data.sources.push({ alias, repo });
  await writeUserSources(data);
}

export async function removeUserSource(alias: string): Promise<void> {
  validateAlias(alias);
  const data = await readUserSources();
  const idx = data.sources.findIndex((s) => s.alias === alias);
  if (idx === -1) throw new Error(`No se encontró el alias "${alias}".`);
  data.sources.splice(idx, 1);
  if (data.default === alias) delete data.default;
  await writeUserSources(data);
}

export async function setDefaultSource(alias: string): Promise<void> {
  validateAlias(alias);
  const data = await readUserSources();
  if (!data.sources.some((s) => s.alias === alias)) {
    throw new Error(`No se encontró el alias "${alias}".`);
  }
  data.default = alias;
  await writeUserSources(data);
}

export async function getSourceListInfo(): Promise<{
  official: string;
  user: { alias: string; repo: string; isDefault: boolean }[];
}> {
  const data = await readUserSources();
  return {
    official: OFFICIAL_REPO,
    user: data.sources.map((s) => ({
      alias: s.alias,
      repo: s.repo,
      isDefault: data.default === s.alias,
    })),
  };
}

/** Clona un repo remoto a un path temporal. Para init con URL explícita. */
export async function cloneTempRepo(repoUrl: string): Promise<string> {
  const dir = path.join(os.homedir(), ".agentctl", "cache", `_tmp_${Date.now()}`);
  await fs.ensureDir(path.dirname(dir));
  await run("git", ["clone", "--depth", "1", repoUrl, dir]);
  return dir;
}
