# Aeterna architecture

How the pieces fit. Other docs link here instead of repeating it. Rules for agents live in `CLAUDE.md`; where each kind of file goes: skill `bs-doc-convention`; one-line index of every doc: `docs/README.md`.

## 1. Build: `src/` -> `index.html`
The shipped game is ONE offline HTML file. Never edit `index.html` or `build/`.

```
src/index.template.html   page shell with /*@@CSS@@*/ and /*@@JS@@*/ marker lines
src/styles.css            all CSS
src/js/NN-name.js         game script parts, joined in file-name order as ONE classic script
data/cards/all-cards.json built-in card pack, compressed and embedded between /*PACK_START*/ and /*PACK_END*/
        |
        v  node tools/build.mjs   (--check: CI guard that index.html is the build of src/)
index.html                + build/game.js (joined script for ESLint)
                          + docs/ai/code-map.md, docs/progress.html, docs/roadmap.html (regenerated)
```

Top-level functions stay global (inline handlers, `window.BS` and the tests rely on it). Part order matters: `01a-card-pack.js` (pack codec, shared with `tools/build.mjs`) loads before `03-imported-cards.js`. Find code with `docs/ai/code-map.md` (names per part) and `grep -n`.

| Parts | Role |
|---|---|
| `00-config.js` | steps, formats, ban list, seeded RNG, keyword glossary, small helpers |
| `01-cards.js`, `01a-card-pack.js`, `03-imported-cards.js` | `VERSION`, card database, pack codec, user-imported cards, tokens |
| `02a`-`02k` effects | effect engine (section 3) |
| `04-decks.js` | deck storage, validation, prebuilt decks |
| `05-state.js` | settings, audio, game state `G`, `newPlayer`, `newGame`, redraw |
| `06-rules.js` | rule helpers: cores, levels, BP, Brave, tokens, symbols, costs, summon, Magic, Standby |
| `07-turn.js`, `08-battle.js` | turn flow (`matchLoop`, `beginTurn`, `endStep`, `win`), battle, Flash timing, Bursts |
| `09-cpu.js`, `09a-cpu-eval.js` | CPU turn and evaluation policy (profiles, lethal check, attack/block scores) |
| `10-modals.js`, `11-human.js`, `12-zones.js` | promise-based modals, human actions, zone/log/rules views |
| `13-render.js`, `13a-deckbuilder.js`, `14-images.js` | board rendering (PC + phone layouts), lobby, deck builder, card images (IndexedDB) |
| `15-match.js`, `16-events.js` | match start/end, event delegation, replays, scenarios, test hooks `window.BS` |

## 2. Runtime
- **State:** one object `G` (players `G.p.player` / `G.p.opponent`, step, turn number, queues). Browser storage only for decks, imported cards, settings, history, images; the game makes no network calls and no `eval`. Imported card names and text are escaped in every `innerHTML` template; corrupt or blocked storage does not break start-up. Test-only stand-in cards (TST-*) live in `tests/fixtures/prototype_cards.js`, never in the shipped game (suite v24 asserts it).
- **Turn flow:** `matchLoop` -> `beginTurn` (Start, Core, Draw, Refresh steps; Standby released) -> human input or `cpuTurn` -> `endStep`. `win()` ends the match. Formats: Eternal and Standard step lists (`00-config.js`).
- **Randomness:** seeded RNG (`seedRng`, `rng`); every match keeps an input record, so `BS.runReplay(record)` reproduces it.
- **Rules source:** the official manuals; decisions and page references in `docs/manual-notes.md`, coverage in `docs/rules-coverage.md`, audit in `docs/reports/rules-audit.md`, per-mechanic records in `docs/mechanics/`.

## 3. Effect engine (data-driven)
A card's `effects` list holds entries of **trigger** (`FX_TRIGGERS`) + **actions** (`FX_ACTIONS`) + **conditions** (`fxIf`, the `if` field) + options (`lv`, `once`, `optional`, `zone`, `oc`, ...). `parseEffects` / `parseBurst` read card data; `fxDescribe` renders the text. Strict effects (v0.59.4): an unknown trigger, action, condition or STATIC flag name at run time goes through `fxUnknown` (`02a-effects-base.js`): it throws in automated runs (`navigator.webdriver` or `?strict=1`) and warns once + skips in the release build (tests S594).

Resolution (`02d-effects-resolve.js`):
1. An event calls `fireFx` / `fireFxMulti`; `collectFx` gathers every matching effect on the field (plus Hand, Trash or Mirage for the triggers that look there).
2. `resolvePool` keeps the still-valid ones (`fxValid`: zone, level, once per turn, conditions, `fxCan`). The turn player's effects go first; a human turn player picks the order.
3. `runActions` runs the actions. Inside it the game counts as "resolving" (`asResolving`): effects it triggers queue in `G.derivedQ` and resolve right after it (`flushDerived`), before the effects still pending.
4. After each effect, Bursts resolve (`flushBursts`, after all non-Burst triggered effects of that event).
5. Immunity: `fxImmune(owner, target, acting effect)` with STATIC flags (`UNAFFECTED`, `HAND_UNAFFECTED`, Armor family) filters targets (`02k-effects-immunity.js`).

