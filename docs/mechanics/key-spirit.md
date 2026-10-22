# Key Spirit (v0.103.0)

Aeterna house rule from the owner (roadmap U/I queue): one Spirit card per deck can be marked as the deck's
**Key Spirit** in the deck builder; while no copy of it is in the Hand or on the Field, every draw from the Deck
favours its copies.

## Rules in our words (the house rule, engine reading)
1. The mark belongs to the DECK SLOT (one card id); it must be a Spirit with at least one copy in the deck
   (`validateDeck` third argument; `loadSlots` keeps marks only for Spirits; removing the last copy clears the mark).
2. The weighted draw applies ONLY to draws during play — the single draw funnel `draw(p, n)` (Draw step + DRAW effect
   actions). NOT weighted: the Opening Hand deal, the Starting-hand redraw, the Contract setup draw, and anything that
   reveals or searches the Deck (they never call `draw()`).
3. "No copy in the Hand or on the Field" reads as a presence check over `p.hand` and the field list (`fieldList(p)` =
   Spirits + Nexuses). Soul State / Mirage / a copy sitting under something do NOT count — the literal wording is
   honoured (documented reading).
4. Weight = `KEY_WEIGHT` (2) per copy vs 1. The weighted pick splices the drawn copy to the deck front first, so later
   natural draws keep their order; the seeded RNG is read exactly once per weighted draw and not at all while the rule
   is inactive (decks without a Key Spirit draw exactly as before, replays stay deterministic).
5. Records: `G.rec` and the port record carry `keyA` / `keyB` / `keyW`; replays replay a match with its keys; records
   without key fields (old builds) stay deterministic — no hidden auto-keys for sims (H82-04 keeps headless and the
   browser sims identical, keys enter only via explicit opts or a record).

## Built
- `00-config`: `KEY_WEIGHT`; `04-decks`: the slot key field (saved/loaded with a Spirit guard), `keyOfDeck`/`pickKey`
  (the CPU's deterministic pick for a player-built deck it uses: most copies, then the smallest id), prebuilt/starter
  keys, `cpuDeckFor` `CPU_KEY` (the mirror plays the deck's marked key, else the deterministic pick), `loadPrebuilt`
  carries the starter's key.
- `06-rules`: `keyDrawActive` / `drawKeyFirst` / `draw`; `15-match` / `15b-replay` / `headless`: seat keys + records;
  web: the deck builder KEY button (`db-key`, one per Spirit row), the deck code `KEY <id>` line (at most one),
  My decks tile badges, one How-to-play line.

## Measured (the sizing run: 40 starter-vs-starter pairs, seeds 1001-1004, rule on vs off)
- Key in Hand at the End Step of the owner's turns 1-4: 40.0% natural → 46.9% with the rule (+7 points).
- First-draw rate (unit test): 13.9% weighted vs 7.5% natural (6/43 vs 3/40 for a 3-copy key).
- Win rate and average turns unchanged (first seat 19 vs 21 → 20 vs 20; 5.7 turns both ways) — a nudge, not a shift.
- `KEY_WEIGHT` stays 2.

## Official bench record (docs/reports/cpu-bench.*, v0.103.0, the same 240-match matrix with the keys passed by tools/cpu_bench.mjs)
- 240/240 finished, 0 errors, 0 timeouts; 6.0 turns average, first seat 45%, idle attack 0.141 / idle summon 0.023 per own turn.
- Deltas vs the v0.102.0 baseline are the seeded consequence of the keys biasing early draws (same seeds, no CPU or deck-list change): first seat 48.8 → 45%, avg turns 6.1 → 6.0, style pairings 65/35/65 → 60/30/40 (aggressive-defensive / aggressive-balanced / balanced-defensive), colours green 61 → 72%, red 44 → 57%, white 61 → 50%, blue 56 → 47%, yellow 49 → 43%, purple 40 → 42%.
