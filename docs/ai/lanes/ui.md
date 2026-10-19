# ui lane notes

Changes this lane needs in shared files, one `- [ ]` line each (CHANGELOG bullet, roadmap line, minor/patch). The merge step (`tools/lane_merge.sh`) applies them and ticks them `- [x]`; ticked lines may be deleted by the next lane session.

## U4 (agent A1, team session v0.68.0)
- [x] CHANGELOG v0.68.0, heading "U4": "Settings page restyled: header card, section menu (PC left column, phone chip row) and rows with a help line; Appearance holds Dark/Light, your colour (3x3 grid, same choice as the header picker) and the CPU colour line."
- [x] CHANGELOG v0.68.0, heading "U4": "Playmat upload in Settings, Appearance: your picture fills the battle board (centre kept, edges trimmed), with a veil and see-through field rows so the board stays readable; stored on this device with the card images, Remove takes it away."
- [x] CHANGELOG v0.68.0, heading "U4": "How to play and Library pages in the new style (header card, document cards; How to play in two columns on PC). Every button, setting and saved choice works as before."
- [x] Roadmap `docs/ai/roadmap-open.md` item U: "**U4** done in v0.68.0 (`apps/web/src/13d-pages.js`: Settings section menu + rows, Appearance with colour grid, Dark/Light, playmat upload stored as IndexedDB key `~playmat` (cover, veil, `--ae-rowbg` see-through rows), CPU colour; How to play + Library restyled; test `tests/unit/ui68.test.mjs`)." CLAUDE.md "Done" gets "U4 Settings / How to play / Library v0.68.0 (`apps/web/src/13d-pages.js`, playmat upload)."
- [x] Release type: minor (UI overhaul session with a new player feature, the playmat upload).
- [x] Revert note for the release notes: "to undo U4, revert commit a96f305 on lane/ui (after the merge: the merge's copy of it)."
- [x] Player-view note for A6: Settings section menu jumps by scroll (all sections stay on one page); the stylesheet is at ~89.4 KB of the 90 KB budget (test B04), so U5 needs to trim old CSS or raise the budget on purpose.
