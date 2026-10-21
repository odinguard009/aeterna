// Quick Node test run: every tests/unit/*.test.mjs except the slow ones listed in SLOW.
// New test files are picked up automatically, so package.json never needs editing per version.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';

const SLOW = new Set(['props.test.mjs', 'fuzz596.test.mjs']);      // v0.59.6: the fuzz replays run in CI (npm test)
const files = readdirSync('tests/unit')
  .filter((f) => f.endsWith('.test.mjs') && !SLOW.has(f))
  .sort()
  .map((f) => `tests/unit/${f}`);

// Item T (owner, 2026-10-21): node --test runs (cores - 1) files at a time, i.e. one by one on the 2-core session machine; most
// files wait on a browser page, so 3 at a time took the set from 528 s to 320 s there with the same 1,338 passes. BS_TEST_CONC=1
// restores the serial run (use it if a test turns flaky under load).
const conc = Number(process.env.BS_TEST_CONC) || Math.max(3, availableParallelism() - 1);
const r = spawnSync(process.execPath, ['--test', `--test-concurrency=${conc}`, ...files], { stdio: 'inherit', env: { ...process.env, BS_QUICK: '1' } });   // v0.60.2: timing tests skip themselves
process.exit(r.status ?? 1);
