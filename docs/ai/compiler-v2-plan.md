# Effect compiler v2 plan (owner request 2026-10-18)

Why: the card pool is close to one effect text per card (17 exact duplicates in 8,041; 18 shared texts over 56 staged cards), and the v1 compiler (`tools/compile_effects.py`) matches whole sentences, so each new pattern unlocks about 2 cards. Every staged card that v1 can compile is already promoted (scratch compile 2026-10-18: compiled 0, review 7,433). Closing the data gaps (Nexus levels for 717 cards, Ultimate Trigger lines for 119, v0.60.3) removed those reasons but unlocked 0 cards on its own: each card still has another sentence v1 does not read.

Evidence that the wording, not the engine, is the wall:
- Standard block A cards (the official format since April 2026, `docs/reports/priority-report.md`) write "Target an opposing 4000 BP or less Spirit. Destroy it." (target sentence + action sentence). v1 compiles 0 of 12 simple block A samples (When Destroyed destroy/bounce, can't attack, exhaust, BP+), although the engine has every action they need.
- Aegis (`docs/aegis-study.md`, "Card coverage at scale") reaches full coverage of 4,480 cards with one small declarative module per card in a composable IR (`trigger`, `condition`, `actions[]` with `filter`, `count`, `to`), all 4,559 modules marked `coverage: "full"`, no manual mode.

## Measured 2026-10-18 (staged pool, 7,433 cards)
- Whole-sentence templates (numbers, colours, families, wiki templates and brackets replaced by slots): 14,258 distinct over 24,680 sentences; the top 1,000 templates cover only 43% of sentences and fully cover 415 cards. Clause strings (split at commas / "then"): 14,466 distinct; the top 2,000 fully cover 1,036 cards. **So pattern matching, even at clause level, cannot scale.**
- The verbs are few: when, during, if, destroy, return, put, summon, send, draw, discard, give, refresh, reveal, add cover most clauses. **v2 must be a small grammar** (head + selector noun phrase + verb + modifiers), not a list of templates: one noun-phrase rule ("an opposing Cost 3 or less exhausted Spirit") serves every verb.

## Design (clause level, same output JSON as v1)
1. **Split** a paragraph into head (level brackets, timing, keyword templates such as `{{tk|Clash}}`, `{{Rumble|3}}`) and body sentences. Accept both `[LV1][LV2]` and `[LV1-2]`.
2. **Target clauses** -> a selector: owner (opposing / your / either), kind (Spirit, Ultimate, Nexus, card in Trash/Hand), filters (BP or less, Cost N or less/more, exhausted, family "X", colour, with keyword K), count ("up to N", "one of your", "all").
3. **Action clauses** -> engine actions applied to the selector or to "it/them/this Spirit": destroy, return to Hand/deck, exhaust, refresh, send cores, put core from Void, BP +/- (this turn / this battle), can't attack/block, draw, discard, reveal-and-add, summon/deploy from Trash or Hand.
4. **Connectives**: "Then,", "If you've done so,", "Also, if ...", "instead" (replacement), "For each X, +N".
5. **Keyword heads** (block A first): Clash, Rumble, Amplify, Shamanism, Current, Magirrate, True Release, Legacy, Soul Magic; each needs a rule note (`docs/manual-notes.md`) before engine work.
6. Unknown clause -> Review with the exact clause (as v1), so promotion stays "read every card once".

## Next session plan (written 2026-10-18 for the next "Lanjutkan roadmap")
Scope: heavy, alone, minor release (v0.61.0). Order:
1. `tools/compile_v2.py` (new file, v1 untouched): tokenizer + head parser (level brackets incl. `[LV1-2]`, timing, `{{tk|...}}` / keyword templates kept as heads) + **selector grammar** (owner, kind, BP/cost bounds, exhausted, family, colour, keyword holder, count) + the 8 most common verbs (destroy, return to Hand/deck, exhaust, refresh, send cores, put core from Void, BP +/-, draw) + connectives ("Then,", "If you've done so,").
2. Gate: v2 output equals v1 output for all 608 playable cards (test), so nothing shipped changes.
3. Measure on the staged pool (scratch, `--v2`): cards that compile, top remaining review reasons by verb/selector; write `docs/reports/compile-v2-report.md` (generated).
4. Promote only cards whose text was read against the JSON, in batches of 20 per colour of the newest Saga (`docs/reports/priority-report.md`), each batch with generated scenario tests (point 5); stop at ~80 calls.
5. **Generated tests per action** (token saver): `tests/unit/lib/fx-props.mjs` builds one board per compiled effect from its JSON (e.g. "destroy <= N BP": a target at N is destroyed, one at N+1000 is not), so a promoted card needs no hand-written test unless its effect is new.
6. Release, priority report, mind map.

Card-author agent pilot (owner idea, 2026-10-18; after v2 exists, for the cards v2 still sends to review): 20 cards of the newest Saga, agents write per-card effect JSON patches (data only, existing actions only; missing actions go to a counted list), a second agent that has not seen the work checks text vs JSON (skill Q4 `bs-card-verify`), generated tests + strict mode + fuzz gate them, the main session merges. Measure tokens per card and the error rate; continue only if at most 1 of 20 is wrong after verification. Agents get 10-20 cards per call so the shared schema is read once.

Owner action that saves the most time and tokens: allow `battle-spirits.fandom.com` for this cloud workspace (claude.ai Settings > Capabilities, allowed domains, if the plan offers it). Then sessions read the wiki API with `curl` directly instead of relaying data through the browser and the chat (this session relayed ~60 KB by hand and had to checksum it). The block A import (~700 cards) depends on it or on the browser.

## Sessions (Opus, heavy, one each)
1. **Prototype + measure:** v2 for target/action pairs and the "[LV1-2]" head on the existing staged pool behind a flag; scratch recompile; report real unlocks per clause (`tools/lever_report.py` style). Keep v1 output identical for the 608 playable cards (test).
2. **Block A import** (owner present for the browser): read the 26R set pages and card pages (~700 numbers, `docs/reports/priority-report.md`) into `data/sources/fandom-cards-26r.json`, import as block "A", compile with v2, promote by colour toward the deck target.
3. **Keyword heads** by measured unlocks, one per session, with scenarios first.
