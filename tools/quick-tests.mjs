// Quick Node test run: every tests/unit/*.test.mjs except the slow ones listed in SLOW.
// New test files are picked up automatically, so package.json never needs editing per version.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SLOW = new Set(['props.test.mjs', 'fuzz596.test.mjs']);      // v0.59.6: the fuzz replays run in CI (npm test)
const files = readdirSync('tests/unit')
  .filter((f) => f.endsWith('.test.mjs') && !SLOW.has(f))
  .sort()
  .map((f) => `tests/unit/${f}`);

const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
