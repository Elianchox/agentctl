import * as p from "@clack/prompts";
import { listResourcesFromSources } from "../core/manifest.ts";
import { installResource } from "../core/installer.ts";
import { getAdapter } from "../adapters/index.ts";
import { getSources, refreshAllSources } from "../core/sources.ts";

interface AddOptions {
  target?: string;
  force?: boolean;
}

export async function add(
  resourceSpec: string,
  projectDir: string,
  options: AddOptions
) {
  if (!options.target) {
    p.log.error("Especificá un target con --target. Ej: --target opencode");
    return;
  }

  const parts = resourceSpec.split("/");
  if (parts.length > 2) {
    p.log.error(
      `Formato inválido: "${resourceSpec}". Usá "nombre" o "alias/nombre".`
    );
    return;
  }
  const hasAlias = parts.length === 2;
  const alias = hasAlias ? parts[0] : undefined;
  const resourceName = hasAlias ? parts[1] : parts[0];

  if (hasAlias && alias!.length === 0) {
    p.log.error(
      `Formato inválido: "${resourceSpec}". El alias no puede estar vacío.`
    );
    return;
  }

  if (resourceName.length === 0) {
    p.log.error(
      `Formato inválido: "${resourceSpec}". El nombre del recurso no puede estar vacío.`
    );
    return;
  }

  // Actualizar caché
  const sp = p.spinner();
  sp.start("Actualizando caché de sources...");
  await refreshAllSources();
  sp.stop("Caché actualizada.");

  const sources = await getSources();
  const allResources = await listResourcesFromSources(sources);

  let candidates = allResources.filter((r) => r.name === resourceName);
  if (alias) {
    candidates = candidates.filter((r) => r.sourceAlias === alias);
  }

  if (candidates.length === 0) {
    const msg = alias
      ? `No se encontró "${resourceName}" en la source "${alias}".`
      : `No se encontró "${resourceName}" en ninguna source.`;
    p.log.error(msg);
    return;
  }

  // Si hay varios, selector interactivo
  let selected = candidates[0];
  if (candidates.length > 1) {
    const chosen = await p.select({
      message: `Se encontraron varios "${resourceName}". ¿Cuál querés instalar?`,
      options: candidates.map((r) => ({
        value: `${r.displayName}::${r.type}`,
        label: `${r.displayName} (${r.type}) — ${r.manifest.description}`,
      })),
    });
    if (p.isCancel(chosen)) {
      p.cancel("Cancelado.");
      return;
    }
    selected = candidates.find((r) => `${r.displayName}::${r.type}` === chosen)!;
  }

  const targets = options.target
    .split(",")
    .map((t) => t.trim())
    .map((name) => getAdapter(name))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  if (targets.length === 0) {
    p.log.error("No se reconoció ningún target válido.");
    return;
  }

  for (const target of targets) {
    const result = await installResource(selected, target, projectDir, {
      force: options.force,
    });
    if (result.status === "skipped-modified") {
      p.log.warn(
        `${target.label}: "${selected.displayName}" fue editado a mano, no se pisó. Usá --force.`
      );
    } else {
      p.log.success(`${target.label}: ${selected.displayName} → ${result.status}`);
    }
  }
}
