---
name: "bs-card-image-reader"
description: "Use when reading Battle Spirits card images into JSON data (cost, reduction, symbols, class, Saga) for Aeterna."
---

# Battle Spirits card image reader (Aeterna)

Use this when turning card images (user assets, VASSAL module pieces) into card JSON for the Aeterna single-file HTML simulator.

## Where the assets are
- The user's laptop (linked through the device bridge) holds card assets in the owner's laptop folder (connected through the device bridge). List with `device_list_dir`, copy with `device_stage_files` (lands in `/mnt/user-data/uploads/...`). Staged copies are snapshots; re-stage if the user edited them.
- 17 Saga folders. Index of 19,212 cards: project doc `claude/saga-map.md` and `saga_card_index.json` ([path, name, image]).
- VASSAL module "Battle Spirits [Online Battlers]" 7.0: each Saga is an extension; `buildFile.xml` has a TabWidget hierarchy with PieceSlot `entryName` and image `piece;;;<file>.png;<name>/`.

## Saga map
01 Booster Set BS01-09; 02 Constellation BS10-13; 03 Heroes BS14-18; 04 Sword Blade BS19-23; 05 Ultimate BS24-30; 06 Burning Legend BS31-34; 07 God King BS35-39; 08 Advent BS40-43; 09 God Advent BS44-47; 10 Ultra Advent BS48-51; 11 Rebirth BS52-55; 12 True Rebirth BS56-59; 13 Contract BS60-63; 14 Contract Realm Era BS64-67; 15 Contract True BS68-71; 16 Contract Cycle BS72-75; 17 Contract Proof (Block A): Eternal BS76 (+PX26), Standard 26RBS01/02, 26RCB01, 26RDB01, 26RSD01-10, RP26.
Open question: user says BS75 belongs to Saga 17; official data says Saga 16. Check the user's latest decision before adding a `saga` field.

## Reading an image
1. Frame color gives the card color/class (see classify.json if present).
2. Top-left: big number = cost. Red hexes = red reduction, blue drops = blue reduction.
3. Bottom-right gems = symbols.
4. Level boxes give cores and BP per level; read families and the effect text.
5. Open the image with Read (view it) and zoom/crop with PIL if text is small. Never guess a value you cannot see; mark it in a `note` field.

## Output JSON (per card)
`id, name, type (Spirit/Nexus/Magic/Brave), color, cost, symbols, reduction, levels [{cores,bp}], families, text, mechanics [], image, block`, optional `text_partial`, `note`, `mirage`, `magic`, and `effects` + `fxComplete:false` when the engine only covers part of the text. Reference file: project doc `claude/red-cards-BS75-BS76.json`.

## Rules
- Standard format = block A only. Contract maps to Soul State in the engine.
- Brave type is not yet supported by the importer (BS76-060 is rejected).
- Verify: render a table page of cards beside their images for the user to check, and run the importer against the finished JSON.
- Chat replies to the user are in Indonesian; JSON, code and in-project text in English.