# Monorepo plan: Aeterna online + offline (owner decision 2026-10-17)

Owner: "saya juga ingin membuat aeterna menjadi seperti itu" (Aegis: TypeScript monorepo, server/client split, Docker, Postgres) and "saya ingin repo kita bisa menjadi lebih rapi dan lebih baik dari aegis". Answers of 2026-10-17:
- **Product:** online PvP with a server **and** the offline single-file game vs CPU (PC + phone) stay.
- **Hosting:** none yet. Build and test the server and database code locally and in CI; deployment waits for the owner.
- **Order:** step by step, alternating: one migration session, then one card session (cards unlocked per token), Opus for all.

## Measured starting point (v0.59.1)
- 30 modules in `src/js` (~385 KB), concatenated by `tools/build.mjs` into `index.html`; tsc 6.0.3 and Node 22 are available in sessions; npm/pip registries are blocked in sessions (packages such as `ws`, `pg` or Colyseus can only be installed in GitHub Actions or on the owner's machine).
- Engine modules (`02*`-`09*`, `12`, `15`) touch the DOM almost never, but they call the UI directly: ~70 `render*()` calls, ~70 choice prompts (modal / ask / pick), ~200 `await`s. Human choices are awaited inside effect resolution.

## Design: what "better than Aegis" means here
1. **One engine, two hosts.** `packages/engine` is pure (no DOM, no globals, seeded RNG). It talks to the outside only through a port: `io.view(event)` (replaces `render*`), `io.decide(player, decision) -> Promise<answer>` (replaces modals and CPU picks), `io.log(entry)`. Offline host: the browser UI and the CPU answer the port. Online host: the server answers it by sending the decision to that seat and awaiting the reply. The async engine stays (no rewrite to a state machine); a decision is a typed, serializable record, so the server can time out, reconnect and replay.
2. **Two replay formats, like Aegis (corrected 2026-10-17 after the owner asked):** the **input record** (exists since v0.26: `G.rec`, `runReplay`; decks, seed, every answer) re-executes the engine to reproduce a match: bug reports, regression tests, server audit and reconnect. It depends on the engine version, so old records can drift after engine changes. The **viewer replay** (board snapshot per event) plays back in any later version without the engine: watch, step back and forth, share. The viewer replay is exported from an input record by re-running it in the version that recorded it; same files offline and online. Neither is needed for a match to run.
3. **Strict but documented.** Typed through `// @ts-check` + JSDoc first, `.ts` per module later, `tsc --noEmit` in CI. Comments stay allowed (Aegis forbids them); rules for where things live are checked by tools, not by memory: a docs link checker, an old-path checker, a "generated file is up to date" check, and the brand guard.
4. **One home per thing:** `AGENTS.md`-style short root rules (our `CLAUDE.md`), `docs/ARCHITECTURE.md`, `docs/mechanics/<mechanic>.md`, `docs/reports/` (generated), a README per package and per `tools/` group, `docs/DATA.md` (card pipeline and, later, database tables, like Aegis `COLLECTIONS.md`).

## Target layout
```
packages/
  engine/      rules, effects, turn, battle, CPU (pure; host port; seeded RNG; input records)
  cards/       card pack builder, compiler, card JSON access (from data/)
  protocol/    decision, event, intent and view types shared by server and clients
apps/
  web/         UI, deck builder, offline host; builds the single-file aeterna-vX.Y.Z.html and the online client
  server/      authoritative rooms (WebSocket), seat-filtered views, matchmaking; Postgres store (accounts, decks, replays)
data/          sources -> import (staging) -> cards (playable); unchanged pipeline
docker/        compose for local server + Postgres (dev only until hosting is chosen)
tools/         grouped by domain, README each; session_gate.sh / session_start.sh stay at tools/
docs/          ARCHITECTURE.md, DATA.md, mechanics/, reports/, ai/
tests/         unit + scenarios per package, browser tests for apps/web, CI-only server tests
```
npm workspaces (built into npm, no registry needed for local packages) instead of pnpm.

## Phases (each = one session, Opus; a card session follows each one; the full order with the quality bundles is in `roadmap-open.md` "Session order")
- **M0 = cleanup C1 + C2** (`docs/ai/repo-cleanup-plan.md`): architecture doc, doc index, doc-convention skill, docs tidy. v0.59.2-v0.59.3.
- **M1 Workspace skeleton (patch): done in v0.60.1** (`tools/src_parts.mjs`; engine = `00-config`, `01-cards`, `01a-card-pack`, `02*`-`09*`, `12`, `15`; web = `00b-errors`, `10`, `11`, `13`, `13a`, `14`, `16`). root `package.json` workspaces; move `src/js` modules into `packages/engine/src` and `apps/web/src` by the DOM/engine split above, still plain JS; `tools/build.mjs` reads the new paths. Gate: built `index.html` byte-identical to the pre-move build except the version line; all tests and Regression green. Replaces cleanup C3/C4 (tools and data move with the layout).
- **M2 Host port, part 1 (minor): done in v0.82.0** (`packages/protocol/src/00p-protocol.js`, web host `apps/web/src/13e-host.js`, `packages/engine/headless.mjs`, tests H82; `12-zones.js` moved to `apps/web`; 9 human prompts left in `WEB_GAPS` for M3). Plan was: define the port and decision/event records in `packages/protocol`; route every `render*` call in engine modules through `io.view`. Test: a headless run (no DOM) plays CPU vs CPU to the end in Node.
- **M3 Host port, part 2 (minor, maybe 2 sessions):** route every human/CPU choice through `io.decide`; the CPU becomes a port answerer. Test: scripted answers reproduce scenario results; the offline game is unchanged (player-view check).
- **M4 Replays (minor):** input records go through the port (`decide` answers); viewer replay format (snapshot per `view` event) + exporter from an input record + a playback screen in `apps/web`; replay regression tests.
- **M5 Types (patches, alongside):** `@ts-check` + JSDoc per package, `tsc --noEmit` in CI and `npm run loop`; `.ts` conversion module by module once checks are clean.
- **M6 Server (minor):** `apps/server` with rooms, seat-filtered views (hidden hand/deck), decision timeouts, reconnect; uses Node built-ins where possible; dependencies installed only in CI; CI test plays two scripted clients to the end. No deployment.
- **M7 Database + Docker (minor):** Postgres schema and migrations (accounts, decks, replays), `docs/DATA.md` tables, `docker/compose.yml` for local runs; CI service container for tests. Hosting stays the owner's decision.
- **L1 UI languages (minor, after M4; owner 2026-10-17):** string table in `apps/web`, then Japanese, Thai, Chinese, further languages by market; details in `roadmap-open.md` "Session order" item 9.
- **M8 Online client (minor):** lobby, room join, play through the server in `apps/web`; offline mode untouched.

## Rules for every phase
- Offline game behaviour never changes in a migration step; the player-view check runs after M1, M2, M3, M8.
- Backup branch before M1, M2, M3 and M6.
- Paths fetched from outside a clone stay put (`tools/session_gate.sh`, `tools/session_start.sh`); the scheduled task prompt depends on them.
- The brand guard covers the new folders; neutral names only until v1.0.
- Anything that costs money or publishes a server is not done by a session; it is written down for the owner.
