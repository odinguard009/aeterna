# Study: Aegis (aegis-digi.online)

Source: https://github.com/vinicius3333/aegis-digimon-tcg (MIT, (c) Vinicius Luiz; Digimon card data and art are excluded from that licence). Studied at commit `84b2049` (13 Oct 2026, 6,451 commits, about 14,600 files). We take ideas and structure, not code: Aegis is TypeScript on a server, Aeterna is one HTML file played against a CPU.

## What Aegis is
- Server-authoritative online Digimon Card Game simulator. Monorepo: `packages/shared` (card catalog, effect IR types, protocol), `apps/api` (Colyseus rooms, rules engine, bots, Postgres), `apps/web` (React + PixiJS board, deck builder, lobby).
- The client only sends **intents** (play, attack, answer). The engine validates actor, phase, cost and targets, runs effects through a stack, and pauses on **decisions** owned by one player.
- Every event carries `seq`, `batch`, `stateVersion`; the client paces animations from that stream. Rules never live in the UI.

## Effect system (closest to ours)
- One card = one module that declares a `CompiledCard`: `effects[]` of `{ trigger, optional, frequency, condition, cost, actions[], description }`, plus `coverage: "full" | "partial" | "none"` and `residual: string[]` (the printed fragments that are not modelled).
- About 40 trigger tags (`OnPlay`, `WhenAttacking`, `OnDeletion`, `EndOfAttack`, `StartOfYourTurn`, `WhenBlocked`, ...), and actions grouped by domain (play, removal, reveal, resources, restrictions, replacement, statics, sub-triggers).
- `cost` on the whole clause models "By doing X, ...": paid once before any action, and the clause is skipped when it cannot be paid.
- `description` keeps the exact printed clause for prompts and the log.
- Continuous effects are recomputed from active sources, never stored as mutations (we do the same with `staticBp`/`flagActive`).

## Trigger ordering (their audited loop)
1. Collect printed triggers plus armed watchers for one event; the pool is rebuilt every pass so a trigger whose condition lapsed drops out.
2. Turn player's triggers first, then the opponent's; each controller picks the order of their own group.
3. Resolve one, run the rule sweep (depletion etc.), then a trigger caused by that resolution goes before older pending ones.
4. Watchers that did not exist when the event happened never react to it.

## Testing and rules evidence
- Every official rule is an "obligation" in `data/kb/rule-obligations.json` with source section, text, `status` (gap/proven) and the `testPath` that proves it. Conformance tests cite the rule with a fingerprint.
- Regression tests are named after behaviour and use **scenario fixtures** (a named board spec: zones, cores, turn, aliases) shared by engine tests and browser tests.
- Replays: an **input record** (decklists, seed, every input) re-executes a match deterministically, so any bug report can be reproduced exactly.
- `AEGIS_STRICT_EFFECTS`: unsupported effects throw in development.

## Bot
- `BotPolicy` interface: one method per decision kind (main action, block, counter, answer a prompt). The plumbing is separate from the judgement.
- Evaluation policy: enumerate every legal action, score each in one unit, play the best; passing scores 0 so the bot never overextends just because it can pay. Two cheap lookaheads: lethal first, and "this action ends my turn".
- Personalities (balanced, aggressive, defensive) are weight sets only, never code branches. A battle fuzzer and benchmark play bot vs bot.

## UI patterns worth copying
Decision rail and effect focus (the source card glows while its effect resolves), narration stack, phase banner, play log with card links, reveal showcase, keyword reminders/glossary, hand sort, cost preview before paying, match timer, rollback controls, game-over splash, mobile prompt layout tested at several phone sizes.

## What Aeterna adopts (in order)
Status: 1 done in v0.25 (`residual`), 3 and 4 done in v0.26, 2 and 6 done in v0.28, 7 done in v0.32 (`src/js/09a-cpu-eval.js`).
1. **Coverage + residual** per card instead of `fxComplete:false`: the hover shows exactly which printed clauses are not implemented. Effects get a `text` field with the printed clause for prompts and the log.
2. **Clause cost** for "By doing X, ..." (Soul Core moves, discards, core payments) instead of chaining with `{"prev":true}` where the card is a real cost.
3. **Seeded RNG + input record replay**: one seed per match, every human input logged, a "Copy replay" button; tests can replay a match.
4. **Scenario fixtures** in `tests/scenarios/*.json` (named after behaviour) loaded through `window.BS.testSetup`.
5. **Rule obligations**: turn `docs/rules-coverage.md` into `data/kb/rule-obligations.json` (manual section, text, status, test) and check it in tests.
6. **Trigger loop audit** against the four steps above (turn player first, derived triggers first, new watchers ignore older events).
7. **CPU as an evaluation policy** with weight profiles and a lethal check (replaces "CPU strength" on the roadmap).
8. **UX polish** from the list above, one piece per release.

## What we do not adopt now
Online multiplayer, accounts, lobby, tournaments, database and the TypeScript/React/Colyseus stack. Aeterna stays a single offline file played against the CPU. Moving to online play later would mean splitting rules from UI first; points 1-6 above already move the engine in that direction.

## Deck builder comparison (v0.53.0, 2026-10-16)
- aegis `apps/web/src/screens/DeckEditor.tsx` (read from the public repo, not the live site): `FilterRail` (cost, rarity, sort) | card pool with paged loading (`PAGE_SIZE`, "scroll for more") | `aside.deck-current` (name, count chips vs target, list, curve chart, format violations, import / export / play). Phone: the deck panel becomes a bottom sheet behind a "View deck · List, curves and ratios" trigger bar with the counts; pool cards have add / remove / open.
- Taken over: three columns, count vs target in the panel header, curve + ratios, violations listed in the panel, import/export in the panel, phone trigger bar + sheet. Different: Aeterna windows the grid (spacer rows) instead of paging, so the DOM stays small however far the player scrolls; tap = +1 with an (i) button for the detail.
- the official Connected Battler app's deck edit was not compared: it is a native app with no web build reachable from the session (no screenshots taken).
