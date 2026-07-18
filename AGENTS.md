# agentctl

CLI to install custom AI agents/skills/commands across AI CLIs (Claude Code, Codex CLI, OpenCode, etc).

## Commands

```bash
pnpm run dev -- init                      # detect stack + install
pnpm run dev -- add code-reviewer -t claude-code
pnpm run dev -- list
pnpm run build && pnpm link && agentctl init   # global install
```

- Use `tsx src/cli.ts` directly if `pnpm run dev` args get weird with `--`
- No lint/test scripts. Typecheck: `npx tsc --noEmit`

## Build

`pnpm run build` → `tsc` outputs ESM to `dist/`. Node >=18. Uses `rewriteRelativeImportExtensions` in tsconfig, so source imports `.ts` extensions (not `.js`).

## Architecture

```
cli.ts (commander) → commands/{init,add,list}
                   → core/{detector,manifest,installer,lockfile,hash,git-fetch}
                   → adapters/{claude-code,codex,opencode}  (Adapter interface)
```

- **Adapters** implement `{name, label, detect(), destPath(type), install(src, dest)}` — to add a new CLI, create the adapter file and add it to `adapters/index.ts`
- **Resources** live in `resources/{skills,agents,commands}/<name>/` with `meta.json` + content file
- **Git-sourced resources** (e.g. superpowers-tdd) clone to `~/.agentctl/cache/`; `alwaysLatest: true` bypasses edit protection
- **Lockfile** (`agentctl.lock.json`) stores SHA-256 hashes per resource+target. **Not committed** (gitignored). If user edits installed files, `add`/`init` skip them unless `--force`
- **Stack detection** (`detector.ts`) checks for `.sln` → dotnet, `pyproject.toml` → python, `go.mod` → go, `package.json` + deps → node/react/expo/nextjs/astro

## Adding a resource

1. Create `resources/{skills,agents,commands}/<name>/meta.json`
2. Create content file (`SKILL.md` / `AGENT.md` / `<name>.md`)
3. Optional `stacks` field filters by detected stack; omit for universal

## meta.json fields

`name`, `type` (skill|agent|command|plugin), `version`, `description`, `stacks?`, `source?` (git URL), `required?` (always installed in `init`), `alwaysLatest?` (bypasses edit protection).

## graphify

Project has a knowledge graph at `graphify-out/` (gitignored). Use `graphify query "..."` for codebase questions, `graphify path "A" "B"` for relationships, `graphify explain "concept"` for focused topics. After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
