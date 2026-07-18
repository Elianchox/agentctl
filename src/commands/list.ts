import * as p from "@clack/prompts";
import { listAllResources } from "../core/manifest.ts";
import { ResourceType } from "../core/types.ts";

export async function list(resourcesRoot: string) {
  const resources = await listAllResources(resourcesRoot);

  if (resources.length === 0) {
    p.log.info("No hay recursos en resources/ todavía.");
    return;
  }

  const byType = { skill: [], agent: [], command: [], plugin: [] } as Record<
    ResourceType,
    typeof resources
  >;
  for (const r of resources) byType[r.type].push(r);

  for (const [type, items] of Object.entries(byType)) {
    if (items.length === 0) continue;
    p.log.step(`${type}s:`);
    for (const r of items) {
      const stacks = r.manifest.stacks?.join(", ") ?? "genérico";
      console.log(`  - ${r.name} (v${r.manifest.version}) [${stacks}]`);
      console.log(`    ${r.manifest.description}`);
    }
  }
}
