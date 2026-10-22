# Aeterna UI inventory (owner request 2026-10-22: "list semua jenis UI yang dibutuhkan, sampai yang terkecil")

One home for the complete UI list. Structure from `docs/DESIGN.md`; build target code from `docs/ai/code-map.md` (`apps/web/src/*`). Status: **shipped** = in the game (U1-U8 + fixes, v0.63.0-v0.102.0); **v12** = proposed in `mockup-v12.html` (open in a browser; not yet built anywhere); **deferred** = waits until the owner lifts "Deferred UI" (`docs/ai/roadmap-open.md` item L); **open** = no proposal yet. V12 items are proposals only — nothing is chosen until the owner approves the mockup.

## A. Shell and navigation
| Piece | Where | Status |
|---|---|---|
| Top nav PC (Home, Play, Decks, Library, How to play), skewed tabs, active tab | `13b-nav.js` | shipped v0.65.0 |
| Phone bottom tab bar (5 tabs, own icons: gate, core-play, fanned cards, card+lens, core-?) | `13b-nav.js` | shipped v0.65.0 |
| Home hero: eyebrow chips, big italic motto, PLAY NOW / BUILD A DECK, last-deck line | `13b-nav.js` | shipped |
| Home shortcut tiles (Match vs CPU, Deck builder, Library) | `13b-nav.js` | shipped |
| Home version line + footer bar | `13b-nav.js` | shipped |
| Colour diamond button + 3x3 picker pop (9 colours incl. Soul Core silver / Ultimate gold) | `00c-theme.js` | shipped |
| Dark / Light switch (lobby corner + Settings) | `00c-theme.js` | shipped |
| Match history viewer (list + replay viewer) | `13b-nav.js`, `13f-replay.js` | shipped v0.86.0 |
| Sound toggle + on/off switch list | `13b-nav.js`, `13e-host.js` | shipped |
| Settings entry | `13d-pages.js` | shipped |
| Player-view naming: Library as a data tool, not a card list | — | v12 (Home tile + page header rewording) |
| "What's new" entry from Home (opens the release note) | — | v12 |

## B. Pages (lobby)
| Piece | Where | Status |
|---|---|---|
| Play page: deck chip on top (sleeve, name, colours, count, legality, format) | `13c-play.js` | shipped v0.67.0 |
| Play mode cards (vs CPU, Watch CPU vs CPU, sims) + CPU style / speed chips | `13c-play.js` | shipped |
| Setup chips row (match setup) + confirm sentence | `13c-play.js` | shipped |
| **new-player 3-step order: 1 Deck -> 2 Opponent -> 3 Rules chips + one big START** | — | v12 (roadmap "new-player UX") |
| *One-line action hint under the step being set up* | — | v12 |
| My decks header card (count of slots in use, search deck, sort, Import code, + new deck) | `13h-decks.js` | shipped v0.93.0 |
| My decks PC tiles (sleeve 40x56, colours, status, ACTIVE badge, Edit/Play/more) | `13h-decks.js` | shipped |
| My decks phone rows + action sheet | `13h-decks.js` | shipped |
| Deck more menu (Set active, Rename, Duplicate, Deck look, Copy deck code, Delete asks first) | `13h-decks.js` | shipped |
| Starter (prebuilt) decks, read-only, Copy only | `13h-decks.js` | shipped |
| Deck builder header (back, name, rename, ready chip, Set active, Play, saved line) | `13a-deckbuilder.js` | shipped v0.94.0 |
| Deck builder toolbar (search, FILTERS + count badge, chips, Clear all, card count, sort) | `13a-deckbuilder.js` | shipped |
| Filter panel (colour, type, cost, format + Saga, family, playable only; Show/Reset) PC panel + phone sheet | `13a-deckbuilder.js` | shipped |
| Deck panel tabs: Deck list / Curve and check / Deck look | `13a-deckbuilder.js` | shipped |
| Deck list rows (count, name, -/+ at 3 copies), grouped | `13a-deckbuilder.js` | shipped |
| Curve chart + type split + deck check list | `13a-deckbuilder.js` | shipped |
| Deck look pickers (sleeve 6 tints, upload, core colour, Soul Core gem colour) + battle preview | `13a-deckbuilder.js`, `13-render.js` | shipped |
| Phone deck sheet (minimizable to one row with mini preview) | `13a-deckbuilder.js` | shipped |
| Import / export deck list as text, Replace this deck? | `13a-deckbuilder.js` | shipped |
| **Key Spirit picker: one copy marked KEY in deck list + badge** (engine + builder; ensi item) | — | v12 sketch (approved direction, owner 2026-10-21) |
| Saga select filter (today only set prefix), family chips, symbol split in Curve | `13a-deckbuilder.js` | open (U8a leftovers) |
| Library page: counts, "Complete effects only", "!" legend, image import | `14-images.js` | shipped (no card grid — open) |
| How to play: rules docs + glossary | `13d-pages.js`, `12-zones.js` | shipped |
| Settings header card + section menu (Appearance, Game speed, Sound, CPU style, Card images, Saved data, Match history) + rows | `13d-pages.js` | shipped v0.68.0 |
| Appearance rows: mode toggle, colour grid, playmat upload/remove, CPU colour line | `13d-pages.js` | shipped |
| **Text size setting row (Normal / Large / Larger)** for battle text | — | v12 (audit: 81% of battle text <= 11 px at 1280x800) |
| Animations row (Full / Reduced / Off, Auto on phone) | `13d-pages.js` | shipped v0.99.0 |

