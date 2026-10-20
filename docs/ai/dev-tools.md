# Developer tools (owner, 2026-10-20)

Optional outside tools for AI sessions and the owner. None of them is a project dependency: nothing goes into `package.json` dependencies, the game file or CI. Versions are pinned so a session gets the same tool every time; raise a pin only on purpose.

Registry check (2026-10-20, cloud session): `npx` fetched ccusage and ast-grep and `uv`/`uvx` were present. If a session cannot reach the registry, skip the tool and go on with the existing route (`docs/ai/token-economy.md`); never block a task on these tools.

## In use

### ccusage: real token use per session
- What: reads Claude Code's local session logs and prints input, output, cache and total tokens per session, day or week (ryoppippi/ccusage, MIT).
- Command: `npm run -s usage` (= `npx -y ccusage@20.0.37 session`). Other views: `npx -y ccusage@20.0.37 daily`, `... weekly`, `... blocks`.
- Use: at the end of a roadmap session, copy the row of the current session (the session id matches the chat) into the handoff next to `Token terpakai`. It counts what the logs record (cache reads included), so it is the figure to compare between sessions; the budget-counter difference stays as it is.
- Item A2 (`docs/ai/roadmap-open.md`): "tokens used" and "cards per 100k tokens" come from this report (main + agents: agents log as their own sessions).
- Owner laptop: the same command shows the owner's local sessions.

### ast-grep: structural code search
- What: searches and rewrites code by syntax tree, not by text (ast-grep/ast-grep, MIT). Finds call shapes that `grep` either misses or over-matches, with fewer lines printed.
- Command: `npm run -s astgrep -- run -l js -p '<pattern>' packages/engine/src/` (= `npx -y -p @ast-grep/cli@0.51.0 ast-grep`). Add `--json=compact` for a one-line-per-match result.
- Examples:
  - every function definition in one part: `-p 'function $N($$$A){$$$B}' packages/engine/src/06-rules.js`
  - every comparison against an action name: `-p "\$X === 'DESTROY'" packages/engine/src/` (escape `$` inside double quotes)
- Route: code map first (`docs/ai/code-map.md`), then ast-grep or `grep -n`, then `Read` with offset/limit. Do not call the bare `sg` command: on Linux images it is often the system "switch group" tool.

## Optional (owner laptop)

### Serena: symbol-level reading and editing (MCP)
- What: an MCP server that lets Claude Code find, read and edit code by symbol (function, class) through a language server instead of reading whole files (oraios/serena; application GPL-3.0-or-later, its LSP layer MIT). Supports JavaScript and TypeScript.
- Not in `.mcp.json`: it would start in every cloud session and add its tool list to every call. Use it on the laptop, mainly for the TypeScript move (`docs/ai/monorepo-plan.md` M5).
- Setup (from Serena's docs): install `uv`, then `uv tool install -p 3.13 serena-agent`, then in the project folder `claude mcp add serena -- serena start-mcp-server --context claude-code --project "$(pwd)"` (or `serena setup claude-code`). Check with `/mcp`.
- Serena's docs advise turning off the overlapping built-in tools to avoid a bigger context; measure with ccusage before and after and keep it only if a session gets cheaper.

## Reference (read, never copy)

### Forge: card scripting of a large open-source card game engine
- What: Card-Forge/forge, an open-source rules engine for another trading card game with a script per card and a documented scripting API (repo wiki "Card scripting API", "Creating a custom Card").
- Use: like `docs/aegis-study.md`, a source of patterns for the effect JSON vocabulary, trigger and replacement shapes and the text compiler; note the idea and our own decision in the mechanic file.
- License: GPL-3.0. Copy no code or card scripts into this repo; take ideas only.

## Later (not now)

### Online play frameworks: boardgame.io, Colyseus
- Evaluate at **M6 Server** (`docs/ai/monorepo-plan.md`), not before: boardgame.io (turn-based game framework: moves, phases, secret state per player, multiplayer server) and Colyseus (authoritative WebSocket room server with state sync).
- The M6 default stays "Node built-ins where possible"; a framework is taken only if it saves more than it costs (dependency, license, fit with `packages/engine` and the seat-filtered views). Write the comparison in the monorepo plan at that time.

## Not taken
- Graphify (codebase knowledge graph): overlaps `tools/code_map.mjs` + `docs/ai/code-map.md`; its token claims have no published method (checked 2026-10-20).
- Repomix: `tools/pack_ai.mjs` already fills that role.
