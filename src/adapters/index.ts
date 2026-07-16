import type { Adapter } from "./types.ts";
import { claudeCodeAdapter } from "./claude-code.ts";
import { codexAdapter } from "./codex.ts";

// Agregar un adapter nuevo (ej. Cursor) es sumarlo acá.
// Automáticamente aparece en init/add sin tocar el resto del código.
export const adapters: Adapter[] = [claudeCodeAdapter, codexAdapter];

export function getAdapter(name: string): Adapter | undefined {
  return adapters.find((a) => a.name === name);
}