Other engine parts: `pay:true` summons, Grandwalker Nexuses that level by Count, Burst/Mirage slots, Soul State, Void, Count, Contract Advent, Manifest, Revive, Standby (`p.standby`, `releaseStandby`), Removed Zone (`02e`), mill/discard (`02f`), can't attack/block (`02g`), Magic effect types (`02h`), keyword effects High Speed / Crush / Holy Life (`02i`), Accel / Silver Wheel (`02j`). Glossary of every trigger/action/condition with its rule note: `data/glossary/effects.json`; workflow for a new mechanic: skill `bs-effect-mechanic-adder`.

## 4. Card data pipeline
```
data/sources/fandom-cards-bs01-bs77.json   raw Fandom export (not in the light clone)
data/index/saga_card_index.json            Saga/image index (import input)
        |  python3 tools/import_fandom.py
        v
data/import/saga-NN.json                   staging: every card (loads in the game, not yet playable)
        |  promote: tools/promote_import.py, or the compiler (section 5)
        v
data/cards/saga-NN.json                    playable cards (the only card JSON edited by hand)
        |  python3 tools/build_cards.py
        v
data/cards/all-cards.json                  generated copy of the Saga files
        |  python3 tools/tag_effects.py -> data/glossary/card-tags.json, docs/reports/effect-coverage.md
        |  node tools/build.mjs
        v
pack embedded in index.html                (codec: src/js/01a-card-pack.js; size: node tools/pack_size.mjs)
```
Staging keeps every card; playable is the promoted subset, so the stages are not duplicates. Card data order of trust: the Fandom export in the repo, then the official list, then other sites, images last (`docs/ai/cards-and-rules.md`). Prebuilt decks: `data/decks/*.txt`. Rule obligations (page, status, proving test): `data/kb/rule-obligations.json`.

## 5. Effect compiler
`python3 tools/compile_effects.py [--saga N] --review docs/reports/compile-review.md --out build/compiled.json` turns staged card text into effect entries by pattern; cards with any unmatched unit are listed in the review file with the reason. `node tools/promote_compiled.mjs build/compiled.json` checks and promotes the compiled cards into `data/cards`. Progress: `python3 tools/unlock_report.py` -> `docs/reports/unlock-report.md` (`playable X / 8,041`); real unlocks of one lever: `python3 tools/lever_report.py` + a scratch recompile (tag counts are upper bounds).

## 6. Tests
| Layer | Where | Run |
|---|---|---|
| Node unit + engine tests | `tests/unit/*.test.mjs` (quiet board via `BS.testSetup()`) | `npm test`; quick subset `npm run -s loop` |
| Property tests | `tests/unit/props.test.mjs` | `npm run test:props` |
| Scenarios | `tests/scenarios/*.json`, loaded with `BS.loadScenario(spec)` | used by unit and Python tests |
| Python Playwright suites (UI flows, sims) | `tests/suites`, `tests/legacy` | `python3 tests/run_all.py --only <names>`; full run only on GitHub |
| Release file check | `tests/unit/release.test.mjs` | `RELEASE_FILE=... npm run -s test:release` |
| GitHub | `.github/workflows/ci.yml` (every push), `regression.yml` (dispatched once per session), `auto-mode.yml` | `docs/ai/release.md` |

Ratchet lists (`tests/unit/known-gaps.json`) only shrink. Hooks (`.githooks/`): pre-push runs build check, lint, quick tests, `tools/check_renames.py` and the brand guard; commit-msg runs the brand guard.

## 7. Session tooling
- `tools/session_start.sh`: overlap guard, hooks, baseline loop, version, Next line, playable count, open issues.
- `tools/session_gate.sh`: auto-mode switch and session lock (`check`, `lock`, `manual`, `switch`, `done`, `unlock`, `on`/`off`/`status`); rules in `docs/ai/next-session-prompt.md`.
- `tools/session_end_check.mjs`: game file, embedded version, release test, fresh mind map, backup branch.
- Mind map: `docs/roadmap-data.json` -> `node tools/gen_roadmap.mjs` -> `docs/roadmap.html`; `docs/progress.html` from the CLAUDE.md Roadmap, `docs/ai/roadmap-open.md` and README notes.
- Skills in `.claude/skills/` (session runner, effect mechanic adder, Playwright tester, card data check, card image reader, doc convention).

## 8. Brand layer
Until v1.0 the public name is the neutral codename. `tools/brand_guard.mjs` (loop, hooks) blocks original names in public text; `python3 tools/brand.py --neutral|--restore|--check` switches whole strings using the mapping kept in the owner's private vault (not in this repo). Card names, card data, mechanic terms and source URLs are never changed.

## 9. Planned
The monorepo move (TypeScript workspace, server/client, database, online play) is planned in `docs/ai/monorepo-plan.md`; until it lands, the single built HTML file stays the product.
