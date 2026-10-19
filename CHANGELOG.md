# Changelog

Release notes, newest first. Each version also has a GitHub Release with the game file attached (from v0.57.1 on; earlier versions are listed here only). Issue numbers up to v0.57.0 refer to the owner's private archive.

## v0.69.3
- **P0 process cleanup** (`docs/ai/process-plan.md` part B, owner 2026-10-19 18:37). No game change; every step is reversible (git history keeps the old text).
  - B1: the CLAUDE.md `**Done:**` line (6.3k characters, re-sent with every tool call) is now one pointer to `CHANGELOG.md`, the mind map and `docs/ai/roadmap-archive.md`; sessions update only the `**Next:**` line. CLAUDE.md 19.4k -> 13.2k characters.
  - B2: superseded and finished sections of `docs/ai/roadmap-open.md` ("Plan from the audit 2026-10-16", "Earlier plan 2026-10-15", CPU-tweak bundle, "Index by mechanic", "Items", finished card-priority bullets) moved to `docs/ai/roadmap-archive.md` (not read at session start): 38.0k -> 20.8k characters. `tools/gen_roadmap.mjs` reads Index / Items from the archive, `tools/rules_audit.py` scans it too (counts unchanged: 250 items, 91 confirmed, 47 house, 112 open; the committed report was stale at 242).
  - B3: `tools/session_start.sh` also prints the chain-stop state, `Mode hemat` and an open handoff (newest "Handoff" comment on issue #3 newer than the last release commit); the skill's separate context, chain-stop and hemat calls are gone (2-3 calls per session).
  - B6: `tools/mechanic_inventory.py` runs at the session end only when the session changed `data/glossary/mechanics.json` or `data/import`.
  - B7: `tools/session_end_check.mjs` checks the GitHub Release asset `aeterna-vX.Y.Z.html` itself (warning with the newest Release run when missing; `--no-release` skips it), replacing the separate `gh api` call.

## v0.69.2
- **K2: generated tests per compiled action** (`docs/ai/compiler-v2-plan.md` point 5; plan W in `docs/ai/roadmap-open.md`). No game change.
  - `tests/unit/lib/fx-props.mjs` builds one quiet board per action of every shipped card with complete effects, from the action JSON alone, with synthetic `FXP-` fixture cards (cost / BP / family chosen from the action), and checks the property its sentence promises: DESTROY at the BP / cost / core bound is destroyed and one step over is not (also exhaustedOnly, thenDraw, Nexus, lowest / highest cost); EXHAUST_OPP / HEAVY_EXHAUST_OPP exhaust exactly N; BOUNCE_OPP reaches the Hand or the deck bottom and respects its bound; BP_MINUS leaves BP and destroys at 0 BP only with zeroDestroy (Eternal FAQ p. 68); DRAW / DRAW_BOTTOM / MILL / Crush move the right cards; COUNTER max, Void to Reserve / Life / a Spirit, BP_PLUS self / attacker / own, REFRESH, REFRESH_SPIRIT (match), REVEAL_PICK (add the match, rest to the bottom or Trash), OPP_CORES_TO_RESERVE.
  - `tests/unit/fxprops692.test.mjs`: FX01 coverage (221 of 277 shipped actions, 80%; floor 75%, uncovered shapes printed), FX02 every board passes, FX03 mutation check (a wrong bound, count, destination or zeroDestroy flag fails its board). A one-off mutation sweep (each board run with N+1, bound+1 step, the other destination or rest) failed 202 of 202 mutated boards.
  - Promotion is now "read the card + generated test": a promoted card whose actions all have generators needs no hand-written action test (`docs/ai/release.md`).
  - Player-view pass (backup session): PC 1366x800 + phone 390x844, 40 of 40 checks, all 722 shipped cards open / parse / can-play check without errors, 10 of 10 CPU-vs-CPU matches finished, no console errors.

## v0.69.1
- **K1: pattern dictionary and pack plan** (owner, 2026-10-19: "pattern first, then card by card"; plan item W in `docs/ai/roadmap-open.md`). No game change.
  - `tools/wiki_rules.py`: caches the 302 Fandom keyword pages and 12 rules pages (Comprehensive Rules, Standard rule manual) in `build/` and writes `docs/reports/wiki-rules-index.md` (179 keyword pages used by staged cards, which ones carry a format / default-text section, mechanic status; rules pages with their sections). `--show` / `--section` / `--for` read a page or the rule source of a compiler blocker locally. The repo keeps links, section names and counts only.
  - `data/glossary/wiki-rules-map.json`: 31 compiler blockers mapped to their wiki rule sections (step timings, Burst, durations, connectives, Once per Turn, "by doing A", "remaining cards", targets, denial, keyword templates).
  - `tools/pack_plan.py` -> `docs/reports/pack-plan.md`: greedy order of the compile_v2 blockers by cards completed (first 10 steps ~800 cards, 60 steps ~2,080; upper bounds, since `blockers()` sees the first failing sentence per paragraph). By family: step timing heads 580, event trigger heads 374, sentence verbs 322, keyword templates 288, Burst 201.
  - `docs/mechanics/step-timings.md`: rule note for the first pack (paraphrased from the wiki and the Standard manual, measured forms of the 3,364 step heads, build decision: one window condition `if.step` for triggers, statics and activations).
  - Skill `bs-wiki-rules` (cache, pick the pack, rule source, note in our own words, real recompile); `docs/reports/compile-v2-report.md` regenerated (it still described the 8,040-card pool).
  - Roadmap: card sessions now build one pack per session from the pack plan; K2 generated tests per action next; U5 paused until the card rate rises.

## v0.69.0
- **Legacy (= Succession; Standard CR 12-2-1-3, Fandom "Legacy" + Q&A 31541-31543, 31620, 31866)** (card session): summoning or casting a card with Legacy, EX-symbol cards of the reduction colour in your Trash pay reduction symbols (one card per symbol, before the Field symbols); the paying cards go to the Banished zone.
  - Card data: text head "(Legacy)" -> `legacy: true` (compiler head, Spirit / Nexus / Magic; Brave is reviewed), the Fandom `ex_symbols` -> `exSymbols` through `parseCard` (the 60 shipped block A EX cards that had lost the field got it back from `fandom-cards-26r.json`). A card whose only text is the Legacy head counts as implemented.
  - Engine (`06-rules.js` `legacyPlan` / `legacyPay`, hooked into `effCost`, `summon`, `castMagic`, `highSpeedSummon`): automatic, with the fewest EX cards that give the lowest cost (a Field symbol that can pay a reduction symbol saves an EX card); none banished = Legacy not activated (`legacyN` 0); never with a fixed cost (`costAlt`). House reading: the rules let the player choose how many to banish; the engine always takes the cheapest result so the CPU and the human never need a prompt. Revert: `git revert` the Legacy commit.
  - Tests: `tests/unit/legacy69.test.mjs` (L69-01..10) and scenario `tests/scenarios/legacy-lione-macina-banish.json`; S62-04 accepts a Legacy-only text; rules KB gap `STD 12-2-1-3` (no chunk yet: the Standard manual text was not read).
  - **Measured unlock: +8 cards** (Regulinaz, Protomaia, Lione-Macina, The AzureGait Balpnir, The Dismemberer Buzzsawn, The MightyArm Anatoma, The SpellThunder Lucnas, Blaze Draw): 711 of 8,709. The sized upper bound "38" counted target sentences as compiling; the real recompile gave 8 (12 more cards wait only for "target an opposing" sentences, 8 only for the (During Attack) head).
- **"Reveal N cards from your decktop" in the compiler** (card session): the Standard wording "Reveal three cards from your decktop. Among them, add / summon/deploy <card>. Return / Discard any remaining cards." is read as one effect (three sentences joined in `tools/compile_v2.py`) and compiled to the existing `REVEAL_PICK` / `REVEAL_DEPLOY` actions (no card used them from the compiler before; they were hand-written).
  - Forms read: one card by `"Family"` (one or two families), kind (Spirit / Nexus / Magic), colour, `Cost N or less`, "a name different from this Spirit's"; rest to the Deck bottom or discarded; "summon/deploy" pays the cost, "without paying the cost" does not. Forms the engine match cannot say stay in review (keyword holder such as "with Amplify", two kinds, "every", "with no printed effects", "Discard a card among them", a second condition in the same sentence).
  - Engine: match key `costLe` (`fxMatch`, `hasMatch`) and the action flag `diffName` (the added / deployed card must have another name than the source). Tests `tests/unit/reveal69.test.mjs` (R69-01..08).
  - **Measured unlock: +11 cards** (Bearama, The Attuned Narloth, Kamen Rider Gaim Orange Arms, Kamen Rider Ryuki, Kamen Rider Ex-Aid Action Gamer Level 2, Haarier, The FlyingIron Akurai (also Legacy + True Release), The TransparentHood Olindias, Amaru, Deertora, Kamen Rider Zeztz Physicam Impact): 722 of 8,709. Every card was read against its JSON; the smoke check played all 11. The sized upper bound "53" counted target sentences as compiling; the real recompile found 11 new cards (15 of the 26 reveal-three texts wait on other sentences or forms).
  - Revert: `git revert` the reveal commit (the 11 cards go back to staging).

## v0.68.0
- **Invoke** (Standard activations; block A card session, team session main head; Standard Rule Manual "FAQ on Effects" Q11, Standard CR 12-2-1-4 / 12-2-1-5). "{{Invoke|Flash}}" / "{{Invoke|Main}}" + "<cost> ▶ <effect>": the cost is paid in full first or the effect is not used at all; Flash = every Flash Timing and also your Main Step, Main = your Main Step; printed heads narrow it and limits apply only when printed.
  - Card data: ACTIVATE `invoke: true` with `when` (yourAttack, oppAttack, eitherAttack, yourTurn, duringAttack, duringBlock, duringAttackBlock), `once` / `oncePer: "battle"` / `sameName`, and one `cost`: `pay` N, `exhaustSelf`, `destroySelf`, `exhaustOwn` {kind, match}, `discard` {match}. Engine module `packages/engine/src/02l-effects-invoke.js` (parse hook, timing and cost checks, cost payment with a pick for the human, "[Invoke]" log, cost text in the effect description); `G.battleNo` and `G.blocker` (`08-battle.js`) for (Once Per Battle), (During Block) and battle-length BP (`bpBattle` in `bpOf`).
  - New actions: `BP_TARGET` ("during this battle/turn, this Spirit gains +N BP"; "Target one of your [attacking] [Cost N or more] [family] Spirits. ... it gains +N BP"), `SYMBOL_TARGET` (extra symbol on one of your Spirits for the battle); new filters: DESTROY `exhaustedOnly`, BOUNCE_OPP `bpLe` / `attackingOnly`, BP_MINUS `zeroDestroy` ("Then, if it has 0 BP, destroy it": 0 BP alone does not destroy). Compiler v2: own-target sentences, "send a core, besides <Soul Core>, from it to the Reserve", "Target a <family> Spirit card in your Trash. Return it to the Hand.", attacking / exhausted / BP filters on opposing targets; `blockers()` now reads the Invoke and True Release heads.
  - CPU: uses an Invoke only when it helps (`cpuInvokeOK`): a battle BP boost only when it turns a lost or tied battle into a win, an extra symbol only when no opposing Spirit can block, "destroy this card" only to destroy or return an opposing card, keeps one core after paying, and does not exhaust a ready Spirit in its own Main Step.
  - Tests: `tests/unit/invoke68.test.mjs` (INV68-01..14) and scenario `tests/scenarios/invoke-griffar-discard-plus-bp.json` (Griffar discards a Windfang card while attacking: 5000 -> 8000 BP against a 7000 BP blocker, once per turn); C61-04 and S62-03 follow the new behaviour.
  - **Measured unlock: +19 cards** (Invoke: Griffar, Armalido, Leben-Leichnam; target and BP sentences: Bonrat, Gonpon, Kamen Rider Scissors, Spinoblurt, Carnoconqueror, Sclouse, Ogrul, Quill, Raniraya, Divaes, Wigil, Dream Rotor; Eternal by the same sentences: DarkDemo-Bone, Pegashione, The GunMachine Toradoll, Dark-Bison): 703 of 8,709 playable. Most Invoke cards wait on other heads: Legacy 19, the {{X Change}} template 13, Amplify 11, Current 6, other cost forms 6.
- **Review fixes (team agent A7, no blocking bug found):** "pay N costs" takes Reserve cores first and never the Invoke source's cores; the Once Per Turn/Battle mark is set only after the cost is paid; an Invoke entry without "once" is unlimited (limits only when printed); battle BP and Once Per Battle end when the Spirit leaves the Field; "during this battle" sentences outside a battle trigger stay in review; the CPU uses a "destroy this Spirit" Invoke that returns a stronger card from the Trash (Leben-Leichnam). Tests INV68-15/16. Open (no shipped card affected): human core choice for "pay N costs", the colour of an extra symbol, carrying battle BP through a Contract Advent.
- **Player-view pass** (`bs-playwright-tester`, team agent A6, on the v0.68.0 build): 19 new cards played (38 plays), human Invoke through the Flash Timing dialog and the Activate button on PC and phone (Griffar, Armalido, Leben-Leichnam), U4 Settings / How to play / Library on PC and phone in Dark and Light (every control, playmat upload and remove), 6 Standard block A CPU-vs-CPU sims, 2 click-driven games and 2 Watch games to Game Over: 0 errors, 0 invariant breaks. On v0.67.0 before the change: 95/95 deck cards and 535/535 other shipped cards played, 12/12 sims; the game-over overlap note does not reproduce (the board only shows through during the 0.2 s fade).
- **U4 Settings, How to play and Library** (UI/UX overhaul, team agent A1; mockup v11 + `docs/DESIGN.md` section 0):
  - Settings page restyled: header card, section menu (PC left column, phone chip row) and rows with a help line; Appearance holds Dark/Light, your colour (3x3 grid, same choice as the header picker) and the CPU colour line.
  - Playmat upload in Settings, Appearance: your picture fills the battle board (centre kept, edges trimmed), with a veil and see-through field rows so the board stays readable; stored on this device with the card images (IndexedDB key `~playmat`, shrunk to 1600 px), Remove takes it away.
  - How to play and Library pages in the new style (header card, document cards; How to play in two columns on PC). Every button, setting, id, `data-a` action and saved choice works as before; the colour and mode selects became button groups using the existing `theme-color` / `theme-mode` actions.
  - Code: `apps/web/src/13d-pages.js` (`setSection`, `renderSetPage`, `MAT`, `matUse`, `matSet`, `matClear`), markup in `src/index.template.html`, the "U4" block of `src/styles.css` (unused old page CSS removed; the stylesheet is ~89.4 KB of the 90 KB budget, test B04). Audit with skill `web-design-guidelines`. Tests: `tests/unit/ui68.test.mjs` (8, PC and phone).
- **Rules knowledge base, Q3 part 1** (team agent A5): `docs/rules/kb.json` lists 53 official rule sections (45 Eternal Rule Manual VER.17.0, 8 Standard Comprehensive Rules 1.0) with stable ids, pages, one-sentence paraphrases and SHA-256 fingerprints (no manual text in the repo); `tools/rules_kb.py` (`--query`, `--list-cited`, `--fetch`, `--check`, `--build`); schema in `docs/rules/README.md`; test `tests/unit/rules_kb.test.mjs` (K01-K06, offline). All 68 engine rule citations resolve (63 to sections, 5 known gaps); 7 stale engine comments fixed (Over Count p. 60, Braves FAQ Q1 p. 69, Contract setup pp. 11/54, immunity order FAQ Q4).
- **Mechanic inventory** (team agents A3/A4): all 122 "(unverified)" rows checked against the code and tests (`data/glossary/mechanics.json`, `docs/reports/mechanic-inventory.md`: 15 done, 23 partial, 126 missing); prep notes for Legacy, EX symbols, Magic and Brave cards; blue Nuadha deck data matches the Fandom export (16/18 exact, 2 known modelling differences).
- Revert: `git revert` of the Invoke commit d36e296 (no data migration: 19 cards moved from staging to `data/cards`); to undo U4, revert the merge of `lane/ui` (commit a96f305 inside it) or restore branch `backup/v0.67.0`; Q3 is tooling and docs only.

## v0.67.0
- **U3 Play setup page** (UI/UX overhaul, `docs/DESIGN.md` section 0 "Play = deck chip + mode cards + setup chips"; same tokens and shapes as the U2 Home, both modes, PC and phone). The page opens with a header card (eyebrow MATCH SETUP, title, one line, HOME), then a **deck chip** (deck slot select, legality line with a mark, EDIT DECK), the **mode cards** MATCH VS CPU and the new **WATCH CPU VS CPU**, and a **setup** panel: format toggle, CPU deck, **CPU style** chips (Balanced / Aggressive / Defensive) and **speed** chips (Normal / Fast / Instant). Style and speed are the same saved settings as on the Settings page. A mode card shows "deck not ready" while your deck is not legal (it still opens the explanation).
  - **Watch CPU vs CPU:** `startNewGame({ watch: true })` (`15-match.js`) lets the CPU play your deck too (`G.watch`, `G.p.player.cpu`, name "Your deck"), at the chosen speed: random first player, CPU redraw choice, no prompts, no match-history entry; the end dialog says MATCH OVER with "Watch again". Step buttons only say "Watching: the CPU plays both sides."
  - Code: `apps/web/src/13c-play.js` (`renderPlay`, `playSet`), markup in `src/index.template.html`, styles in the "v0.67.0 U3" block of `src/styles.css`. Every old id (`play-deck`, `play-cpu`, `format-btn`, `lobby-deck`) and `data-a` action is kept.
  - Audit with skill `web-design-guidelines`: labelled chip groups with `aria-pressed`, focus rings, `role="status"` on the deck line, tap highlight and reduced motion handled, no slanted text in the chips.
  - Tests: `tests/unit/ui67.test.mjs` (3 tests: page on PC 1366x768 and phone 390x844, chips save, a watched match runs to the end with no history entry); `play_ui`, `v17_tests`, `v18_tests` 148/148.
- **Player-view pass** (`bs-playwright-tester`, on v0.66.0 before the change): 95/95 deck cards played with 0 problems, 12/12 seeded CPU-vs-CPU sims, 4/4 click-driven UI games (2 PC, 2 phone) to Game Over, 0 console errors. Cosmetic note for U5: the last attacking card can be drawn above the fading game-over dialog.
- Revert: `git revert` of the v0.67.0 commit, or restore branch `backup/v0.66.0` (previous UI state); no data change.

## v0.66.0
- **True Release** (= Super Unleash; block A card session; Standard rule manual "True Release", CR 12-2-1-1, Fandom True Release Q&A 31532-31534). A card with the keyword can level up to LV2 either with its printed cores or with only the Soul Core on it ("True Release state"); the Soul Core level-up is a rule, not an effect, and enough normal cores still reach LV3.
  - Card data: `trueRelease: true` (Spirit / Nexus cards with an LV2; `parseCard` rejects anything else). Compiler v1 reads the `[LV2] (True Release)` head (also the export's stray `[LV2]' (True Release)` on 26RBS01-032), sets the field and keeps the LV2 effect; "(True Release)" outside an `[LV2]` head stays in review.
  - Engine: `lvIndex` (`06-rules.js`) treats a True Release card holding the Soul Core as at least LV2, so BP, level effects, the level diamond and the CPU's level reading follow without other changes.
  - **(During Attack)** heads (manual "Examples on Activation Timings": active as long as the Spirit is attacking): "This Spirit gains +N BP" -> STATIC `bp` with `attackingOnly`; Clash now also reads "(During Attack)" and "Opposing Spirits must block if possible" (Standard wording) -> `MUST_BLOCK`.
  - Tests: `tests/unit/truerelease66.test.mjs` (TR66-01..06) and scenario `tests/scenarios/true-release-soul-core-lv2.json` (Gen-Bor with only the Soul Core is LV2 5000 BP, 7000 while attacking).
  - **Measured unlock: +14 cards** (7 True Release, 7 by the (During Attack) / Clash sentences; most from the block A starter decks RSD01/02/03/06/10): 684 of 8,709 playable. The roadmap's "22 only-blocker" came from the first-blocker metric; a real recompile with only True Release stripped gives 1, with (During Attack) 6. The same re-measure gives Invoke 1 and Legacy 2 alone (`docs/ai/roadmap-open.md`).
- **Player-view pass** (`bs-playwright-tester`, on the new build): the 14 new cards summoned and attacked on PC 1366x768 and phone 390x844 (28/28, 0 console errors; a True Release Spirit with only the Soul Core shows LV2 in both layouts; Clash forced the block); 6/6 CPU-vs-CPU matches (3 Eternal, 3 Standard block A with 1-6 True Release cards per deck) ended normally with 0 errors and 0 invariant failures.
- Revert: `git revert` of the v0.66.0 commit; no data migration (14 cards moved from staging to `data/cards`).

## v0.65.0
- **U2 lobby navigation** (UI/UX overhaul, `docs/DESIGN.md` section 0, mockup v11 "Lobby PC" / "Lobby phone"). The menu screens get one header: on PC a top bar with the name, skewed tabs (Home, Play, Decks, Library, How to play), the colour diamond (opens the 3x3 colour picker with a Dark/Light switch), Dark/Light, match history, sound on/off and settings; on the phone a header (name, colour, Dark/Light, settings) and a bottom tab bar with our own icons (gate arch, core pentagon with play triangle, two fanned cards, card with a lens, core pentagon with "?"). The header is hidden on the battle screen and in the deck builder (its own layout until U6).
  - New Home: tags "CARD BATTLE VS CPU / OFFLINE", the motto "GATE OPEN, RELEASE!", the playable card count (training cards not counted), PLAY NOW and BUILD A DECK, the last deck line (name, format, cards, legal), three shortcut tiles (Match vs CPU, Deck builder, Card library) and a footer with the version, How to play, Settings & history and Rules coverage. Graphite ground with the 60-degree lattice, both modes.
  - Code: `apps/web/src/13b-nav.js` (`navSync`, `renderHome`, `themePop`, `navTools`), header markup in `src/index.template.html`, styles in the "v0.65.0 U2" block of `src/styles.css`. Every `data-a` action, test id and the Play / Settings / Library / How to play pages are kept (their restyle is U3+).
  - Audit with skill `web-design-guidelines`: accessible names on every header button, focus rings, 44px phone targets, focus moves into the colour picker, Escape and outside click close it, `translate="no"` on the name, `color-scheme` per mode.
  - Tests: `tests/unit/ui65.test.mjs` (25 tests, PC 1366x768 and phone 390x844).
- **Player-view pass** (`bs-playwright-tester`, on v0.64.0 before the change): quick tests 1129 passed, 48/48 seeded CPU-vs-CPU property checks, `play_ui` 20/20 (10 PC + 10 phone), one rendered CPU-vs-CPU match per layout with 0 console errors, fuzzer 10/10, all 685 shipped cards summoned or cast with 0 errors. After the change: `play_ui`, `v17_tests`, `v18_tests` 148/148.
- Revert: `git revert` of the v0.65.0 commit, or restore branch `backup/v0.64.0` (previous UI state); no data change.

## v0.64.0
- **Soul Magic** (block A card session; Standard CR 12-2-1-2, Fandom "Soul Magic" page and template, official Q&A 31159-31161). A Magic card with `[Soul Magic: <colour>]` can be used by paying its whole cost with just the Soul Core while you control a symbol of that colour. The Soul Core must be in the Reserve or on a Field card (not the Life or Trash); it may come from the only Spirit that shows the symbol, and it goes to the Trash like any paid core.
  - Card data: `soulMagic: "<colour>"` (Magic only; `parseCard` rejects other types and unknown colours). Compiler v1 turns the `{{Soul Magic|x}}` line (also the `{{Soul Magic|x||<printed text>}}` form) into that field; it also reads "You can't use this card during Main Step." as the existing `magic.noMain` flag.
  - Engine (`06-rules.js`): `soulMagicOK`, `soulMagicHolder` (Reserve first, then a card that keeps its level, then any Field card), `soulMagicPick`; `magicUsable` accepts a Soul-Magic-only payment; `castMagic` pays the Soul Core when chosen. The CPU uses Soul Magic when the normal cost cannot be paid or is 3 or more.
  - Player: the Cast button says "Soul Magic: pay the Soul Core" when that is the only way, or "Pay N or the Soul Core"; when both work, a dialog asks which payment to use.
  - Tests: `tests/unit/soulmagic64.test.mjs` (S64-01..08) and scenario `tests/scenarios/soul-magic-tentacle-attack.json`.
  - **Measured unlock: +1 card** (26RSD03-014 Tentacle Attack): 670 of 8,709 playable. The roadmap's "33 cards wait only for it" counted Magic cards by their first blocker only; the other 32 also need other sentences (23 effect sentences, 5 team / Main-Step lines, "target two" exactly 1, return three 1). Recorded in `docs/ai/roadmap-open.md`.
- **Player-view pass** (`bs-playwright-tester`, on v0.63.1 before the change): build ok, `tools/player_view.mjs` 95 cards over 6 decks + PC 1366x768 and phone 390x844 matches with 0 problems, 8 CPU-vs-CPU matches (4 Eternal, 4 Standard block A) ended normally with 0 console errors.
- Revert: `git revert` of the v0.64.0 commit; no data migration (one card moved from staging to `data/cards`).

## v0.63.1
- **Regression part 3 fixed:** on a 844x390 phone (landscape) the U1 header was 1 px wider than the screen (the skewed LOG / EXIT TO LOBBY buttons count as overflow), so the page scrolled sideways and test 29 of `tests/suites/v27_tests.py` failed. The header now clips sideways overflow (`overflow-x: clip` on `#view-playmat header.ae-head`); the buttons are not cut (they end 2.6 px inside the header). Suite 31/31.
- **P1 parallel lanes** (owner, 2026-10-18 21:39; tooling + docs only, no engine/CPU/effect code). Opt-in: "Lanjutkan roadmap ui" and "Lanjutkan roadmap card" can run at the same time, each on its own branch, then one merge + release; plain "Lanjutkan roadmap" works as before. Flow: `docs/ai/lanes/README.md`.
  - `tools/session_gate.sh`: optional lane on `lock`, `manual`, `unlock`, `busy` and `check opus <lane>`; a mark with a lane (`LOCK ui`, `MANUAL card`) blocks only that lane, a mark without a lane still blocks everything; new end mark `lanedone <lane> <branch>` (`LANEDONE`); `DONE vX.Y.Z` ends all marks. Staleness, the 24-hour cap and the no-progress count work over both lanes. Offline evaluator mode (`GATE_FIXTURE=1`, `COMMENTS`, `COMMITS`, `GATE_NOW`) for tests.
  - `tools/session_start.sh --lane ui|card`: overlap guard for that lane only, branch `lane/<lane>` from `main` or the unmerged remote lane branch with `main` merged in (the plan said "rebased"; merging needs no force-push, which is the safer choice).
  - `tools/lanes.mjs` + new pre-commit hook: on a `lane/*` branch, shared files (version, CHANGELOG, README, CLAUDE.md, build output, progress page, mind map, roadmap, code map, two generated reports), the other lane's files and the `VERSION` line are refused; `--unstage-shared` drops the generated files. The pre-push hook skips the build check on lane branches (the merge step rebuilds). No effect on `main`.
  - `tools/lane_merge.sh`: merges each lane branch with new commits into `main` (`--no-ff`; a conflict aborts and leaves `main` unchanged, exit 4), prints the open lane notes (`docs/ai/lanes/<lane>.md`), rebuilds.
  - Docs: CLAUDE.md "Session scope", `docs/ai/next-session-prompt.md`, skill `bs-session-runner` (step 7), `docs/ARCHITECTURE.md`, `docs/README.md`. Auto mode stays one session at a time: the scheduled prompt has no lane, and sessions never add schedules.
  - Tests: `tests/unit/gate_lanes.test.mjs` (G01-G08: old single-lane behaviour, lane blocking, LANEDONE/UNLOCK per lane, staleness, daily cap over both lanes, unknown lane, status, file ownership). Hook and merge step also tried end to end in scratch repos.
  - Backup of the previous state: branch `backup/v0.63.0`. Revert: `git revert` the P1 commit (lanes are opt-in, so sessions without `--lane` never use the new code).

## v0.63.0
- **U1 battle screen restyle** (UI/UX overhaul, owner design approval 2026-10-18 21:17: mockup v11 + `docs/DESIGN.md` section 0). Same v0.62.1 layout on PC and phone; only the style changes. No rules change.
  - Theme (`apps/web/src/00c-theme.js`): the player's side colour (Teal default, or Red, Purple, Green, White, Yellow, Blue, Silver, Gold) and Dark/Light mode, in Settings > Appearance, saved on the device (`aeterna.theme.v1`). The CPU is crimson, blue when the player picks red. Lobby picker comes with U2.
  - CrossOver-style tokens (`--ae-*`, `--you`, `--cpu` at the end of `src/styles.css`; old names alias them inside the battle screen): graphite board with a faint lattice, turn-banner header (AETERNA, version, PLAYER/OPPONENT TURN n, step name), skewed tags and buttons, cut-corner zone plates.
  - Step band: PLAYER TURN / OPPONENT TURN label; band, current step and NEXT (now a diamond) in the colour of the side whose turn it is; one-line narration strip with "…" (full text in the Log).
  - Clickable step buttons: a click on the step NEXT goes to works like NEXT; End from Main or Attack runs the remaining steps through NEXT (the Attack Step still runs, with no attack, so its start-of-step effects are kept); any other click shows an "Illegal move" strip in the CPU colour with the reason ("already in the Main Step", "the Draw Step has passed", "next legal step: Attack", "the CPU is playing its turn") and shakes the button.
  - Cores as pentagon crystal gems and the Soul Core as a silver frame with a red gem: on cards (instead of "C:n", count kept for screen readers), Life (one gem per Life), Reserve. Sleeve stacks on Deck, Trash and Banished; a set Burst is a face-down sleeve with a "BURST SET" ribbon in the owner's colour; Soul State shows the last card that entered as its cover with the count; level diamond on Spirits.
  - PC: no Tr/Cnt/Vd/Core prefixes, no "Your"/"CPU" in zone labels (the tag colour says whose; the CPU hand pill reads "HAND n"), Burst-Mirage and Soul State slots larger with the state inside the card shape. Phone: the CPU stat grid is the point mirror of yours (its Life bottom-right), the "Your field" / "CPU field" tags are hidden (kept for screen readers).
  - Regression part 3 fixed: tests C1/C2 (`tests/suites/v24_tests.py`) now count the Standard block A ids (`26RBS…`, `26RCB…`); the v0.62.0 run had failed only there.
  - Tests: new `tests/unit/ui63.test.mjs` (U01-U11: step clicks, illegal-move reasons, theme, plates, mirrored grid, gems, no page errors); L03/L04 expect "HAND n". Quick tests 1112/1112, props 48/48. Web Interface Guidelines pass on the changed files: hover states, `touch-action`, `translate="no"` on the name added; `color-scheme` per mode is left for U4/U8 (menus are still dark).
  - Backup of the previous state: branch `backup/v0.62.1`. Revert: `git revert` the v0.63.0 commit (the theme setting is then ignored).

## v0.62.1
- **UI/UX overhaul prepared** (owner, 2026-10-18: "like Aegis, with the card game's own touch"). No change to the game itself; this release only adds the plan and tools for the U sessions.
  - `docs/DESIGN.md`: design system for the overhaul. Taken from Aegis (studied live on PC 1280x800 and phone 375x812, tokens read from its CSS): token-driven shell, corner piles, centre band, fanned hand, one-line narration, toasts, decision overlays. Own touch: cores drawn as gems everywhere they count, the seven steps as a step rail, attribute-colour card frames, rims for "can act" / "your choice" / "threat", Flash and Burst colours. Dark "night arena" default, gold accent kept, system fonts only (offline file).
  - New skills: `redesign-existing-projects` (from Leonxlnx/taste-skill, MIT, with Aeterna notes on top: DESIGN.md wins, no network images or fonts) and `web-design-guidelines` (Vercel, MIT; rules kept as an offline snapshot in the skill). The taste skill's main `design-taste-frontend` was not taken: it says itself it is not for app screens.
  - Design System artifact "Aeterna Arena" and Design artifact "Aeterna battle screen" (directions A Arena Night = default, B Core Forge, C Clean Table, plus phone and block overlay of A) on claude.ai, for the owner to pick a direction.
  - Card frame (owner, same day): `docs/DESIGN.md` "Card frame" takes the layout grammar of the printed cards (cost disc with gold ring, reduction gems, type tab, name plate with pointed ends and family tab, level ladder LV1 blue / LV2 orange / LV3 yellow with BP, symbol gem), studied on four Fandom card images of both frame generations; drawn in our own shapes, no printed ornaments or art. Two skins: Arena (dark, block A look, default) and Classic (attribute-colour frame, light text box); field, hand and inspector sizes. Tokens `--ae-trim*`, `--ae-lv1..3`. Added after the v0.62.1 release commit, so the GitHub Release text does not list it.
  - Owner direction the same afternoon (`docs/DESIGN.md` section 0): the battle screen keeps its current layout and only gets a new style; the lobby copies Aegis's navigation (top nav on PC, bottom tab bar on the phone, header cards, Home shortcuts, Play setup page, Settings section menu; studied live on five Aegis pages); card frames use the Eternal edge by default (studied on a second Eternal card, BS72-002), the block A look stays as the "Arena" skin. New mockups on the "Restyle" page of the Design artifact; the A/B/C directions are superseded. Sessions now U1 shell style, U2 card frames, U3 lobby navigation, U4 Play page, U5 Settings/How to play/Library, U6 overlays, U7 deck builder, U8 audit.
  - Owner direction later the same afternoon (`docs/DESIGN.md` section 0): black and white for lobby and arena in the style of the card back (double silver borders, corner flourishes, rays, serif display names; our own drawings, not the printed back), motto "Gate Open, Release!", no card frame design (cards show their image). New mockups on the "Monochrome" page; sessions now U1 monochrome shell, U2 lobby navigation, U3 Play page, U4 Settings/How to play/Library, U5 overlays, U6 deck builder, U7 audit.
  - Owner direction at 17:04 (`docs/DESIGN.md` section 0): theme and design of the console game CrossOver (studied from two gameplay videos) on Aeterna's own layout: graphite board, teal for you and crimson for the CPU, skewed banners and tags, step/flash ribbons, diamond Life and NEXT, attack beam, prompts with skewed buttons; replaces the black-and-white colours (motto, no card frame and the current layout stay). Mockups on the "CrossOver style" page.
  - Owner at 17:24-17:27: the player picks the side colour (teal default, or red, purple, green, white, yellow, blue, silver, gold) and Dark/Light mode, in Settings and in the lobby top-right; the CPU turns blue when the player picks red. Interactive HTML preview "Aeterna Theme Preview" on claude.ai.
  - Owner at 17:40: battle mockups redone in the exact v0.62.1 layout (the earlier ones had simplified it); all seven step buttons become clickable with the current step glowing in the centre and an "Illegal move" warning for a wrong step, planned for U1.
  - Owner at 17:59: step band shows PLAYER TURN / OPPONENT TURN in the turn side's colour (phone centres the lit step); cores and the Soul Core drawn as gems wherever they are, Life as one gem per Life; per-deck sleeve, core colour and Soul Core colour set in the Deck builder (planned U1 + U6; preview updated).
  - Roadmap item U (`docs/ai/roadmap-open.md`): U1 tokens + app shell, U2 board PC, U3 board phone, U4 decision overlays, U5 deck builder, U6 lobby, U7 audit; alternating with card sessions, U1 next. CLAUDE.md: U sessions may change colours, layout and structure as DESIGN.md says.

## v0.62.0
- **Standard block A import** (owner priority 2026-10-18: newest cards first): 669 of 8,709 cards playable (+51; the card pool grows from 8,041 to 8,709).
  - `tools/fetch_fandom_std.py` reads the 15 block A set pages (26RSD01-10, 26RBS01-03, 26RCB01, 26RDB01) and their card pages through the wiki API with `curl`-style GET requests (50 titles per call, one at a time) into `data/sources/fandom-cards-26r.json`: 681 rows, same format as the BS01-BS77 export. EX symbols count as symbols (Standard Comprehensive Rules 2-10-3 and the Standard manual glossary) and are also kept as `ex_symbols` for the Legacy / Succession rule later.
  - `tools/import_fandom.py` stages them as `data/import/saga-50.json` (block "A"; 674 cards after merging repeated numbers and one Token row); the six 26RSD Soul Magic cards move there from the BS75 rows of Saga 16.
  - Compiled with v2 (`python3 tools/compile_v2.py --saga 50`) and promoted after reading every card against its JSON and the smoke check: 38 vanilla Spirits and 13 with effects (26RBS01-001, -011, -033, -052, -110, -X07, 26RBS02-049, 26RBS03-010, 26RSD02-002, -006, 26RSD03-013, 26RSD10-005, -007). Playable per colour in block A: red 10, purple 9, green 11, white 6, yellow 4, blue 11.
  - Measured levers for the 623 block A cards still in review: Soul Magic (33 cards wait only for it), True Release (= Super Unleash, in 185 texts), Invoke activations (108), Legacy (= Succession, 137). Next card sessions take them in that order (`docs/ai/roadmap-open.md`).
  - Player-view pass (minor release, subagent): deck builder PC and phone 51/51 block A cards found and added, smoke 51/51 played, 6 CPU-vs-CPU matches with only block A cards finished (seeds 101-606), 0 console errors.
  - Card total now comes from the unlock report (README build line, release notes); tests I01/I04/I13/I17, D09, B19, P09 and the gold-icon check know block A; new tests S62-01..04 (`tests/unit/std62.test.mjs`).
  - Revert: `git revert` the v0.62.0 commit (the 51 cards and the staging file go away; the Eternal data is unchanged).

## v0.61.0
- **Effect compiler v2 prototype** (owner plan 2026-10-18, `docs/ai/compiler-v2-plan.md`): 618 of 8,041 cards playable (+10).
  - `tools/compile_v2.py` (v1 untouched): every sentence is tried with v1 first, so cards v1 compiles come out identical (gate test C61-01 over the 459 playable records v1 recompiles and the staged pool); sentences v1 rejects go through a clause grammar: one selector noun phrase (owner, count incl. "up to", kind, Cost/BP bounds, exhausted, family, colour, LV, cores on it, lowest/highest cost, cost <= this Spirit, BP <= the attacker) shared by destroy, exhaust, heavy exhaust, return to Hand / deck bottom, remove, BP minus and send cores. "Target X. Destroy it." pairs (block A wording), `[LV1-2-3]` level heads and Rush reminder spellings are read too. Only existing engine actions; a filter an action lacks keeps the card in review with a "v2 <verb>: ..." reason.
  - Promoted (text read against the JSON, smoke-checked): BS22-066 Coral-Jaguar, BS23-012 The WolfKnight Loup-Gar, BS25-039 Calydon, BS26-024 Tank-Mobil-Leopard, BS27-024 The GoldenShellEmperor Rosenberg, BS34-011 Kemurineko, BS36-014 Purple Smoke Fish, BS36-030 Saber-Phoneus, BS48-090 Nix Spark, BS59-022 Swallowtail-Kiwi. Saga 17: 0 (Contract / Advent / Mirage heads first).
  - Measurement: `docs/reports/compile-v2-report.md` (first reasons, engine levers, cards whose only blocker is each reason). Of 7,423 review cards 2,906 have one blocker; the largest single blockers are heads and templates (step timings ~220, Burst variants ~170, Mirage 78, Rush forms 73), not action clauses. Next: block A import, then heads by these counts.
  - Player-view pass (minor release): `node tools/player_view.mjs`: 95 cards in 6 prebuilt decks played on a quiet board, PC and phone layouts render, 0 problems.
  - `tools/promote_compiled.mjs --v2` names compile_v2 in the card note. Tests C61-01..05 (`tests/unit/compile61.test.mjs`).
  - Revert: `git revert` the v0.61.0 commits (the ten cards go back to staging; the tool is new).

## v0.60.3
- **Card priority, data gaps and the compiler v2 plan** (owner, 2026-10-18; no gameplay change, staging data only):
  - Priority (owner: newest cards first): `tools/priority_report.py` -> `docs/reports/priority-report.md`: Standard block A (official format since April 2026; ~700 card numbers in 26R sets, only 6 in the data), then Eternal by Saga from 17 down, playable per colour against a target of 40 per colour, shared effect texts. `session_start.sh` prints its line.
  - Card pool facts: 17 exact duplicates and 18 shared texts (56 staged cards) in 8,041; version marks XV (24), LT (4), RV (303 numbers) are new cards with their own text, not reprints.
  - Data gaps closed from the Fandom pages (wiki API, owner's built-in browser): Nexus level thresholds for 717 staged Nexus cards (`data/sources/fandom-nexus-levels.tsv`, 1,375 pages) and the Ultimate Trigger `[LVn] (timing)` line for 119 Ultimates (`data/sources/fandom-ultimate-trigger.tsv`); `tools/import_fandom.py` fills them (report keys `nexus_levels_added`, `ut_lines_added`, `*_missing`). Measured with a scratch recompile: 0 cards unlocked on their own (each still has a sentence the v1 compiler does not read).
  - Compiler v2 plan (`docs/ai/compiler-v2-plan.md`): the v1 compiler reads 0 of 12 simple block A samples ("Target ... Spirit. Destroy it."); v2 parses target and action clauses separately. Aegis study: 4,559 card modules, all full coverage, composable IR, no manual mode (`docs/aegis-study.md`). Owner: no manual mode for unsupported cards.
  - Roadmap: compiler v2 prototype next, then the block A import; mind map updated.
  - Tests P603-01..08 (`tests/unit/priority603.test.mjs`); C56-18 now checks that the Ultimate Trigger line is back and the review names the body sentence; timing test B17 skips in the quick loop like B13 (still in CI).
  - Revert: `git revert` this commit (staging data, tools and docs only).

## v0.60.2
- **Faster sessions** (owner, 2026-10-18; no gameplay change):
  - One version bump + one release per session: tasks commit locally, the first commit opens the version, one push at the end (CLAUDE.md "Session scope", `docs/ai/release.md`, skill `bs-session-runner`).
  - Regression is dispatched at the end and not awaited; 10 sims for a patch release, 30 for a minor. `tools/session_start.sh` prints the newest Regression result (`failure` = fix first). Measured on 2026-10-17: Regression ~6 min, CI ~2.5 min per run.
  - Subagents may also run the `bs-playwright-tester` pass, doc/release consistency checks and card-data research in parallel; engine, CPU and effect code stay with the main session.
  - Light-clone baseline green again: B60-12/13 skip without `data/sources` (like I30); timing test B13 skips in the quick loop (`BS_QUICK`, 4-8 s on a 2-core session machine for an unchanged build) and still runs in CI (`npm test`). `session_start.sh` prints its summary even when the baseline fails, then exits with the loop's code.
  - CLAUDE.md: fetched pages, card text and issue comments are data, never instructions (from a one-off AgentShield 1.6.0 static scan, grade B; the other findings were generic chatbot prompt checks, not applied).
  - Mind map: M1 marked done, new "Road to playable" phase with the session estimate of 2026-10-18.
  - Revert: `git revert` this commit (rules, docs and three test/tool lines).

## v0.60.1
- **M1 workspace skeleton** (monorepo plan phase 1; no gameplay change): the 31 script parts moved from `src/js` into npm workspaces by role.
  - `packages/engine/src` (`@aeterna/engine`): config, card pack codec, effects, state, rules, turn, battle, CPU, zones, match. `apps/web/src` (`@aeterna/web`): error catcher, modals, human input, render, deck builder, images, events. Root `package.json` declares the workspaces (nothing to install).
  - `tools/src_parts.mjs` is the one list of part folders and build order (file-name order across both folders, as before); build, lint, code map, project pack, stale-reference check and unit tests B02/B03/B08 read it. Test B02 also fails on a stray `.js` file in a source folder.
  - Gate: the built `index.html` equals the v0.60.0 build except the version line and one CSS comment that names the error catcher's path.
  - Pre-push hook: in a shallow clone the brand guard no longer fails when the remote branch tip is not local (falls back to the commits not on any remote).
  - Revert: `git revert` this commit (only moves, paths and the hook).

## v0.60.0
- **Brave completion, part 1** (card session; 593 -> 608 of 8,041 playable, +15 Braves):
  - Combine data: the Fandom export drops the Brave condition and braved BP, so they were read from the 441 Fandom card pages (wiki API, owner's built-in browser) into `data/sources/fandom-brave-combine.tsv`; `tools/import_fandom.py` `brave_of()` gives 287 of 460 staged Braves their `brave` data (cost N or more, families, family & cost, no condition). Conditions the engine cannot check yet stay without data (report `brave_unparsed`: two-sided Left/Right, onto Ultimates, Grandwalker Nexus, symbol/keyword holders).
  - Compiler: `[When Braved]`, `When Braved`, `During Brave`, `During Spirit Brave` paragraphs (JP 合体時) compile to effects with `braved: true`; "(When Brave Attacks)" / "(When This Spirit Brave Attacks)" = (When Attacks) while combined. `brave` is kept through compiling.
  - Engine: a Spirit combined with a Brave now uses the Brave's braved effects (triggers, Flash activations, STATIC flags and BP) through `fxEntries()` (indexed from 200); a Brave alone in Spirit form and an unbraved Spirit do not. The parser keeps `braved` on STATIC effects.
  - Promoted: BS10-067, BS10-068, BS10-075, BS11-059, BS14-067, BS14-072, BS15-056, BS19-071, BS20-055, BS20-057, BS21-055, BS22-057, BS22-061, BS22-064, BS32-059 (each text read against its compiled JSON).
  - Measured first (lever report + scratch recompile): combine data alone +4, braved paragraphs +11; the next Brave levers are "summon a Brave card from your Hand" (~24 cards blocked) and two-sided Braves.
  - Tests B60-01..24 (`tests/unit/brave60.test.mjs`). Player-view check: `npm test` 1123/1123 (CPU-vs-CPU properties included).
  - Release checks: CI, Regression (Python parts 1-3 + legacy, 30 sims, fuzz 20) and the Release workflow green on the v0.60.0 commit. Backup `backup/v0.60.0` (5 releases since `backup/v0.59.4`).
  - Owner, 2026-10-17: the README link line and the screenshots (`docs/images/`) are removed until v1.0 (restore notes in `docs/ai/roadmap-open.md`); auto mode ON with a 20-minute idle delay (three hourly Opus tasks at :18, :38, :58).
  - Revert: `git revert` of the v0.60.0 commit.

## v0.59.8
- **Match fuzzer in Regression** (F1, owner approved; workflow only, no change to the game):
  - New job `fuzz` in the Regression workflow, next to the 5 Python parts: `node tools/fuzz.mjs --runs N --seed <run id mod 1e9>` (dispatch input `fuzz`, default 20; `0` skips it). Every run plays new seeds, so rare crashes, invariant breaks and endless matches turn up without spending session tokens.
  - A failure names mode + seed as annotations (sessions cannot read raw logs); the case JSON is uploaded as run artifact `fuzz-cases`, since workflows do not commit. The next session downloads it, commits it to `tests/fuzz-cases/` (test F596 replays it) and fixes it first.
  - Budget: first run (Regression run 39026263504) took 86 s for the fuzz job including the Playwright install, against 372 s for the slowest Python part (legacy), so the default of 20 stays.
  - Release checks for v0.59.7-v0.59.8: CI green on both commits, Regression green (Python parts 1-3 + legacy, 30 sims, fuzz 20), Release workflow green: releases v0.58.0-v0.59.8 now exist with their game files, v0.59.8 is "Latest". No backup due (4 releases since `backup/v0.59.4`).
  - Tests F598-01..03 (`tests/unit/fuzzci598.test.mjs`): job, input, run-id seed, failing exit, annotations, artifact.
  - Revert: `git revert` of the v0.59.8 commit.

## v0.59.7
- **Front page and releases** (C5, owner request; docs and tooling only, no change to the game):
  - `README.md` is now a short front page (about 60 lines, modelled on the Aegis repo page): pitch, download link, four screenshots (match on PC and phone, deck builder, lobby; `docs/images/`, made by `node tools/screens.mjs` from a seeded CPU-vs-CPU match), what it does, status, a small architecture diagram and the three dev commands. The lobby replaces the planned "card library" shot: the Library view only holds the import tools. The old Data / Development / glossary text moved to `docs/ARCHITECTURE.md`.
  - Release notes moved unchanged from the README to this file (`CHANGELOG.md`, newest first); the two `v0.14.0` sections are merged into one, so every version has one heading. `tools/gen_roadmap.mjs` (progress page), `tools/brand_guard.mjs` and `tools/pack_ai.mjs` read it; `node tools/build.mjs --check` fails when its newest heading is not the current version; the README "Current build" line now points to the latest release.
  - GitHub Releases: `.github/workflows/release.yml` runs after CI succeeds on `main` and calls `tools/make_releases.sh`, which creates every missing release from v0.57.1 on (oldest first, newest stays "Latest"): tag on the last `main` commit of that version, title from the first bullet of its notes, body = its notes + playable count, asset `aeterna-vX.Y.Z.html` (the committed `index.html`). The first run backfills v0.58.0-v0.59.6 (v0.57.0 already has its release). The body says "CI green" only for the commit CI just passed; Regression runs later in the session, so the release does not claim it. `DRY_RUN=1` prints the plan.
  - Tests C597-01..07 (`tests/unit/frontpage597.test.mjs`): README under 120 lines with no release notes, every local link/image exists, screenshots are small JPEGs, newest CHANGELOG heading = version, neutral sentences kept word for word, workflow shape, dry run of the release script.
  - Session runner, release guide, doc convention and CLAUDE.md now name `CHANGELOG.md`; the session end checks the release with one `gh api` call.
  - Revert: `git revert` of the v0.59.7 commit (the releases and tags it creates stay; delete them on GitHub if wanted).

## v0.59.6
- **Match fuzzer** (Q1 quality bundle, Aegis idea; no change to normal play):
  - CPU hook `FUZZ` / `fuzzPick` (`src/js/09a-cpu-eval.js`, `BS.setFuzz`): while on for a side, that CPU picks a uniformly random legal option or passes at its play, attack and block decisions, using the seeded game rng, so a fuzzed match replays exactly from seed + mode + fuzz setting. Off by default.
  - `node tools/fuzz.mjs [--runs 20] [--seed S] [--timeout 90000] [--modes ...]`: headless Playwright, 10 deck pairings in turn; any page/console error, error notice, invariant break or match not over in time is saved as `tests/fuzz-cases/<mode>-<seed>.json` (version, reason, replay record). First run: 40 of 40 matches healthy (master seed 20261017, all 10 pairings), so no case was saved.
  - Tests F596-01..04 (`tests/unit/fuzz596.test.mjs`, slow file: runs in CI `npm test`, kept out of the quick loop): seeded uniform picks, fuzzed match reproducible and different from the normal CPU, a 3-match live batch, replay of every saved case. `simMatch` takes `fuzz`.
  - Release checks: CI green (run 39022456850) and Regression green (run 39022456284, Python parts 1-3 + legacy, 30 CPU-vs-CPU sims) for v0.59.4-v0.59.6; player-view pass (`node tools/player_view.mjs`): 95 cards in 6 decks, 0 problems, PC and phone layouts render. No backup due (2 releases since `backup/v0.59.4`).
  - Revert: `git revert` of the v0.59.6 commit.

## v0.59.5
- **In-game error catcher** (Q1 quality bundle, Aegis idea; UI addition):
  - New part `src/js/00b-errors.js`: an uncaught error or unhandled promise rejection shows a small notice at the top of the screen ("Something went wrong (N errors). The game may be stuck.") with **Copy report** and **Close**. The report holds the version, browser, the last 10 errors (message + stack), the match turn/step and the input record of the running match (`replayOf(G)`: seed, decks, inputs), so a stuck game can be replayed. If the clipboard is blocked, the report text appears in a box to select by hand. The errors still reach the console and the test hooks (the events are not cancelled).
  - Checked on PC (1280x720) and phone (390x844) screenshots: the notice sits above the board and does not move it.
  - Tests E595-01..06 (`tests/unit/errors595.test.mjs`).
  - Backup of the previous state: `backup/v0.59.4`. Revert: `git revert` of the v0.59.5 commit.

## v0.59.4
- **Strict effects mode** (Q1 quality bundle, Aegis idea):
  - An unknown effect trigger (`collectFx`), action (`runActions`, `fxCan`), condition key (`fxIf`) or STATIC flag (`flagActive`) is no longer a silent no-op: `fxUnknown` throws in automated runs (Playwright tests, CPU-vs-CPU sims: `navigator.webdriver`; or `?strict=1`) and in the release build warns once per name in the console and skips it (condition not met, no effects collected, the action is skipped and the next one runs). The parser already rejected unknown names in card data; this catches names written in engine code and hand-made effect objects.
  - Tests S594-01..05 (`tests/unit/strict594.test.mjs`): strict throws for all four kinds, release skip + warn-once, every parser condition key known to `fxIf`, every built-in card effect uses known action/flag names. CPU-vs-CPU property tests 48/48 under strict mode.
  - Revert: `git revert` of the v0.59.4 commit.

## v0.59.3
- **Docs tidy** (repo cleanup C2, docs and generator paths only, no game change):
  - Generated reports moved to `docs/reports/` (`compile-review.md`, `unlock-report.md`, `rules-audit.md`, `effect-coverage.md`, `red-cards-check-table.html`); `tools/unlock_report.py`, `tools/lever_report.py`, `tools/rules_audit.py`, `tools/tag_effects.py`, the light-clone sparse pattern (`CLAUDE.md`, `tools/session_start.sh`), skills and guides point there. Old-path grep is empty outside the cleanup plan's findings and the history of the moved files.
  - New `docs/mechanics/` with one record per mechanic (source, rule, decision, engine names, tests, open points): Standby, Burst order, effect priority / unaffected, Contract Advent, Seal; the matching `docs/rules-coverage.md` rows link them. Further mechanics get a record when a session touches them (skill `bs-doc-convention`).
  - `docs/code-review.md` (v0.24.0 record) and `docs/card-sources.md` (2026-10-13 site check) folded into `docs/ARCHITECTURE.md` and `docs/ai/cards-and-rules.md`, then deleted (git history keeps them). `docs/saga-map.md` stays: the card-image skill uses it.
  - Generators rerun with unchanged results: rules audit 242 items (84 confirmed, 47 house, 0 conflict, 111 open); playable 593 / 8,041.
  - Brand note: the brand mapping's exclude `docs/compile-review.md` becomes `docs/reports/*` (Project copy updated; the archived vault copy is read-only, so the v1.0 restore must use the Project copy).
  - Release checks: CI green (run 39018677530) and Regression green (run 39018681671, Python parts 1-3 + legacy, 30 CPU-vs-CPU sims) for v0.59.2 + v0.59.3. Backup branch `backup/v0.59.3` (5 releases since backup/v0.57.0).
  - Revert: `git revert` of the v0.59.3 commit.

## v0.59.2
- **Architecture and doc layout** (repo cleanup C1, docs only, no game change): `docs/ARCHITECTURE.md` explains build, runtime, effect engine and resolution order, card data pipeline, compiler, tests, session tooling and the brand layer; `docs/README.md` lists every doc as hand-written or generated (with its tool); new skill `bs-doc-convention` says where each kind of file goes. The CLAUDE.md "Architecture" paragraph is now one line linking `docs/ARCHITECTURE.md`.
  - Revert: `git revert` of the v0.59.2 commit.

## v0.59.1
- **Starting-Hand redraw with a Contract card** (owner report 2026-10-17, patch): the rules were re-checked and the engine was already right, so the redraw dialog now explains it.
  - Rules: JP Eternal Rule Manual Ver.17.1 (web, game setup steps 2, 5, 7) and the EN Eternal manual VER.17.0 (p. 11 steps 5-7, p. 54) agree: with a Contract card you draw 3 and add it (4 cards); a redraw returns the whole Hand, the Contract card too, shuffles and draws 4; a Contract card cannot be added again on a redraw. Recorded in `docs/manual-notes.md`.
  - Redraw dialog: when the starting Hand holds a Contract card, a note says the redraw sends it back to the Deck and it cannot be added again. Rules summary in the lobby updated the same way.
  - CPU: never redraws a starting Hand that holds its Contract card (before, an all-cost-4+ hand was redrawn and the Contract card was lost for the game).
  - Code: `redrawHand` and `cpuWantsRedraw` moved to `src/js/05-state.js` (exposed on `window.BS`). Tests E21d (hand size 4 with and without a Contract card, redraw keeps 4 and the Deck total) and E21e (CPU redraw rule). Dialog checked on PC and phone (4 cards, note shown, no console errors).
  - Release checks: CI green (run 39014923537) and Regression green (run 39014936454, Python parts 1-3 + legacy, 30 CPU-vs-CPU sims). No backup due (3 releases since backup/v0.57.0).
  - Revert: `git revert` of the v0.59.1 commit.

## v0.59.0
- **Ultimates as targets: measured, then step-prefixed attack triggers** (heavy item, Opus): +4 cards (593 / 8,041 playable).
  - Sizing (scratch recompile, `tools/lever_report.py`): reading every "Spirit/Ultimate" as "Spirit" in the 2,015 staged non-Ultimate cards that mention Ultimates unlocks **0** cards on its own (opposing "Spirit/Ultimate" targets already compile since v0.54.0; each of these cards has another blocker). The ~738-824 in `docs/reports/unlock-report.md` are tag upper bounds. Of the 253 staged Ultimates, adding the missing `[LVn] (When Attacks)` line to the 110 Ultimate Trigger cards makes only 1 compile (their bodies need other sentences), so that data work is low yield. Recorded in `docs/ai/roadmap-open.md`.
  - New engine trigger `OPP_ATTACKS` ("when an opposing Spirit attacks"): fired for the defending player in the same pool as the attacker's `ATTACKS` / `ALLY_ATTACKS` (`src/js/08-battle.js`). New match key `noUlt` (`fxMatch`): the text says "Spirit", so an attacking Ultimate does not trigger these.
  - Compiler: "(Your Attack Step) When your "X" family Spirit attacks, ..." -> `ALLY_ATTACKS` + `match { family, noUlt }`; "(Opposing Attack Step) When an opposing Spirit attacks, ..." -> `OPP_ATTACKS`; "that Spirit gains +N BP" after an ally attack trigger -> `BP_PLUS` to the attacker.
  - Promoted (every text/JSON pair read): BS11-031 The Valkyrie-Mist, BS18-021 The SteedGeneral Muqali, BS21-016 Death-Hydra, BS21-032 The HoundMachine Asterio-Venera 9.
  - Test I17 (staged image ratio) now also takes an absolute bound: promoting cards with images lowered the staged ratio to 93.99 % although no image was lost.
  - Tests C59-01 to C59-10 (`tests/unit/compile59.test.mjs`, C59-09 on the real-card scenario `valkyrie-mist-opposing-attack-exhausts`). Player-view pass before this minor release (`node tools/player_view.mjs`): 95 cards in 6 decks, 0 problems, PC and phone layouts render; property tests 48/48.
  - Release checks: CI green (run 39011907411) and Regression green (run 39011914324, Python parts 1-3 + legacy, 30 CPU-vs-CPU sims). No backup due (2 releases since backup/v0.57.0).
  - Revert: `git revert` of the v0.59.0 commit (engine `OPP_ATTACKS` / `noUlt` in `src/js/02a-effects-base.js`, `02c-effects-parse.js`, `02d-effects-resolve.js`, `08-battle.js`; compiler step triggers in `tools/compile_effects.py`; the 4 promoted cards).

## v0.58.0
- **Effect priority and "unaffected"** (rules audit R3 item 2, JP 17.0 revision notice item 9, with session E; heavy, Opus): +16 cards (589 / 8,041 playable).
  - New STATIC flag `UNAFFECTED` (`to` self or own + `match`, `from: { colors, types }`): the card is unaffected by OPPOSING effects whose source card has one of those colours and card types. `fxImmune(owner, target, acting effect)` checks it; every effect action that lists targets skips such opposing cards (`src/js/02k-effects-immunity.js`), and so do the older Magic targets, "every opposing Spirit's symbol is zero" (also for Spirits that arrive later) and must-block.
  - Compiler: Armor (`{{Armor|..}}`, "Armor : X - ...": Spirit/Nexus/Magic effects), Heavy Armor (`{{ha|..}}`: Spirit/Brave/Nexus/Magic), Ultra Armor (`{{ua|..}}`: Spirit/Ultimate/Nexus/Magic), `{{uha|..}}`, "This Spirit is unaffected by opposing [colour] [types] effects", "All your "X" family Spirits are unaffected by ...", "Your Hand is unaffected by opposing effects" (STATIC `HAND_UNAFFECTED`), "this card in Hand/Trash is unaffected" (card flags `handUnaffected` / `trashUnaffected`). Heavy/Ultra Armor also keep Bursts of those colours off the card (Eternal manual p. 48) through the same filter.
  - Priority: "cannot" beats "must" (a Spirit that can't block is never forced by a must-block attacker; a Spirit unaffected by the attacker is not bound either); "cannot be prevented" (action `ignoreImmune`) beats "unaffected" (FAQ Q3). "Do" and "can" need no order in the engine. Not built: "effects can't activate" (no card needs it yet), conditional forms (while exhausted, During Seal, While ... in your Trash), granted Armor ("give ... Armor", When Braved / During OC prefixes).
  - Promoted (every text/JSON pair read): BS02-040, BS02-044, BS02-045, BS03-037, BS03-043, BS03-044, BS04-034, BS05-028, BS06-037, BS07-028, BS10-032, BS14-035, BS17-035, BS20-035, BS22-033, BS29-023. Most Armor/unaffected cards are still blocked by other mechanics (Burst, Brave data, Advent, Contract, Mirage), so the real unlock is 16, not the ~139 the tag count suggested.
  - Rules audit: the effect-priority conflicts are confirmed (84 confirmed, 0 conflicts).
  - Tests A58-01 to A58-14 (`tests/unit/armor58.test.mjs`, A58-14 on the real-card scenario `heavy-armor-red-purple-unaffected`). Player-view pass before this minor release (`node tools/player_view.mjs`): 95 cards in 6 decks, 0 problems, PC and phone layouts start without errors; property tests 48/48.
  - Release checks: CI green (run 39007869443) and Regression green (run 39007874969, Python parts 1-3 + legacy, 30 CPU-vs-CPU sims). No backup due (1 release since backup/v0.57.0).
  - Revert: `git revert` of the v0.58.0 commit (engine: `fxImmune` / `unaffectedBy` in `src/js/02a-effects-base.js`, `src/js/02k-effects-immunity.js`, `handSafe` / `handLocked` in `src/js/02e-effects-removed.js`, must-block in `src/js/08-battle.js`; compiler `unaffected_para` / `flag_para`; the 16 promoted cards).

## v0.57.0
- **Standby state** (rules audit R3, JP 17.0 revision notice item 4; heavy, Opus; engine rule fix, no new cards): a Spirit or Ultimate that is destroyed or depleted now waits in Standby (`p.standby`) while its leave triggers resolve, then goes to the Trash.
  - While it waits: its (When Destroyed) effect resolves (with the level it had just before), its cores and Soul Core are already in the Reserve, it is not in the Trash and not on the Field, and its symbols still reduce costs (normal and Accel costs; "while you have a red symbol" does not see it).
  - It leaves Standby right after the last queued effect that names it ((When Destroyed), "when an ally is lost"); declared Bursts resolve after that, so they see it in the Trash. A card with no leave trigger goes to its destination at once (same result under the rule); a combined Brave goes to the Trash at once; a Contract card destroyed by the opponent still enters Soul State. A new turn or the end of the game empties Standby.
  - Effects may still move a waiting card ("banish one destroyed by this effect", summon it, put it in Soul State). Open: When Banished / leaves-the-Field triggers (none in the engine yet).
  - Rules audit: the Standby and T_DESTROYED conflicts are now confirmed (81 confirmed, 2 conflicts left: effect priority).
  - Tests S557-01 to S557-20 (`tests/unit/standby557.test.mjs`, two on the real-card scenario `burst-after-when-destroyed`). Player-view check: CPU-vs-CPU property matches (`npm run test:props`) 48/48.
  - Release checks: GitHub Actions did not start any job on 21b80b4 ("recent account payments have failed or your spending limit needs to be increased", GitHub Billing), so the gate ran locally on the same commit: `npm test` 1062/1062, Python regression parts 1-3 and legacy 1309/1309 checks, 10 CPU-vs-CPU sims 10/10 (no invariant or page errors). No backup due (2 releases since backup/v0.55.2).
  - Revert: `git revert` of the v0.57.0 commit (`releaseStandby` / `leaveStandby` in `src/js/06-rules.js`, calls in `src/js/07-turn.js` and `src/js/08-battle.js`).

## v0.56.0
- **Ultimate cards in the effect compiler** (heavy, Opus; plan step 4): engine and compiler pieces; **no card promoted** (measured: every staged Ultimate still has another blocker, see below).
  - Summon conditions: `{{Sumcon|...}}` and the old `[Summon Condition: ...]` map to `summonIf`; new keys `lifeGe` and `ctrl` ("you control N or more <colour>/<Cost N or higher>/<family> Spirits/Ultimates", several entries = all must hold). 206 of the 253 staged Ultimates now parse (27 stay staged, 20 have no summon condition block: Contract Advent and similar); Nexus, Burst, Mirage, named-card and "no Spirits in your Trash" conditions stay staged.
  - Ultimate levels: `[LV3]+` is checked against the level offset (lvBase 3); "this Ultimate" acts on the card itself; the summon condition shows as readable text.
  - **Ultimate Trigger**: action `ULT_TRIGGER` (sends the opposing decktop card to the Trash; a hit when its cost is lower than this card's: Eternal Rule Manual sec.15 note in the glossary, Fandom card reminder on Ultimate-Sea-Serpendar) and condition `utHit` for the "When Ultimate Trigger hits" actions. The compiler takes the inline form `Ultimate Trigger [LVn] (When Attacks) When Ultimate Trigger hits, ...`.
  - Data gap found: the Fandom export drops the `[LVn] (timing)` line of 110 Ultimate Trigger cards (Fandom page of Ultimate-Cu-Sith: "Ultimate Trigger [LV4] (When Attacks)", export: "Ultimate Trigger"). Live Fandom pages need an approval prompt, so this auto run could not read them: next step for a session with the owner present (recorded in `docs/ai/roadmap-open.md`).
  - Tests C56-01 to C56-22 (`tests/unit/compile56.test.mjs`).
  - Release checks: CI and GitHub Regression (Python parts 1-3, legacy, 30 sims) green on 1c81452. No backup due (1 release since backup/v0.55.2).
  - Revert: `git revert` of the v0.56.0 commit (`ctrlCount` in `src/js/02a-effects-base.js`, `ULT_TRIGGER` in `src/js/02i-effects-keywords.js`, `sumcon`/`ultimate_text` in `tools/compile_effects.py`).

## v0.55.2
- **Burst resolution order** (rules audit R3 item 1, JP 17.0 revision notice item 6; patch, engine fix): a declared Burst now resolves after every non-Burst triggered effect of the same event.
  - "After your Spirit is destroyed" Bursts wait for the (When Destroyed) and "ally lost" effects; "after the opposing Hand increases" Bursts wait for the (When the opposing Hand increases) effects.
  - Several Bursts: the non-turn player's resolve first, each player's in declaration order. House reading: the Burst condition is checked when it resolves.
  - Scenarios can now set a Burst card (`"burst": "<id>"`); new scenario `burst-after-when-destroyed` (BS11-009 blocks The Witch Naja, Burst BS71-083); tests B552-01 to B552-04.
  - Release checks: CI and GitHub Regression (Python parts 1-3, legacy, 30 sims) green on 3f8df05 (the first run caught the scenario naming test-only cards; fixed). Backup `backup/v0.55.2` (5 releases since backup/v0.52.1).
  - Revert: `git revert` of the v0.55.2 commits (`flushBursts()` in `src/js/08-battle.js`).

## v0.55.1
- **Rules audit R1-R2** (owner request; patch, no engine change): every rule the engine applies is listed with its source and a verdict.
  - **Sources and versions** (table at the top of `docs/manual-notes.md`): Japanese Eternal Rule Manual Ver.17.1 (2026-05-29, change list not readable in this run), English PDF VER.17.0, Japanese 17.0 revision notice (2026-04-03, effective 2026-04-11; its 9 changes are listed with the engine area each touches), Ruling Changes pages (no 2025-2026 entries), Standard Rule Manual 1.1 (2026-10-02) and Comprehensive Rules 1.0 (2026-04-01).
  - **New `tools/rules_audit.py` -> `docs/reports/rules-audit.md`:** 242 items (coverage rows, glossary rule notes, house-reading lines): **77 confirmed, 48 house reading, 5 conflict, 112 open** (no source cited yet). Hand-set verdicts in `docs/rules-audit-verdicts.json`; test D14.
  - **Conflicts found (R3, own releases):** a declared Burst must resolve after all non-Burst triggered effects (the engine runs the "ally destroyed" and "opposing Hand increased" Bursts first); Standby state when a card leaves the Field (the engine puts it in the Trash before its (When Destroyed) effects); effect priority "cannot" > "must" > "do" = "can".
  - **Settled:** "mandatory Soul Core use" (17.0) means every game includes the Soul Core (already built), not that it must be spent; the Flag Nexus / F Contract Advent rule text is in the 17.0 notice (unblocks that item; Nexus levels still missing).
  - `tools/session_start.sh` prints the audit line and warns when the check is older than 30 days (R4).
  - Release checks: CI and GitHub Regression (Python parts 1-3, legacy, 30 sims) green on 98aa809. No backup due (4 releases since backup/v0.52.1).
  - Revert: `git revert` of the v0.55.1 commit (docs and tools only).

## v0.55.0
- **Engine levers + compiler patterns** (audit plan step 3b): **12 more cards playable, 573 / 8,041**. Measured first with a scratch recompile (handle one lever, recompile every staged card): Rush 5, (When Destroyed by the Opponent) 4, (When Battles) 3, BP minus 2, all four 15 (12 after the stricter checks below). The tail stays long: no single text unit blocks many cards on its own.
  - **BP minus:** new action `BP_MINUS {n}` ("during this turn, give an opposing Spirit/Ultimate -N BP", 1000-30000). It lasts until the end of the turn; BP shows 0, never negative (Standard CR 1-4-6). **No BP-0 destruction rule:** the Eternal manual FAQ (p. 68, "BP+ and BP- effects") shows a 0 BP Spirit stays unless its card says "Then, if its BP is 0, destroy it", so the roadmap item "BP-0 destruction" is dropped. Open: "every / two opposing Spirits" (also hits Spirits summoned later that turn, FAQ Q3) and the "then destroy at 0" clause.
  - **(When Destroyed by the Opponent):** `DESTROYED` with `if: {byOpp: true}` = destroyed by an opposing effect or by BP comparison with an opposing Spirit (Standard CR 12-2-1-12-1). "(When Depleted/Destroyed by the Opponent)" stays staged (depletion is not destruction, Eternal manual p. 28).
  - **(When Battles) "when only the opposing Spirit is destroyed by comparing BP":** new trigger `BATTLE_WIN` for the attacker or blocker that alone wins the BP comparison (not on a tie, not when unblocked; Standard CR 8-1-6-2). Other (When Battles) texts stay staged.
  - **Rush** `{{Rush|Colour}}`: the Rush effect runs after the main body only while you have a Field symbol of that colour (per-action condition `hasSymbol`; Soul State does not count). House reading: neither manual has a Rush section. A Rush block after a blank line, optional Rush effects and Rush on Magic cards stay staged.
  - Promoted (each card read once, text vs JSON; promotion smoke check 12 / 12): BS01-047, BS04-032, BS05-023 (When Battles); BS19-049, BS19-109 (BP minus); BS20-012, BS20-031, BS20-053, BS23-001, BS27-004 (Rush); BS40-012, BS46-016 (When Destroyed by the Opponent).
  - Glossary: new partial tags `A_BP_MINUS`, `T_BATTLE_WIN`, `K_RUSH`, `T_DESTROYED_OPP` with rule notes; unlock report refreshed (their tag-based "only blocker" counts, e.g. Rush 103, are upper bounds; real compiles are far fewer).
  - Tests: new `compile55.test.mjs` C55-01..21 and scenario `tests/scenarios/battle-win-only-opposing-destroyed.json`; C54-01 now checks the Depleted/Destroyed form. Player-view pass (`tools/player_view.mjs`): 95 cards in 6 decks, 0 problems, PC and phone layouts render.
  - Release checks: CI + Regression (30 sims) green on 9f69994 (runs 38924058456, 38924057024).
  - Revert: `git revert` this commit (engine, compiler, cards, glossary and tests together).

## v0.54.0
- **Compiler patterns + batch promotion** (audit plan step 3): **62 more cards playable, 561 / 8,041**. New patterns in `tools/compile_effects.py`, all on existing engine actions (no engine change):
  - `(When Destroyed)` and `(When Summoned/Destroyed)` -> trigger `DESTROYED` (17 cards); effects about "this Spirit" (refresh, cores, BP, return to Hand) stay staged because the Spirit has left the Field.
  - "Spirit/Ultimate" in opposing targets reads as the engine's opposing targets (they already include Ultimates).
  - `(Your Attack Step)` static BP for this Spirit or all your (family) Spirits (`if: {attackStep, oppTurn: false}`); "This Spirit's color and symbol are also treated as X" -> `colors` (only when it applies on every level).
  - Sentences: refresh a (family) Spirit you control, send a core from an opposing Spirit to the Reserve, draw then discard (LOOT), draw from the deckbottom, Void core to Life or to any Spirit, destroy an opposing Spirit with N cores or less, discard N (max 5) from the opposing decktop.
  - **Burst block** `{{Burst|condition}}` for the four engine conditions (Life reduced, Spirit destroyed by the opponent, opposing When Summoned, opposing Hand increase) with "summon this card" / "then, by paying the cost, activate this card's Flash/Main effect"; no card passes yet (the Burst cards fail on other text), it is groundwork for the next batches. Magic family line also accepts "has the "X" family".
  - Finding: the cards left are a long tail. A greedy cover over all missing patterns gives about 2 cards per new pattern; "ready 1,912" in the unlock report is an upper bound far above what plain patterns unlock. Bigger levers need engine work: BP minus with BP-0 destruction (17 sentences), `(When Battles)` (49), `(When Destroyed by the Opponent)` (69), Rush/Chain `{{Rush|Colour}}` (203 cards, needs a "you have a X symbol" condition), more Burst conditions (depleted/destroyed, opposing attacks).
  - Staging re-imported (`tools/import_fandom.py`: 7,480 staged, 558 skipped as curated), tags refreshed. Two compiled cards (BS10-060, BS34-057: decktop discard of 12 / 15) were refused by the game check and now stay staged with a clear reason.
  - Tests: new `compile54.test.mjs` C54-01..05 (patterns, review cases, Burst block, in-game DESTROYED draw, Attack Step static, second colour). Every promoted card passed the promotion smoke check (parseCard, played on a quiet board, triggers fired, no console error); the UI player-view pass (skill `bs-playwright-tester`) was not run this session.
  - Release checks: CI + Regression green on 7f70aa9 (runs 38914744389, 38914741744).
  - Revert: `git revert` this commit (data/cards, data/import, glossary tags and the compiler change together).

## v0.53.0
- **Deck builder redesign for PC and phone** (owner request 2026-10-16; plan `docs/ai/deckbuilder-plan.md`, step 2). Same colours and card faces; every old function kept (format, slots, name, ready-made, default, clear, "in deck only", colour/cost/type filters, card detail with add/remove).
  - **PC (900 px and wider), three columns:** filter rail (colour, cost 0-9/10+ and type chips, all multi-select; set, family search, "legal in format", "in deck only", sort: default / set number / cost / name / colour; reset), the windowed card grid, and a deck panel: `40 / 40+` counter with the legality line, rows grouped by type with `−` count `+`, cost curve, colour and type split, Undo, Import text, Export text.
  - **Phone (narrower than 900 px):** title + deck counter + Menu (format, slot, name, ready-made, default, clear, back); search always visible; filters in a bottom sheet behind "Filters (n)"; three-column grid; deck bar `Deck 40/40 · legal ▲` opens the deck panel as a full-height sheet. Touch targets 44 px; no horizontal scroll at 360 px.
  - **Changed behaviour:** tap/click a card = add one copy (badge pulse); the (i) button on the card or a right-click opens the detail; a card that cannot be added (4th copy, not legal) opens the detail, which says why. Search also matches effect text. Keyboard: `/` focuses search, Esc clears it or closes a sheet.
  - Compared with aegis's deck editor (notes in `docs/aegis-study.md`); the official Connected Battler app was not compared (native app, not reachable from the session).
  - Code: new `src/js/13a-deckbuilder.js` (deck builder moved out of `13-render.js`). Tests: new `deckbuilder53.test.mjs` D01-D11 (both layouts: tap add, row remove, undo, 4th copy refused, (i) / right-click detail, multi-select chips + filter count + reset, set / family / legal / type filters, sorts, deck panel groups + curve, import / export, sheets, 44 px targets, no horizontal scroll, Library header untouched, keyboard); U04-U08, N08, N09 and B19 updated for chips, menu and sheets.
  - Release checks: Regression green (run 38907535192, 10 sims; UI only, no engine change) after the Python UI suites were updated (`v17`, legacy `deep`, `fmt`, `hid`, `imp`: (i) opens the detail, phone menu and deck sheet); player-view pass 95 cards in 6 decks, 0 problems; screenshots `build/shots/v053-deckbuilder-pc.png` / `-phone.png`. Backup of the previous state: `backup/v0.52.1`.
  - Revert: `git revert` this commit, or restore `backup/v0.52.1`.

## v0.52.1
- **Deck builder list performance** (no visual change; plan `docs/ai/deckbuilder-plan.md`, step 1). With all 8,042 cards loaded the builder opened in 1.96 s on PC and 20.6 s on a phone-like CPU (x4), measured this session; now **0.08 s / 0.16 s**.
  - Search index built once per card-data change (`CARDS_VER`); the filtered list is recomputed only when a filter or the deck changes; search input is debounced (120 ms).
  - Windowed grid: only the rows near the visible area are in the DOM (about 100-170 card faces instead of 8,042); spacer rows keep the scroll height, so the scroll bar and scroll position behave as before.
  - Tests: new `deckbuilder52.test.mjs` B14-B19 (all staged cards imported: open <= 300 ms PC / 1.2 s x4, <= 220 card faces in the DOM, keystroke <= 100 ms, debounce, scroll to the last card, search + filters). S16 and U08 now read the windowed grid (deck-only view, card count line).
  - Revert: `git revert` this commit (only `src/js/03`, `13`, `14`, `16` and two tests changed).

## v0.52.0
- **Effect compiler + pilot promotion** (audit plan step 2). `tools/compile_effects.py` turns staged card text into engine data (`effects`, `magic`, `highSpeed`) for patterns of wired glossary tags only, old (Saga 1-2) and current wording; a card is promoted only when **every** paragraph maps (no partial promotion), otherwise it stays staged and goes to the review list `docs/reports/compile-review.md` (Saga 1; regenerate with `--saga N --review`). `tools/promote_compiled.mjs` then checks every compiled card in the real game page (parseCard + smoke check: played by the CPU or summoned/cast, SUMMONED/START_ATTACK/ATTACKS/BLOCKS fired, one attack, no console error, no invariant break) and merges the passing cards into `data/cards`. Tests C52-01..05.
  - Promoted **347 cards**: 301 vanilla cards (all Sagas; 4 without level data and 2 Braves without combine data stay staged) + 46 Saga 1 cards with effects (BP+ on attack/block, draw, destroy by BP, exhaust, Void cores, Clash, Crush, Holy Life, High Speed, Awaken, simple Magic). Smoke: 347 / 347 ok. **Playable 152 -> 499 / 8,041.**
  - Saga 1 coverage is low (171 of 1,011 compile; review reasons: paragraphs without a mapped trigger 361, sentences 329, Tribute 39, other keywords 32). Each new pattern is cheap and unlocks cards across all Sagas: that is the work of the Sonnet batch sessions.
  - Guards: Nexus `[LV2]`+ text stays staged (the export has no Nexus thresholds; `[LV1][LV2]` effects load as LV1); level thresholds that are not strictly ascending (BS19-031) stay staged; wiki templates, Burst and cards with two text versions (errata tabs) stay staged.
  - House readings (Fandom wording): old "(When Attacks) This Spirit gains +N BP" lasts for the turn (`BP_PLUS`); Magic "give a Spirit +N BP" targets your Spirit (`MAGIC_FX.BP_PLUS`); BS01-068 "[LV2] High Speed" is read as High Speed (a Hand ability).
  - Measured for the batch sessions: deck builder with all 8,042 cards loaded takes 1.8 s to open on PC and 8.8 s on a phone-like CPU (x4), search 0.25 s / 1.2 s. It must render the list in pages before the batches push past ~2,000 cards (next session).
  - Tests updated: I25 looks for promoted cards in `data/cards` too; I31 now checks that the pack carries no staging-only fields (the pack grows with promotions).
  - Release checks: Regression green (run 38893364846, 30 sims); player-view pass 95 cards in 6 decks, 0 problems, PC + phone screenshots. Backup `backup/v0.52.0`.
  - Revert: `git revert` this commit, then `python3 tools/import_fandom.py` (puts the 347 cards back into staging).

## v0.51.2
- Data loading (v0.52.0 pre-step, found in v0.51.0): 1,236 of 7,889 staged cards failed the game's `parseCard`. Now **7,875 / 7,889 load** (`node tools/check_staged.mjs`, new; test S52-01/02).
  - 760 Nexuses: the Fandom export has no Nexus level data (`levels: []`); they load at LV1 (`[{cores:0}]`), like a Nexus without `levels`. LV2+ thresholds are still unknown: the effect compiler must keep cards with `[LV2]`+ text staged until the thresholds are found (official list or images).
  - 458 Braves: the export has no combine data (Brave BP+ and condition); they load as Spirits that never combine (`braveFits` needs `brave`). Combining waits for that data.
  - 4 Magic cards typed "Spirit" in the export (BS09-079, BS10-109, BS10-110, BS11-081; no levels, Main/Flash text) are now Magic (`tools/import_fandom.py`).
  - Left as source-data gaps (14, listed in `tools/check_staged.mjs`): 11 Spirits with no level data, 2 Braves with neither levels nor combine data, BS60-XX01 (one symbol per colour, 6; the engine allows 5).
  - Revert: `git revert` this commit (staged data only changes for the 4 Magic cards; no promoted card changes).

## v0.51.1
- Test fix (Regression of v0.51.0, part 2, 232/233): v20 check 23 "magicText shows both effects" only passed because the uncompressed card text of the old pack sat in the page source (`document.body.innerHTML`); the rendered text has "(Main) ... reveal ... (Flash) ... +5000". It now checks `BS.effectTextHTML` only, case-insensitive. The game is unchanged. Other suites that read the page source (v21, v24, v26) pass locally.

## v0.51.0
- Build: **compact, compressed card pack** so every card can ship in the one file. Measured first with `node tools/pack_size.mjs` (all 8,041 cards projected: promoted ones + staged ones reduced to the fields `promote_import.py` keeps, each with an average-size `effects` stand-in): today's plain JSON would be 7.45 MB and a phone-like load (390x844, CPU x4) took 3.6 s, over the 3 s budget, mostly just parsing the page size.
  - New part `src/js/01a-card-pack.js` (shared by the build and the game): `packCards` / `unpackCards` (field table instead of keys per card, booleans 1/0, small string sets as indexes, levels as `[cores, bp]`, image `"<id>.png"` and block from the ID left out, `null` fields dropped), and `loadPack`: base64 of raw DEFLATE (level 9, node zlib at build time) decoded by a small **synchronous** `inflateRaw` (table-driven Huffman), then `TextDecoder` + `JSON.parse`.
  - Why this option: the start-up order stays synchronous (no `DecompressionStream` / Promise), works offline from `file://` on PC and Android, one file, no external request. Full pack: 1.16 MB in the page (index.html ~1.6 MB), phone-like load 2.3 s, PC 0.7 s. Today's 152-card pack: 179 KB -> 39 KB.
  - `node tools/build.mjs --check` compares the decoded pack, not the compressed bytes, so another zlib build on CI cannot fail it.
  - Budgets: B01/B02 now measure index.html without the pack (700 KB / 200 KB gzip, unchanged); B03 pack < 1.6 MB; new B13 loads a page with all 8,041 cards on the phone layout with CPU x4 (< 4 s, no errors). `pack.test.mjs` (9): exact round trip of every card, inflate vs node zlib on 300 random inputs (stored, fixed, dynamic blocks), damaged packs throw.
  - Finding for v0.52.0: 1,237 of the 8,041 projected cards do not pass `parseCard` yet (760 Nexus and 15 Spirits with `levels: []` in the export, 460 Braves without Spirit-form data, BS60-XX01 with 6 symbols); the deck builder with ~8,000 cards is not measured yet.
  - Revert: `git revert` this commit (the old plain pack is `packBlob(cards)` in `tools/build.mjs`; `unpackCards` still accepts a plain array).
- Player-view pass before this minor release: 95 cards in 6 decks, 0 problems, both layouts render; property tests 48/48.

## v0.50.1
- Fix (Regression of v0.50.0): the Removed Zone view keeps its "Banished cards" text (legacy check 390); the white test fixture is now the white deck list (`data/decks/white-mitra-awakened-dragon.txt`, 18 cards) instead of every white card in the pack, which grew by 8 in v0.50.0 (mitra/v15/v15b checks and the sims). No game rule changed. Revert: `git revert` this commit.

## v0.50.0
- Engine: **keyword effects, part 2** (session D): Accel and Silver Wheel now run (new file `src/js/02j-effects-accel.js`).
  - **Accel** (effect `{"trigger":"ACCEL","cost":4,"timing":["FLASH"],"actions":[...]}`): used from the Hand at its timing (a Flash Accel also in your Main Step) by paying the Accel cost; the card is in no zone while its effect resolves, then goes to the Removed Zone. An Accel Spirit in the Removed Zone can be summoned in your Main Step by paying its cost; Accel can't be used from the Removed Zone. Source: Fandom "Accel" Q1-Q8 (the Eternal manual text read has no Accel section; see `docs/manual-notes.md`). Human: "⚡ Accel (Pay N)" in the Hand card modal and in the Flash Timing; "Summon" buttons in your Removed Zone view during the Main Step. CPU: Main Accel draw/return effects when the Reserve pays; Flash Accel to return the attacker / a stronger blocker or to end the Attack Step; Removed Zone Spirits join its summon choices.
  - **Silver Wheel**: `ACTIVATE` with `silverWheel`, Main + Flash timing, exhaust-self cost, not once per turn; new trigger `SILVER_WHEEL` ("when you activate Silver Wheel") on field cards and `zone:"hand"` cards. CPU uses it only as the defender after the block, on a Spirit that is not blocking.
  - `BOUNCE_OPP` gains `costLe` ("Cost 3 or less").
  - **Partial (stable choice):** the Fandom export loses the Accel-cost reduction icons ("Cost 4 ()"), so the full Accel cost is paid; an optional `reduction` field is ready for when the icons are checked.
- Build: the maintainer `note` of each card is no longer embedded in `index.html` (the game never reads it); the embedded pack drops from ~204 KB to ~179 KB, under the 200 KB budget. Revert: the `packBlob(cards.map(...))` line in `tools/build.mjs`.
- Cards promoted from staging and wired (all `fxComplete:false`, residual lines list the rest): Accel BS71-RV004 Armor Rhider (Main, draw 3 discard 2), BS68-045 Gennadios, BS77-040 Jialin (LV1/LV2 only), BS69-043 Charicles (ends the Attack Step; When Summoned returns two), BS68-035 Cleomenes (discard the Burst, else return); Silver Wheel BS70-036 Tink, BS70-037 Disel, BS70-039 Breg, BS70-045 Lemusir, BS71-X06 Brigantia (also When Summoned/Attacks return). Contractor Brigit (Contract Field "when you activate Silver Wheel") is not promoted yet.
- Glossary `K_ACCEL`, `K_SILVER_WHEEL`: partial with rule notes; obligations ACCEL-50, SILVER-WHEEL-50.
- Player-view pass before this minor release: 95 cards in 6 decks, 0 problems, both layouts render. Tests: `accel50.test.mjs` (32).
- Revert: `git revert` this commit (new file `src/js/02j-effects-accel.js`; small hooks in `02a`, `02b`, `02c`, `02d`, `06-rules.js`, `08-battle.js`, `09-cpu.js`, `11-human.js`, `12-zones.js`, `16-events.js`; card data in `data/cards/saga-15.json`, `saga-17.json`).

## v0.49.0
- Engine: **keyword effects, part 1** (session D). Three keywords now run instead of being stored only:
  - **High Speed** (card flag `highSpeed`): in a Flash Timing the card is summoned from the Hand paying its cost **and** its Lv1 cores from the Reserve only (the Soul Core in the Reserve may pay; cores on Spirits never do). Human: a "⚡ High Speed" button in the Flash Timing dialog. CPU: as the defender before the block it summons a High Speed Spirit that wins the block (or any, at Life 2 or less with no ready blocker). In the Main Step a normal summon already does the same, so High Speed is offered only in battle (house reading of "Flash -").
  - **Crush**: new action `CRUSH {n:"lv"}` discards cards equal to the Spirit's level from the opposing decktop (`ctx.crushed` for follow-ups). An empty opposing Deck is not a loss (only a draw is).
  - **Holy Life**: no new code, `ALLY_LIFE_HIT` with `self` + `VOID_TO_LIFE`.
- Cards: BS69-024 Stichiox (pack, green deck) High Speed wired (residual line removed). Promoted from staging and wired: BS68-024 Gaudy Trooper G (High Speed; copies rule and LV3 Cost 7 residual), BS68-059 Fropper and BS68-061 Folly-Golem (Crush; their Crush follow-ups residual), BS68-048 Kamikiri File (Holy Life, LV2 draw from the bottom, counter with "Contractor Kinich-Ahau" incl. Soul State; complete), BS69-052 Coati Chisel (Holy Life; Ultra Holy Life residual). Staging regenerated (7,899 cards).
- Glossary: `K_HIGH_SPEED`, `K_CRUSH`, `K_HOLY_LIFE` (wired); `K_ULTRA_HOLY_LIFE`, `K_ACCEL`, `K_SILVER_WHEEL`, `K_ARMOR`, `K_NETHER_IMMORTALITY` added as missing so the coverage report counts them.
- Player-view pass before this minor release: 95 cards in 6 decks, 0 problems, both layouts render. Tests: `keywords49.test.mjs` (10), property tests 48/48.
- Revert: `git revert` this commit (new file `src/js/02i-effects-keywords.js`; small hooks in `08-battle.js`, `09-cpu.js`, `11-human.js`, `03-imported-cards.js`).

## v0.48.2
- Data only (issue #5). The conflicts with the Fandom export are settled **in favour of Fandom** (owner priority, 2026-10-16; source: `data/sources/fandom-cards-bs01-bs77.json`, collected 2026-10-14, no website needed): BS75-001 Lv1 BP 1000 -> 2000; BS75-063 reduction red 3 -> 2; BS75-075 + white 1; BS75-076 + Ultimate 1 (Fandom "gold" icon = our `ultimate` key, as on BS74-X14); BS75-082 + god 1; BS76-079 reduction red 1 -> none; BS74-CX01 family Vultica -> Vulrica (name, text and residual).
- Revert: `git revert` this commit (data/cards/saga-16.json, saga-17.json); the old values are in the v0.48.1 data. Tests: `fandom4176.test.mjs` (BS75-001 test now expects 2000, 6 new checks).
- Still open: 59 of 77 cards without `name_jp`; Magic/Nexus symbol counts (1 vs 0) are a counting difference, not a data conflict. Not checked against the official list (blocked on the owner's network this session).

## v0.48.1
- Tests only, no engine change. BS76-047 (The ThunderDragon Togevajdra) "the CPU does not play it when it is the only card in its Hand" (player-view note of v0.45.0) could **not be reproduced**: the CPU plays it from `cpuMain` and a full `cpuTurn` at Reserve 4+ for all three profiles, alone in Hand or with another card, and correctly keeps it at Reserve 3. 12 regression tests (`cpu_bs76047.test.mjs`) now guard this. If it shows up again, record the replay seed.
- Dropped this session (named per the session rule): the issue #5 data conflicts (BS75-001 Lv1 BP, Magic reduction differences, Vultica/Vulrica). The official card list and Fandom were not reachable (WebFetch needs a URL approval, no browser linked to this chat), so no curated data changed. Run them in a session with the desktop app linked.

## v0.48.0
- Engine: **Seal** (session C, Eternal manual p.49). A Seal effect moves your Soul Core to your Life; while it is there you are Sealed (`p.lifeSoul`) and [During Seal] effects work (fxIf `sealed`). The Soul Core in Life counts as a Life core; a Life reduction takes normal cores first and the Soul Core leaves only with the last Life core (the manual lets the player choose; fixed choice for both players, revert = drop `lifeTake` in `02d`). All Life-leaving paths (battle, Life to Trash/Reserve, Life to a Spirit) go through `lifeTake`.
- New: action `SEAL`, action `REVEAL_LIFE_RESERVE` (Thunder God Bombardment), `"seal":true` on `manifest` (Seal Manifest: Soul Core from the Field/Reserve to the Life) and on `contractAdvent` (Seal Contract Advent). The Life pill/badge shows the Soul Core as `+S` (like the Reserve), the Life zone text says Sealed.
- Card: BS76-X02 Revol-Tiger X — Seal Manifest on "Contractor Zeus" (C6, your turn) and [During Seal] Thunder God Bombardment wired; "treated as Z" and the refresh clause stay residual.
- Not built: **Flag Contract Advent / Flag Nexus**. The engine has nothing for it yet; the Flag Nexus rule box is a stub ("FArule") and Nexus levels are empty in the Fandom export, the manual text read does not cover it, and Fandom was not reachable from this session. All 32 Flag cards are staging only, so nothing playable is lost. Next step: get the Flag Nexus rule text first.
- 9 new tests (`seal48.test.mjs`).

## v0.47.6
- Docs (process fix 6, owner 2026-10-16): the BS76-047 CPU issue (not played from a one-card Hand) is listed in `docs/ai/roadmap-open.md` under a small CPU-tweak bundle. All six process fixes are done: `docs/ai/process-fixes.md` and its CLAUDE.md bullet are removed. No game change.

## v0.47.5
- Tests (process fix 5, owner 2026-10-16): the browser-free Python glossary checks (v21 glossary consistency, v28 [26]) now also run in the quick Node suite (`tests/unit/pychecks.test.mjs`, P01-P04; D10c already mirrors the v21 source-citation check), so `npm run -s loop` catches them before Regression. The Python originals stay until both agree over a few releases. No game change.

## v0.47.4
- Session tooling (process fix 4, owner 2026-10-16): `tools/session_start.sh` ends with a short summary (version, last 5 commits, the Next line, open issues); CLAUDE.md says it is loaded automatically (never `cat` it) and that `add_repo` is called once. No game change.

## v0.47.3
- Session tooling (process fix 3, owner 2026-10-16): the scheduled "Lanjutkan roadmap" prompt in `docs/ai/next-session-prompt.md` is now a short pointer to CLAUDE.md and skill `bs-session-runner` (no copied rules); the watchdog task prompt already only points to that file. No game change.

## v0.47.2
- Session tooling (process fix 2, owner 2026-10-16): `tools/session_start.sh` prints the age of the newest commit on `main` and stops with OVERLAP (exit 3) when it is under 30 minutes old (`--force` skips it); skill `bs-session-runner` also stops when another "Lanjutkan roadmap" task is running or pending. No game change.

## v0.47.1
- Session tooling (process fix 1, owner 2026-10-16): new `tools/session_end_check.mjs` fails unless the game file `aeterna-v<version>.html` is in the outputs folder with the right embedded version, `test:release` passes on it, the mind map is fresh and `backup/v<version>` is on origin; skill `bs-session-runner` requires it before sending both files. No game change.

## v0.47.0
- **Remaining Magic clauses** (session F, roadmap step 6): Whirling Tide, Thunder Counter, Hades Disaster, Plutonic Wall and Lightning Tempest are now complete; Dana Draw keeps one residual.
  - Sent-to-Trash triggers (card field `trashTrigger`): Whirling Tide / Thunder Counter sent from the Deck by Contractor Nuadha / Indra can be added to the Hand, then +1 core to a Grandwalker Nexus; Hades Disaster sent from the Hand/Deck by Contractor Hades or an Infernal Lord effect gives +1 core to a Grandwalker Nexus. Hooked into `DECK_TO_TRASH_CORES`, `MILL` and `DISCARD_HAND`.
  - Use from the Trash (`magic.trashUse`): Hades Disaster (destroys a Spirit/Ultimate with four cores or less instead of two) and Plutonic Wall while you control Contractor Hades; the card is banished afterwards. Human: offered in the Flash Timing list, marked "[from the Trash]".
  - Plutonic Wall effect (`AB_CORE_TAX_TURN`): this turn opposing Spirits attack/block only by sending a core from themselves to the Trash.
  - Lightning Tempest: Trash symbols reduce its cost (`trashSymbols`); in the Hand it is skipped by opposing remove/discard effects (`handUnaffected`); its zero symbols now also cover Spirits that come to the Field later that turn.
  - Thunder Counter Hand trigger (`magic.oppAttackHand`): at the start of the opposing Attack Step, send 2 cores from Contractor Indra to the Void and pay the cost to use it.
  - Dana Draw: after the Burst, pay to use its Main effect (`burst.thenMain`; the CPU pays only when Contractor Nuadha makes it a card gain); the set card also activates when a Scalostle Brave is summoned with five counters or more (`burst.also`, direct Brave summons included).
- House readings (lowest risk): "+1 core" to a Grandwalker Nexus comes from the Void (older `CORE_TO_SELF` / `DECK_TO_TRASH_CORES` still take Reserve cores, unchanged); only a spare core pays the Plutonic Wall tax (a payment that would deplete the Spirit is not offered); "unaffected in the Hand" also blocks "the opponent discards a Magic or ..." choices; the human uses Trash Magic only in Flash Timings (no Main Step button, no UI change).
- Not built: Dana Draw's Burst on depletion (the engine does not track who caused a depletion); a direct Brave summon still fires no (When Summoned) / ally-summoned effects other than the Dana Draw Burst.
- 18 new tests (`magic47.test.mjs`), magic41 M01/M20 updated. Regression run 45 (30 sims) green on v0.47.0; the session also did the six process fixes the owner queued (v0.47.1-v0.47.6) after it, at the owner's request.
- Player-view pass (before this minor release): `node tools/player_view.mjs`: 95 cards in 6 decks, 0 problems; PC and phone layouts start without errors.

## v0.46.0
- **Ultimate card type** (issue #4): Ultimates parse (`"type": "Ultimate"`), stand on the Field like Spirits (summon by paying, attack, block, BP, depletion, Ultimate symbol for Life damage and for Ultimate reduction symbols) and are not Spirits for Braves or Contract Advent targets. Levels start at LV3 (`lvBase` 3): effects use the printed LV numbers through the new `lvNo()`; the card detail, field status and logs show LV3-LV5. New card field `summonIf` (summon condition, an `fxIf` condition: controlName, counterGe, lifeLe, soulGe), checked for every summon and Advent of the card, for the human and the CPU.
- **Ultra Manifest** (`manifest.ultra`): built from the printed BS76-CP01 text: the Soul Core goes onto the card, +1 core from the Void to the target Nexus, the card is summoned treating all costs as paid, once per turn (same name). BS76-CP01 Generator-Dragon-Brahman now fires its (When Manifests) effect.
- Four BS74 Ultimates promoted from the Fandom export into the pack (deck builder only, no shipped deck changed): BS74-X15 Ven-Danta (Contract Advent onto an Awakened Dragon Spirit, Mitra summon condition, LV3-5 return an opposing Spirit/Ultimate to the deck bottom, LV4-5 reveal-to-Soul-State; partial), BS74-X12 LeonLancer X (LV3-5 destroy 30000 BP or less; its Contractor Homura Toshiie is not in the data yet), BS74-X13 Aztlan and BS74-X14 Gi-Gasha (summon condition / Manifest data only; effects listed as residual). Fandom's god icon added to X12 and X14 reductions; card texts cleaned of wiki templates. The three BS73-AX Ultimates share their numbers with BS73 Spirits in the export and stay out until the conflict is settled.
- House readings (lowest risk; the Eternal manual PDF could not be fetched this session, the permission request was not answered): the summon condition also applies to effect summons and Advent; effects printed for "Spirits" only still reach Ultimates (open); Ultimate Trigger is not built (only BS73-AX02 uses it). Not built: Ultra Advent (Grand-Sagitto-Nova is not in the card data).
- 15 new tests (`ultimate46.test.mjs`); D05 and the gold-icon test accept the promoted cards; quick suite 806 passed locally.
- Regression run 1 found 4 failing checks (mitra_tests, v15, v15b, mitra_sims): the white test fixture took every white pack card and now held 19 (Ven-Danta). `tests/make_fixtures.py` leaves Ultimates out, so the fixture is the deck's 18 cards again; the four suites pass locally.
- Player-view pass (before this minor release): `node tools/player_view.mjs`: 95 cards in 6 decks, 0 problems; PC and phone layouts start without errors.

## v0.45.1
- Fix (Regression part 2, v21 [20]): the four new glossary rule notes (K_UNLEASH, G_SUBJ_BRAVED, A_LIFE_TO_TRASH, S_OPP_NO_BLOCK) are marked "Engine (house reading ...)" because no manual section covers them; they no longer read like official rules. New quick Node test D10c mirrors that Python check so it fails locally, not only on GitHub.
- Session tooling: the god-icon and Agateram work of v0.44.6-v0.45.0 recorded in CLAUDE.md, roadmap and mind map; scheduling bootstrap done (both scheduled tasks exist).

## v0.45.0
- BS71-X09 Agateram (blue Nuadha deck) is playable beyond its Manifest: **SA Unleash 3** (when your Scalostle Brave Spirit attacks you can send 3 cores from a Nuadha Grandwalker Nexus to it; then, unless the opponent discards a Magic card, one opposing Life per differently named Scalostle Brave you control goes to the Trash) and **Lv2-3 block lock** (unless the opponent discards a Magic card, they can't block during your Attack Step).
- New engine vocabulary: ALLY_ATTACKS gate `subjBraved`, actions `OPP_LIFE_TO_TRASH {n | perBraveNames}` and `OPP_NO_BLOCK {minLv}` (`noBlockActive()`, used by the battle's blocker list), and `{"prev":true}` now works inside `BY.then`. Glossary: K_UNLEASH, A_LIFE_TO_TRASH, S_OPP_NO_BLOCK, G_SUBJ_BRAVED.
- House reading (lowest risk, noted in the card residual): the block lock is decided once at the start of your Attack Step; reaching Lv2 later in that step does not start it. The lock ends when Agateram leaves the Field or drops below Lv2.
- 24 new tests (`agateram44.test.mjs`), full Node suite 838 passed locally.
- Player-view pass (before this minor release): new `tools/player_view.mjs` plays every distinct card of the 6 shipped decks (95 cards) on a quiet board (CPU Main Step, else free summon/cast), fires its triggers and a battle, checks invariants and console errors: 0 problems; BS76-047 is not chosen by the CPU from a one-card Hand (noted, not an error). PC and phone layouts start a match without errors (screenshots taken). Human-click UI flows and the 30 CPU-vs-CPU sims run in the GitHub Regression.

## v0.44.7
- Card data (issue #5): the blue Nuadha deck had the same missing God reduction symbol on 11 cards (BS71-057/058/060/061/063/064/X09, BS72-050/051/054/068, incl. the Spear/Rifle/Sword Braves); added from Fandom (the official list fetch served only BS68). All six deck lists now match Fandom's reduction exactly (new test GB07). 20 new tests (`god_reduction.test.mjs` GB01-GB20).

## v0.44.6
- Card data (issue #5): the 14 green/purple Devotee cards (BS68-014/016/018/020/022/NX01, BS69-025/029/030/033, BS70-034/035/072/X03) now have their God reduction symbol (+1 `god`). BS68: confirmed on the official card list (battlespirits.com shows 神 in the reduction) and Fandom; BS69/BS70: Fandom only, because the official list served only BS68 to the fetch. Only God symbols (Contractor Hades, Hermes and other Grandwalker Nexuses) fill that slot, so these cards get cheaper with a Contractor on the Field. No image check needed. 21 new tests (`god_reduction.test.mjs`), ratchet in `fandom_decks.test.mjs` replaced.

## v0.44.5
- Docs only, no game change: quota pause. When a session or the watchdog meets a usage / quota / rate-limit error, or two sessions in a row fail, the chain pauses: the watchdog is disabled and one session is scheduled for the next Tuesday 17:00 WIB (owner's quota reset), which re-enables the watchdog.

## v0.44.4
- Docs only, no game change: chain watchdog. A cheap scheduled task (every 3 hours, no clone, only `gh api` and the task list) restarts the session chain if it broke: no next session pending, the last session finished, and no `docs/ai/chain-stop.md` marker. Sessions that stop for an owner decision, or find the roadmap empty, commit that marker.

## v0.44.3
- Docs only, no game change: the hourly scheduled task is replaced by a session chain. Each session ends by scheduling the next one 60 minutes after its final push (`docs/ai/next-session-prompt.md` holds the single prompt text), so runs cannot overlap. No next session is scheduled when a session stopped for an owner decision or nothing is left on the roadmap.

## v0.44.2
- Docs only, no game change: CLAUDE.md records the owner's goal (every card playable), the player-view check every 3rd session (scripted UI games, CPU-vs-CPU runs, per-card sweep) and the hourly scheduled task with its collision guard.

## v0.44.1
- Tooling only, no game change: `tools/session_start.sh` sets up a session in one call (light sparse clone if needed, hooks path, baseline `npm run -s loop`; `--with-sources` for the Fandom import).
- Test I30 (importer repeatable) now skips itself when `data/sources` is not checked out (light clone); the full CI checkout still runs it.
- CLAUDE.md: shorter Done list, one-call session start, rules for parallel read-only data-check subagents, a model hint for heavy tasks and "scenario test first" for new mechanics.

## v0.44.0
- New mechanic K_FLASH_BURST_FOLLOWUP (`burst.thenFlash`): after the Burst of BS75-073 Crimson Meteor Defense or BS75-076 Magma Call, the owner may pay the card's cost (reductions apply) to activate its (Flash) effect straight from the Burst. Human: a "Pay N / Do not pay" prompt; CPU: pays only when the Flash effect helps now (ending the opposing Attack Step with another attacker ready; Magma Call in its own turn).
- BS75-076 Magma Call (Flash, can't use in Main, `magic.noMain`): during this turn a Lava Fish gets an extra Red symbol (new action `SYMBOL_PLUS_TURN`, counts for attacks and reductions, "fixed as zero" still wins); then the Soul Core may go to Contractor Ometeotl to give it once more (new action `SOUL_TO_NEXUS_THEN`). CPU casts it in the Flash Timing when its Lava Fish attack is not blocked.
- Fix: a Magic card whose effect is still resolving is counted in limbo (it had left the Hand but was in no zone; a CPU-vs-CPU property test caught the card-count invariant during Magma Call).
- Tests: `tests/unit/burst_flash44.test.mjs` (23).

## v0.43.0
- New mechanic A_END_ATTACK: BS75-073 Crimson Meteor Defense (Flash) is usable during a battle by discarding another Crimson/Wurm/Kushina card from the Hand; when that battle ends, the Attack Step ends (action `END_ATTACK_AFTER_BATTLE`, `G.attackEnded`; the human and CPU attack loops stop; Standard format goes on to the Second Main Step).
- Magic actions can be marked `cost`: the Magic is usable only when every cost action can be paid, a cost card is never the Magic itself, and an unpaid cost stops the rest of the effect.
- Guard STATIC `NO_END_ATTACK`: BS74-050 Sunya Lv3 (Awakened Dragon attacking) and BS75-063 Crimson Crater Lv2 (Wurm attacking) stop the opponent ending the Attack Step via effects. Checked when the Magic is used and again when the battle ends (most stable reading: the lock wins if it is active at either point; an attacker that left the Field is no longer "attacking").
- CPU: as the defender it uses the Magic when another opposing Spirit is ready to attack; never as the attacker.
- Still open: paying the cost to use the Flash effect right after the Burst (next task); Crimson Crater's deploy-from-Hand and "effects can't activate" clauses.
- Tests: `tests/unit/end_attack43.test.mjs` (21).

## v0.42.2
- UI (small, follows the v0.42.1 rule fix): the field-card dialog of a Grandwalker Nexus no longer offers "Add Core", "Remove Core" or "Move 1 core"; it shows one disabled info line ("Grandwalker cores cannot be moved or used to pay costs"). Other cards cannot pick a Grandwalker Nexus as the receiver of a moved core or a Soul Core swap. Both layouts checked with one screenshot each (the label wraps to two lines on the phone).
- Revert: `git revert` the commit titled "v0.42.2 UI", or go back to the branch `backup/v0.42.1` (state before this UI change).

## v0.42.1
- Rule fix (Eternal manual pp. 22, 26, 42, read from the official PDF on 2026-10-15): cores on a Grandwalker (and Grandstone) Nexus cannot pay costs, cannot be moved by the player, cannot be moved onto a Grandwalker Nexus, and are not counted as cores on the Field. Before, the engine treated them like any Field core: they counted for "enough cores", were taken when paying (human payment list, CPU, free summons) and could be moved or swapped by hand. Now only effects put cores on or take cores off them (Oracle, Neo-Core Charge, "send N cores from this Nexus", Unleash, Manifest cost, Void on leaving the Field are unchanged).
- Not changed (not covered by those pages): the Soul Core on a Grandwalker Nexus (Contract Field Nexuses such as Ometeotl) behaves as before.
- Code: `isGW` / `freeCores` / `freeTotal` in `06-rules.js`; used by `coresAvailable`, `takeCores`, `moveCore`, `swapSoul`, `cpuCanPlay` and the payment list. 15 new tests (`tests/unit/gw_cores42.test.mjs`).
- Revert: `git revert` the commit titled "v0.42.1 Grandwalker".

## v0.42.0
- New action `OPP_DISCARD_MAGIC_OR` ("unless the opponent discards a Magic card from their Hand, <next action>"): a human opponent gets a modal (one button per Magic card plus "Do not discard"); the CPU pays with its cheapest Magic card when it holds two or more or its Life is 2 or less, otherwise keeps them (`cpuKeepMagicOrPay`). No Magic card in the Hand = the effect goes ahead. Follow-up actions use `{"if":{"prev":true}}`.
- BS72-054 Vaha: the third effect (During Brave Lv2-3, when it attacks, once per turn: refresh unless the opponent discards a Magic card) is now in the card data.
- Checked and closed: the old note "CPU never manifests outside Main" was stale; the CPU already Manifests in the Flash Timing (tests C01-C02).
- Rule 17.0 "mandatory Soul Core use": audited against the Eternal manual PDF (fetched 2026-10-15): no general mandatory-use rule found; paying with and placing the Soul Core is optional, the Advent/Manifest moves are fixed. The 17.0 revision notice itself was not reachable, so the row stays open and no engine change was made.
- Still open (not wired): BS71-X09 Agateram (needs Unleash and "can't block"), End Attack Step and Flash after Burst (A2 session), the god-icon image check (the asset folder is not visible on the laptop).
- 20 new tests (`tests/unit/opp_discard42.test.mjs`, `tests/unit/cpu_flash42.test.mjs`).
- Revert: `git revert` the commits titled "v0.42".

## v0.41.5
- Icon check (issue #5): Fandom's `gold` reduction icon is our `ultimate` reduction symbol (241 Fandom Ultimates carry a gold symbol; manual p. 40: the Ultimate symbol pays Ultimate reduction symbols). `tools/import_fandom.py` now maps it, so 313 staged cards carry `reduction.ultimate` (staging only; the game pack is unchanged).
- Not changed: the `god` reduction icon is still dropped on import (open, 14 deck cards, see `roadmap-open.md`); BS75-076 (Magma Call, curated) keeps red 3 until its image is checked.
- 4 new tests (`tests/unit/gold_icon.test.mjs`); two old import tests updated for the new mapping.
- Not done this session, re-scoped (see `roadmap-open.md`): the god-icon image check (asset folder not reachable), End Attack Step, Flash after Burst, opponent-discard choices and the rule 17.0 gaps are not small.
- Revert: `git revert` the commit titled "v0.41.5 gold icon".

## v0.41.4
- Docs only: plan for the next sessions (missing icons, symbols and mechanics) in `docs/ai/roadmap-open.md`; CLAUDE.md Next points to it.
- Revert: `git revert` the commit titled "v0.41.4 session plan".

## v0.41.3
- Data check of the green, purple and yellow deck cards (45 cards) against the Fandom export (issue #5). Cost, level cores/BP, families and coloured reduction all agree.
- One open conflict, data not changed: Fandom shows one extra `god` icon on 14 green/purple cards (BS68-014/016/018/020/022/NX01, BS69-025/029/030/033, BS70-034/035/072/X03); ours has none. Applying it would raise those costs by 1 for decks without a Grandwalker Nexus, so it waits for a card-image check (laptop was not connected). Yellow has no difference.
- 21 new tests (`tests/unit/fandom_decks.test.mjs`) including a ratchet on the 14 open cards.
- Revert: `git revert` the commit titled "v0.41.3 green/purple/yellow data check vs Fandom".

## v0.41.2
- Data check of BS74-BS76 against the Fandom export (issue #5, owner decision 2026-10-15: Fandom is the reference). 77 cards compared on cost, reduction, symbols, levels, families.
- 12 cards had a blue reduction symbol that is the God symbol on the wiki (BS74-043/045/047, BS75-004/009/010/012/013/X02, BS76-006/009/060): now `god`, so only Grandwalker Nexus symbols reduce it and Field blue symbols no longer do. Test D05 accepts `god`.
- BS76-005 Lv3 needs 5 cores (was 3), BS76-006 Lv3 needs 4 (was 3), BS75-041 gains the Devotee family.
- Confirmed as real: cost 0 on BS75-001, BS75-002, BS76-001.
- Not changed (conflict or unclear), kept in `docs/ai/roadmap-open.md`: BS75-001 Lv1 BP (Fandom 2000, cardrush 1000), Magic reductions BS75-063/075/076/082 and BS76-079.
- 20 new tests (`tests/unit/fandom4176.test.mjs`); the mitra suite check for Paanch/Chai/Sat now expects `god` (an earlier image reading had called the icon blue; Fandom is the reference).
- Revert: `git revert` the commit titled "v0.41.2 BS74-BS76 data check vs Fandom".

## v0.41.1
- Fix: v0.41.0 blocked casting a Magic card whose effect is not built; the legacy suite (mag) guarantees it stays castable with a log warning, so the block is removed. Plutonic Wall behaves like every unbuilt Magic card.
- Revert: `git revert` the commit titled "v0.41.1 keep unbuilt Magic castable".

## v0.41.0
- **Magic effect types:** a Magic card can now run any list of engine actions (`magic.effect = "ACTIONS"`, with a condition per action), the same vocabulary as Spirit effects.
- **7 Magic cards added to the pack** (Fandom export data): Dana Draw (Main: draw 3, discard 3, -1 per Contractor Nuadha; Burst: cost destruction up to 6, +4 with five counters), Whirling Tide (Flash: summon a Scalostle/Celtica Brave or Nexus from the Trash for free), Magic Bullet (Flash: destroy one Spirit each of cost 3/4/5/6, plus one of cost 7+ with seven counters), Hades Disaster (Flash: destroy a Spirit with two cores or less, not preventable), Thunder Counter (Flash: with a Contractor Indra, an opposing Spirit can't attack/block for the game), Lightning Tempest (Flash: with a Contractor Indra, opposing symbols are zero this turn), Plutonic Wall (data only, effect not built).
- New actions: `DESTROY_EACH_COST`, `SYMBOLS_ZERO_OPP`; extended: `SUMMON_HAND` from the Trash (`from: "trash"`, `types`), `DESTROY` `ignoreImmune`, `DESTROY_TOTAL` `boost`.
- Plutonic Wall is in the pack without an effect: like every unbuilt Magic card it can still be cast (a log line warns, the card is wasted), so keep it out of decks until it is built.
- CPU: casts ACTIONS Magic in the Main Step when it has cards to spare, and as Flash when its attack is blocked by a stronger Spirit or when attacked at 3 Life or less.
- Decision (stable option): the prebuilt decks are unchanged; the new cards are in the deck builder. Adding them to prebuilt decks needs Regression sims first.
- Not built yet (see `docs/ai/roadmap-open.md`): use from the Trash, Deck-to-Trash add-to-Hand clauses, Thunder Counter's Hand trigger, Dana Draw's pay-to-use-Main after the Burst, Plutonic Wall.
- Tests: `tests/unit/magic41.test.mjs` (20 checks); B06 updated.
- Revert: `git revert` the commit titled "v0.41.0 Magic effect types".

## v0.40.3
- UI polish by Claude under the owner's standing delegation (2026-10-15); the PC and phone layouts are otherwise unchanged:
  - **Card names wrap at word and CamelCase boundaries** ("Crimson / Dragon / Star") instead of in the middle of a word ("CrimsonDrago / nStar"): hand, field and deck builder.
  - **PC turn-step bar** shows every step without the edge fade (the first step was half hidden); the phone keeps its scrolling bar.
  - **Touch targets:** deck builder controls are at least 34 px high on phones and touch screens, the "only" checkbox is larger; the header and navigation buttons got a bigger touch area with the same look.
- Tests: `tests/unit/ui403.test.mjs` (22 checks, PC + phone, screenshots in `build/shots`).
- Revert: `git revert` the commit titled "ui: v0.40.3 polish", or restore the state before it from branch `backup/v0.40.2`.

## v0.40.2
- UI patch, all four items the owner approved (2026-10-15), PC and phone layouts otherwise unchanged:
  - **CPU style** selector in Settings (Balanced / Aggressive / Defensive; saved, reset by "Reset settings"). Uses the existing weight profiles.
  - **Contract card in the starting Hand is optional** (issue #2, manual p. 12): a prompt "Add to Hand / Keep in Deck" appears once, after the coin toss, only when the human's Hand has a Contract card. "Keep in Deck" shuffles it back and draws a replacement that is never another Contract card. Default and the CPU keep the old behaviour (Contract in Hand), so seeds, replays and CPU-vs-CPU sims are unchanged.
  - **Deck builder filters**: colour (multicolour cards match either colour), cost (10 = 10 or more) and type (Spirit / Brave / Nexus / Magic / Contract), combined with search and "In deck only".
  - **Heavy Exhaust** is drawn upside down (rotated 180 degrees, portrait slot); plain Exhaust stays sideways. The live status line says "heavy exhausted".
- Tests: E21 renamed (default behaviour), E21b-c and `tests/unit/ui402.test.mjs` (20 checks, PC + phone, screenshots in `build/shots`). Python suite v29 handles the new Contract prompt (+1 check for "Keep in Deck"; Regression part 3 caught the missing prompt in the first run).
- Choices noted per the autonomy rule: Contract choice defaults to "Add to Hand" (current behaviour); three CPU styles only (no new profile).
- Backup of the v0.40.1 state: branch `backup/v0.40.1`.

## v0.40.1
- Test-only fix: the legacy suite v17 counted the CPU deck list as a fixed 8 options; it now counts `BS.PREBUILT.length + 2` (the v0.40.0 Regression run failed in part 2 for exactly this). Backup of the v0.40.0 state: branch `backup/v0.40.0`.

## v0.40.0
- Colour expansion 4/4, **yellow**: prebuilt deck "Yellow: Indra / Thunderive (Contract, v0.40)" (40 cards, 14 different; `data/decks/yellow-indra-thunderive.txt`) from Saga 16-17 (BS75, BS76). New Contract Grandwalker Nexus The HeavenlyThunderContractor Indra (BS75-CX03) and Indra's Heavenly Thunder Temple (BS75-068). Closes the yellow item of issue #7 (all four colours done).
- Deck choice (lowest risk, noted per the autonomy rule): the official BS75 Indra deck (battlespirits.com), minus Thunder Counter (Magic needs Magic effects) and Grand-Sagitto-Nova (Ultra Thunder Advent, cost 12, needs Ultra Advent); Togevajdra and Vajreine (BS76) take their six slots. Standard Block A cards only.
- Data source: the owner-supplied Fandom export. Read from battlespirits.com and yuyu-tei.jp (2026-10-14): Indra's Neo-Core Charge target (Thunderive / Devotee / Concluser & Cost 3 or more), **Lv2 at Count 2**, Contract Field, Contract Skill 3. The Indra Temple Lv2 threshold (1 core) is copied from the other Temples and **not verified**. Stats are still not checked against the card images. The Eternal manual PDF could not be fetched this session, so no manual page was re-read (`docs/manual-notes.md`).
- Engine (`src/js/02g-effects-yellow.js` and small changes): **can't attack/block** (`CANT_ATTACK_BLOCK`, flag `noAB` on the Spirit; enforced for human and CPU attackers and blockers, cleared when the Spirit leaves the Field), `DRAW_BOTTOM`, `DISCARD_ALL_HAND`, `REVEAL_ADD`, `VOID_TO_LIFE`, `LIFE_TO_SELF`, `NEXUS_CORES_TO_SELF`, `SELF_TO_HAND`, STATIC flag `EXTRA_REDUCTION` (extra reduction symbol, used by `effCost`), `BOUNCE_OPP` with `lv` / `notColor` / `kind: nexus`, conditions `oppNoAB` / `oppNexusGe`, effect flags `other`, `noStack` ("Can't Stack") and `self` for `ALLY_LIFE_HIT`. Vajdra-of-Magan uses the existing `costAlt` (Cost 3 with Indra and an opposing Nexus).
- Wired: Indra (Neo-Core Charge, deck-to-Trash cores, Contract Field counter +2 and extra yellow reduction symbol, Contract Skill 3 usable in Main or Flash so the CPU can use it), Temple (draw from the bottom), Bilijvern, Vajdraco, Manevajra, Raivajdra (Manifest data, draws, Grandwalker core removal), Shimavajdra (LV2-3 extra symbol), Magjvern (Burst, trash return), Vajdra-of-Magan, Airavajdra, Naraka, Vajrawurm (Unleash cost and effect), Togevajdra (LV2-3 return), Vajreine (Burst, returns). Each card lists what is still missing in its residual text.
- Left out on purpose: Magic (Thunder Counter, Lightning Tempest), Grand-Sagitto-Nova (Ultra Advent), Mirage of Bilijvern, the Nexus lock of Vajdraco, the Life-for-leaving replacement effects, Raishin Vajdra, Nazuma.
- UI: one new disabled button label, "Cannot attack or block", on a Spirit under that effect (no layout change; tell me if you want it removed).
- 49 new tests (`tests/unit/yellow40.test.mjs`); legacy Python suites v17, v21, v22, v24 updated for 126 cards, 7 decks, nine Contractor Nexuses (186/186 pass after the glossary wording fix). Sims: 16 CPU games (yellow vs red 6, mirror 4, vs white 2, vs green 2, vs purple 2), all finished, no invariant or page error; the new effects fired in the sampled logs (bottom draws, Neo-Core Charge, bounces to the Deck bottom, can't attack/block). Honest note: yellow won 8 of the 16 games and 2 of 6 against the red draft deck, so it is untuned; the CPU never manifests (known), so Raivajdra, Naraka and Vajrawurm only enter by a normal summon in the sims.
- Open: Magic effect types (blue, green, red and yellow Magic), Ultra Advent / Ultimate / Seal for the cards that need them, Mirage sets, the Trash-based summons and Flashes from earlier colours, Temple Lv2 core count check against the image, a manual re-read for can't attack/block.

## v0.39.1
- Tooling only, no gameplay change (token saving): legacy suites v17, v21, v22, v24 read the card count and the Contractor Nexus list from `data/cards/all-cards.json`, so a new colour deck needs no test edit and no extra Regression run (186/186 pass).
- `docs/ai/colour-version.md`: checklist for colour versions (from v0.37-v0.39); `docs/ai/token-economy.md` section 12: budget and rules for the next work.
- Backup of the v0.39.0 state: branch `backup/v0.39.0`.

## v0.39.0
- Colour expansion 3/4, **purple**: prebuilt deck "Purple: Hades / Sorcerer Infernal Lord (Contract)" (40 cards, 14 different; `data/decks/purple-hades-sorcerer.txt`) from Saga 15 (BS68). New Contract Grandwalker Nexus The SorcererContractor Hades (BS68-CX01) and Hades' Nether Temple (BS68-070). Closes the purple item of issue #7; yellow is next.
- Deck choice (lowest risk, noted per the autonomy rule): Hades / Sorcerer is built on deck-to-Trash, Count, discard and core-to-Reserve effects that the engine mostly had. Hera (Ogre Wizard / Doll) needs "summon instead of banishing" replacement effects, Nyx / Dionysus need Ultimate, Amon needs the Flag Contract. They stay in `data/import`.
- Data source: the owner-supplied Fandom export. Read from yuyu-tei.jp (2026-10-14): Hades' Neo-Core Charge target (Infernal Lord / Devotee / Concluser & Cost 3 or more), **Lv2 of Hades at 5 cores** (not 2 like the other Contractors), its Contract Field text, and Lv2 of the Nether Temple at 1 core. The one Contract symbol follows BS74-CX03 / SD69-CX01. Stats are still not checked against the card images (`note` on each card).
- Engine (`src/js/02f-effects-purple.js`): `MILL`, `DISCARD_HAND` (cost of `BY`), `OPP_CORES_TO_RESERVE` ({targets, each} / {total}, `drawPerDepleted`), `COUNTER_ONCE`, `DESTROY coresLe`, `match.color`, condition `oppSpiritsLe`. A Spirit left below its Lv1 cores is depleted (manual p. 28).
- Wired: Hades (Neo-Core Charge, deck-to-Trash cores, Contract Skill 2 with the once-per-turn Count part), Nether Temple (counter, reveal three and add a Purple Sorcerer), Infernal Soldier, Hound-Beros, Galatiark (summon and destroyed), Heineza, Naberidus (discard and draw), Phenlese (draw, Manifest data), Javir (summon, LV2 symbol), Gadirac (Burst, LV2 refresh), Vaplus, Dells-Vajram, Alvanshell. Residual text is listed on each card.
- Left out on purpose: the Magic cards (Plutonic Wall, Hades Disaster need Magic effects and use-from-Trash), Dark-Clymenus (Unleash), Leo-Smog (Petit Bat / True-Curse), Sagramore (Spectral Contract). Not built yet: the Flash-from-Trash of Soldier and Galatiark, setting Naberidus as a Mirage, summoning Javir / Phenlese's target from the Trash, Hades' Contract Field, Nether Temple LV2, Volgoat (LV cost increase), the Soul State clauses.
- 35 new tests (`tests/unit/purple39.test.mjs`); legacy Python suites v17, v21, v22, v24 updated for 112 cards, 6 decks, eight Contractor Nexuses. Sims: 14 CPU games (purple vs red 6, mirror 4, vs white 2, vs green 2), all finished, no invariant or page error; Hades deploy, Nether Temple, Vaplus depletion and Naberidus discards appeared in the sampled logs. Honest note: purple won 1 of 6 against the red draft deck, 2 of 2 against white and 0 of 2 against green; the deck is untuned and the CPU discards its cheapest card.
- Open: Magic effect types, the Trash-based summons and Flashes above, then yellow (v0.40).

## v0.38.0
- Colour expansion 2/4, **green**: prebuilt deck "Green: Hermes / Lionheart Blade Beast (Contract)" (40 cards, 17 different; `data/decks/green-hermes-lionheart.txt`) from Saga 15 (BS69, BS70). New Contract Grandwalker Nexus The SwiftContractor Hermes (BS69-CX02).
- Deck choice (lowest risk, noted per the autonomy rule): Hermes / Blade Beast needs Heavy Exhaust, the Removed Zone and a Burst lock, but no Mirage engine work and no Magic; Ra-Harakhti (Weapon Insect) is Mirage-, Mani- and counter-heavy, Yum-Kaax and Liber need Fungal / Flag Contract mechanics. They stay in `data/import` for later.
- Data source: the owner-supplied Fandom export. Gaps filled from the web: Neo-Core Charge target (Blade Beast/Devotee/Concluser & Cost 3 or more, cardrush-bs.jp) and the Contract symbol (fullahead-tcg.com). **Not verifiable online and not image-checked** (the laptop was not connected, so no card image was read): the Lv2 threshold of Hermes (kept at 2 by Count, like most Contractors) and the Nexus levels of Spiral Way and Messenger Post (Lv2 at 1 core, like the other Saga Nexuses). Each card carries a `note`; stats are still not checked against images.
- Engine: **Heavy Exhaust** (`heavy` flag next to `exhausted`; `HEAVY_EXHAUST_OPP`; one Refresh, Refresh Step or effect, turns it into a normal Exhaust; manual pp. 60-61, FAQ p. 67), `EXHAUST_OPP`, the **Removed Zone** (`REMOVE_OPP_HAND`, `OPP_CHOOSES_REMOVE_HAND`, `REMOVE_OPP_TRASH`, `SEND_REMOVED`, trigger `OPP_REMOVED`, conditions `oppRemovedGe` / `oppRemovedSpirit` / `removedGe`), `VOID_TO_MATCHING`, `NO_BURST_BATTLE` (the Contract Field lock, cleared with the battle), `BOUNCE_OPP exhaustedOnly`, ACTIVATE cost `exhaustSelf` ("by exhausting this Nexus"), Manifest timing `YOUR_ATTACK`.
- Wired: Hermes (Neo-Core Charge, deck-to-Trash cores, Contract Skill 2, Contract Field: Burst lock and random Hand card), Spiral Way (Flash and Removed-Zone reveal), Messenger Post, Medon, Stichiox (Hermes deploy), Eurytius, Priapus (LV effects), Sisyphus (Mani, LV2), Eudoros, Calchas, Iphicles (LV1-2 Trash clause), Pelops (Hand cut, cores), Autolycus, Hermaphros (LV2), Leonteus and King Perseus (Mani, send to the Removed Zone), Guneus (Burst and LV1-3). Residual text is listed on each card.
- Left out on purpose: the Magic cards (Wind Boom, Folk Reverse, Cactus Shot), Trismegistus (Unleash), Prometech-Lycus.
- Rules honesty: the Eternal manual text read online has no Removed Zone rule (it lists a Set Aside zone); the zone is built as printed on the cards and marked partial in the glossary, obligations and coverage. The Burst lock is a card-text rule (manual p. 48 names only Heavy Armor / Ultra Armor).
- UI: Heavy Exhaust is drawn upside down (v0.40.2).
- 45 new tests (`tests/unit/green38.test.mjs`); legacy Python suites v17, v21, v22, v24 updated for 98 cards, 5 decks, seven Contractor Nexuses (185/185 pass). Sims: 16 CPU games (green vs red 6, mirror 4, vs blue 4, vs white 2), no invariant or page error; the new effects fired in the sampled logs (Heavy Exhaust, Removed Zone, Burst lock, Neo-Core Charge, Guneus Burst). Honest note: green won 5 of 6 against the red draft deck and all games against blue and white, the deck is untuned; the CPU never manifested in the sampled games.
- Open: Magic effect types (blue and green Magic), Removed-Zone returns and "can't use" locks, Stichiox/Priapus hand clauses, Eurytius and Pelops static clauses, Hermaphros cost reduction, then purple (v0.39).

## v0.37.1
- Test-only fix: the legacy Python suites (v17, v21, v22, v24) had fixed counts (63 cards, 3 ready-made decks, five Contractor Nexuses) that the blue release changed; updated to 81 cards, 4 decks, six Contractor Nexuses. Glossary rule notes of the new entries now name the Eternal Rule Manual and say it defines no rule for the term. The v0.37.0 Regression run failed in parts 2 and 3 for exactly this; part 2 (230 checks) and part 3 (258 checks) pass again locally.

## v0.37.0
- Colour expansion 1/4, **blue**: prebuilt deck "Blue: Nuadha / Scalostle Dana (Contract)" (40 cards, 18 different; `data/decks/blue-nuadha-scalostle.txt`) from Saga 15-16 (BS71, BS72, BS74). New Contract Grandwalker Nexus The SilverArmContractor Nuadha (BS71-CX03).
- Data source (owner decision 2026-10-14): the owner-supplied Fandom export, not the card images. `tools/promote_import.py` moves staged cards into `data/cards` (never overwrites). The export lacks: the Neo-Core Charge target, Brave BP+ and combine conditions, Nexus levels, the Contract Nexus symbol, and drops the "god" reduction key; these were read from cardrush-bs.jp (see `docs/manual-notes.md`) and the Contract Nexus symbol follows BS74-CX03/SD69-CX01. Stats are still not checked against the card images (`note` on each card).
- Engine: cost-based `DESTROY` (`costLe`, `costLeSelf`, `costLeDiscarded`, `costRank` lowest/highest, `costBoost`), `STATIC` flag `COST_DESTROY_PLUS` (Bulwark Temple, Railgun), `DESTROY_TOTAL byCost`, `CORE_TO_NEXUS perDestroyedCost`, `LOOT` (draw then discard), `CORE_OR_COUNTER` (Neo-Core Charge Contract Field), effect gate `braved` and condition `nexusBraved`, a Brave card summoned as a Spirit by `SUMMON_HAND` / `REVEAL_DEPLOY` (`allowBrave`).
- Bug fix found by the new tests: `summonFree` returned nothing, so `REVEAL_DEPLOY` without paying put the summoned card back into the Deck as well (a duplicate). It now returns true.
- Wired: Nuadha (Neo-Core Charge with counter option, deck-to-Trash cores, Revive), Bulwark Temple (limit bonus only), Scout, Soldier, Musketeer, Aidman, Madea, Goibniu (draw trigger), Dian, Vaha, Brodeur, Gaulesser (Burst + LV2), Agateram (Manifest only), the four Saga Braves (Spear, Rifle, Long Sword, Railgun) with their Nexus Brave skills. Each card lists what is still missing in its residual text.
- Left out on purpose: the Magic cards (Dana Draw, Whirling Tide, Magic Bullet need new Magic effects), Dagda and Magic Soldier (Burst/Mirage clauses not built). They stay in `data/import`.
- 44 new tests (`tests/unit/blue37.test.mjs`); sims: 4 blue-vs-red and 4 blue mirror games, no invariant or page errors. Honest note: blue lost all 4 games against the red draft deck and the second player won all 4 mirror games, so the deck is untuned.
- Open: Contract Field clauses of Nuadha (Burst lock, Brave-summon core), Shielder/Scout LV2 protections, Aidman/Musketeer/Vaha extras, Magic effects, then green (v0.38).

## v0.36.1
- Measured first (Chromium headless, v0.36.0): `index.html` 370 KB (96 KB gzip; card pack 75 KB, CSS 35 KB), page ready in 224 ms, `render()` 6.6 ms, JS heap 10 MB, one CPU-vs-CPU match 3.8 s. Nothing needed optimising.
- Guard rails instead (`tests/unit/budget.test.mjs`, 12 tests): size limits for the page, gzip, card pack, CSS and each `src/js` file; one script and no external requests or data URIs; the build never reads `data/import`; time and memory limits for load, `render()`, new match and heap (about 10x headroom for time, 2x for size, so only real regressions fail).
- Rule for v0.37+: when a colour release adds cards, embed only the cards its decks use; keep the rest out of `index.html` (lazy-load as a separate file if the deck builder needs them).
- No change to `src/` except the version.

## v0.36.0
- Card data intake (no engine change): `tools/import_fandom.py` merges `data/sources/fandom-cards-bs01-bs77.json` (reference only) with `data/index/saga_card_index.json` into one staging file per Saga, `data/import/saga-01.json` ... `saga-17.json` (one card per line), plus `data/import/report.json`.
- Result: 7978 cards, 453 without an image, 110 duplicate numbers merged (rarities collected), 6 number conflicts, 60 cards skipped because `data/cards` already holds them (hand-verified, never overwritten), 2 Token rows left out.
- Image match: by (set, name), then by unique name; ambiguous names and missing files are reported, with a near-name suggestion where one exists (the index has typos such as "The Topz Empty Sky"). Nothing is guessed.
- Also reported: Type typos ("Spirt" fixed), Contract/Burst variants (kept as a flag on the base type), non-colour reduction keys (wiki "gold", dropped), non-ascending level cores (wiki errors), a bad index file name.
- Decision (lowest risk): output goes to `data/import/`, not `data/cards/` as the roadmap sketched. `build_cards.py` globs `data/cards/saga-NN.json` into the game pack, so ~8,000 unchecked cards there would be embedded into `index.html` and break the Saga 15-17 pack invariant (D08). A colour release promotes verified cards into `data/cards`.
- Stats are NOT yet checked against the card images (`stats_verified: false` on every card; image wins when it differs). That check is done per colour deck in the v0.37+ releases.
- 32 new data tests (`tests/unit/import36.test.mjs`). No change to `src/` except the version.

## v0.35.0
- Token cards (issue #4; Eternal manual p. 56-57 and the official "How to Use Token Cards" page): Rig Avatar Dragon (`data/cards/tokens.json`) is built in as a Token Spirit; never in a Deck or the deck builder. New action `SEND_TOKEN`: no cost, Lv1 cores from the Reserve / spare Field cores, not a summon. A Token that leaves the Field (destroyed, depleted, returned, Soul State) goes back to the Token supply, so "after destroyed" Bursts do not trigger; a Brave on it goes to the Trash. Field badge "TOK", card type "Token Spirit".
- Decision (lowest risk, the rules set no limit): each player prepares 10 of each Token kind their deck can send out.
- Saga Brave onto a Grandwalker Nexus (manual p. 38-39): Yaj-Veda combines with a "Brahma" Grandwalker Nexus (Brave cores back to the Reserve; Lv1 cores to separate); the Nexus gets the Brave's symbol and its [While Combined with a Nexus] Contract Skill 3 (Flash, either Attack Step, Rig Avatar Dragon). Not yet: the Nexus taking the Brave's cost/family.
- Wired: The GenesisContractor Brahma (SD69-CX01: Neo-Core Charge for Spirits, deploy mill, Contract Skill 2, Contract Field; Contract + Revive flags), Generator Yajdragon (BS76-006: Manifest onto Contractor Brahma in either Attack Step, counter, destroy whose effects can't activate, Token at LV2-3), Generator-Dragon-Brahman (BS76-CP01: (When Attacks) return two Generator/HermitDragon, two Tokens; Ultra Manifest and the Life effect stay residual), Yaj-Veda (complete: Trash-to-Hand from Brahma's mill, Nexus Brave), Rig Avatar Dragon ((When Attacks) +1 core to Contractor Brahma, +1 symbol for the battle).
- New: `DESTROY` option `noFx` ("the effects of the destroyed target can't activate"), action `SYMBOL_PLUS`, card field `trashHand`.
- Rule fix: an attacking Spirit's combined Brave symbol now counts for Life damage (manual p. 34); the CPU uses the same symbol count.
- Card-count invariant counts combined Braves and ignores Tokens.
- 35 new tests (`tests/unit/mech35.test.mjs`); 6 CPU-vs-CPU games with a Brahma Token deck: no invariant or page errors.

## v0.34.2
- Tooling only, no gameplay change (token saving): `npm run loop` runs build, lint and quick tests in one call with a one-line result; `test:quick` now picks up every `tests/unit/*.test.mjs` except the slow `props` suite (`tools/quick-tests.mjs`), so new test files need no `package.json` edit.
- Light sparse clone documented in `CLAUDE.md` (skips `data/sources` and the 1.1 MB check table).
- `docs/ai/token-economy.md` section 11: settings the owner can turn off.
- Backup of the previous state: branch `backup/pre-v0.34.2`.

## v0.34.1
- Yaj-Veda (BS76-060) data read from the owner's card image: Lv1 1 core, 2000 BP. It can now be summoned on its own (Spirit form); [LV1](When Summoned) counter +1, then you can destroy an opposing Nexus. Summoned directly combined it has no Lv, so that effect does not fire.
- Rule: a Brave summon is not a Spirit summon, so "when your Spirit is summoned" effects no longer fire for it (manual p. 35).
- Token still open: the owner's asset folder has no Rig Avatar Dragon token card (only a VASSAL prototype name).
- 3 new tests (V29-V31).

## v0.34.0
- Brave (issue #4, manual pp. 34-36): new card type; summon in Spirit form (treated as a Spirit, not a Spirit summon) or directly combined; combine / separate in the Main Step at no cost; Brave cores move onto the Spirit; BP+ and symbol added; one Brave per Spirit; it leaves the Field with its Spirit (Soul State: Trash); a Spirit that no longer fits separates at once. Hand button "Summon combined with a Spirit", Field buttons "Combine" / "Separate" (new buttons in the existing menus only). CPU combines with its strongest fitting Spirit.
- BS76-060 Yaj-Veda is now playable as a Saga Brave (+5000 onto Ancient Dragon / Creation). Its Spirit-form levels are not in the card data yet, so it can only be summoned combined; its (When Summoned), Trash-to-Hand and Nexus Brave texts stay residual.
- Over Count (manual p. 61): `overCount` {count, bp} adds BP while the Count meets the condition, whatever the Lv; effect modifier `oc:true` for [During OC] effects. Siegwurm, Meteorwurm, Siegwurm-Nova and Sieg-Meteorwurm get their OC BP.
- Token: not done; the token card data (Rig Avatar Dragon) and the official token document are missing.
- Decisions (lowest risk): the engine adds no Family from a Brave (manual p. 34 and p. 35 disagree); LV-gated Brave effects need the Brave's own Lv, so they do not fire while combined.
- 28 new tests (`tests/unit/mech34.test.mjs`, part of `test:quick`).
- Backup: `aeterna-v0.33.0.html` and a git bundle of v0.33.0 in the outputs backup folder.

## v0.33.0
Roadmap issue #4 (missing mechanics): block, destruction and reveal triggers.
- Rules: (When Blocks) activates after the block is declared, in one pool with the attacker's "when blocked" effects (manual p. 30); "(When Attacks/Blocks)" effects share their Once per Turn. (When Destroyed) on the card itself, by battle or effect, never on depletion, with the level the card had (p. 31; partial: resolved right after the card reaches the Trash). New "when your X destroys an opposing Spirit in battle" trigger. Effects can work from the Hand when your Spirit is blocked.
- Ruling (the manual is silent): "When this card is revealed from the deck" resolves at once inside the revealing effect, so the card can act before the rest is discarded or returned. Magic reveals do not fire it yet.
- Engine: triggers BLOCKS, DESTROYED, REVEALED, ALLY_DESTROYS; `alsoBlocks`, `zone:"hand"`, `onceKey` (several effects share one Once per Turn); actions MIRAGE_SET, DEPLOY_SELF, REVEAL_PICK.
- Cards wired: Teen, Aath, Sunya, Hazaar (When Blocks); Rainydle (reveal three); Ankillersaurus, Katanakasago (set as Mirage when revealed); The Sunstone Air Fortress (deploy when revealed); The Crimson Lavafalls (deploy from the Hand when blocked, LV2 draw). Teen and Katanakasago are now complete.
- Tools: `check_obligations.py` accepts Node tests (`file.mjs:label`).
- Tests: `tests/unit/mech33.test.mjs` (30 checks, part of `test:quick`).
- Backup: `aeterna-v0.32.7.html` and a git bundle of v0.32.7 in the outputs backup folder.

## v0.32.7
Owner note: not only Spirits carry symbols, and cost reduction depends on them. Reduction now follows the Eternal rule manual VER.17.0.
- Rules: Field symbols of Spirits, Ultimates and Nexuses reduce costs (p. 18, 24); Soul State (p. 55) and the Burst Area / Mirage (p. 49) do not; each Field symbol pays for one reduction symbol, matched in the best way; reduction stays mandatory and never takes a cost below 0.
- Special symbols: Ultimates carry Ultimate symbols that reduce only Ultimate reduction symbols (p. 39); a plain Grandwalker Nexus has a God symbol that never reduces the six colours (p. 42); a Contract Grandwalker Nexus has a coloured God symbol that also reduces its colour (p. 44), so every Contract Grandwalker in the pack works as before; six-colour reduction symbols (`reduction: {"all": n}`) take any coloured symbol (p. 25).
- House reading (the manual is silent): a two-colour card's symbol counts as either of its colours, still paying for one reduction symbol only.
- Card data: `reduction` also takes `all`, `ultimate`, `god`; `symbolColors` also takes `god` and `god-<colour>`.
- Display: the symbol indicator shows on every card that has symbols (Spirits, Ultimates, Nexuses incl. Grandwalker, Braves); Magic never. Ultimate symbols are gold; God symbols get a silver ring.
- Tests: `tests/unit/rules32.test.mjs` (20 checks, part of `test:quick`), `tests/unit/ui32.test.mjs` +3 checks.
- Backup: tag `backup/pre-v0.32.7` locally.

## v0.32.6
Fix (owner report on v0.32.4): on a narrow PC window the Hand could not be scrolled sideways with a mouse (the scrollbar is hidden and the wheel is vertical).
- Horizontal rows (Hand, Field rows, step chips) now scroll with the mouse wheel and with a mouse drag; a drag never counts as a click, a plain click still opens the card. Touch keeps the native swipe; rows that fit are left alone.
- Tests: `tests/unit/ui32.test.mjs` +6 checks (wheel at three widths, drag, click, no overflow).

## v0.32.5
UI changes requested by the owner (review comments on v0.32.4).
- Phone field headers read `CPU FIELD ↔` / `YOUR FIELD ↔` (the word "swipe" is gone, the arrow stays).
- PC: the CPU's right flank now mirrors the player's: VOID at the top, then CPU RES, then CPU LIFE.
- PC: the CPU's hand count (`CPU HAND: n`) sits at the top centre of the CPU field; tapping it opens the count-only Hand view. Phones keep the `HD` stat.
- Tests: `tests/unit/ui32.test.mjs` +6 checks.
- Backup: tag `backup/pre-v0.32.5` locally.

## v0.32.4
UI change requested by the owner (review comments on v0.32.3).
- Enlarged card view, Aegis-style: on PC and landscape screens the card sits left and the details right; on portrait phones the card is on top and the details below. The detail panel scrolls by itself, so the view never runs off the screen (before, the top was cut off when the text was long).
- Effect text is justified (both edges straight, the last line left) in the enlarged view, the card detail dialog and the placeholder card face; long "A/B/C" names get break points after each slash so justified lines do not stretch.
- Larger effect text in the detail panel on PC.
- Tests: `tests/unit/ui32.test.mjs` +8 checks (enlarged view on PC, phone portrait, phone landscape and a small phone; justified text; slash break points).
- Backup: tag `backup/pre-v0.32.4` locally.

## v0.32.3
Two-colour Spirits (owner request), display only: the rules still use the main colour until multicolour rules arrive (issue #4).
- Card data: optional `colors` (2-3 colours, the first is the main one and must match `color` when both are given).
- The frame is split (top/left first colour, right/bottom second) and the cost circle is half and half; a two-colour Ultimate splits it in both colours and gold.
- Symbol indicator: a two-colour card's symbol is one pie in both colours with the symbol count; printed `symbolColors` still win.
- Tests: `tests/unit/ui32.test.mjs` now 43 checks.

## v0.32.2
Owner feedback on v0.32.1: yellow and gold looked the same.
- Yellow is now a lemon yellow (`#f5e50a`, was `#f2c94c`) so it is clearly different from the gold of the Ultimate symbol (`#d4af37`).

## v0.32.1
UI change requested by the owner (review comment on v0.32.0).
- Cost circle: the number gets a dark outline, so it stays readable on white (and yellow) cards.
- Symbol indicator in the bottom-right corner of every Spirit (Hand, Field, deck builder; Nexuses too since v0.32.7): the number of symbols on a circle in the symbol colour; mixed colours as a pie with one slice per symbol; the Ultimate symbol in gold (`--color-ultimate`). It turns with an exhausted Spirit like the magnifier. Nexus, Magic and Brave cards have none.
- Card data: optional `symbolColors` (1-5 of the colours or `ultimate`, one per symbol; sets `symbols`). Cards without it keep their colour and count; the built-in pack is unchanged.
- Deck builder: the copy count moved to the bottom-left so it does not cover the symbol indicator.
- Ready for later sets (display only until the rules arrive with issue #4): all six colours have badge colours; Ultimate cards (`type: "Ultimate"`) get a gold ring around the frame, a gold tint, a cost circle split between their colour and gold, and a gold ring on the symbol badge; Rebirth cards (`rebirthTo: "<id of the rebirth side>"`) show a gold ↻ on the type badge, and the rebirth side (`rebirthSide: true`) also gets a double frame.
- Tests: `tests/unit/ui32.test.mjs` (35 checks, PC + phone, part of `test:quick`).
- Backup: tag `backup/pre-v0.32.1` locally on the v0.32.0 commit.

## v0.32.0
CPU as an evaluation policy with weight profiles and a lethal check (issue #1, Aegis study point 7). No UI change.
- New part `src/js/09a-cpu-eval.js`: every CPU decision scores its options in one unit and takes the best; passing scores 0. Life is valued non-linearly (`lifeValue`: the last cores are worth the most); a Spirit's value is BP + symbols + printed cost (`unitValue`); `cpuEval` scores a whole board (zero-sum).
- Profiles `balanced` (default), `aggressive`, `defensive` are weight sets only (`CPU_PROFILES`), same code. Stored as `SETTINGS.cpuProfile`; no selector in the UI yet (UI changes need approval). "Reset settings" restores `balanced`.
- Attack: lethal check first (`cpuLethal`: worst case, every ready blocker stops one of the attackers with the most symbols) -> all-in; otherwise attack only with a positive score, and keep enough guards home when the opponent's next attack could take the CPU's Life (`guard` weight; `aggressive` keeps none).
- Block: compares taking the hit with each blocker (win, even trade, chump); always blocks a hit on the last Life, with a winner if any, else the cheapest body. Replaces the old fixed rules.
- Main Step: card choice by score (a new cheap Nexus first, then the strongest Spirit, as before). Magic, Flash, Advents, Revive and level-up keep their existing logic (lowest-risk scope).
- Test hooks: `BS.CPU_PROFILES`, `cpuEval`, `cpuLethal`, `cpuAttackChoice`, `cpuAttackScore`, `cpuChooseBlock`, `cpuBlockScore`, `cpuPlayChoice`, `cpuPlayScore`, `setCpuProfile(name, side?)`, `setSimProfiles({player, opponent})`; `simMatch(seed, {profiles})`.
- Tests: `tests/unit/cpu32.test.mjs` (29 checks, part of `test:quick`); property tests add aggressive-vs-defensive CPU matches (P01-P06 for that mode + P12), 25 property checks in all.
- Backup: tag `backup/pre-v0.32` locally on `93e82bd`; the commit history keeps v0.31.0.

## v0.31.0
UI changes approved by the owner (issue #6); PC and phone layouts otherwise unchanged.
- Coin toss buttons read `HEADS` / `TAILS`, turn order buttons `FIRST` / `SECOND`.
- Every dialog, peek-bar and pick-bar button label is shown in Title Case (`titleCase`, applied when the button is drawn, so new prompts follow it automatically).
- Card-style effect text (`effectLines` / `effectTextHTML`): header line (name, type, colour, cost), one line per effect block, level tags, timing tags and keywords marked. Used in the card detail, the enlarged card view and the Hand prompt.
- The automatic hover preview (PC) and long-press preview (phone) are gone. Every Hand and Field card has a magnifier button in its bottom-left corner that opens the card detail directly; for a Field card it also shows the live Lv / cores / BP. It does not cancel a waiting dialog.
- Tests: `tests/unit/ui31.test.mjs` (35 checks, PC + phone, part of `test:quick`); Python suites updated for the new labels and the magnifier.
- Tooling (after the release, no game change): `tools/check_renames.py` in the pre-push hook finds tests that still use removed names or old labels; Project docs trimmed to `CLAUDE.md` + `card-list.md` (token saving).
- Backup: tag `backup/pre-v0.31` locally on the previous commit (`9b422f7`); the commit history keeps v0.30.2.

## v0.30.2
- Release smoke test (`tests/unit/release.test.mjs`, 10 checks): opens the delivered single file on a PC screen (1366x768) and a phone screen (390x844), checks the menu loads without errors and the layout matches the screen, starts a match with the real buttons, reaches a playable board, survives a rotation/resize, and confirms the file is fully self-contained. It runs in the quick gate (pre-push), on every push (CI) and on the delivered copy before each release. A planted load-time error was caught by it.

## v0.30.1
- Token economy patch (no gameplay change; the build of the game script is byte-identical to v0.30.0 apart from the version).
- The full Python regression (parts 1-3, legacy, 30 CPU-vs-CPU sims) now runs on GitHub Actions in parallel (`.github/workflows/regression.yml`, started for each release), instead of inside the working session.
- The effect engine file is split into four parts (`src/js/02a`-`02d`), so a change reads only the part it needs.
- CLAUDE.md shortened (history moved to Issues and these notes); new `docs/ai/token-economy.md` with the token rules for every session.
- Project docs: the duplicate card JSON copies were replaced by a short card list (the repo stays the only source of card data).

## v0.30.0
- Tooling release (no rule or gameplay change). The game source is now split into `src/` (template, CSS and 17 script parts) and `index.html` is built from it by `tools/build.mjs`; the first build was byte-identical to v0.29.0.
- New headless test layer: 67 Node tests (`npm test`): build/layout 12, card data 14, engine helpers 24, seeded CPU-vs-CPU properties 17 (two decks x 10 seeds, determinism, replay). A full run takes about 90 seconds.
- New static check `tools/lint.mjs`; it found and removed duplicate keys (`evQ` in the game state, two `window.BS` hooks listed twice).
- New: GitHub Actions CI, issue templates and labels; open work moved to GitHub Issues #1-#5. `tools/pack_ai.mjs` makes a one-file project pack for the brainstorming chat.
- Choice (lowest risk): npm/pip downloads are blocked in the cloud workspace, so built-in equivalents are used instead of Vitest, fast-check, ESLint and Repomix (`node --test`, a seeded property runner, the TypeScript checker, `pack_ai.mjs`). ES modules + Vite were not used: they would hide the global functions the inline handlers and tests use.
- Known gaps tracked as tests: 37 glossary entries without a manual `rule` note (ratchet list `tests/unit/known-gaps.json`, issue #3).
- Tests: 67/67 Node tests; full Python regression parts 1-3 and legacy 1307/1307, 10 CPU-vs-CPU sims all passing.

## v0.29.0
- Official rule (Comprehensive Rules 4-8-1/4-8-2, Eternal Rule Manual p. 11): the Void is the core supply and has no limit. The Core Step (CR 7-3-2), the Count Area (manual p. 60) and "cores from the Void" effects take cores from the Void first and add new cores from outside the game when it is empty, so these effects are never cut short by an empty Void (Nao: cores = opposing Hand / 2).
- New `data/kb/rule-obligations.json`: every official rule the engine claims to obey, its manual page, status and proving test; `tools/check_obligations.py` checks it (27 rules: 23 enforced, 2 partial, 1 equivalent, 1 open).
- Direct tests for setup (Life, Reserve, Hand, Contract card, redraw, coin toss), the turn steps, battle results and deck-out.
- Known gap (manual p. 12): adding the Contract card to the starting Hand is optional; the engine always adds it (a choice prompt would be a UI change, suggested to the user first).
- Test tooling: the runner now also reads a suite's error output, so a crashed or empty suite can no longer count as passed; the image that legacy/hid needs is generated by make_fixtures (66 more checks run).
- Tests: v29 suite 42/42, full regression (parts 1-3, legacy, 30 CPU-vs-CPU sims) all passing.

## v0.28.0
- Official rule (Eternal Rule Manual FAQ Q5): "By doing X, do Y" is done only when Y is possible, and the player chooses whether to do it. New engine action `BY`; Paanch, Pachhattar, Sphinott-Hauser and Hazaar use it (they no longer pay X for nothing).
- Official rules (About Activating Effects): effects that activate at the same time form one pool and the turn player decides the order, also for the opponent's effects (Life reduced: attacker and defender effects together; When Attacks with "when an ally attacks"; When Manifests with the summon effects). An effect caused by a resolving effect resolves right after that effect has finished, before older pending effects (also for Activate effects and Bursts).
- Tests: v28 suite 27/27, full regression, 40 CPU-vs-CPU sims.

## v0.27.0
- Card images everywhere cards are listed: Trash (newest first), your Hand, Soul State, Banished, your Burst/Mirage area, the cards under a stacked Spirit, the Hand card dialog, Burst and Flash prompts, and every "choose a card" effect prompt show the cards like the starting-hand screen. Tap a card to enlarge it.
- When the cards do not fit, the row scrolls sideways (PC and phone); with few cards the row is centered. Hidden cards stay hidden (the CPU Hand, face-down Bursts, decks).
- Replay: board actions are recorded on every route; a record that ends while the match waits for a prompt counts as a clean end.
- Tests: v27 suite 31/31, full regression, 30 CPU-vs-CPU sims.

## v0.26.0
- Every match has a seed: shuffles, the coin toss and the random CPU deck use a seeded generator, so the same seed + decks + inputs give the same match.
- Match record: every prompt answer, field pick and board action of the human is recorded with the seed and both decks; the last 3 finished matches keep their record in the match history. `BS.runReplay(record)` replays it and reports whether the result and the hash of the whole log are identical (a changed seed or a missing input is detected).
- Named test scenarios: `tests/scenarios/*.json` boards loaded with `BS.loadScenario` (aliases, one Soul Core, consistent cores/cards).
- Tests: v26 suite 33/33, full regression, 30 CPU-vs-CPU sims. No rules changes.

## v0.25.0
- Grandwalker core effects: Erimakilizard (cores of opposing Grandwalker Nexuses to the Void), Magmatodon (reveal 5, deploy Ometeotl, Soul Core, destroy), Cladoselache LV2, Sphinott-Hauser (Manifest in either Attack Step, destroy up to 20000 BP, banish), Pachyrhachis and Magmazosia (Soul Core to Ometeotl), Ometeotl (unaffected with a Soul Core, counters +2).
- Official rules: the Soul Core never goes to the Void; When-Manifests effects do not activate in the Main Step; "all cores from an opposing Grandwalker Nexus" is one Nexus (Aath fixed).
- Cards list the printed clauses that are not implemented yet (`residual`, shown in the card detail).
- The Red prebuilt deck now plays 3 Ometeotl (instead of 3 Rokceratops, which needs Siegwurm).
- Tests: v25 suite 48/48, full regression, 30 CPU-vs-CPU sims. `tests/make_fixtures.py` recreates the files the older suites need. Design notes from the Aegis simulator: `docs/aegis-study.md`.

## v0.24.0
- Code review and cleanup: fabricated prototype cards and first-generation mechanics removed from the game (test fixtures live in `tests/`), real-card default deck, one version constant, no external network access (audited; record folded into `docs/ARCHITECTURE.md` in v0.59.3).
- Tests: v24 suite 52/52, plus the full regression.

## v0.23.0
- Official rule: cores of a Grandwalker Nexus go to the Void when it leaves the Field or enters Soul State.
- Official rule: Revive/Revival and "summon/deploy" effects without "without paying the cost" now pay the cost (Mitra Contract Skill, Pachhattar, Lizardedge, Altair). Humans get the payment dialog.
- Tests: v23 suite 25/25.

## v0.22.0
- Official rule: the Lv of a Contract Grandwalker Nexus (Mitra, Ometeotl, Zeus, Brahma, Lugh) follows your Count. Card text and hover show "Count N".
- Tests: v22 suite 21/21.

## v0.21.0
- Rules audit against the official manuals: Burst and Mirage can both be set; a replaced Mirage returns to the Hand; Flash includes the Main Step; the CPU sets Mirages.
- The effect glossary now carries the official rule for each entry (`rule` field) and a test checks it against the engine.
- Tests: v21 suite 20/20.

## v0.20.0
- Magic cards can have separate Main and Flash effects and an alternative cost (Wurm Draw).
- New Magic effects: REVEAL_ADD, BP_PLUS_MATCH. The CPU casts them (Main) and uses the Flash +BP to win a lost fight.
- Tests: v20 suite 28/28.

## v0.19.0
- New engine pieces: START_ATTACK trigger, Mirage "During Set" triggers (own/opposing Life reduced), STATIC flags (MUST_BLOCK, NO_RETURN, CORES_DRAW), AWAKEN action, Soul State summon, Trash-core moves to the attacker, lifeGe condition.
- Wired red cards: Goradon, Lizardedge, Sabecaulus, Balmung, Tartargar, Altair, Ankillersaurus, Katanakasago.
- Tests: v19 suite 36/36; older suites pass (two load-related flakes passed when rerun alone).

## v0.18.0
- Game log drawer: header button "Log" or key L (Esc closes). Side panel on PC, bottom sheet on phone; follows new lines.
- Card hover preview on PC (mouse only): image, type/cost/levels, live Lv/cores/BP for Spirits on the field, effect text and an "implemented?" warning.
- Keyboard: Space / Enter = Next, L = log, Esc = close.
- Match history (last 100, saved in the browser): shown in Settings with win rate and a Clear button.
- HOW TO PLAY page in the lobby.
- Tests: v18 suite 37/37; all older suites pass; 30 CPU sims clean.

## v0.17.0
- Built-in card pack: 62 cards (Saga 15-17: red BS75/BS76 and white Mitra / Awakened Dragon) are inside the game, no import needed. Imports can still override them; "Remove imported cards" keeps the pack. Rebuild with `python3 tools/build_cards.py && python3 tools/embed_pack.py`.
- 8 deck slots (rename, switch, ready-made decks: Training Red, White Mitra, Red BS75 draft). The old single saved deck becomes slot 1.
- PLAY page: choose your deck, the CPU deck (ready-made / random legal / mirror), and the format.
- Settings page: game speed (Normal / Fast / Instant) and optional synthesized sounds.
- Fixed: deck builder tiles overlapped on phones when many cards were shown.

## v0.16.0
- Advent during a battle now keeps the battle going: the Spirit on top of the stack continues as the attacker/blocker (before, the attack ended).
- CPU uses Flash: Contract Advent on its fighting Spirit when it turns a lost fight into a win, Mitra's Contract Field and Contract Skill.
- Mitra Contract Field second half: until the end of the turn, Contract Advent from Soul State (put Reserve cores onto the advent card; Field cores are not offered yet).

## v0.15.0
- Card data reorganised per Saga plus one all-cards file (see Data).
- Lobby: the main button is now PLAY; the PLAY page holds the format choice and VS CPU MATCH. The library button is now "CARD LIBRARY" (import buttons are inside).
- Engine: event queue ("opposing Hand increases by an opposing effect", "ally depleted/destroyed"), trigger "ally attack reduces the Life", Revive from Soul State, new conditions (oppTurn, soulLe, putGe, hasName), actions LIFE_TO_RESERVE and TRASH_CORES_TO.
- Cards wired: Mitra's Revelation Temple, Nao (Burst + When Summoned), Banve (Life to Reserve), Do (cores from Trash, Soul State entry), Mitra Revive.

## v0.14.0
- Soul State Area on both fields (top-right for you, bottom-left for the CPU), no card limit; the Void zone for cores.
- New white deck data: the white cards in `data/cards/saga-16.json` and the deck list `data/decks/white-mitra-awakened-dragon.txt`.
- Effects that trigger together: you choose the order.
- Contract Advent and Manifest (Hand, Main Step and Flash windows), "When Advents" trigger.
- White Mitra deck: Teen, Iktis, Aath, Pachhattar, Iktalis (Contract Advent) and Banve, Hazaar (Manifest) are now playable.
