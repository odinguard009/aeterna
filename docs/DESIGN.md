# Aeterna DESIGN.md (design system for the UI/UX overhaul)

Read by agents before any UI work (owner, 2026-10-18: "big UI/UX update; like Aegis, with the card game's own touch"). Format follows the DESIGN.md convention (visual theme, colour, type, components, layout, depth, do/don't, responsive, agent guide). The overhaul plan and its sessions live in `docs/ai/roadmap-open.md` (item U); this file only says how things should look and behave.

Sources: aegis-digi.online live site, 2026-10-18 (home, play setup, practice match on PC 1280x800 and phone 375x812; tokens read from its CSS custom properties) and `docs/aegis-study.md`. Aegis is MIT code with its own visual identity: we copy structure, spacing, motion and interaction patterns, never its logo, magenta palette, fonts or art.

## 1. Visual theme and atmosphere
- **Aegis gives the skeleton:** a calm token-driven app shell (one display face in caps for labels, one body face), a play mat board with real-looking piles in the corners, a central gauge, a fanned hand that overlaps the mat, one-line narration at the top, toasts for state changes, and full-screen decision overlays (mulligan style: title, chip, card row, two buttons).
- **Aeterna's own touch (the card game's identity):** cores are the heart of the game, so they are drawn as **gems** everywhere a number of cores matters (Life, Reserve, Count, Trash, cores on a Spirit, cost preview). The seven steps (Start, Core, Draw, Refresh, Main, Attack, End) are a step rail, not a gauge. Attribute colours (red, purple, green, white, yellow, blue) frame cards and light the field. Burst and Flash windows get their own colour so a player always sees "something can happen now".
- **Mood:** night arena. Dark by default (current players are used to it; light theme later as a token set). Gold accent kept from the current build, so it is still recognisably Aeterna.
- **Density:** PC shows everything at once; phone shows the board and puts secondary information behind one tap (sheet or menu), never behind a scroll inside a scroll.

## 2. Colour (tokens, prefix `--ae-`)
All colours are CSS custom properties on `:root` in `src/styles.css`. Old names (`--bg-main`, `--accent`, ...) stay as aliases until every rule uses the new ones.

| Role | Token | Dark (default) | Notes |
|---|---|---|---|
| App background | `--ae-paper` | `#070b12` | behind the mat |
| Panel / sheet | `--ae-sheet` | `#0f1724` | hand sheet, dialogs, top bar |
| Raised panel | `--ae-sheet-raised` | `#16213a` | chips, pile slots, hovered rows |
| Line | `--ae-line` / `--ae-line-strong` | `#24304a` / `#3a4a6b` | 1px borders |
| Text | `--ae-text` / `-2` / `-3` / `-off` | `#eef2f8` / `#b9c3d4` / `#8593ab` / `#56627a` | `-3` is the smallest allowed for labels |
| Accent (Aeterna gold) | `--ae-accent` / `-strong` / `-soft` / `--ae-on-accent` | `#e5a93c` / `#f3c25e` / `#3a2a0c` / `#140d02` | primary buttons, current step, focus |
| Focus ring | `--ae-focus-ring` | `0 0 0 3px #e5a93c66` | every focusable control |
| Success / danger / warning | `--ae-success` / `--ae-danger` / `--ae-warning` (+ `-soft`) | `#4ade80` / `#f87171` / `#fbbf24` | taken from Aegis dark |
| Scrim | `--ae-scrim` | `#000000b8` | behind overlays |
| Core gem | `--ae-core` / `--ae-core-glow` | `#4fa3ff` / `#4fa3ff55` | normal core |
| Soul Core | `--ae-soul-core` | `#ff7a3d` | ring + glow, never only colour: also a small "S" mark |
| Rim: can act | `--ae-rim-ready` | `#22d3ee` | summonable hand card, Spirit that can attack |
| Rim: needs your choice | `--ae-rim-attention` | `#fbbf24` | targets to pick, block choice |
| Rim: threat | `--ae-rim-threat` | `#f97316` | opposing attacker, card that targets yours |
| Flash window | `--ae-flash` | `#a78bfa` | step rail marker + "Flash?" prompt |
| Burst | `--ae-burst` | `#e879f9` | Burst slot ribbon, Burst reveal |
| Attribute colours | `--color-red` ... `--color-white`, `--color-ultimate`, `--color-god` | keep current values | card frame and symbol only; text on yellow and white is always dark |

