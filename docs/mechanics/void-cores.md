# Void cores, attack/block battle results, existing-action sentences (v0.74.0)

First release built as a bundle of packs (owner, 2026-10-20: 3-4 packs per release, ranked by the measured yield of
`python3 tools/pack_plan.py --measure`, `docs/reports/pack-plan.md` "Measured order").

## Source
- No new rule was needed: every sentence maps onto an action or trigger the engine already modelled. The battle result
  head follows Comprehensive Rules 8-1-6-2 as used since v0.55 (`BATTLE_WIN`); core moves from the Void use the
  existing `VOID_TO_RESERVE` / `VOID_TO_CARD`. The wiki pages were not re-read this session (nothing to decide).

## Rules in our words
1. "Put a core from the Void to one of your [colour] [family] Spirits" gives the core to one Spirit of yours that
   matches the filter; with no matching Spirit nothing happens. An unmarked "a Spirit" is not read (we do not guess
   whose Spirit it is).
2. "(When Attacks) When only the opposing Spirit is destroyed by comparing BP, ..." is the battle result for the
   attacker; "(When Blocks) ..." for the blocker; "(When Battles)" or no head at all (older prints) for either.

## Built
- Compiler `tools/compile_v2.py` `void_cores`: Reserve spellings ("Void" / "the Void", "your" / "the" Reserve) and
  one own Spirit with one colour or one or more families (+ "You can" = optional). Trash, Nexus, "each to every",
  "Red/White" (two colours) and two-destination sentences stay in review.
- Compiler `tools/compile_effects.py`: `BATTLE_HEADS` "(When Attacks)" = `BATTLE_WIN` + `attackingOnly`, "(When
  Blocks)" = `BATTLE_WIN` + `blockingOnly`; `TRIGGERS` BATTLE_WIN head: "(When Battles)", "(When Attacks/Blocks)" and
  "by BP comparison" optional.
- Compiler sentences for actions that already existed: "Discard N cards from your Hand" (`DISCARD_HAND`), "Your
  counters +N", "Send an opposing Life to their Reserve" (`LIFE_TO_RESERVE`) / "to the Trash" (`OPP_LIFE_TO_TRASH`).
- Engine: `VOID_TO_CARD` accepts `match` (candidates = own Spirits that match); effect flag `blockingOnly` on
  `BATTLE_WIN` (parse `02c`, resolve `02d`).

## Measured
- The measured ranking estimated ~58 cards for the three packs; the scratch recompile gave **+13** (12 read now plus
  Potion Berry, which already compiled). Estimate / result is ~4x: the measure swaps ONE sentence, the real cards need
  every other sentence too. Next measures should be read as "at most".
- Left: "with your <family / keyword> Spirit" ally battle results (new trigger), "During this turn, when only ..."
  (granted effects), bodies such as "exhaust every Spirit with the same LV", "return an opposing Spirit/Brave/Nexus",
  "refresh two <family> Spirits", "summon a Brave card from your Hand without paying the cost" (SUMMON_HAND needs a
  match by name or family), Void to Trash (core Trash is not modelled).
