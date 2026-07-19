#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "./commands/init.ts";
import { add } from "./commands/add.ts";
import { list } from "./commands/list.ts";
import {
  sourceAdd,
  sourceRemove,
  sourceSetDefault,
  sourceList,
} from "./commands/source.ts";

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
  .command("init [repo]")
  .description("Configura agents/skills/commands. Opcional: URL de repo para usar una vez.")
  .action((repo?: string) => init(process.cwd(), repo));

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

const source = program
  .command("source")
  .description("Gestiona repositorios de recursos");

source
  .command("add <alias> <repo>")
  .description("Agrega una source de recursos")
  .action(sourceAdd);

source
  .command("remove <alias>")
  .description("Elimina una source de recursos")
  .action(sourceRemove);

source
  .command("set-default <alias>")
  .description("Define qué source de usuario se usa en init")
  .action(sourceSetDefault);

source
  .command("list")
  .description("Lista todas las sources configuradas")
  .action(sourceList);

program.parse();
