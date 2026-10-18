# Effect compiler v2 plan (owner request 2026-10-18)

Why: the card pool is close to one effect text per card (17 exact duplicates in 8,041; 18 shared texts over 56 staged cards), and the v1 compiler (`tools/compile_effects.py`) matches whole sentences, so each new pattern unlocks about 2 cards. Every staged card that v1 can compile is already promoted (scratch compile 2026-10-18: compiled 0, review 7,433). Closing the data gaps (Nexus levels for 717 cards, Ultimate Trigger lines for 119, v0.60.3) removed those reasons but unlocked 0 cards on its own: each card still has another sentence v1 does not read.

Evidence that the wording, not the engine, is the wall:
- Standard block A cards (the official format since April 2026, `docs/reports/priority-report.md`) write "Target an opposing 4000 BP or less Spirit. Destroy it." (target sentence + action sentence). v1 compiles 0 of 12 simple block A samples (When Destroyed destroy/bounce, can't attack, exhaust, BP+), although the engine has every action they need.
- Aegis (`docs/aegis-study.md`, "Card coverage at scale") reaches full coverage of 4,480 cards with one small declarative module per card in a composable IR (`trigger`, `condition`, `actions[]` with `filter`, `count`, `to`), all 4,559 modules marked `coverage: "full"`, no manual mode.

## Design (clause level, same output JSON as v1)
1. **Split** a paragraph into head (level brackets, timing, keyword templates such as `{{tk|Clash}}`, `{{Rumble|3}}`) and body sentences. Accept both `[LV1][LV2]` and `[LV1-2]`.
2. **Target clauses** -> a selector: owner (opposing / your / either), kind (Spirit, Ultimate, Nexus, card in Trash/Hand), filters (BP or less, Cost N or less/more, exhausted, family "X", colour, with keyword K), count ("up to N", "one of your", "all").
3. **Action clauses** -> engine actions applied to the selector or to "it/them/this Spirit": destroy, return to Hand/deck, exhaust, refresh, send cores, put core from Void, BP +/- (this turn / this battle), can't attack/block, draw, discard, reveal-and-add, summon/deploy from Trash or Hand.
4. **Connectives**: "Then,", "If you've done so,", "Also, if ...", "instead" (replacement), "For each X, +N".
5. **Keyword heads** (block A first): Clash, Rumble, Amplify, Shamanism, Current, Magirrate, True Release, Legacy, Soul Magic; each needs a rule note (`docs/manual-notes.md`) before engine work.
6. Unknown clause -> Review with the exact clause (as v1), so promotion stays "read every card once".

## Sessions (Opus, heavy, one each)
1. **Prototype + measure:** v2 for target/action pairs and the "[LV1-2]" head on the existing staged pool behind a flag; scratch recompile; report real unlocks per clause (`tools/lever_report.py` style). Keep v1 output identical for the 608 playable cards (test).
2. **Block A import** (owner present for the browser): read the 26R set pages and card pages (~700 numbers, `docs/reports/priority-report.md`) into `data/sources/fandom-cards-26r.json`, import as block "A", compile with v2, promote by colour toward the deck target.
3. **Keyword heads** by measured unlocks, one per session, with scenarios first.