Contrast: body text and labels at least 4.5:1 on their background; large numbers (BP, Life) at least 3:1. Status is never shown by colour alone (rim + icon or label).

## 3. Typography
- **No network fonts** (one offline HTML file, phone play): system stacks only. Body: `"Segoe UI", Roboto, -apple-system, "Noto Sans", sans-serif` (the Noto fallback covers Japanese, Thai and Chinese for item L1). Display/labels: same stack, `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: .14em` for small labels, `-.015em` for big titles (Aegis values). Numbers (BP, cost, cores, deck counts): `font-variant-numeric: tabular-nums`, weight 700. Mono only for the log ids and error reports.
- Scale (with `--ae-text-scale`, a future settings option): xs 12, sm 14, base 16, lg 18, xl 20, 2xl 24, 3xl 30, 4xl 36 px. Minimum on phone: 12px for labels, 14px for anything the player must read to decide.
- Line height: 1.5 body, 1.08 titles.

## 4. Components
- **Top bar:** version name left; right side icon buttons (40px, `aria-label` + tooltip): Log, Settings, Fullscreen, Exit. Phone: one overflow button (three dots) opens the same list.
- **Turn badge:** top-left chip "CPU · their move" / "You · your move", accent dot on the side that acts.
- **Step rail:** the seven steps as pills in one row; current step filled accent; passed steps dimmed; Flash windows show a small violet dot; phone shows the current step and its neighbours (current behaviour) with the same pills.
- **Narration pill:** top centre, one line, the current action ("CPU summons Blaze Colt (paid 2)"); the full log stays in the Log drawer.
- **Toasts:** top-left stack, max 3, auto-hide after 3 s, for state changes (Life lost, cores moved, Burst set). Never for things that need an answer.
- **Decision overlay:** scrim + centred sheet: small chip (what kind of decision), title (question), subtitle (one line why), card row, then buttons (secondary outline left, primary filled right; "Check board" ghost button to peek). Used for opening hand, targets, block, Flash, Burst, Contract choices. Phone: full-width bottom sheet.
- **Card (on board and in hand):** attribute-colour frame (2px, double for two colours), cost top-left in a dark circle with the cost-reduction symbol count, card type tag top-right, name centre, BP bottom-left (tabular), level badge bottom-right ("Lv2"), **core pips** along the bottom edge (one gem per core, Soul Core marked), exhausted = rotated 90 degrees (current rule) with a soft dim. Rims from section 2. Tap/hover opens the inspector (zoomed card with full text and the `residual` clauses). Card art is never shipped.
- **Pile slot (deck, trash, removed, void):** a small card stack with a count badge (Aegis piles), label under it in caps; tap opens the pile viewer.
- **Core tray:** Reserve, Count, Trash and Life as rows of gems with the number beside them (gems up to 10, then "10+" with the number). Life is red-rimmed gems. Cost preview: while choosing what to pay, the gems that will move pulse.
- **Burst slot:** face-down card with a magenta "BURST" ribbon; empty slot dashed.
- **Hand:** PC: a fan along the bottom edge, overlapping the mat, hovered card rises; sort button (By cost / By colour / By type). Phone: dark bottom sheet with player name, sort and collapse buttons, horizontal row, "end step" round button at the right edge (Aegis).
- **Attack line:** when an attack is declared, an arrow from attacker to the opposing side plus a banner "ATTACK" in the threat colour; the block prompt follows as a decision overlay.
- **Buttons:** primary (accent fill, uppercase label), secondary (accent outline), ghost (text or icon), danger (red outline). Height 44px on phone, 36px on PC. Radius 6px.
- **Chips:** 24px pills for filters, format, decision kind.

