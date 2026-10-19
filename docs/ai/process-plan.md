# Process plan: which session steps run less often or go away (owner, 2026-10-19)

Owner: "too many tests"; "update the steps we have been doing: a step that can run every few sessions or be dropped gets a plan". Part A is applied (owner approved, 2026-10-19 17:30). Part B: owner approved on 2026-10-19 18:37 ("apply in the next session"): roadmap item P0, done by the next session before K3; each row is reversible.

## A. Applied 2026-10-19 (tests)
| Step | Before | Now | Why |
|---|---|---|---|
| `npm run -s loop` (session start + after every task) | build, lint, every quick test: 1,214 tests, ~3 min each run | build, lint, brand guard, 5 smoke files + test files changed on the branch: ~15 s (`-- --full` = old behaviour) | the full set ran 2-6 times per session |
| Full quick set | start, every task, pre-push | pre-push hook only (once per push) | same coverage before anything leaves the laptop/workspace |
| Local `npm test` / `test:props` (~3-4 min) | local release gate | dropped: CI runs `npm test` on every push to `main` | ran twice (local + CI) |
| GitHub Regression (5 Python parts + sims + fuzz) | every session | `tools/regression_due.sh`: newest run not green, 3+ releases since its commit, or a core engine file changed (30 sims; else 10) + weekly scheduled run (Sunday 03:17 WIB) | Actions minutes and reading results every session |
| Player-view subagent (HEMAT ON) | every 3rd session and before every minor release (= almost every card session) | at a backup (every 5 releases) or when the UI changes | biggest token cost among the checks |
| New-test quota | 20+ per minor, 50+ per review release | one test per new action / condition / trigger head, promoted card group or fixed bug | tests written to reach a number |
| `tests/legacy/imp.py`, `sizes.py` | in the repo, never run | removed (git history keeps them) | dead files |

Unchanged on purpose: CI on every push, pre-push hook, `test:release` on the delivered file, `check_renames.py`, ratchet lists, test-first for a new mechanic, HEMAT OFF team agents (A6 every session).

Honest note: card packs often touch core engine files (the last 5 releases together changed 8 of them), so Regression will still run in many card sessions; it is skipped mainly for compiler-only, UI-only and docs sessions.

## B. Approved, next session (P0; owner 2026-10-19 18:37)
| # | Step | Now | Proposal | Saving |
|---|---|---|---|---|
| B1 | CLAUDE.md `**Done:**` line (6.3k of 19k characters) | updated every session; CLAUDE.md is re-sent on every tool call | replace with one line pointing to `CHANGELOG.md` and the mind map; keep only `**Next:**` | ~1.6k tokens on every call (~100k+ per session) |
| B2 | `docs/ai/roadmap-open.md` (37k characters) read at every start | superseded sections ("Earlier plan 2026-10-15", "Plan from the audit 2026-10-16", done Rules audit parts) stay in it | move them to `docs/ai/roadmap-archive.md` (not read at start) | ~2k tokens per start |
| B3 | Start step 4 (`git log -5`, issue titles, handoff) | separate call, but `session_start.sh` already prints the log and the issues | `session_start.sh` also prints the newest handoff, chain-stop state and `Mode hemat`; drop steps 2, 4 and the separate hemat call | 2-3 calls per session |
| B4 | Card-prep subagent (a) sizing the next heads | every card session | `python3 tools/pack_plan.py` already sizes the packs; main does the one scratch recompile itself | one subagent per card session |
| B5 | Card-prep subagent (b) rules research | every card session | only when the next pack's blocker has no `prep.rules` in `data/glossary/mechanics.json` | one subagent in most card sessions |
| B6 | `tools/mechanic_inventory.py` | every session end | only when `data/glossary/mechanics.json` changed | one call |
| B7 | Release check (`gh api .../releases/tags/vX.Y.Z`) | separate call | inside `tools/session_end_check.mjs` | one call |
| B8 | `docs/ai/token-economy.md` sections 8-16 (measurements v0.30-v0.39) | kept as history | condense to ~15 lines of lessons; history stays in git | smaller doc when read |
| B9 | Python legacy suites (v0.11 era) in Regression | run with every Regression | audit against the Node tests (`pychecks.test.mjs` already mirrors some); drop the Python checks that have a Node twin | Actions minutes, faster Regression |
| B10 | K2 generated tests (done in v0.69.2: `fxprops692.test.mjs`) | check its time in the quick set | generate pure Node tests where possible (no page load), else list them as SLOW (CI only), so the quick set does not grow back to minutes | keeps the loop fast |

Kept every session (owner rules or cheap): gate marks, opening line, `unlock_report.py --line`, mind map + game file to the owner, `session_end_check.mjs`, backup check (every 5 releases), final summary with tokens.
