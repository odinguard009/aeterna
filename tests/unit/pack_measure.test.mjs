// 2026-10-20: tools/pack_measure.py swaps the head of a blocker for a head the compiler already reads, so a pack's real yield
// can be measured by a scratch recompile (pack-plan upper bounds were 3-25x too high).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './lib/game.mjs';

const py = (code) => spawnSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(join(ROOT, 'tools'))})\nimport pack_measure as pm\n${code}`], { encoding: 'utf8' });

test('PM01 a parenthetical head is swapped for a known head, the body is kept', () => {
  const r = py(`print(pm.strip_head('(When Battles) Draw 1 card.', 'no trigger: (When Battles)'))`);
  assert.equal(r.stdout.trim(), '(When Summoned) Draw 1 card.');
});

test('PM02 a plain-English head is cut at its first comma; a template swallows its reminder text', () => {
  const a = py(`print(pm.strip_head('When your Life is reduced, draw 1 card.', 'no trigger: When your Life'))`);
  assert.equal(a.stdout.trim(), '(When Summoned) draw 1 card.');
  const b = py(`print(pm.strip_head('{{Rush|Red}}(While you have a Red symbol, the following effect activates next)\\n: Draw 1 card.', 'wiki template {{Rush}}'))`);
  assert.match(b.stdout.trim(), /^\(When Summoned\) Draw 1 card\.$/);
});

test('PM03 a blocker without a head to swap is not measurable', () => {
  const r = py(`print(pm.strip_head('Put a core on this Spirit.', 'sentence: put a core'))`);
  assert.equal(r.stdout.trim(), 'None');
});
