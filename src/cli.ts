#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "./commands/init.ts";
import { add } from "./commands/add.ts";
import { list } from "./commands/list.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// resources/ vive un nivel arriba de dist/ cuando se compila,
// o al lado de src/ en modo desarrollo con tsx.
const resourcesRoot = path.resolve(__dirname, "..", "resources");

const program = new Command();

program
  .name("agentctl")
  .description(
    "Instala tus propios agents, skills y commands de IA en cualquier proyecto."
  )
  .version("0.1.0");

program
  .command("init")
  .description("Detecta el stack del proyecto y configura agents/skills/commands")
  .action(() => init(process.cwd(), resourcesRoot));

program
  .command("add <resource>")
  .description("Instala un recurso puntual por nombre")
  .option("-t, --target <targets>", "targets separados por coma, ej: claude-code,codex")
  .option("-f, --force", "sobreescribe aunque el recurso haya sido editado a mano")
  .action((resource, options) =>
    add(resource, process.cwd(), resourcesRoot, options)
  );

program
  .command("list")
  .description("Lista todos los recursos disponibles en el repo fuente")
  .action(() => list(resourcesRoot));

program.parse();
