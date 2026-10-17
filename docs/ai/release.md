# Release and tests (read when releasing or adding tests)

## Tests
- Minor version: **20+ new tests** (50+ for review/cleanup releases). Patch version: only the tests that guard the fix (usually 1-5); docs-only patches need none. Prefer Node tests in `tests/unit/` (quiet board via `BS.testSetup()`, see `engine.test.mjs`); Python suites `tests/suites/vNN_tests.py` only for UI flows (add to `NO_FIXTURES` in `tests/run_all.py` when they must run without TST cards).
- Ratchet lists in `tests/unit/known-gaps.json` only shrink.
- While working: `npm run -s loop` (build + lint + quick tests, one call); touched Python suites only: `python3 tests/make_fixtures.py` once, then `python3 tests/run_all.py --only <names>`.
- UI text changed (zone names, modal or pill text): `grep -rln '<old word>' tests` and run those Python suites locally with `--only` before pushing. `check_renames.py` catches removed multi-word text, but not single-word substring checks such as `'Banished' in modal(pg)` (the v0.50.0 Regression failure).
- Pitfalls: `page.evaluate` of an async call hangs (append `;1`); no parallel Playwright pages locally; never `playwright install`.

## Gate
- Local: `npm test` (~90 s) passes, `node tools/lint.mjs` clean, `python3 tools/check_renames.py` ok (stale names/labels in tests). The pre-push hook (`git config core.hooksPath .githooks`, once per clone) runs build check + lint + quick tests.
- GitHub: every push runs **CI** (build check, lint, Node tests). **Regression** (Python parts 1-3, legacy, 30 sims, in parallel) is started from the session with `gh api -X POST repos/odinguard009/aeterna/actions/workflows/regression.yml/dispatches -f ref=main -f 'inputs[sims]=30'` (pushing tags and creating refs are blocked by the session proxy; a tag pushed by the user also starts it). Wait with the one-line poll in `token-economy.md`; on failure read only the failing lines. Record real failures honestly, fix, push, dispatch again.

## Routine
1. `src/` changes; bump `VERSION` (`src/js/01-cards.js`) and `package.json` `version`. Card data: `data/cards/saga-*.json` -> `python3 tools/build_cards.py` -> `python3 tools/tag_effects.py` -> `node tools/build.mjs` (also refreshes `docs/ai/code-map.md`).
2. Tests as above.
3. Docs: `README.md` release notes (bullets, only what changed), `docs/rules-coverage.md`, `docs/reports/effect-coverage.md`, glossary `rule` notes, `python3 tools/check_obligations.py`.
4. Commit (`Fixes #N`), push, start Regression (dispatch above) -> CI + Regression green -> copy `index.html` to `/mnt/user-data/outputs/aeterna-vX.Y.Z.html` and `aeterna.html` -> `RELEASE_FILE=/mnt/user-data/outputs/aeterna-vX.Y.Z.html npm run -s test:release` (opens the delivered file on PC and phone screens and starts a match) -> SendUserFile the game file and `docs/roadmap.html` -> short Indonesian update (no Project docs: the Project holds none; everything lives in the repo) -> stop; the next "Lanjutkan roadmap" is a new session.
