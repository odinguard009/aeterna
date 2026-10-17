# Deck builder UI/UX plan (owner request 2026-10-16)

**Status:** steps 1-2 done in v0.52.1 (list performance) and v0.53.0 (redesign). Leftovers for a small Sonnet bundle: a Saga select (today: set prefix only), symbol split in the deck panel, family filter as exact family chips instead of substring search.

Owner: "user friendly, functional, and still stylish, on PC and on the phone." This screen may be restructured
(owner request); keep the colour palette, the card art/card face, every existing function and both layouts working.
UI rules from CLAUDE.md still apply: own commit, `backup/vX` of the previous state, one screenshot per layout,
revert note in the release notes.

## Today (v0.52.0, measured)
- One flat grid of every card (`renderDeckBuilder`, `apps/web/src/13-render.js`): rebuilt with `innerHTML` on every filter change
  and every keystroke. With all 8,042 cards loaded: open 1.8 s PC, 8.8 s phone-like CPU (x4); search 0.25 s / 1.2 s.
- No deck panel: the deck is only visible as `×n` badges on the grid (or the "In deck only" checkbox).
- No sort, no Saga/set or family filter, single-choice colour/cost/type selects, no deck stats (cost curve, colours, types).
- Phone: the toolbar (format, slot, name, ready-made, default, clear, back) takes the first screen; filters wrap into two rows.

## Target
**PC (>= 900 px wide), three columns:**
1. Filter rail (left, ~220 px): search (name, ID, effect text), colour chips (multi-select), cost chips 0-9 / 10+,
   type chips (Spirit, Nexus, Magic, Brave, Ultimate), Saga/set select, family search, "legal in format" and "in deck" toggles,
   sort (cost, name, colour, set number), "reset filters".
2. Card grid (centre): windowed, the same card face as today; tap/click = +1, right-click or the (i) button = detail/zoom
   (existing `openZoom`), `×n` badge, legality/ban badge as today; keyboard: `/` focuses search, Esc clears it.
3. Deck panel (right, sticky, ~300 px): deck name + slot select, `38 / 40-50` counter with the legality status, rows grouped
   by type (cost, name, colour bar, `-` count `+`), cost curve bars, colour/symbol split, type split; actions:
   ready-made, default, clear, import/export text (`deckToText` / `textToDeck` already exist), undo last change.

**Phone (< 900 px):** top bar = title + deck counter + overflow menu (slot, rename, ready-made, default, clear, import/export,
back to lobby). Search field always visible; filters in a bottom sheet ("Filters (3)" button shows the active count);
grid 3 columns; the deck is a bottom bar (`Deck 38/40 · legal ▲`) that opens a full-height sheet with the deck panel.
Touch targets >= 44 px; no horizontal scroll at 360 px.

**Style:** same dark palette and colour variables (`colorVar`), card faces unchanged; chips and panels use the existing
accent colours; subtle add feedback (badge pulse), no layout shift when a card is added.

**Performance budget (test):** with 8,042 cards, open <= 300 ms PC and <= 1.2 s phone-like (x4); a keystroke in search
<= 100 ms PC (debounce 120 ms, precomputed lower-case search index); the DOM holds at most ~150 card faces
(windowed grid or pages of 120 with "show more" on scroll).

## Work order (one heavy UI session, Opus)
1. **v0.52.1 (patch): list performance** without visual change: precomputed filter/search index, debounced search,
   windowed grid; budget test in `tests/unit` (B-series) with all staged cards imported (the C52/S52 helpers load them).
2. **v0.53.0 (minor): deck builder redesign** as above: compare first with aegis-digi.online's deck builder and
   the official Connected Battler app's deck edit (built-in browser; notes + screenshots into `docs/aegis-study.md`,
   keep it short), then `backup/v0.52.1`, build PC and phone layouts, Playwright UI tests for both layouts
   (add/remove, filters, sort, deck panel/sheet, import/export, legality), player-view pass, one screenshot per layout.
3. Leftovers (polish, extra filters) go to a small Sonnet bundle; the batch promotion sessions follow after v0.53.0.
