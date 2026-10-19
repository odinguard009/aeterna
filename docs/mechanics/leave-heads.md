# Leave heads and effect connectives (v0.73.0)

Fourth pack of the pattern-first plan (`docs/ai/roadmap-open.md` item W, row "no trigger: When this Spirit" of
`docs/reports/pack-plan.md`, family "event trigger head").

## Source
- Fandom wiki, Comprehensive Rules / Categories of Effects, section "Spirit/Nexus' When Destroyed Effects", and
  Comprehensive Rules / Destruction, section "Resolving Destruction" (`python3 tools/wiki_rules.py --show
  "Comprehensive Rules/Destruction" --section "Resolving"`).
- Fandom keyword pages Curtain Call and True-Curse (the printed "would leave the Field due to opposing effects /
  due to the opponent" wording) and Comprehensive Rules / Depletion "When Spirits/Ultimates are Depleted by the
  Opponent" (depletion caused by an opposing effect counts as caused by the opponent).
- Comprehensive Rules / Effect Texts on "Then" (the part after "Then" needs the part before it to have been done).

## Rules in our words (paraphrase, not wiki text)
1. "Destroyed by the opponent" covers both an opposing effect and losing a BP comparison; "destroyed by opposing
   effects" covers only an opposing effect.
2. "Would leave the Field due to the opponent" covers every way the opponent makes the Spirit leave: destroyed by an
   opposing effect or in battle, depleted because an opposing effect removed its cores, returned to the Hand or
   Deck or removed by an opposing effect. "Due to / by opposing effects" leaves out BP comparison.
3. A Spirit that leaves by its owner's own effect or own cost never activates these effects.
4. "A. Then, B." does B only when A was done; "A, and B." does both, in order, and a condition in front covers both.

## Built
- Compiler (`tools/compile_effects.py` TRIGGERS): "When this Spirit is destroyed by the opponent," = `DESTROYED` +
  `byOpp`; "... destroyed by opposing effects / an opposing effect," = `DESTROYED` + `byOppFx`; "When this Spirit
  would leave the Field due to the opponent," = `LEAVES`; "... (due to|by) opposing effect(s) / an opposing effect,"
  = `LEAVES` + `byOppFx`. Bodies about this Spirit (refresh, BP, return it) stay in review.
- Compiler (`tools/compile_v2.py` `action_of`): "Then, B." = B with `if.prev`; "A, and B." (B starts with draw, put,
  send, return, destroy, discard, exhaust, refresh or "your counter") = both actions when each half reads alone
  and B is not optional.
- Engine: `G.fxBy` = the player whose effect is resolving (`runActions`); `removeSpirit` takes `'battle'` for BP
  comparison (still "by the opponent") and works out "by an opposing effect" from it; `leaveEvent` queues `LEAVES`
  from `removeSpirit` (destroyed, depleted, removed) and `bounceCard` (returned); the card resolves from Standby or
  its new zone with its level at leaving (`lostLv`). House reading: the effect resolves just after the card left,
  as (When Destroyed) does; no printed body that depends on the card staying is compiled.

## Measured
- Scratch recompile: the leave heads alone +1 card (the bodies are the real blockers: 35 cards had the head as
  their only open head, but 34 of them have an unread body); the two connectives +11. 12 promoted.
- Left: "you can return it to the Hand" (Curtain Call, a replacement), "by <cost>, this Spirit remains on the Field"
  (replacement), "(Opposing Turn)/(Your Turn)" in front of the head, "When this Spirit becomes the target of
  Tribute", "When this Spirit card is discarded/sent to the Trash from your deck by ...", "exhaust two opposing
  Spirits" (exactly N), "including being in Soul State/pre-advent condition", braved-paragraph (When Destroyed).
