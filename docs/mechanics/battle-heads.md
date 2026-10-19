# Battle heads (v0.72.0)

Third pack of the pattern-first plan (`docs/ai/roadmap-open.md` item W, row "no trigger: (During Attack)" of
`docs/reports/pack-plan.md`, family "event trigger head").

## Source
- Standard rule manual, "Examples on Activation Timings": (During Attack) = active while this Spirit is attacking.
- Fandom wiki, Comprehensive Rules / Categories of Effects, section "Spirits' When Attacks/Blocks Effects"
  (`python3 tools/wiki_rules.py --show "Comprehensive Rules/Categories of Effects" --section "Spirits' \"When Attacks/Blocks\" Effects"`).

## Rules in our words (paraphrase, not wiki text)
1. A (During Attack) effect works only while its Spirit is the attacking Spirit; a battle-result clause under it
   ("when only the opposing Spirit is destroyed by BP comparison") therefore needs this Spirit to be the attacker,
   while the same clause under (When Battles) also works when it blocked.
2. "This Spirit's attack reduces the opposing Life" is the unblocked attack's Life damage, not a Life loss from an
   effect during the attack.
3. "For each X you control" counts the matching cards on your Field when the value is needed, the source included
   (a constant updates at once; a (When Attacks) BP gain is counted when it resolves and then stays for the turn).

## Built
- Compiler (`BATTLE_HEADS`, `PER_STATIC`, `PER_NP` in `tools/compile_effects.py`): the three forms above.
- Engine: `per` on STATIC BP and `BP_PLUS` (`perCount` in `02a-effects-base.js`), `attackingOnly` on `BATTLE_WIN`.

## Measured
- Scratch recompile: 14 cards (the pack-plan row promised up to 28, an upper bound); 13 promoted.
- Left: "When blocked by an opposing N BP or less Spirit" (blocker filter), "At the end of battle" (no end-of-battle
  trigger yet: (During Attack), (When Battles), Brilliance, Rumble, Ringing Charge), "for each Spirit with <keyword>",
  "+N BP; if ..., +M BP instead", unblockable-by conditions, "would reduce the opposing Life" (replacement), the Brave
  "(When Brave Attacks)" Life head.
