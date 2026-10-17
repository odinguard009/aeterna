# Official rules: working notes (read once, reuse)

Paraphrased notes from the official PDFs, so a session does not have to fetch them again. Check the PDF only for a rule that is **not** here, then add it here (short paraphrase + page/section). Never quote long passages.

## Sources and versions (Rules audit R1, checked 2026-10-16; `tools/rules_audit.py` -> `docs/reports/rules-audit.md`)
| Source | Version / date | URL | Read |
|---|---|---|---|
| Eternal Rule Manual, Japanese (newest) | Ver.17.1, published 2026-05-29 (news tag gamerule) | https://www.battlespirits.com/rule/official-rule-manual-eternal/ | game setup page read 2026-10-17 via WebFetch (`page03.html`; `page02/04/05/09.html` are intro, basic play, turn flow, Braves); 17.1 change list not found |
| Eternal Rule Manual, English PDF | VER.17.0 (no date in the text) | https://asia-en.battlespirits.com/pdf/official-rule-manual_eternal.pdf | yes (WebFetch); page 1 lists "Ruling Changes (Eternal)" and "Past Rule Revisions (Eternal)" without URLs; asia-en /rule/ still says Ver.16.0 |
| JP rule revision notice for Eternal 17.0 | 2026-04-03, effective 2026-04-11 | https://www.battlespirits.com/news/2026/rule-manual-eternal17-revised.php | yes, 2026-10-16 (changes below) |
| JP Ruling Changes page | newest entry 2022-07-22 (CB23 name spelling); no 2025-2026 entries | https://www.battlespirits.com/rule/revised_rule.html | yes |
| EN Ruling Changes page (old site) | newest 2022-02-04 | https://en.battlespirits.com/rule/revised_rule/ | yes, nothing engine-relevant |
| Standard Rule Manual, Japanese | Ver.1.1, 2026-10-02 | https://www.battlespirits.com/rule/official-rule-manual-standard/ | no (Standard format not offered) |
| Standard Comprehensive Rules (EN PDF) | Ver.1.0, last updated 2026-04-01 | https://asia-en.battlespirits.com/pdf/comprehensive-rules-standard.pdf | yes (earlier sessions) |
| JP rule news list (watch for new versions) | newest rule item 2026-10-02 (Standard 1.1) | https://www.battlespirits.com/news/?tags=gamerule | yes |

### Changes in the JP 17.0 revision notice and the engine area they touch
1. Formats Eternal / Standard (Standard: block icon letters, rotation) -> deck rules (Eternal only offered).
2. Flag Nexus (BS76+): an ordinary Nexus (moves cores, hit by Nexus effects); a Contract Flag Nexus also has the Contract card traits (one copy, opening Hand, Soul State when an opposing effect removes it); F Contract Advent onto Spirits or Nexuses, also in Soul State -> unblocks Flag Contract Advent.
3. Opening-Hand redraw once after deciding turn order -> setup (built).
4. Standby state for every way of leaving the Field (destroy, banish, return to Hand/Deck, to the hand area, exclude): the card waits in Standby, its leave triggers resolve (Lv just before Standby for banish), then it goes to the Trash or its destination; cores go to the Reserve; effects already applied persist; its symbols still reduce costs; only effects tied to the leaving event may use it; a Brave leaving alone takes its colour, cost, BP, symbols and [Braved] effects away at once -> destruction / bounce flow (conflict, R3).
5. Soul Core use is mandatory = every game has it (Reserve 3 cores + 1 Soul Core); costs that move the Soul Core may use up the source Spirit, then the 'when you've done so' / 'after Burst' part fails -> setup (built), Soul-Core costs.
6. Burst: declared only at the moment the event's triggered effects are revealed, one at a time, not declared = lost for that event; resolves after all non-Burst triggered effects; several Bursts in declaration order (non-turn player first) -> `flushBursts` order (fixed in v0.55.2).
7. Block icon number follows the newest reprint -> card data only.
8. Abbreviated Standard timings (When Summoned, When Attacks, When Destroyed without "this Spirit's") count as the full Eternal wording; "while attacking" is not "When Attacks" -> compiler (built).
9. Keyword effects (renamed; several per card); draw wording; "Lv1-2-3" notation; "exclude" wording; constant effects with no place or condition are not stopped by "effects can't activate"; effect priority "cannot" > "must" > "do" = "can" -> session E (conflict on priority).