## C. Battle board
| Piece | Where | Status |
|---|---|---|
| PC board: 14 side plates (Trash, Deck, Count, Life, Reserve, Void, Banished x both sides + Hand Cnt) | `13-render.js` | shipped |
| CPU Nexus row with HAND pill | `13-render.js` | shipped |
| CPU/You Spirits rows with Soul State + Burst-Mirage slots (top corners) | `13-render.js` | shipped |
| Step band: turn label, 7 clickable steps, NEXT diamond, narration line, illegal-move strip | `13-render.js` | shipped v0.63.0 |
| Hand row / phone stat grids (8 cells per side) | `13-render.js` | shipped |
| **Full words in every plate and stat cell (Banished, Deck, Trash, Count, Void, Hand, Reserve; BURST / MIRAGE; "3 + Soul")** | — | v12 (audit: abbreviations unreadable for new players) |
| Cell hover / tap highlight + zone tooltip on PC | — | v12 (small) |
| Card on board: cost disc, type tab, name, core bar (one gem per core), BP, level diamond | `13-render.js` | shipped |
| Big card panel PC: hovered/selected card at ~200px + effect text 14px + last 3 log lines | — | v12 (audit: effect text currently unreadable in battle) |
| Cards ~40% bigger with board auto scale | — | deferred (roadmap "Deferred UI": changed layout) |
| Match Log drawer (one line categories + full text) | `12-zones.js`, `13-render.js` | shipped |
| Zone modals: Trash, Deck top, Burst/Mirage area, Soul State, Removed | `12-zones.js` | shipped |
| View Field peek bar | `10-modals.js` | shipped |

## D. Decision dialogs (the `.pop` family, one chip kind each)
| Kind (chip) | Trigger | Status |
|---|---|---|
| EFFECT | every effect prompt (a pull-down HTML effect choice list) | shipped v0.91.0 |
| FLASH TIMING | your flash window after the opponent's effects | shipped |
| BURST / Burst effect | Burst reveal / Burst effect choice | shipped |
| EFFECT ORDER | order of your triggered effects | shipped |
| PAYMENT | paying the cost; cores move, soul/Reserve alternates | shipped |
| MATCH SETUP | starting a match (decks, format) | shipped |
| RESULT | game over (WIN in your colour, DEFEAT in CPU colour) | shipped |
| CARD | Zoom view of a card, card replaces a deck? | shipped |
| ZONE | zone viewer dialogs | shipped |
| INFO | glossary, deck import notes, rules coverage | shipped |
| CHOICE | coin toss, attack targets, block? | shipped |
| Payment **cost preview**: gems that will move pulse before paying | — | shipped (v0.91.0 pulses the gems) |
| Starting Hand (mulligan: Keep / Redraw cards in row) | ship | shipped |
| Coin toss | ship | shipped |
| **Keep Hand as primary button with readable card text** | — | v12 (audit "new-player UX") |
| Contract / Contract Advent, Manifest choices | ship | shipped |
| Confirm modals (delete deck, clear deck), Delete as a CPU-colour danger button | shipped v0.99.0 |
| Escape key closes **every** generic modal and menu | — | open (U8a leftover: generic confirm modals) |
| Bottom sheets on phone: rise from the bottom, stop in the lower half, buttons 50px in the thumb zone | — | v12 (audit) |

