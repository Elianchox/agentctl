import * as p from "@clack/prompts";
import fs from "fs-extra";
import { detectStacks } from "../core/detector.ts";
import { listAllResources, filterByStacks } from "../core/manifest.ts";
import { installResource } from "../core/installer.ts";
import { readAgentctlConfig, provisionTools } from "../core/provisioner.ts";
import { adapters } from "../adapters/index.ts";
import {
  getInitSource,
  refreshInitSource,
  cloneTempRepo,
} from "../core/sources.ts";

export async function init(projectDir: string, repoUrl?: string) {
  p.intro("agentctl init");

  let sourceDir: string;
  let isTemp = false;

  if (repoUrl) {
    const sp = p.spinner();
    sp.start("Clonando repo...");
    try {
      sourceDir = await cloneTempRepo(repoUrl);
    } catch (e) {
      sp.stop("Error al clonar.");
      p.log.error(`No se pudo clonar el repo: ${(e as Error).message}`);
      return;
    }
    sp.stop("Repo clonado.");
    isTemp = true;
    p.log.info(`Source: ${repoUrl}`);
  } else {
    const source = await getInitSource();
    sourceDir = source.dir;
    const sp = p.spinner();
    sp.start("Actualizando caché...");
    await refreshInitSource();
    sp.stop("Caché actualizada.");
    p.log.info(`Source: ${source.repo}`);
  }

  try {
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

    const agentctlConfig = await readAgentctlConfig(sourceDir);
    if (agentctlConfig) {
      await provisionTools(agentctlConfig, targets, projectDir);
    } else {
      p.log.info(
        "No hay agentctl.json en la source. Solo se instalarán resources."
      );
    }

    const allResources = await listAllResources(sourceDir);
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
      p.outro(`✅ Instalado en: ${targets.map((t) => t.label).join(", ")}.`);
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
  } finally {
    if (isTemp) {
      await fs.remove(sourceDir);
    }
  }
}
