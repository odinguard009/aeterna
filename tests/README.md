# Aeterna tests

Two layers: fast Node tests in `unit/` (`npm test`, see the README "Development" section) and the Playwright (Python) regression below, which is the release gate.

Playwright (Python) tests that drive the single-file game through `window.BS`.

- `run_all.py` runs everything with a short summary (only failing lines): `python3 tests/run_all.py` (full), `--only v28,mitra` (selected suites), `--part 1|2|3|legacy|sims` (one part per 10-minute call), `--sims N`. Results go to `tests/last-run.json`.
- `make_fixtures.py` recreates `/mnt/user-data/outputs/wip.html`, the white/red card JSON in `/tmp/claude-0/fixtures` and the `mitra_tests.py` helper copy that several suites `exec()`. Run it once per session before the regression.
- `suites/` current suites (one numbered `chk()` per test). Version suites (`v18`…`v28`) cover the rules work of that release; `mitra_tests`, `advent_tests`, `v15*`, `v17` cover the card effects; `play_ui` and `import_all` cover the UI and card import; `mitra_sims.py` and `v25_sims.py` run CPU-vs-CPU games.
- `scenarios/` named boards (JSON) for tests, loaded with `BS.loadScenario(spec)`; the cards they create are available as `window.SC.<alias>`. Name the file after the behaviour it sets up (the `name` field must match the file name).
- Replays: `BS.lastReplay()` gives the record of the current/last match, `BS.runReplay(record)` replays it (`v26_tests.py` drives a scripted human through the real UI and replays it).
- `legacy/` the first-generation regression suites (fx, scen60, imp, mag, burst, hid, std, fmt, deep, sizes).
- `fixtures/prototype_cards.js` test-only stand-in cards (TST-*) that older suites use. They are **not** part of the shipped game. `sitecustomize.py` injects them after every `page.goto()`; run with `PYTHONPATH=tests` (copy the fixture next to it, see below). `v24_tests.py` must run **without** the fixtures because it asserts the shipped game contains no TST cards.
- Tests expect the game file at `/mnt/user-data/outputs/wip.html` (a fresh copy of `index.html`) and some suites read JSON fixtures from `/tmp/claude-0/fixtures`; adjust the paths at the top of each file for your machine.

Usage example:

    python3 tests/make_fixtures.py          # wip.html copy + the JSON/helper files the older suites read
    PYTHONPATH=tests python3 tests/suites/v23_tests.py
    python3 tests/suites/v24_tests.py        # no fixtures

Legacy notes: `legacy/*.py` load `/mnt/user-data/outputs/aeterna-v0.11.1.html`; copy the build there to run them. `legacy/sizes.py` only prints card sizes; `legacy/imp.py` needs local `cards.json` and `imgs/` files that are not in the repo (card import is covered by `suites/import_all.py`).
