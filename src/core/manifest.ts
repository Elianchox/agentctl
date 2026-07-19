import * as p from "@clack/prompts";
import fs from "fs-extra";
import path from "node:path";
import type { ResourceManifest, ResourceType, Stack } from "./types.ts";
import type { SourceEntry } from "./sources.ts";
import { resolveGitSource } from "./git-fetch.ts";

const TYPE_FOLDERS: Record<ResourceType, string> = {
  skill: "skills",
  agent: "agents",
  command: "commands",
};

export interface ResourceEntry {
  name: string;
  type: ResourceType;
  dir: string;
  manifest: ResourceManifest;
  /** Alias de la source de origen. Undefined si es del root local (legacy). */
  sourceAlias?: string;
  /** "alias/nombre" si tiene sourceAlias, sino "nombre" */
  displayName: string;
}

export async function readResourceManifest(
  resourceDir: string
): Promise<ResourceManifest> {
  const metaPath = path.join(resourceDir, "meta.json");
  if (!(await fs.pathExists(metaPath))) {
    throw new Error(`No se encontró meta.json en ${resourceDir}`);
  }
  return fs.readJson(metaPath);
}

export async function listAllResources(
  resourcesRoot: string
): Promise<ResourceEntry[]> {
  const entries: ResourceEntry[] = [];

  for (const [type, folder] of Object.entries(TYPE_FOLDERS) as [
    ResourceType,
    string
  ][]) {
    const typeDir = path.join(resourcesRoot, folder);
    if (!(await fs.pathExists(typeDir))) continue;

    const names = await fs.readdir(typeDir);
    for (const name of names) {
      const dir = path.join(typeDir, name);
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) continue;

      try {
        const manifest = await readResourceManifest(dir);
        entries.push({ name, type, dir, manifest, displayName: name });
      } catch {
        p.log.warn(`Se omitió ${type} ${name}: no se pudo leer meta.json`);
      }
    }
  }
  return entries;
}

export function resourceDirFor(
  resourcesRoot: string,
  type: ResourceType,
  name: string
): string {
  return path.join(resourcesRoot, TYPE_FOLDERS[type], name);
}

/** Filtra recursos relevantes para los stacks detectados en el proyecto.
 *  Los recursos sin campo `stacks` se consideran genéricos y siempre aplican. */
export function filterByStacks(
  resources: ResourceEntry[],
  detectedStacks: Stack[]
): ResourceEntry[] {
  return resources.filter((r) => {
    if (!r.manifest.stacks || r.manifest.stacks.length === 0) return true;
    return r.manifest.stacks.some((s) => detectedStacks.includes(s));
  });
}

/**
 * Agrega recursos de múltiples sources cacheadas. Anota cada entrada con
 * sourceAlias y displayName = "alias/nombre".
 */
export async function listResourcesFromSources(
  sources: SourceEntry[]
): Promise<ResourceEntry[]> {
  const all: ResourceEntry[] = [];
  for (const source of sources) {
    const resources = await listAllResources(source.dir);
    for (const r of resources) {
      r.sourceAlias = source.alias;
      r.displayName = `${source.alias}/${r.name}`;
    }
    all.push(...resources);
  }
  return all;
}

/**
 * Devuelve la carpeta con el contenido REAL a instalar.
 * - Recurso local: es directamente resource.dir (donde está meta.json + SKILL.md)
 * - Recurso remoto (source.type "git"): clona/actualiza el repo externo y
 *   devuelve la subcarpeta correspondiente dentro del cache local.
 */
export async function resolveResourceDir(resource: ResourceEntry): Promise<string> {
  if (!resource.manifest.source) return resource.dir;
  return resolveGitSource(resource.manifest.source);
}
