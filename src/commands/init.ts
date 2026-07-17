import * as p from "@clack/prompts";
import { detectStacks } from "../core/detector.ts";
import { listAllResources, filterByStacks } from "../core/manifest.ts";
import { installResource } from "../core/installer.ts";
import { adapters } from "../adapters/index.ts";

export async function init(projectDir: string, resourcesRoot: string) {
  p.intro("agentctl init");

  const stacks = await detectStacks(projectDir);
  p.log.info(
    stacks.length
      ? `Stack detectado: ${stacks.join(", ")}`
      : "No se detectó un stack conocido (se sugerirán solo recursos genéricos)"
  );

  const presenceCLI = await Promise.all(
    adapters.map(async (a) => ({ adapter: a, present: await a.detect(projectDir) }))
  );

  const selectedTargets = await p.multiselect({
    message: "¿En qué CLI(s) instalar? (espacio para elegir varias)",
    options: adapters.map((a) => ({
      value: a.name,
      label: a.label,
      hint: presenceCLI.find((d) => d.adapter.name === a.name)?.present
        ? "detectado en el proyecto"
        : undefined,
    })),
    initialValues: presenceCLI.filter((d) => d.present).map((d) => d.adapter.name),
  });

  if (p.isCancel(selectedTargets)) {
    p.cancel("Cancelado.");
    return;
  }

  const targets = adapters.filter((a) =>
    (selectedTargets as string[]).includes(a.name)
  );

  if (targets.length === 0) {
    p.outro("No se seleccionó ningún target. Nada que instalar.");
    return;
  }

  const allResources = await listAllResources(resourcesRoot);
  const relevant = filterByStacks(allResources, stacks);
  const requiredResources = relevant.filter((r) => r.manifest.required);
  const optionalResources = relevant.filter((r) => !r.manifest.required);

  if (requiredResources.length > 0) {
    p.log.info(
      `Se instalan siempre: ${requiredResources.map((r) => r.name).join(", ")}`
    );
  }

  let resourcesToInstall = [...requiredResources];

  if (optionalResources.length > 0) {
    const selectedResources = await p.multiselect({
      message: "¿Qué otros agents/skills/commands querés instalar?",
      options: optionalResources.map((r) => ({
        value: r.name,
        label: `${r.name} (${r.type})`,
        hint: r.manifest.description,
      })),
      initialValues: optionalResources.map((r) => r.name),
    });

    if (p.isCancel(selectedResources)) {
      p.cancel("Cancelado.");
      return;
    }

    resourcesToInstall = resourcesToInstall.concat(
      optionalResources.filter((r) =>
        (selectedResources as string[]).includes(r.name)
      )
    );
  }

  if (resourcesToInstall.length === 0) {
    p.outro("No hay recursos disponibles en resources/ todavía.");
    return;
  }

  for (const target of targets) {
    const spinner = p.spinner();
    spinner.start(`Instalando en ${target.label}...`);

    for (const resource of resourcesToInstall) {
      const result = await installResource(resource, target, projectDir);
      if (result.status === "skipped-modified") {
        spinner.message(
          `${resource.name}: se dejó como está (fue editado a mano). Usá --force para pisarlo.`
        );
      } else {
        spinner.message(`${resource.name}: ${result.status}`);
      }
    }

    spinner.stop(`${target.label}: listo`);
  }

  p.outro(
    `Instalado en: ${targets.map((t) => t.label).join(", ")}. Revisá agentctl.lock.json`
  );
}
