import * as p from "@clack/prompts";
import {
  addUserSource,
  removeUserSource,
  setDefaultSource,
  getSourceListInfo,
} from "../core/sources.ts";

export async function sourceAdd(alias: string, repo: string) {
  try {
    await addUserSource(alias, repo);
    p.log.success(`Source "${alias}" → ${repo} agregada.`);
  } catch (e: unknown) {
    p.log.error((e as Error).message);
  }
}

export async function sourceRemove(alias: string) {
  try {
    await removeUserSource(alias);
    p.log.success(`Source "${alias}" eliminada.`);
  } catch (e: unknown) {
    p.log.error((e as Error).message);
  }
}

export async function sourceSetDefault(alias: string) {
  try {
    await setDefaultSource(alias);
    p.log.success(`Default source cambiado a "${alias}".`);
  } catch (e: unknown) {
    p.log.error((e as Error).message);
  }
}

export async function sourceList() {
  const info = await getSourceListInfo();
  p.intro("Sources");
  p.log.info(`Oficial (built-in): ${info.official}`);
  if (info.user.length === 0) {
    p.log.info("No hay sources de usuario configuradas.");
  } else {
    for (const s of info.user) {
      const def = s.isDefault ? " (default)" : "";
      p.log.info(`  ${s.alias} → ${s.repo}${def}`);
    }
  }
  p.outro("Usá `agentctl source add <alias> <repo>` para agregar más.");
}
