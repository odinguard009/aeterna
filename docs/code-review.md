# Code review, v0.24.0

Scope: `index.html` (single-file game), card data, tools and tests. Goal: a clean foundation with no leftovers from the first prototype.

## Findings and actions
| Finding | Action |
|---|---|
| Fabricated prototype cards in the shipped game: TST-001..003, TST-X01 ("Siegwurm" with an invented effect), TST-ADV1 ("Siegwurm-Nova"), TST-CNT1, TST-BST1, TST-MIR1, TST-N01, TST-MG1..6. | Removed from the game. Rebuilt in the current effect format as test-only fixtures (`tests/fixtures/prototype_cards.js`), registered through `BS.defBuiltin` so their ids stay reserved. |
| First-generation mechanics only used by those cards: `onSummon:'DRAW1'`, `onAttack:'COUNT1'`, the legacy Burst form, and the whole old Advent path (`advent`, `adventSources`, `doAdvent`, `humanAdvent`, the Advent button, the ADV badge). | Deleted. Real Advent is Contract Advent / Manifest through the effect engine. |
| The default / first-run deck and the "Preset" button used the Training deck (fake cards). | Now a real-card deck (Mitra, legal in Eternal); the button is "Default deck". The Training deck is a legal 40-card deck of generic vanilla cards, kept for sims and tests. |
| Stale header comments ("Cards in this build are TEST cards", "kept from the v0.2.0 prototype"). | Rewritten. |
| Version string repeated in three places. | One `VERSION` constant (title, header, `BS.VERSION`). |
| `BS.defCard` was exposed to the page. | Removed; only `defBuiltin` (fixtures) is exposed. |
| Test files in the repo root. | Moved under `tests/` with a README. |

## Checked and fine
- No network access of any kind from the game (no fetch/XHR/WebSocket/eval/external script). Everything stays in the browser; `localStorage` only for decks, imported cards, settings and history.
- Imported card text and names are escaped in every `innerHTML` template; a hostile card cannot run script.
- Corrupt or blocked `localStorage` does not break start-up.
- All 62 registered pack cards pass a data audit (ids, colours, cost range, level ordering, BP, effect and Burst re-validation, action names).
- Known skipped card: one Brave card (Brave is not implemented yet).

## Still open (not code smells, missing rules)
Grandwalker core effects, Over Count, Brave, Ultimate, Token, Seal, Heavy Exhaust, (When Blocks)/(When Destroyed) on the Spirit itself, draw game. See `docs/rules-coverage.md`.
