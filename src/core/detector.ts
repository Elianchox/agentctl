import fs from "fs-extra";
import path from "node:path";
import type { Stack } from "./types.ts";

async function hasMarkerFile(projectDir: string, markers: string[]): Promise<boolean> {
  const files = await fs.readdir(projectDir).catch(() => [] as string[]);
  return markers.some((marker) =>
    marker.startsWith(".")
      ? files.some((f) => f.endsWith(marker))
      : files.includes(marker)
  );
}

async function readDeps(projectDir: string): Promise<{ deps: Set<string>; devDeps: Set<string> }> {
  const pkgPath = path.join(projectDir, "package.json");
  try {
    const pkg = await fs.readJson(pkgPath);
    return {
      deps: new Set(Object.keys(pkg.dependencies ?? {})),
      devDeps: new Set(Object.keys(pkg.devDependencies ?? {})),
    };
  } catch {
    return { deps: new Set(), devDeps: new Set() };
  }
}

function hasDep(deps: Set<string>, devDeps: Set<string>, name: string): boolean {
  return deps.has(name) || devDeps.has(name);
}

export async function isNode(projectDir: string): Promise<boolean> {
  return hasMarkerFile(projectDir, ["package.json"]);
}

export async function isPython(projectDir: string): Promise<boolean> {
  return hasMarkerFile(projectDir, ["pyproject.toml", "requirements.txt", "setup.py"]);
}

export async function isGo(projectDir: string): Promise<boolean> {
  return hasMarkerFile(projectDir, ["go.mod"]);
}

export async function isDotnet(projectDir: string): Promise<boolean> {
  return hasMarkerFile(projectDir, [".sln", ".csproj"]);
}

export async function isReact(projectDir: string): Promise<boolean> {
  const { deps, devDeps } = await readDeps(projectDir);
  return hasDep(deps, devDeps, "react");
}

export async function isReactNative(projectDir: string): Promise<boolean> {
  const { deps, devDeps } = await readDeps(projectDir);
  return hasDep(deps, devDeps, "react-native");
}

export async function isExpo(projectDir: string): Promise<boolean> {
  const { deps, devDeps } = await readDeps(projectDir);
  return hasDep(deps, devDeps, "expo");
}

export async function isNextJS(projectDir: string): Promise<boolean> {
  const { deps, devDeps } = await readDeps(projectDir);
  return hasDep(deps, devDeps, "next");
}

export async function isAstro(projectDir: string): Promise<boolean> {
  const { deps, devDeps } = await readDeps(projectDir);
  return hasDep(deps, devDeps, "astro");
}

export async function detectStacks(projectDir: string): Promise<Stack[]> {
  const checks: [Stack, () => Promise<boolean>][] = [
    ["dotnet", () => isDotnet(projectDir)],
    ["python", () => isPython(projectDir)],
    ["go", () => isGo(projectDir)],
    ["node", () => isNode(projectDir)],
    ["react", () => isReact(projectDir)],
    ["react-native", () => isReactNative(projectDir)],
    ["expo", () => isExpo(projectDir)],
    ["nextjs", () => isNextJS(projectDir)],
    ["astro", () => isAstro(projectDir)],
  ];

  const results = await Promise.all(checks.map(([, fn]) => fn()));
  return checks.filter((_, i) => results[i]).map(([stack]) => stack);
}
