# Destroy filters, control conditions, "By discarding", same-name limits (v0.76.0)

Third bundle release (owner, 2026-10-20: 3-4 packs per release from `docs/reports/pack-plan.md` "Measured order"):
rows "sentence: destroy an opposing", "v2 destroy: filter other", "sentence: if you control", "sentence: by discarding a"
and "sentence: (once per turn:".

## Source
- "By doing A, do B": Fandom Comprehensive Rules / Effect Texts, section "By doing A, do B" (optional effect; B only
  when A can be and is done; both parts are checked together).
- "(Once Per Turn: Same Name)": Comprehensive Rules / Categories of Effects, section "(Once Per Turn: Same Name)"
  (one use per turn across every card of that name the player controls; engine `sameName` since v0.47).
- Destruction targets: Comprehensive Rules / Destruction "Resolving Destruction", Effect Texts "Targets of Effects".

## Rules in our words
1. "Destroy an opposing Spirit with BP equal or inferior to this Spirit's / the same BP as this Spirit" compares with
   the source's BP when the effect resolves; it needs the source on the Field (no last-known BP is kept, so the same
   text under When Destroyed stays in review).
2. "with two or more symbols" counts printed symbols. "with a cost equal or less than the number of <Nexuses |
   "X" family Spirits> you control" counts when it resolves (the source counts if it matches).
3. "If you control any exhausted <colour | "X" family> Spirit, target ... . <Verb> it." = the action only while such a
   Spirit is exhausted on your Field; 'If you control any "Name"' = a card whose name includes that text.
4. "By discarding a [Spirit | Nexus | Magic | "X" family] card from your Hand, draw N" is optional; no discard = no draw.
5. "(Once per Turn: Same Name)" in front of a triggered body limits that effect to once per turn for all cards of
   the same name.

## Built
- Engine: `DESTROY` `bpLeSelf`, `bpEqSelf`, `symbolsGe`, `costLePer` (`02m-effects-filters.js`); fxIf `ctrl.exhausted`.
- Compiler: `selector()` post filters, `cond_of` exhausted / quoted name, target pairs after an "If you control"
  lead, `RETURN_TRASH` by quoted names (any card) and "Cost N or more", "By discarding" in `own_grammar`,
  `trig_effects` reads the same-name limit head; `self_bound_ok` keeps leave-trigger self-BP texts in review.
- Tests: `tests/unit/pack76.test.mjs` (PK76-01..05).

## Measured
- Scratch recompile: **+14 cards** (6 of them Standard block A).
- Left: keyword filters ("with Clash/...", "with Charge", "Spirit with Current", "with (When Summoned) effects"),
  "Blue symbols on your field" counts, "Spirit/Brave" and braved targets, "instead" replacements after a condition,
  a green Nexus as condition, "by discarding" with BP or "also, destroy", the same-name bodies that discard from the
  decktop or summon from the Trash, last-known BP after a Spirit left.
