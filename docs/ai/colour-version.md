# Colour version checklist (read when building a colour deck, issue #7)

Distilled from v0.37 blue, v0.38 green, v0.39 purple. Follow it instead of rediscovering the pattern; target <= 60 tool calls.

## 1. Pick the deck (2-3 calls)
- List the colour's Contractor decks in `data/import` (Saga 13-17, Standard Block A) with one `python3 -I -c` (id, name, family, effect keywords only).
- Choose the lowest-risk deck: mechanics the engine mostly has; avoid Magic-heavy, Ultimate, Flag / Fungal / Spectral Contract, Unleash. Write the choice and the reason in the release notes ("Deck choice (lowest risk, ...)").
- ~25-35 unique cards; 40-card deck, `data/decks/<colour>-<contractor>-<family>.txt`.

## 2. Card data (one script)
- `python3 tools/promote_import.py ...` -> `python3 tools/build_cards.py && python3 tools/tag_effects.py && node tools/build.mjs`.
- Gaps (Neo-Core Charge target, Lv thresholds, Contract symbol): cardrush-bs.jp / yuyu-tei.jp, one WebFetch per card page with a narrow prompt.
- Card images only for fields the export lacks or that look wrong: contact sheet of ~20 cropped corners per image, never one image per card. Fields that stay unverified get a `note` on the card and a line in the release notes.

## 3. Engine
- New actions / triggers / conditions in one file per mechanic: `packages/engine/src/02<letter>-effects-<mechanic>.js` named by what it does, never by a colour or a release (pattern: `02e-effects-removed.js`, `02f-effects-mill-discard.js`); follow skill bs-effect-mechanic-adder.
- Every new keyword: glossary entry with an official `rule` note (or marked partial), `python3 tools/check_obligations.py`.
- Residual text stays listed on the card; never invent effects.

## 4. Tests and checks
- `tests/unit/<colour><minor>.test.mjs`, 20+ tests (template: `contractor_hades_deck.test.mjs`); `npm run -s loop` while working.
- Legacy suites (v17, v21, v22, v24) read card and Contractor counts from `build/all-cards.json` (since v0.39.1): no edit needed for a new deck.
- Sims: through the Regression workflow (dispatch in `release.md`), plus a few seeded games of the new deck vs red / white / the previous colour. Report wins honestly ("untuned").

## 5. Release notes template (bullets)
Colour expansion N/4 + deck; Deck choice; Data source (what was read where, what is unverified); Engine; Wired; Left out on purpose; Rules honesty (if a rule is missing from the manual); UI (only suggestions, need approval); tests + sims; Open.
