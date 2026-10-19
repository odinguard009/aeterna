# End of battle (Curse, Brilliance, "At the end of battle") and ally battle results (v0.78.0)

Fifth bundle release (plan W, rows "sentence: at the end", "no trigger: When only the" of `docs/reports/pack-plan.md`
"Measured order", plus the end-of-battle keywords Curse and Brilliance found under them).

## Source
- Fandom keyword pages [Curse](https://battle-spirits.fandom.com/wiki/Curse) and
  [Brilliance](https://battle-spirits.fandom.com/wiki/Brilliance) (keyword text, Q&A).
- [Comprehensive Rules / Categories of Effects](https://battle-spirits.fandom.com/wiki/Comprehensive_Rules/Categories_of_Effects),
  sections "At the End of..." (examples 1 and 2) and "Spirits' When Attacks/Blocks Effects"; Official Rule Manual
  (Standard) battle procedure (resolution, destruction, end of battle).

## Rules in our words
1. A battle ends after the BP comparison and the destruction (or after the Life damage when unblocked), and also when
   it ends early (a fighting Spirit left the Field). End-of-battle effects resolve then, before "during this battle"
   effects expire.
2. "At the end of (the) battle, X." inside a (When Attacks / Blocks / Battles) effect: X waits until that moment and
   resolves only if its source is still on the Field.
3. Curse: at the end of the battle the Spirit that blocked is destroyed (an effect destruction, so "unaffected"
   protects it). It needs the battle to reach the BP comparison; it works even if the Curse Spirit lost and left the
   Field; nothing happens without a block or when the blocker is already gone.
4. Brilliance: at the end of the battle, while the source is on the Field, every Magic card its owner used during this
   battle and that is now in the Trash returns to the Hand.
5. "When only the opposing Spirit is destroyed by comparing BP with your X Spirit" (on another card) = one of your
   Spirits matching X won a BP comparison (the opposing one destroyed, yours not; a tie does not count).
   "(Your Attack Step)" = your Spirit was attacking, "(Opposing Attack Step)" = it was blocking; "the opposing
   attacking / blocking Spirit" names the same side. "Refresh that Spirit / the blocking Spirit you control" = the
   Spirit that won.
6. House reading: "(When Battles)" in front of "At the end of battle" = When Attacks/Blocks. The level of a Brilliance
   effect is checked when the attack is declared, not again at the end of the battle.

## Built
- Engine: module `02o-effects-battle-end.js` (`END_BATTLE` {then}, `CURSE`, `BRILLIANCE`, `DESTROY_SELF`,
  `REFRESH` `to: 'subject'`, `endOfBattle()` called by `doBattle`); trigger `ALLY_BATTLE_WIN` (02a, 02d, fired next to
  `BATTLE_WIN` in 08-battle); `match.symbolsGe`; `castMagic` records Magic used during a battle (06).
- Compiler: Curse / Brilliance keyword paragraphs, ally battle heads (`ally_win`, step window side), (When Battles)
  before an end-of-battle body (`compile_effects.py`); "At the end of battle, X.", "Destroy this Spirit.",
  "refresh that Spirit", "give a Spirit you control +N BP" (`compile_v2.py`).
- Tests: `tests/unit/pack78.test.mjs` (PK78-01..05).

## Measured
- Scratch recompile: **+23 cards** (24 compiled; BS06-058 held back: its export prints "[LV1][LV2][LV2]").
- Left: "Spirit with Evolution / Current / When Blocks effect" conditions (cards carry no keyword field),
  "[A]/[B]" control conditions with a return from the Trash, "another X" conditions, optional end-of-battle bodies
  ("you can summon ..."), reveal "equal to this Spirit's level", ally results that discard by the destroyed Spirit's
  cost or check "BP+" effects, Brave filters ("exhausted Brave Spirit", "braved Brave").
