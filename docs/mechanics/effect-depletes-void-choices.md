# "When this effect destroys/depletes", Void choices, core floors, new conditions (v0.77.0)

Fourth bundle release (owner, 2026-10-20: 3-4 packs per release from `docs/reports/pack-plan.md` "Measured order"):
rows "sentence: when this effect", "sentence: put a core", "sentence: if you control" and the targeted core-removal
sentences of "sentence: target an opposing" (Standard block A first).

## Source
- Effect Texts / "Targets of Effects" and "Depletion" in the Fandom Comprehensive Rules (a Spirit with no cores is
  depleted and goes to the Trash; "deplete" = brought to 0 cores by the effect).
- Early card wording "Gain N core(s) on this spirit / in your Reserve / on target nexus": the later wording of the same
  cards is "Put N core(s) from the Void to ..." (house reading, recorded here).

## Rules in our words
1. "<Destroy X>. When this effect destroys any Spirit, draw a card." = draw only when the destruction happened (DESTROY
   `thenDraw`). "<Send a core from an opposing Spirit>. When this effect depletes any Spirit / brought the number of
   cores on that Spirit to 0 / If it depletes, draw a card." = draw only when the target was depleted.
2. "Put a core from the Void to your Spirit/Reserve" and "... to this Spirit, or your Reserve" = the owner picks one
   destination when it resolves; without a legal Spirit the core goes to the Reserve (`orReserve`; the CPU takes the
   Spirit).
3. "When your X Spirit attacks, put a core from the Void to that Spirit" = the attacking Spirit of that event
   (`to: 'attacker'`), only while it is still on the Field.
4. "If you control fewer Spirits than the opponent" counts Spirits (not Ultimates) on both Fields when it resolves
   (`fewerSpirits`); "If you control a <colour> nexus" = one Nexus of that colour (`nexusGe`).
5. "Target an opposing <Cost N or less | exhausted | Spirit with N cores or less on it>. Send N core(s) from it to the
   Reserve." keeps the target filter; "Its number of cores can't be brought to less than one" stops at one core
   (`keepOne`); "Send cores from it to the Reserve until one core remains" sends all but one (`untilOne`). A Soul Core
   is never taken by these (the opponent chooses, and "besides" excludes it).
6. "Target X, destroy it." (comma) reads like "Target X. Destroy it."

## Built
- Engine: module `02n-effects-void-destinations.js` (`VOID_TO_CARD` `orReserve` / `to: 'attacker'`, `OPP_CORES_TO_RESERVE`
  `costLe` / `exhaustedOnly` / `coresLe` / `keepOne` / `untilOne`); conditions `fewerSpirits`, `nexusGe` (02a, 02c).
- Compiler (`tools/compile_v2.py`): `WHEN_FX` tail joined onto the sentence before it, `OPP_CORES_T`, Void
  destinations, "gain N core(s)" wording, the two conditions, the comma target pair.
- Tests: `tests/unit/effect_destroys_void_choices.test.mjs` (PK77-01..05); generators in `tests/unit/lib/fx-props.mjs` for the new shapes.

## Measured
- Scratch recompile: **+23 cards** (11 of them Standard block A).
- Left: "Spirit with Evolution / Current / When Blocks effect" conditions, "instead" replacements, Grandwalker /
  Grandstone Nexus destinations, two-destination "each to your Reserve and ..." sentences, "Cost 1/2" targets,
  "change the targeting BP" riders, "During Seal increase the limit", "target and attack" (new attack rule).
