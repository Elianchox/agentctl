import type { Adapter } from "./types.ts";
import { opencodeAdapter } from "./opencode.ts";

export const adapters: Adapter[] = [opencodeAdapter];

export function getAdapter(name: string): Adapter | undefined {
  return adapters.find((a) => a.name === name);
}
