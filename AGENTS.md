# agentctl

CLI to install custom AI agents/skills/commands across AI CLIs (Claude Code, Codex CLI, etc).

## Commands

```bash
# dev (no build needed)
npm run dev -- init
npm run dev -- add code-reviewer -t claude-code
npm run dev -- list

# build + global install
npm run build
npm link
agentctl init
```

- Use `tsx src/cli.ts` directly if `npm run dev` args get weird with `--`
- No lint or test scripts configured. Typecheck: `npx tsc --noEmit`

## Build

`npm run build` → `tsc` outputs to `dist/`. ESM (`"type": "module"`). Node >=18.

## Architecture

```
cli.ts (commander) → commands/{init,add,list}
                   → core/{detector,manifest,installer,lockfile,hash,git-fetch}
                   → adapters/{claude-code,codex}  (Adapter interface)
```

- **Adapters** implement `{name, label, detect(), destPath(type), install(src, dest)}` — add new CLIs by adding to `adapters/index.ts`
- **Resources** live in `resources/{skills,agents,commands}/<name>/` with a `meta.json` + content file (SKILL.md, AGENT.md, or <name>.md)
- **Git-sourced resources** (e.g. superpowers-tdd) are cloned to `~/.agentctl/cache/` and tracked via `alwaysLatest`, bypassing edit protection
- **Lockfile** (`agentctl.lock.json`) stores SHA-256 hashes per resource+target. If user edits installed files, `add`/`init` skip them unless `--force`
- **Stack detection** (`detector.ts`) looks for marker files (`.sln` → dotnet, `*.py` → python, `go.mod` → go, `package.json` → node, `expo` in deps → expo-react-native)

## Adding a resource

1. Create `resources/{skills,agents,commands}/<name>/meta.json`
2. Create content file (`SKILL.md` / `AGENT.md` / `<name>.md`)
3. Optional `stacks` field filters by detected stack; omit for universal resources

## Key conventions

- `meta.json` fields: `name`, `type`, `version`, `description`, `stacks?`, `source?` (git URL), `required?`, `alwaysLatest?`
- `required: true` = always installed during `init`, non-optional
- Hash-based edit protection in `lockfile.ts` — hash is SHA-256 of the installed file/dir tree

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
