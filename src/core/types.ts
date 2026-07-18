export type ResourceType = "skill" | "agent" | "command";

export type Stack =
  | "dotnet"
  | "python"
  | "go"
  | "node"
  | "react"
  | "react-native"
  | "expo"
  | "nextjs"
  | "astro";

/** De dónde sale el contenido real de un recurso */
export interface GitSource {
  type: "git";
  repo: string; // https://github.com/owner/repo
  path: string; // ruta dentro del repo, ej: "skills/test-driven-development"
  ref?: string; // branch o tag, default "main"
}

/** meta.json que vive junto a cada recurso en resources/ */
export interface ResourceManifest {
  name: string;
  type: ResourceType;
  version: string;
  description: string;
  /** Si se define, el recurso solo se sugiere para estos stacks.
   *  Si se omite, se considera "genérico" y aplica a cualquier proyecto. */
  stacks?: Stack[];
  /** Si viene de un repo externo en vez de vivir en resources/ directamente */
  source?: GitSource;
  /** true = siempre se instala/actualiza sin preguntar y sin protección
   *  contra "editado a mano" (pensado para recursos de terceros tipo Superpowers) */
  alwaysLatest?: boolean;
  /** true = init lo instala siempre, sin que el usuario tenga que elegirlo */
  required?: boolean;
}

/** Entrada en agentctl.lock.json */
export interface LockEntry {
  type: ResourceType;
  version: string;
  hash: string;
  target: string;
  installedAt: string;
}

export interface LockFile {
  resources: Record<string, LockEntry>;
}
