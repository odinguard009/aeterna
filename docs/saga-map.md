# Aeterna: Saga map (17 Sagas)

Source: a local VASSAL card asset folder (VASSAL module "Battle Spirits [Online Battlers]" v7.0, extensions per Saga, updated 4/10/2026). Parsed from each Saga's `buildFile.xml`: Saga > set > color/type > card name + image file. 19,212 card entries in total (names and images only, no effect text).

| # | Saga | Main sets | Other content |
|---|---|---|---|
| 01 | Booster Set Saga | BS01–BS09 | SD01, SD02, promos |
| 02 | Constellation Saga | BS10–BS13 | BSC05, SD03, promos |
| 03 | Heroes Saga | BS14–BS18 | SD06, promos |
| 04 | Sword Blade Saga | BS19–BS23 | SD10–SD17, promos |
| 05 | Ultimate Saga | BS24–BS30 | BSC15–19, SD19–SD28, promos |
| 06 | Burning Legend Saga | BS31–BS34 | BSC20–24, SD29–SD32, promos |
| 07 | God King Saga | BS35–BS39 | BSC25–29, SD33–SD36, promos |
| 08 | Advent Saga | BS40–BS43 | BSC30–31, CB01–04, SD37–SD42 |
| 09 | God Advent Saga | BS44–BS47 | BSC32–33, CB05–08, SD43–SD47 |
| 10 | Ultra Advent Saga (V11) | BS48–BS51 | BSC34–35, CB09–12, SD48–SD51, Revival |
| 11 | Rebirth Saga | BS52–BS55 | BSC36–37, CB13–17, SD55–SD58 |
| 12 | True Rebirth Saga | BS56–BS59 | BSC38–39, CB18–22, SD59–SD63 |
| 13 | Contract Saga | BS60–BS63 | BSC40, CB23–27, SD64–65, PC |
| 14 | Contract Saga: Realm Era | BS64–BS67 | BSC41–42, CB28–30, CBX01, PC04–12, SD66–67 |
| 15 | Contract Saga: True | BS68–BS71 | BSC43–46, CB31–34, SD68–70 |
| 16 | Contract Saga: Cycle | BS72–BS75 | BSC47–51, promos |
| 17 | Contract Saga: Proof (Block A) | Eternal: BS76 (+PX26). Standard: 26RBS01, 26RBS02 | 26RCB01, 26RDB01, 26RSD01–10, RP26 |

Notes:
- BS75 is in Saga 16 (Cycle). Decision rule (user, 13 Oct 2026): follow where the files sit in the Card Asset folder. Count of BS75 images: 192 in Saga 16 vs 6 in Saga 17 (those 6 are BS76 reprints/promos of BS75 cards), so BS75 = Saga 16. This also matches the official site (契約編:環 第4章). BS76 is in Saga 17 as an Eternal booster.
- Saga 17 is split in two formats: Eternal (all cards, BS76) and Standard (block A, 26R sets).
- Each card gets a `saga` field (1-17) in the card database.
