import type { ResourceType } from "../core/types.ts";

export interface Adapter {
  name: string;
  label: string;
  detect(projectDir: string): Promise<boolean>;
  destPath(
    resourceName: string,
    type: ResourceType,
    projectDir: string
  ): string;
  install(
    resourceDir: string,
    resourceName: string,
    type: ResourceType,
    projectDir: string
  ): Promise<void>;
}
