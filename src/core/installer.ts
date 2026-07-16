import type { Adapter } from "../adapters/types.ts";
import type { ResourceEntry } from "./manifest.ts";
import { resolveResourceDir } from "./manifest.ts";
import { hashPath } from "./hash.ts";
import { upsertLockEntry, readLockFile } from "./lockfile.ts";

export interface InstallResult {
  resourceName: string;
  target: string;
  status: "installed" | "updated" | "skipped-modified" | "up-to-date";
}

/**
 * Instala un recurso en un target.
 *
 * Dos modos, según el recurso:
 *
 * - Recurso propio (default): protegido contra ediciones manuales. Antes de
 *   pisar, hashea lo instalado y lo compara contra el lock. Si no coincide
 *   (lo editaste a mano) se salta, salvo --force.
 *
 * - Recurso con `alwaysLatest: true` (ej. Superpowers, cualquier fuente de
 *   terceros): no aplica esa protección. Se resuelve siempre contra la
 *   última versión disponible (clonando/actualizando si es remoto) y se
 *   reinstala automáticamente si cambió, sin pedir --force.
 */
export async function installResource(
  resource: ResourceEntry,
  adapter: Adapter,
  projectDir: string,
  opts: { force?: boolean } = {}
): Promise<InstallResult> {
  const lockKey = `${adapter.name}:${resource.name}`;
  const destPath = adapter.destPath(resource.name, resource.type, projectDir);
  const alwaysLatest = resource.manifest.alwaysLatest === true;

  const installedHash = await hashPath(destPath);
  const lockFile = await readLockFile(projectDir);
  const lockEntry = lockFile.resources[lockKey];

  const wasModifiedByUser =
    !alwaysLatest &&
    installedHash !== null &&
    lockEntry !== undefined &&
    installedHash !== lockEntry.hash;

  if (wasModifiedByUser && !opts.force) {
    return {
      resourceName: resource.name,
      target: adapter.name,
      status: "skipped-modified",
    };
  }

  // Para recursos remotos, esto clona/actualiza el repo externo primero.
  const sourceDir = await resolveResourceDir(resource);
  const sourceHash = await hashPath(sourceDir);
  if (!sourceHash) {
    throw new Error(`No se pudo leer el recurso fuente: ${sourceDir}`);
  }

  const alreadyUpToDate =
    lockEntry !== undefined &&
    installedHash !== null &&
    lockEntry.hash === installedHash &&
    !wasModifiedByUser &&
    lockEntry.hash === sourceHash;

  if (alreadyUpToDate) {
    return {
      resourceName: resource.name,
      target: adapter.name,
      status: "up-to-date",
    };
  }

  await adapter.install(sourceDir, resource.name, resource.type, projectDir);

  const newInstalledHash = await hashPath(destPath);
  await upsertLockEntry(projectDir, lockKey, {
    type: resource.type,
    version: resource.manifest.version,
    hash: newInstalledHash ?? sourceHash,
    target: adapter.name,
    installedAt: new Date().toISOString(),
  });

  return {
    resourceName: resource.name,
    target: adapter.name,
    status: lockEntry === undefined ? "installed" : "updated",
  };
}
