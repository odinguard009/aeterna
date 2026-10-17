# Effect priority and "unaffected"

- **Source:** Eternal manual FAQ "About Effects in General" Q3; JP Eternal 17.0 rule revision notice, item 9 (summaries in `docs/manual-notes.md`, section "Effects").
- **Rule:** "cannot" > "must" > "do" = "can". Immunity order: "cannot be prevented" > "unaffected" > "cannot activate". A Grandwalker Nexus is unaffected except by its own effects and effects that target a Grandwalker Nexus; a card in the Burst state is unaffected except by effects that target Bursts.
- **Decision (v0.58.0, session E):** STATIC flags `UNAFFECTED` / `HAND_UNAFFECTED`; `fxImmune(owner, target, acting effect)` filters effect targets; `ignoreImmune` beats unaffected; can't block beats must block, and unaffected Spirits are not bound by must block. Armor / Heavy Armor / Ultra Armor compile to these flags.
- **Engine:** `fxImmune`, `unaffectedBy`, `STATIC_FLAGS` (`packages/engine/src/02a-effects-base.js`); `trashSafe` and the candidates filter (`packages/engine/src/02k-effects-immunity.js`).
- **Tests:** `tests/unit/armor58.test.mjs` (A58-*), `tests/suites/v21_tests.py`; scenarios `heavy-armor-red-purple-unaffected.json`, `ometeotl-soul-unaffected.json`.
- **Open:** conditional "unaffected" (while exhausted, During Seal, while in the Trash, Nexus counter conditions), granted Armor, "this effect is unaffected", Banve / Grandwalker immunity cards (`docs/ai/roadmap-open.md`, session E). "Effects can't activate" for constant effects with no place/condition: build with the first card that needs it. Coverage row: `docs/rules-coverage.md` "Rule priority".
