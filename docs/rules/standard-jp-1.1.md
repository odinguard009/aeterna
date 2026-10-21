# Standard rules: JP Standard Rule Manual Ver.1.1 vs the engine (v0.98.0)

Read 2026-10-21 from the official web pages (https://www.battlespirits.com/rule/official-rule-manual-standard/, pages 02-12;
the auto runs got a 302 there, this session fetched them through the TinyFish connector). Compared with the EN Standard
Comprehensive Rules Ver.1.0 (2026-04-01) that the engine cites and with the engine code. Section ids are the `SJP:` chunks in
`docs/rules/kb.json` (fingerprints only, no manual text; `python3 tools/rules_kb.py --query SJP:`). Paraphrases are our own words.

**Result:** the JP 1.1 manual and the EN 1.0 rules agree on every point checked; the JP text adds worked examples and a
Q&A page, not new rules. One engine difference was found and fixed (starting-hand redraw order). No Standard ban list exists
(the official list on https://www.battlespirits.com/rule/limited.php, applied 2026-09-01, names only Eternal-era cards).

| Section | JP 1.1 says (paraphrase) | EN 1.0 | Engine | Verdict |
|---|---|---|---|---|
| SJP:formats | Standard = letter block icons, rotating pool; rules differ in part from Eternal | 1-1-1 | `00-config.js` FORMAT, `standardLegal` | same |
| SJP:win | Opponent at 0 Life, or 0 cards in their Deck at their own Start Step | 1-3-2 | `07-turn.js` beginTurn, `08-battle.js` | same (EN 1-3-3 "both at once = draw" cannot happen in the engine's order) |
| SJP:deck | 40+ cards, max 3 per name (a trailing same-name number = another card), block A only until 2027-03-31 | 6-1-1 | `validateDeck`, `STANDARD_BLOCKS` | same; rotation reminder added to `tools/session_start.sh` |
| SJP:setup | 5 Life, 3 cores + Soul Core in the Reserve, draw 4, decide turn order, then redraw once **in turn order, first player first** | 6-2-1-7 (same order) | `15-match.js` | **fixed in v0.98.0**: the CPU used to decide after the player even when it went first; now the seats decide in turn order (`G.setupRedraw`, tests SR11-01/02) |
| SJP:card-layout | Cost, type, reduction, colour, family, symbols, EX symbols (used by Inherit Summon = Legacy), block icon, rarity | 2-x | card data | same |
| SJP:basics | Overview of summon, attack, Magic (no response to a Flash), Nexus | - | - | same |
| SJP:turn | 8 steps incl. Second Main; turn 1 has no Core, Attack or Second Main Step; Draw Step runs on turn 1 | 7-1, 7-8 | `07-turn.js`, `05c-intent.js` | same |
| SJP:main-step | Any order, any number: summon (Lv1 cores), deploy (no core = Lv1), Magic Main/Flash, Flash and (Your Main Step) effects, free core moves | 7-6 | `11-human.js`, `09-cpu.js` | same |
| SJP:cost | Reduction by matching Field symbols is mandatory; pay from Reserve/Field cards to the Trash, never from Life; no cap on cores on a card | 7-6, 10-x | `effCost` (06-rules.js) | same |
| SJP:core-move | Level follows cores; below Lv1 = depleted, not destroyed; depletion effects resolve before the card goes to the Trash | 5-x, 10-x | `checkDepletion`, standby | same |
| SJP:soul-core | Soul Core only in Reserve, a Field card or the Trash unless an effect targets it | 4-x | `02d-effects-resolve.js` soul helpers; core-to-Void actions never move it | same |
| SJP:battle | Attack -> Flash 1 (battle goes on even if the attacker left) -> one blocker -> Flash 2 only after a block -> resolution -> destruction -> end-of-battle, then after-battle effects | 8-1 | `08-battle.js` doBattle | same in result: when the attacker has left, the engine still runs Flash 1 and end-of-battle effects and then skips the block (nothing can be blocked, no Life loss); a blocker that left still prevents Life loss |
| SJP:flash | Defender first, one use at a time, ends after two passes in a row; a player who passed may act again | 8-1-2, 8-1-4 | `flashTiming` | same |
| SJP:true-release | Lv2 with the Soul Core on it = True Release state | 12-2-1-1 | `06-rules.js` level with the Soul Core | same |
| SJP:inherit | Remove EX-symbol cards from the Trash while paying; counted before Field symbols, matching colours, at most the reduction symbols | 12-2-1-3 (Succession) | `legacyPlan` (06-rules.js; data keyword Legacy) | same (house reading kept: applied automatically with the fewest EX cards for the lowest cost) |
| SJP:soul-magic | Pay just the Soul Core (Reserve or Field card) with one symbol of the colour on your Field | 12-2-1-2 | `soulMagicOK` | same |
| SJP:tokens | Prepared outside the deck, enter only by effects, hidden until sent out; sending out is not summoning | 13-x | `SEND_TOKEN`, `tokenHome` | same |
| SJP:effects | No cost to activate; constant effects first, then timed ones in the turn player's order; effects triggered while resolving resolve first | 9-x | `resolvePool`, `asResolving` | same |
| SJP:heavy-exhaust | Only by effects; counts as exhausted; one refresh = exhausted; that refresh counts as being refreshed | 5-5-1-3, 5-16 | `setHeavy`, `refreshOne` | same; no Standard card has a "when refreshed" trigger yet. EN 5-16-1: a heavy exhaust also triggers "when exhausted" effects (26RBS02-050, partial; note for its K session) |
| SJP:faq.effects | Card beats rule; can/cannot; "then" vs "if you do"; per-card Once Per Turn, per-name No Duplicate, shared same-name Magic limit; opposing cores stay in their areas; an Invoke cost resolves in full | 10-x, 12-3 | `usedThisTurn`, noStack, `02l-effects-invoke.js` | same |
| SJP:faq.soul-core | Swapping cores in the Main Step is not a depletion; the opponent picks which of their cores leave; non-True-Release Spirits | 4-x | `swapSoul`, core-to-Void actions skip the Soul Core | same |
| SJP:faq.cost | Cost fixed before paying; a declared card must be paid or the board is restored; effect summons pay unless "without paying"; Soul Magic with a Soul-Core-only Spirit | 10-x | `payCost`, `summonPaid`, `soulMagicOK` | same (cost-fixing during payment is not covered by its own test) |
| SJP:faq.states | Waiting state: only leave effects work, other effects can still reference it; exhausting an exhausted Spirit is not heavy exhaust | 10-x | standby (`releaseStandby`) | same |
| SJP:faq.targets | Fewer targets resolve, none = not done; "up to" allows 0; an unaffectable target may be chosen; "all" does not target and covers later summons for this turn | 9-x | target pickers, `fxImmune` | same |
| SJP:faq.bp | BP = level BP plus/minus each modifier in order; the "then if 0 BP destroy" check happens once, when applied | 1-4-6, 12-x | `bpOf`, BP-minus actions | same (also in `docs/manual-notes.md`) |
| SJP:glossary | Terms; Invoke Flash/Main timing, effect limits, depletion vs destruction, tokens return when they leave | 5, 12 | - | same |

## How to refresh
New JP version (watch https://www.battlespirits.com/news/?tags=gamerule): save the pages 02-12 into
`~/.cache/aeterna-rules/SJP/html/` (`python3 tools/rules_kb.py --fetch` does it where the site answers; otherwise a browser or a
fetch connector), `--import-html SJP`, `--check`; a `CHANGED` chunk = re-read that section and update this table.
