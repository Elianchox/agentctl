# agentctl

CLI para instalar **tus propios** agents, skills y slash commands de IA en cualquier proyecto, para múltiples herramientas (Claude Code, Codex CLI, y las que agregues).

## Instalación (desarrollo local)

```bash
npm install
npm run build
npm link          # deja "agentctl" disponible globalmente en esta máquina
```

## Uso

```bash
agentctl init                          # detecta el stack e instala interactivamente
agentctl list                          # lista todos los recursos disponibles
agentctl add code-reviewer -t claude-code
agentctl add code-reviewer -t claude-code,codex   # varios targets a la vez
agentctl add code-reviewer -t claude-code --force # pisa aunque esté editado a mano
```

## Estructura del repo

```
agentctl/
  src/
    cli.ts               entry point (comandos con commander)
    commands/             init.ts, add.ts, list.ts
    core/
      detector.ts          detecta el stack (.NET, Python, Go, Node, Expo)
      manifest.ts           lee meta.json de cada recurso
      hash.ts                calcula SHA-256 de un archivo o carpeta
      lockfile.ts             lee/escribe agentctl.lock.json
      installer.ts             orquesta: hashea, decide, instala, actualiza el lock
    adapters/
      types.ts               interfaz común que implementa cada adapter
      claude-code.ts          escribe en .claude/{skills,agents,commands}
      codex.ts                 escribe en .codex/ (ajustar a la convención real)
      index.ts                  registro central — agregar un adapter nuevo es sumarlo acá
  resources/              tu repo fuente de recursos propios
    skills/<nombre>/meta.json + SKILL.md
    agents/<nombre>/meta.json + AGENT.md
    commands/<nombre>/meta.json + <nombre>.md
```

## Recursos de terceros que siempre se instalan (ej. Superpowers)

Un recurso puede apuntar a un repo Git externo en vez de vivir en `resources/`,
y puede marcarse para que `init` lo instale siempre, sin preguntar, y siempre
en su última versión:

```json
{
  "name": "superpowers-tdd",
  "type": "skill",
  "version": "tracks-upstream",
  "description": "Skill de TDD de obra/superpowers",
  "required": true,
  "alwaysLatest": true,
  "source": {
    "type": "git",
    "repo": "https://github.com/obra/superpowers",
    "path": "skills/test-driven-development",
    "ref": "main"
  }
}
```

- `required: true` → `init` lo instala siempre, no aparece como opción deseleccionable
- `alwaysLatest: true` → no aplica la protección "fue editado a mano"; cada `add`/`init`
  clona o hace `pull` del repo (cacheado en `~/.agentctl/cache/`) y reinstala si cambió
- Sin `source`, el recurso funciona como siempre: vive en `resources/` y es tuyo

## Cómo agregar un recurso propio

1. Creá la carpeta `resources/<tipo>s/<nombre>/`
2. Agregá `meta.json`:
   ```json
   {
     "name": "mi-skill",
     "type": "skill",
     "version": "1.0.0",
     "description": "Qué hace",
     "stacks": ["node", "expo-react-native"]
   }
   ```
   `stacks` es opcional — si lo omitís, el recurso se sugiere en cualquier proyecto.
3. Agregá el contenido real (`SKILL.md`, `AGENT.md`, o `<nombre>.md` para commands)
4. `agentctl list` ya lo va a mostrar

## Cómo funciona la protección contra ediciones manuales

Cada vez que instalás un recurso, `agentctl` guarda el hash SHA-256 de lo que quedó
instalado en `agentctl.lock.json`. La próxima vez que corrés `add` o `init`:

- Si lo instalado coincide con el hash del lock → puede actualizar sin problema
- Si lo instalado **no** coincide (lo editaste a mano) → se salta y avisa, salvo `--force`

## Agregar soporte para una CLI nueva (ej. Cursor)

1. Creá `src/adapters/cursor.ts` implementando la interfaz `Adapter` (`detect`, `destPath`, `install`)
2. Sumalo al array en `src/adapters/index.ts`
3. Automáticamente aparece en `init` y es usable con `--target cursor`

## Usarlo en otra PC / compartirlo

**Opción recomendada — publicar en npm:**
```bash
npm login
npm publish --access public
```
Después, en cualquier máquina:
```bash
npx agentctl init
# o instalado global:
npm install -g agentctl
```

**Sin publicar — instalar directo desde GitHub:**
```bash
npm install -g github:tu-usuario/agentctl
```

## Próximos pasos sugeridos

- Migrar tus skills/agents/commands actuales de `.claude/` a `resources/` (con su `meta.json`)
- Ajustar `src/adapters/codex.ts` a la convención real de la versión de Codex que uses
- Si querés compartir recursos entre proyectos sin publicar en npm, `resources/` puede vivir en un repo Git aparte y clonarse en `agentctl init` en vez de venir empaquetado