## 5. Layout
- Spacing: 4px base (`--ae-space-1` 4 ... `-12` 48). Gutters: phone 16, tablet 24, desktop 36. Radius: sm 4, md 6, lg 8, pill. Touch target 44px.
- **PC battle (landscape):** the mat fills the window. Opponent half above, own half below, the centre band holds the step rail and both core trays (opponent's above the rail, yours below). Piles sit in the corners as on Aegis (each side: deck + trash nearest that player, removed/void beside them). Nexus row behind the Spirit row on each side. Burst slot beside each player's piles. Hand fan at the bottom edge; top bar overlays the mat top.
- **Phone battle (portrait):** opponent strip at the top (trash, deck, Life gems, Reserve, Burst), opponent field, centre band (step rail + current step + Next button), own field, own strip, then the hand sheet. Log, settings and exit in the overflow menu.
- **Deck builder:** keep the v0.53.0 structure (filter rail, pool, deck panel; phone bottom sheet); restyle only.
- **Lobby/menu:** Aegis play setup pattern: deck chip at the top (deck name, colours, legal state), then mode cards (vs CPU, sims, later online), then match setup chips.

## 6. Depth and motion
- Shadows: raise `0 1px 2px #0006`, overlay `0 16px 48px #0008`, dialog `0 24px 50px #000a`.
- Motion: instant 80ms, fast 150ms, base 200ms; easing standard `cubic-bezier(.2,0,0,1)`, physical `cubic-bezier(.34,1.25,.5,1)` for cards landing. `prefers-reduced-motion`: no movement, only fades.
- Effect focus: while an effect resolves, its source card glows in the accent colour and the narration pill names it.
- Z layers: board 0, hand 20, top bar 30, sheets 80, dialogs 90, toasts 110, inspector 120.

## 7. Do and don't
- Do keep every current function, test id, keyboard shortcut and both layouts (`html.layout-pc` / phone); a restyle never changes rules or engine code.
- Do change one screen per session, with a `backup/vX` of the previous state, before/after screenshots (`node tools/screens.mjs`), and a revert note in the release notes.
- Do audit each finished screen with the skill `web-design-guidelines` and fix what applies.
- Don't load fonts, images or scripts from the network; don't ship card art; don't put the original game or project names in the page (brand guard).
- Don't copy Aegis's logo, magenta palette, pixel background or fonts.
- Don't hide a needed choice in a toast; don't use colour alone for state; don't add hover-only controls (phone has no hover).
- Don't nest scroll areas on the phone; don't shrink text under the minimums in section 3.

## 8. Responsive behaviour
- Breakpoints follow the current layout switch (`html.layout-pc` for wide screens, phone otherwise); check at 1366x768, 1280x800, 390x844 and 375x812.
- Card width keeps `--card-w` (clamp on both viewport width and height) so a full field fits without scrolling.
- Landscape phone uses the PC layout only when the height allows the hand fan (current rule).

## 9. Agent prompt guide
1. Read this file and `docs/aegis-study.md` (UI patterns); find code with `docs/ai/code-map.md` (UI is `apps/web/src/` + `src/styles.css` + `src/index.template.html`).
2. Tokens first: add the `--ae-*` tokens and map the old variables to them, then restyle the screen of the current U item.
3. For direction or polish use the skill `redesign-existing-projects`; for the final check use `web-design-guidelines` (offline copy of the rules inside the skill).
4. Before/after screenshots with `node tools/screens.mjs <dir>`; the player-view pass (`bs-playwright-tester`) must stay green.
5. Mockups and the token reference also exist as claude.ai artifacts (Design System "Aeterna Arena", Design "Aeterna battle screen"); this file wins when they differ.
