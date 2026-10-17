# Raw card sources

Reference data only. The game does not load these files; import tools read them and every card is still checked against the card image (colour from the corner icons) before it goes into `data/cards/`.

## fandom-cards-bs01-bs77.json
- Source: battle-spirits.fandom.com, read through the wiki's MediaWiki API in the owner's browser on 2026-10-14.
- 8,158 rows from the card lists of the 77 booster sets BS01-BS77 (starter decks, promos and special sets not included).
- Fields per card: `id`, `set`, `name`, `name_jp`, `type`, `color`, `cost`, `reduction`, `symbols` (counted from the wiki's core icons), `families`, `keyword`, `levels` (`lv`, `cores`, `bp`), `effect` (English, wiki markup removed), `rarity`, `secret_variant`, `source`, `missing`.
- Known gaps: BS77 lists only 18 cards so far and its 3 AX cards have no page; about 300 cards have no effect text (mostly vanilla Spirits); 116 card numbers appear twice (Secret or variant rows in the set lists) and must be merged on import.
