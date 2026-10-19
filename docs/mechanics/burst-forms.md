# Burst forms (v0.71.0)

Second pack of the pattern-first plan (`docs/ai/roadmap-open.md` item W, rows "Burst" and "wiki template {{Burst}}" of
`docs/reports/pack-plan.md`). The Burst mechanic itself (set, activation, resolution order) is older:
`docs/mechanics/burst-order.md`.

## Source
- Fandom wiki, page "Burst" and Comprehensive Rules / Categories of Effects, section "Burst Activation"
  (`python3 tools/wiki_rules.py --show "Comprehensive Rules/Categories of Effects" --section "Burst Activation"`).

## Rules in our words (paraphrase, not wiki text)
1. A Burst is declared when its condition happens, but it resolves only after the event and every effect caused by
   that event: for "after an opposing Spirit attacks" that means after all (When Attacks) effects of the attack, and
   before the Flash timing before the block.
2. "Spirit" in a condition does not include Ultimates; "Spirit/Ultimate" does.
3. "Having a Burst set" means a face-down card in your Burst Area (a Mirage set card is not a Burst).

## Built
- Compiler: the `{{Burst|...}}` paragraph may stand anywhere in the text (the export often puts it after the card's
  own Main/Flash text); the older spelling `☼[ Burst: ... ]`; condition spelling variants of the four known
  conditions; "activate the Main/Flash effect of this card" as the then-effect.
- Engine conditions: Burst `when` **OPP_ATTACK** (`noUlt` for the plain "Spirit" wording; fired in `doBattleInner`
  after the attack's trigger pool) and **OPP_SUMMON_ADV_FX** ("(When Summoned/Advents)": also answers an Advent's
  (When Summoned) effect, which the plain OPP_SUMMON_FX does not).
- Condition clauses in front of an action ("If you have a Burst set, ...", "If you control any Purple Ultimate, also,
  ...", "If you have three counters or more, ...") become the action's `if`: new fxIf keys `burstSet`, `oppBurstSet`
  and `ctrl` (same shape as `summonIf.ctrl`), plus the older `controlName`, `counterGe`. "instead" (a replacement)
  stays in review. A step window body "While you have a set Burst, ..." adds `burstSet` to the window.
- "While you have a Burst set, this Spirit card in Hand becomes Cost N" = `costAlt {cost: N, if: {burstSet: true}}`.
- Any other sentence that names a Burst is reviewed as "Burst sentence" (no blanket stop on the word any more).

## Measured
- Scratch recompile before building: 2 cards from the Burst paragraph alone (the pack-plan rows promised 189, an
  upper bound); with the condition clauses 12 cards (promoted in v0.71.0).
- Left (first review reason after this pack): inline `{{Burst|con|...}}` references (~113), "depleted/destroyed by
  the opponent" conditions (37; the engine does not track who caused a depletion), Spirit Bursts with a sentence
  after the summon (~25), "(When Summoned/Deployed)" Nexus conditions (14), discard / look at an opposing Burst.
