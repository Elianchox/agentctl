import type { ResourceType } from "../core/types.ts";

export interface Adapter {
  /** Identificador usado en --target y en el lockfile, ej: "claude-code" */
  name: string;
  /** Nombre lindo para mostrar en prompts */
  label: string;
  /** ¿Este proyecto ya tiene configuración de esta CLI? (para preseleccionar) */
  detect(projectDir: string): Promise<boolean>;
  /** Ruta donde este adapter instala un recurso, para poder hashearla antes de pisarla */
  destPath(
    resourceName: string,
    type: ResourceType,
    projectDir: string
  ): string;
  /** Copia un recurso ya resuelto (carpeta fuente) al lugar que esta CLI espera */
  install(
    resourceDir: string,
    resourceName: string,
    type: ResourceType,
    projectDir: string
  ): Promise<void>;
}
