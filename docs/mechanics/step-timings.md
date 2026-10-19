# Step timing heads ("(Your Attack Step)", "(Either Main Step)", ...)

First pack of the pattern-first plan (`docs/ai/roadmap-open.md` item W; order `docs/reports/pack-plan.md`, where the
step timing family completes the most cards: ~580 within the first 60 steps, upper bound).

## Source
- Fandom wiki, Comprehensive Rules / Categories of Effects: sections "General Activation Timings", "Effects Which
  Activate During Specific Steps", "\"At the Beginning of the Step\"/\"At the End of the Step\"", "\"During This...\"",
  "Constant Effects" (read locally: `python3 tools/wiki_rules.py --show "Comprehensive Rules/Categories of Effects" --section "Specific Steps"`).
- Official Rule Manual (Standard), "Turn Procedures" (step order Start, Core, Draw, Refresh, Main, Attack, End).
- Manual chunks: `python3 tools/rules_kb.py --query "step"` (Q3 knowledge base) when a citation is needed in code.

## Rules in our words (paraphrase, not wiki text)
1. The bracketed step name is a **window**, not an event: the effect below it is only active, or can only trigger,
   while that step is running. "Your" = your turn's step, "Opposing" = the opponent's, "Either" = both.
2. Inside the window the body says what actually happens. Most bodies are an ordinary trigger ("When your X family
   Spirit attacks", "When only the opposing Spirit is destroyed", "When an opposing Spirit attacks"), a constant
   effect ("All your X family Spirits get +N BP", "This Spirit can block while exhausted") or an activated cost
   ("By sending ..., ..."); the head only adds the window as a condition.
3. "At the start of / At the beginning of" the step: resolves before the step's own rule actions (e.g. before the
   Core Step core). "At the end of" the step: after the step's actions, before the next step. If the step is
   skipped, neither fires.
4. A step head that can only be used in a Flash timing ("Flash - (Either Attack Step)") is an activated effect that
   uses a Flash opportunity inside that step.
5. The card must still be on the field from the trigger until the effect resolves; "during this turn" results stay
   even when the source leaves, and end after the End Step effects.
6. Several effects triggering at the same moment in a step: the turn player chooses the order.

## Measured (staged pool, 2026-10-19)
3,364 step heads in staged cards: Your Attack 1,234, Either Attack 1,020, Opposing Attack 461, Your Main 259, Your End
141, then Draw / Start / Core / Refresh steps (under 50 each). Bodies after the head (first words, top): "by sending
your" 296 (activated cost form), "when your X family" 179 + "when your X/X family" 51, "once per turn, when" 55,
"all your X family" 53, "when only the opposing" 49, "you can summon this" 44, "when your Life is" 43, "this Spirit
can block" 39, "when an opposing Spirit" 34, "at the start of" 26, "at the end of" 28.

## Decision (for the build session)
- Engine: one generic window condition (`if.step` = step name + whose turn) on any trigger, STATIC or ACTIVATE entry,
  instead of one trigger per head; start/end-of-step hooks for the "at the start of / at the end of" forms. The
  existing `attackStep` / `oppTurn` flags (`tools/compile_effects.py` ATTACK_STEP) and `INVOKE_HEADS` are the first
  users to fold in.
- Compiler: v2 reads the head as a window, then compiles the body with the existing trigger / static / activated
  patterns. Bodies the patterns do not know stay in review with their own reason, so the next pack is visible.
- Tests: scenario first (window open vs closed for each of Your / Opposing / Either), plus start-of-step order.

## Open
- Real unlock by scratch recompile once the window is built (the table counts are upper bounds).
- Main Step / End Step heads of Nexus cards: check that the Nexus level line is read before the head.
