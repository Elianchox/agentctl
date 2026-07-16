import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import type { GitSource } from "./types.ts";

const run = promisify(execFile);

function cacheDirFor(repo: string): string {
  // ~/.agentctl/cache/<owner>-<repo>
  const slug = repo
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-");
  return path.join(os.homedir(), ".agentctl", "cache", slug);
}

/**
 * Clona el repo si no está en cache, o hace pull si ya existe.
 * Devuelve la ruta absoluta a source.path dentro del checkout local.
 */
export async function resolveGitSource(source: GitSource): Promise<string> {
  const ref = source.ref ?? "main";
  const repoDir = cacheDirFor(source.repo);

  if (await fs.pathExists(path.join(repoDir, ".git"))) {
    await run("git", ["-C", repoDir, "fetch", "--depth", "1", "origin", ref]);
    await run("git", ["-C", repoDir, "reset", "--hard", `origin/${ref}`]);
  } else {
    await fs.ensureDir(path.dirname(repoDir));
    await run("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      ref,
      source.repo,
      repoDir,
    ]);
  }

  const resolvedPath = path.join(repoDir, source.path);
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(
      `"${source.path}" no existe en ${source.repo}@${ref}. ¿Cambió la estructura del repo?`
    );
  }
  return resolvedPath;
}
