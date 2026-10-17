# Raw card sources

Reference data only. The game does not load these files; import tools read them and every card is still checked against the card image (colour from the corner icons) before it goes into `data/cards/`.

## fandom-cards-bs01-bs77.json
- Source: battle-spirits.fandom.com, read through the wiki's MediaWiki API in the owner's browser on 2026-10-14.
- 8,158 rows from the card lists of the 77 booster sets BS01-BS77 (starter decks, promos and special sets not included).
- Fields per card: `id`, `set`, `name`, `name_jp`, `type`, `color`, `cost`, `reduction`, `symbols` (counted from the wiki's core icons), `families`, `keyword`, `levels` (`lv`, `cores`, `bp`), `effect` (English, wiki markup removed), `rarity`, `secret_variant`, `source`, `missing`.
- Known gaps: BS77 lists only 18 cards so far and its 3 AX cards have no page; about 300 cards have no effect text (mostly vanilla Spirits); 116 card numbers appear twice (Secret or variant rows in the set lists) and must be merged on import.

## fandom-brave-combine.tsv (v0.60.0)
- Source: battle-spirits.fandom.com card pages, fields `bravecondition` and the Brave line of `level`, read through the wiki API in the owner's built-in browser on 2026-10-17 (the export above drops them).
- 441 page titles (460 staged Brave cards; some pages hold several card numbers). `tools/import_fandom.py` (`brave_of`) turns the conditions the engine can check (cost N or more, families, family & cost, no condition) into `brave`; the rest (two-sided Left/Right, Ultimates, Grandwalker Nexus, symbol or keyword holders, "or less") stay without data and are listed as `brave_unparsed` in `data/import/report.json`.
