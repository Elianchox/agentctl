import * as p from "@clack/prompts";
import { listResourcesFromSources } from "../core/manifest.ts";
import { getSources, refreshAllSources } from "../core/sources.ts";
import { ResourceType } from "../core/types.ts";

export async function list() {
  const sp = p.spinner();
  sp.start("Actualizando caché de sources...");
  await refreshAllSources();
  sp.stop("Caché actualizada.");

  const sources = await getSources();
  const resources = await listResourcesFromSources(sources);

  if (resources.length === 0) {
    p.log.info("No hay recursos disponibles en ninguna source.");
    return;
  }

  const byType = { skill: [], agent: [], command: [] } as Record<
    ResourceType,
    typeof resources
  >;
  for (const r of resources) byType[r.type].push(r);

  for (const [type, items] of Object.entries(byType)) {
    if (items.length === 0) continue;
    p.log.step(`${type}s:`);
    for (const r of items) {
      const stacks = r.manifest.stacks?.join(", ") ?? "genérico";
      console.log(`  - ${r.displayName} (v${r.manifest.version}) [${stacks}]`);
      console.log(`    ${r.manifest.description}`);
    }
  }
}
