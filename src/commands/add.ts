import * as p from "@clack/prompts";
import { listAllResources } from "../core/manifest.js";
import { installResource } from "../core/installer.js";
import { adapters, getAdapter } from "../adapters/index.js";

interface AddOptions {
  target?: string; // ej: "claude-code,codex"
  force?: boolean;
}

export async function add(
  resourceName: string,
  projectDir: string,
  resourcesRoot: string,
  options: AddOptions
) {
  const allResources = await listAllResources(resourcesRoot);
  const resource = allResources.find((r) => r.name === resourceName);

  if (!resource) {
    p.log.error(`No se encontró el recurso "${resourceName}" en resources/`);
    return;
  }

  let targets = options.target
    ? options.target
        .split(",")
        .map((t) => t.trim())
        .map((name) => getAdapter(name))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
    : [];

  if (targets.length === 0) {
    // sin --target: usar los que ya están detectados en el proyecto
    const presence = await Promise.all(
      adapters.map(async (a) => ({ adapter: a, present: await a.detect(projectDir) }))
    );
    targets = presence.filter((d) => d.present).map((d) => d.adapter);
  }

  if (targets.length === 0) {
    p.log.error(
      "No se detectó ningún target en el proyecto y no se pasó --target. Especificá uno, ej: --target claude-code"
    );
    return;
  }

  for (const target of targets) {
    const result = await installResource(resource, target, projectDir, {
      force: options.force,
    });

    if (result.status === "skipped-modified") {
      p.log.warn(
        `${target.label}: "${resourceName}" fue editado a mano, no se pisó. Usá --force para sobreescribir.`
      );
    } else {
      p.log.success(`${target.label}: ${resourceName} → ${result.status}`);
    }
  }
}
