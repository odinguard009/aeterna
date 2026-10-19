# Void destinations, reveal endings, mass and exhausted destruction, Flash battle effects (v0.75.0)

Second bundle release (owner, 2026-10-20: 3-4 packs per release from `docs/reports/pack-plan.md` "Measured order"):
rows 1-4 ("sentence: put a core", "v2 reveal: no remaining cards ending", "sentence: destroy an opposing", "v2 battle
effect outside a battle trigger") plus row 9 ("v2 destroy: count all").

## Source
- No new rule was needed: every sentence maps onto zones and actions the engine already modelled. Core Trash = the
  Trash's core area, returned to the Reserve in the Refresh Step (Comprehensive Rules 4-8, 5-2; engine `trashCores` since
  v0.29). "Destroy" of several targets at once uses the same destruction path as one target (Comprehensive Rules,
  Destruction "Resolving Destruction"). "During this battle" outside a battle has nothing to apply to (Flash Magic used in
  the Main Step), which the existing `BP_TARGET battle` / `SYMBOL_TARGET` guards (`G.attacker`) already do.

## Rules in our words
1. "Put a core from the Void to your Trash" = the core comes back to your Reserve in your next Refresh Step.
2. "Put a core from the Void each to every <X> you control" = every matching Spirit (or Nexus) gets its own core; no
   match = nothing happens. "Red/White Spirit" = a Spirit that is Red or White.
3. One-card reveal: "If that card is <X>, add it to the Hand. If not, return it to the decktop / discard it." The
   card goes back on top (or to the Trash) when it does not match. "Return any remaining card to the decktop or
   deckbottom" = the owner chooses (CPU: bottom).
4. "Destroy every / all opposing <N BP or less | one core> Spirits" = all of them at once; "Destroy an opposing
   exhausted Spirit" has no BP bound.

## Built
- Engine: `VOID_TO_TRASH`; `VOID_TO_CARD` `to` = `anyNexus`, `eachSpirit`, `eachNexus` (+ `match`); `fxMatch` reads
  `match.color` as one colour or a list (either); `REVEAL_PICK` `rest` = `top` / `either`; `DESTROY` `all` (with
  `bpLe` or `coresLe`) and `exhaustedOnly` without a bound (02l wrapper).
- Compiler: `tools/compile_v2.py` `void_cores` (Trash, this Spirit [, and refresh it], Nexus, "each to every", two
  colours), `REVEAL_REST` / `REVEAL_IF`, `v_destroy` (count all, exhausted only), ", and effects of the destroyed ...
  can't activate" (`noFx`), ", and when destroys, draw" (`thenDraw`); `tools/compile_effects.py` passes `battle` to a
  Flash Magic's sentences.
- Tests: `tests/unit/pack75.test.mjs` (PK75-01..06), fx-props generator `VOID_TO_TRASH`.

## Measured
- Scratch recompile: **+23 cards** (estimate of the four rows ~63 plus row 9 ~9; ratio ~1/3, better than v0.74.0's 1/4).
- Left: "to that Spirit" (needs the previous target), "your Spirit/Reserve" and "this Spirit, or your Reserve" (choice
  of destination), "-only" colours and Grandstone Nexus, "two other ... Spirits", "instead" replacements with core
  Trash, reveal "Summon ... among them" with discard, several cards back on the decktop (order), "Destroy all opposing
  Nexuses", keyword filters ("with Clash/...", "with a can't be blocked effect"), "BP equal or inferior to this
  Spirit's" outside an attack, Brave / braved targets, "During this battle, give a <family> Spirit you control +N BP"
  Magic shape.
