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

export interface GitSource {
  type: "git";
  repo: string;
  path: string;
  ref?: string;
}

export interface ResourceManifest {
  name: string;
  type: ResourceType;
  version: string;
  description: string;
  stacks?: Stack[];
  source?: GitSource;
  alwaysLatest?: boolean;
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
  tools?: Record<string, ToolLockEntry>;
}

export type InstallMethod =
  | { brew: string }
  | { npm: string }
  | { uv: string }
  | { pipx: string }
  | { script: string };

export interface ToolPlugin {
  [target: string]: string;
}

export interface ToolConfig {
  name: string;
  desc?: string;
  install?: InstallMethod;
  setup?: string[];
  plugin?: ToolPlugin;
  targets?: string[];
}

export interface AgentctlConfig {
  $schema?: string;
  tools: ToolConfig[];
  resources?: string[] | "*";
}

export interface ToolTargetState {
  setupDone: boolean;
  pluginRegistered: boolean;
}

export interface ToolLockEntry {
  version: string;
  binaryPath?: string;
  targets: Record<string, ToolTargetState>;
  installedAt: string;
}

export interface SourceConfig {
  alias: string;
  repo: string;
}

export interface UserSourcesFile {
  default?: string;
  sources: SourceConfig[];
}