## E. Strips, banners, toasts
| Piece | Status |
|---|---|
| Shared overlay layer `#ae-fx` | shipped v0.91.0 |
| Turn ribbons (PLAYER TURN 3 / OPPONENT…, ~1.2s) | shipped |
| Step + Flash Timing ribbons ("DRAW STEP", "YOUR FLASH TIMING") | shipped |
| Match-start banner "MATCH START / GATE OPEN, RELEASE!" | shipped |
| BLOCK? chevron strip while the block pick is open | shipped |
| Illegal move strip (CPU colour, reason + button shake) | shipped v0.63.0/U1 |
| Toasts (state changes, never for a needed choice) | shipped |

## F. Small pieces
| Piece | Status |
|---|---|
| Core gem `.g-core` (faceted pentagon, one gem per core on cards) | shipped |
| Soul Core `.g-soul` (silver pentagon frame + coloured gem) | shipped |
| Sleeve `.sleeve` (6 own tints + uploaded picture, tinted by the chosen colour) | shipped |
| Kind chip on dialogs (drawn by CSS from `data-kind`, 11 kinds) | shipped |
| Skewed tags `.tagY`/`.tagC`, step pills `.st`, buttons `.ib`/`.btnp`/`.btns`, playmat veil, deck/pile count badge, `!` partial mark + legend | shipped |
| HP/stroke tabular numerals, counter-rotated numbers inside skewed shapes | shipped |
| Card zoom view (+ **zoom buttons in mockup style**, .modal-btn) | shipped v0.91.0 |
| `!` legend entry: "Effect not fully implemented" + residual list in the card detail | shipped v0.79.0 |
| Focus ring + aria labels on every control (guidelines check) | shipped, audit per screen |

## G. Animations (U5b direction: `transform`/`opacity` only, 150-600 ms, `prefers-reduced-motion` = reduced, Settings full/reduced/off; never slows the engine)
| Animation | Status | Spec |
|---|---|---|
| Attack beam (attacker -> blocker or Life) | shipped v0.92.0 | side colour, wide fading beam |
| Life core shatter (gem -> shards on Life loss) | shipped | 6 shards, transform only |
| Summon / deploy flash | shipped | one bright pulse under the card |
| Destroy ghost | shipped | card fades + slight drop |
| BP change pop (+N / -N) | shipped | big white number, black outline |
| Level-up glow (yellow ring) | shipped | ring pulses once |
| Draw slide | shipped | card hand slide-in |
| Core flying between zones (core moves) | v12 proposal (was U5b left / U8b) | one gem follows a straight path, engine already reports the move |
| Burst flip (face-down -> revealed Burst) | v12 proposal (U8b left) | 3D rotateY half-turn + ribbon |
| Ace cut-in (your attacker's card pops large beside the attack beam) | v12 proposal | left-right flash paste-up, ~500ms, reduced = fade |
| Life edge flash (red vignette when your Life is reduced) | v12 proposal | red edge fades in around the board |
| Level-up pillar (gold light column) | v12 proposal | replace or enlarge the ring important events |
| Turn banner slide / match-start banner | shipped (ribbon) | v12 adds slide-in; reduced = fade |
| Screen shake on a big destroy (only when Animations Full) | v12 proposal | caution: keep X1 field lock; shake the board, not the slots |

## H. Small fixes carried per screen ("any session with room")
- Prebuilt colour decks still show "!" on older hand-wired cards (A1 follow-up (a)).
- Replay divergence: UI-only card menu answers (`detail`) recorded as decisions break replay import (F-1 finding (e)); do not record UI-only menus.
- Deck builder Escape, Library card grid, deck-code notes (U8a leftovers).

## Sources used for the v12 proposal
- Live study: aegis-digi.online home + play page, PC 1280x800 (screens 2026-10-22; pattern: deck chip (+ mode -> setup -> one START) and one confirm sentence before the primary button).
- CrossOver, the licensed console game by FuRyu (Nov 2024): repo's own studied notes in `docs/DESIGN.md` section 0 (17:04, board / banners / ribbons / prompts / effect panel / result) + official art (announcement image, mood only).
- Limitation recorded: YouTube frame capture is blocked headless ("Sign in to confirm you're not a bot", 2026-10-22), so no new video frames were taken; the CrossOver reference stands on the repo's earlier live study.
