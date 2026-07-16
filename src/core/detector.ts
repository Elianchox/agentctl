import fs from "fs-extra";
import path from "node:path";
import type { Stack } from "./types.ts";

/**
 * Marcadores por stack. Un string sin punto inicial se busca como archivo exacto,
 * un string tipo ".csproj" se busca como sufijo (para no depender del nombre).
 */
const MARKERS: Record<Stack, string[]> = {
  dotnet: [".sln", ".csproj"],
  python: ["pyproject.toml", "requirements.txt", "setup.py"],
  go: ["go.mod"],
  node: ["package.json"],
  "expo-react-native": ["app.json", "app.config.ts", "app.config.ts"],
};

export async function detectStacks(projectDir: string): Promise<Stack[]> {
  const files = await fs.readdir(projectDir).catch(() => [] as string[]);
  const found: Stack[] = [];

  for (const [stack, markers] of Object.entries(MARKERS) as [
    Stack,
    string[]
  ][]) {
    const match = markers.some((marker) =>
      marker.startsWith(".")
        ? files.some((f) => f.endsWith(marker))
        : files.includes(marker)
    );
    if (match) found.push(stack);
  }

  // Caso especial: Expo/React Native solo cuenta si además hay package.json
  // con dependencia de expo (evita falsos positivos con app.json de otras cosas)
  if (found.includes("expo-react-native")) {
    const pkgPath = path.join(projectDir, "package.json");
    const hasExpoDep = await fs
      .readJson(pkgPath)
      .then(
        (pkg) =>
          Boolean(pkg.dependencies?.expo) || Boolean(pkg.devDependencies?.expo)
      )
      .catch(() => false);
    if (!hasExpoDep) {
      found.splice(found.indexOf("expo-react-native"), 1);
    }
  }

  return found;
}
