// Quick Node test run: every tests/unit/*.test.mjs except the slow ones listed in SLOW.
// New test files are picked up automatically, so package.json never needs editing per version.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { ensureAllCards } from './all_cards.mjs';

ensureAllCards();                                         // build/all-cards.json (generated, not in git) must exist before the test files read it

const FULL = process.argv.includes('--full');           // v0.95.0: npm test (CI) = every file, no BS_QUICK, timing files alone too
const SLOW = new Set(FULL ? [] : ['props.test.mjs', 'fuzz596.test.mjs']);      // v0.59.6: the fuzz replays run in CI (npm test)
// v0.93.0: files with wall-clock limits (B09-B17: page ready, deck builder open, search) run alone after the parallel batch;
// under 3 parallel files B15 measured 355 ms against its 300 ms limit (alone ~100-200 ms). No check is dropped (item T.7).
const TIMING = new Set(['budget.test.mjs', 'deckbuilder52.test.mjs']);
const files = readdirSync('tests/unit')
  .filter((f) => f.endsWith('.test.mjs') && !SLOW.has(f) && !TIMING.has(f))
  .sort()
  .map((f) => `tests/unit/${f}`);

// Item T (owner, 2026-10-21): node --test runs (cores - 1) files at a time, i.e. one by one on the 2-core session machine; most
// files wait on a browser page, so 3 at a time took the set from 528 s to 320 s there with the same 1,338 passes. BS_TEST_CONC=1
// restores the serial run (use it if a test turns flaky under load).
const conc = Number(process.env.BS_TEST_CONC) || (FULL ? Math.max(1, availableParallelism() - 1) : Math.max(3, availableParallelism() - 1));
const env = FULL ? { ...process.env } : { ...process.env, BS_QUICK: '1' };   // v0.60.2: timing tests skip themselves
const r = spawnSync(process.execPath, ['--test', `--test-concurrency=${conc}`, ...files], { stdio: 'inherit', env });
const t = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...[...TIMING].sort().map((f) => `tests/unit/${f}`)], { stdio: 'inherit', env });
process.exit((r.status ?? 1) || (t.status ?? 1));