## Setup and turn (Eternal manual pp. 9-12, 20-21; CR 7-3)
- Deck 40+ cards, no upper limit; max 3 copies per name; one Contract card type, up to 3 copies.
- 5 Life cores; Reserve 3 cores + 1 Soul Core; draw 4 (3 when a Contract card is added to the starting Hand).
- Contract card (EN VER.17.0 p. 11 steps 2/5/7 and p. 54; earlier notes said pp. 12/55): taken from the Deck before shuffling and shown face down; draw 3, then reveal it and add it (adding it is optional). Redraw: once, in turn order; the whole Hand (a Contract card too) returns to the Deck, shuffle, draw 4; a Contract card cannot be added again on a redraw. Re-checked 2026-10-17 against the JP Eternal Rule Manual Ver.17.1 web page "game setup" (page03.html): same rule (v0.59.1).
- The rock-paper-scissors winner chooses first or second (engine: coin toss, equivalent). Each player may redraw once (return the whole hand, shuffle, draw 4).
- Steps: Start, Core (1 core **from the Void** to the Reserve, CR 7-3-2), Draw (1 card), Refresh (refresh cards, Trash cores to the Reserve), Main, Attack, End (temporary effects end).
- The first player's first turn skips **only** the Core Step and the Attack Step (the Draw Step is not skipped). No step is skipped just because nothing happens in it.
- Deck-out: a player whose Deck is empty at the start step of their own turn loses (manual p.9: you win when the opposing Deck has 0 cards at the start step of the opponent's turn).

## Battle (pp. 30-31)
- One Refresh-state Spirit/Ultimate may block; never two at once unless an effect says so.
- Lower BP is destroyed; equal BP: both are destroyed. Unblocked: Life is reduced by the attacker's symbols; Life cores go to the Reserve.
- (When Blocking) effects activate after the block is declared and performed; battle effects resolve before Life is reduced or BP is compared (p. 30).
- BP minus (Eternal manual FAQ p. 68, read 2026-10-16): BP+ and BP- add to the current level's BP in order; a Spirit at 0 BP is not destroyed by a rule, only by its card's 'Then, if its BP is 0, destroy it' clause (checked once, when the effect is applied); 'all opposing Spirits -N BP' also hits Spirits summoned later that turn. Standard CR 1-4-6: negative values are treated as 0. Standard CR 12-2-1-12-1: 'When Destroyed by Opponent' = destroyed by an opposing effect or by BP comparison with an opposing Spirit; 8-1-6-2: effects for destruction by BP comparison activate right after it. '(When Battles)' and 'Rush' are not in either manual.
- (When Destroyed) effects resolve before the destroyed Spirit/Ultimate is placed in the Trash (p. 31). Engine: resolved right after the destruction with the level the Spirit had (partial: the card is already in the Trash).
- "When this card is revealed from the deck": not covered by the manual. Ruling chosen (v0.33): it resolves at once, while the revealing effect resolves, because the card would otherwise leave with the rest.

## Cores, Soul Core, Void (p. 11, p. 20, p. 28, p. 29, p. 44, p. 60, p. 66; CR 4-8, 5-7-3)
- The Void is the core supply; **no limit** on cores in it; if cores run out, add more from outside the game (CR 4-8-1/4-8-2). Players may use their own Void or share one.
- Depletion (too few cores for Lv1) is not destruction: the card goes to the Trash, its cores to the Reserve, destruction triggers do not fire (p. 28).
- The Soul Core can only be in the Reserve, on a Field card or in the Trash; never in Life or the Void (unless an effect names the Soul Core, CR 5-7-3). When an effect would send it to the Void, another core goes instead (FAQ).
- Count Area cores come from the Void; that does not count as "adding cores from the Void" (p. 60).
- Cores on a Grandwalker Nexus go to the Void when it leaves the Field (p. 44). Cores are put on a Grandwalker Nexus only by effects; they do not count as cores on the Field.
- Contract Grandwalker Nexus: its Lv2 depends on your Count, not on its cores.

## Costs and summons (pp. 25-27, FAQ Paying Costs Q3)
- Cost reduction is mandatory when possible; you move exactly as many cores as the cost.
- Symbols for reduction (Eternal VER.17.0): Field Spirits, Ultimates and Nexuses (p. 18, 24); not Soul State (p. 55) nor the Burst Area (p. 49). Six-colour reduction symbols take any colour (p. 25). Ultimate symbols reduce only Ultimate reduction symbols (p. 39). A Grandwalker God symbol never reduces the six colours (p. 42); a Contract Grandwalker's coloured God symbol also counts as its colour (p. 44). Brave symbols are added to the braved Spirit (p. 33). Engine: `symbolAttrs` / `fieldSymbols` / `reductionOf` (one Field symbol per reduction symbol, best matching).
- "Summon/deploy" by an effect pays the cost unless the effect says "without paying the cost".

## Manifest (p. 57)
- Put the Soul Core (from Life, Field or Reserve) in the Trash, pay 1 of the summon cost with a core from the target Grandwalker Nexus; the Spirit is treated as summoned by paying 1 cost. Any number of Field/Reserve cores may be put on it as for a summon.
- When-Manifests effects activate together with the summon effects, but not when the Manifest happens in the Main Step or the Spirit is summoned by another effect. Not usable while summoning is prevented.

## Effects (FAQ About Effects in General; Other Rules "About Activating Effects"; Burst FAQ)
- Q3 priority: "cannot" > "must" > "may/do". Burst / Grandwalker immunity order: "cannot be prevented" > "unaffected" > "cannot activate".
- Q5 "By doing X, do Y": X must be done for the effect; X cannot be done if Y cannot be done; the player chooses whether to use the whole effect. Q6 "you can do X; if you do, Y": Y is done as far as possible.
- Q9 Once per Turn: per card. Once per Turn: Same Name: one use for all copies of that name.
- Effects that activate at the same time: ongoing (category A) before timed (category B); within a category the **turn player** decides the order. An effect activated by a resolved effect resolves first. Flash effects cannot be interrupted by another Flash effect.
- Bursts: declared at the same timing as other effects of the event, starting with the defending player; several Bursts resolve in activation order.
- A Grandwalker Nexus is unaffected by effects except its own and effects that target a Grandwalker Nexus. A card in the Burst state is unaffected except by effects that target Bursts.

## Not found in the online text yet
- Banish (engine: card goes to the Banished zone).
- **Seal** (Eternal manual p.49, read through WebFetch 2026-10-16): Seal moves your Soul Core from the stated place to your Life; you are Sealed while it is there and [During Seal] effects can be used; using Seal is optional; with a normal core and the Soul Core in Life the player chooses which leaves when Life is reduced (engine: normal cores first). The manual text read does not cover Flag Nexus or Flag Contract Advent.
- Heavy Exhaust (pp. 60-61, FAQ p. 67; Eternal manual PDF read through WebFetch 2026-10-14): only an effect applies it; the card is turned upside down, counts as Exhausted and cannot attack or block; one Refresh (an effect, and by the engine's reading the Refresh Step p. 20) turns it into a normal Exhausted card; a Refreshed or an Exhausted Spirit can be targeted by a Heavy Exhaust effect; a plain Exhaust effect is not Heavy Exhaust. Engine: `heavy` flag next to `exhausted` (v0.38); the upside-down picture waits for UI approval.
- Removed Zone (v0.38, Hermes deck): the manual text read on 2026-10-14 defines no Removed Zone rule and lists a Set Aside zone; whether the two are the same is not confirmed. The engine keeps `p.removed` (the same pile as Banish) and implements the cards as printed (put hand/Trash/Spirit cards there, 'when cards are put onto the opposing Removed Zone' once per put event).
- Burst prevention (p. 48): the manual names only Heavy Armor / Ultra Armor as Burst preventers; 'the opponent can't activate Burst effects' (Contractor Hermes Contract Field) is a card-text rule, built as a per-battle lock on the Burst Area (v0.38).
- Brave (pp. 34-38): uncombined Brave = Spirit (not a Spirit summon); combine in the Main Step or summon directly combined, no cost; cores move onto the Spirit; BP+, cost, symbol added (p. 34 also says Family, p. 35 says Family does not change: engine adds no Family); exhausted if either was; one Brave per Spirit; separate in the Main Step with Lv1 cores; no longer fits -> separates at once, a Brave without Lv1 cores -> Trash (not destroyed); Spirit leaves -> Brave to the same place (p. 36). A Saga Brave may combine with a Grandwalker Nexus (p. 38).
- Over Count (p. 61): active while the Count meets the OC condition, regardless of Lv; adds its BP; [During OC] only while met; [During OC & Advent] also needs Advent.
- Tokens (p. 56-57): Token cards are kept outside the Deck and placed on the Field by effects. Official page "How to Use Token Cards" (battlespirits.com/product/special/tokencard/, read 2026-10-14): (1) not in the Deck; prepare as many as you want before the game, face down beside the Deck; no limit per kind; cannot be added during the game. (2) only "send out a Token" effects place them; no cost; place cores for at least the minimum Lv from your Field or Reserve, as when summoning/deploying; a Token Spirit attacks/blocks like a Spirit, receives Spirit-targeting effects, can be braved / Advent / swapped. (3) when it leaves the Field it returns to where it came from, not the Trash/Hand; a Brave on it goes to the Trash/Hand/Deck; "when leaves the Field" effects and "after your Spirit leaves the Field by the opponent" Bursts can activate, "after your Spirit is depleted/destroyed by the opponent" Bursts cannot (the card does not reach the Trash).
- Saga Brave on a Grandwalker Nexus (p. 38-39): cores on the Brave return to the Reserve before combining; when combined directly no cores go on the Brave; the Nexus gets the Brave's cost, family, symbol and [While Combined with a Nexus] effect; to separate, place cores for Lv1 on the Brave; the combined Brave is unaffected except by the Nexus' effects. p. 70 Q1: no Brave onto a Brave or a Nexus treated as a Spirit.

## Blue Nuadha card-text terms (v0.37; card text, not manual rules)
- Read on cardrush-bs.jp (BS71-CX03, BS71-063, BS71-064, BS72-068, BS74-067, BS71-072) and in the owner-supplied Fandom export; the Eternal/Standard manuals read so far define no rule for them, so these are card-text rules, enforced as the cards print them.
- **Cost Destruction effect**: "destroy an opposing Spirit/Ultimate with Cost N or less" (also "cost equal or inferior to this Spirit's / the discarded card's"). The limit N grows through effects printed "increase the limit of your Cost Destruction effect by +n": Bulwark Temple LV2 (+1 per Saga Brave you control, for Celtica/Scalostle sources), Railgun combined with a Nexus (+1), Musketeer (+5 with five counters). "Lowest/highest cost" destruction has no limit, so it gets no bonus.
- **Nexus Brave Contract Skill N**: "(Send N cores from this Nexus to the Void)" is the cost; Flash, either Attack Step. Same engine path as Yaj-Veda (v0.35).
- **Neo-Core Charge, Contract Field of Nuadha**: +1 core to Nuadha when a Scalostle/Devotee/Concluser Spirit with Cost 3 or more is summoned, or a Scalostle Brave (BS71-CX03 bracket: Scalostle/Devotee/Concluser & Cost 3 or more, Scalostle & Brave); the Contract Field lets you take +1 counter instead.
- **Brave summoned by an effect** (Dian, Brodeur): the card is summoned as a Spirit (Lv1, no cost); it can be combined in a Main Step. Direct combining by an effect (Goibniu LV2) is not built.
- **Data gaps of the Fandom export** found while wiring (filled from cardrush-bs.jp): Neo-Core Charge target missing from the text; no Brave BP+ or combine condition; Nexus levels missing; Contract Grandwalker symbol count missing; reduction key "god" (printed on Saga cards) is dropped by the importer.

## Yellow Indra / Thunderive card-text terms (v0.40; card text, not manual rules)
- The manual PDF could not be fetched in the v0.40 session (permission request unanswered); no new manual page was read. Everything below follows the printed card text.
- **Can't attack/block**: built as a permanent flag on the Spirit instance (noAB). It stops attack declaration and blocking only; it ends when the Spirit leaves the Field.
- **Draw from the deckbottom**: the last card of the Deck goes to the Hand.
- **Extra reduction symbol** (Indra Contract Field, Shimavajdra LV2-3): added as extra reduction slots of that colour for the card being paid.
- **Contractor Indra** data (battlespirits.com official Indra deck page and yuyu-tei.jp, 2026-10-14): Neo-Core Charge target Thunderive / Devotee / Concluser & Cost 3 or more; Lv2 at Count 2; Contract Skill 3 (Flash, once per turn); Contract Field Lv1-2. The Indra Temple Lv2 core count (1) is **not verified**.
- Official Indra deck (BS75 page) also lists Thunder Counter (Magic) and Grand-Sagitto-Nova (Ultra Thunder Advent, cost 12): both left out; Togevajdra and Vajreine (BS76) replace the six copies.
- Gold icon (v0.41.5, confirmed by the owner 2026-10-15; the manual does not name the colour): Fandom's `gold` reduction/symbol icon = the Ultimate symbol / Ultimate reduction symbol (manual p. 40 says the Ultimate symbol pays Ultimate reduction symbols). Importer maps it to `reduction.ultimate`.
- **Flash effects in the Main Step** (Eternal manual, read 2026-10-16): Flash effects can be used in the Main Step as well as the Flash Timings (p. 18); in the Main Step either the Main or the Flash effect of a Magic card can be used (p. 23); the Flash Timings of a battle allow Flash effects (p. 32). Used for Silver Wheel (v0.50: ACTIVATE timing Main + Flash).
- **Accel** (v0.50): the Eternal manual text read on 2026-10-16 has no Accel section. Source: Battle Spirits Fandom wiki "Accel" Q&A Q1-Q8: used from the Hand at the printed Main/Flash timing by paying the Accel cost; field symbols reduce it (Q4); effects that change Hand Spirit costs do not (Q8); the card is revealed and put onto the Removed Zone (Q1, Q3); a Spirit there can be summoned in your Main Step by paying its cost (Q5); Accel can't be used from the Removed Zone (Q6) and Hand discards can't hit it there (Q7); it is a Spirit effect, so Magic locks don't stop it (Q2). The Fandom export loses the reduction icons of the Accel cost ("Cost 4 ()"), so the engine pays the full cost until the icons are checked.
