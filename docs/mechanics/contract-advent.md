# Contract Advent (and Flag Contract Advent)

- **Source:** Eternal manual (page not cited yet: open row in `docs/reports/rules-audit.md`); Flag Contract Advent: JP Eternal 17.0 rule revision notice, item 2 (`docs/manual-notes.md`).
- **Rule as built:** from the Hand in the Main Step or a Flash window, onto a matching Spirit (family + counter requirement, Your Turn / Either Attack Step); the Soul Core goes to the Trash; "When Advents" effects fire; the Spirit on top continues a battle.
- **Decision (v0.14):** one data-driven form; Contract Field from Soul State uses Reserve cores only (Field cores are not offered).
- **Engine:** `cadvSources`, `contractAdventTargets`, `doContractAdvent`, `humanContractAdvent`, `cpuAdvents`, `advTiming`, `soulAdventOK` (`packages/engine/src/02d-effects-resolve.js`).
- **Tests:** `tests/suites/advent_tests.py`, `tests/suites/mitra_tests.py`, `tests/suites/contract_field_tests.py`, `tests/unit/ultimate.test.mjs` (Ultimates are not Contract Advent targets).
- **Open:** Flag Contract Advent onto a Nexus (BS76-BS77, 18+ staged cards) needs the Flag Nexus levels, missing from the Fandom export: heavy session of its own (`docs/ai/roadmap-open.md`, Session C). Coverage rows: `docs/rules-coverage.md` "Advent", "Flag Nexus + F-Contract Advent".
