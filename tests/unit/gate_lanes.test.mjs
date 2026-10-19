// v0.63.1 (P1 parallel lanes): the session gate evaluator with fixed inputs, no network (GATE_FIXTURE=1).
// Lane-less markers must behave exactly as before (single-lane flow); markers with a lane block only that lane.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './lib/game.mjs';

const NOW = '2026-10-19T12:00:00Z';
const ago = (min) => new Date(Date.parse(NOW) - min * 60000).toISOString().replace('.000', '');
const rows = (list) => list.map(([min, body]) => `${ago(min)}\t${body}`).join('\n');
function gate(args, comments, commits = []) {
  const r = spawnSync('bash', [join(ROOT, 'tools/session_gate.sh'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, GATE_FIXTURE: '1', GATE_NOW: NOW, COMMENTS: rows(comments), COMMITS: rows(commits), STOP_FILE: '0' },
  });
  return { out: r.stdout.trim(), code: r.status, err: r.stderr.trim() };
}
const ON = [600, 'ON'];

test('G01 no session marker: free, check GO after the idle time', () => {
  assert.equal(gate(['busy'], [ON]).out, 'FREE');
  assert.equal(gate(['check', 'opus'], [ON]).out, 'GO');
});

test('G02 lane-less MANUAL blocks every lane; DONE releases it (old behaviour)', () => {
  const c = [ON, [30, 'MANUAL']];
  assert.equal(gate(['busy'], c).code, 3);
  assert.equal(gate(['busy', 'ui'], c).code, 3);
  assert.equal(gate(['busy', 'card'], c).code, 3);
  assert.match(gate(['check', 'opus'], c).out, /^STOP manual session running/);
  assert.equal(gate(['busy'], [...c, [25, 'DONE v0.63.1 next=Opus']]).out, 'FREE');
});

test('G03 a lane LOCK blocks its own lane and the whole repo, not the other lane', () => {
  const c = [ON, [40, 'LOCK ui']];
  const ui = gate(['busy', 'ui'], c);
  assert.equal(ui.code, 3); assert.match(ui.out, /^BUSY auto session \(ui lane\) running \(40 min\)/);
  assert.equal(gate(['busy', 'card'], c).out, 'FREE');
  assert.equal(gate(['busy'], c).code, 3, 'a lane-less session waits for every lane');
  assert.equal(gate(['check', 'opus', 'card'], c).out, 'GO');
  assert.match(gate(['check', 'opus', 'ui'], c).out, /^STOP auto session \(ui lane\)/);
});

test('G04 two lanes at once; LANEDONE and UNLOCK <lane> end only their lane', () => {
  const c = [ON, [90, 'MANUAL ui'], [80, 'LOCK card']];
  assert.equal(gate(['busy', 'ui'], c).code, 3);
  assert.equal(gate(['busy', 'card'], c).code, 3);
  const c2 = [...c, [60, 'LANEDONE ui lane/ui']];
  assert.equal(gate(['busy', 'ui'], c2).out, 'FREE');
  assert.equal(gate(['busy', 'card'], c2).code, 3);
  assert.equal(gate(['busy', 'card'], [...c2, [50, 'UNLOCK card']]).out, 'FREE');
  assert.equal(gate(['busy', 'card'], [...c, [50, 'UNLOCK']]).out, 'FREE', 'a lane-less UNLOCK ends everything');
});

test('G05 stale lane marks expire like before (MANUAL 3 h, LOCK 5 h)', () => {
  assert.equal(gate(['busy', 'ui'], [ON, [200, 'MANUAL ui']]).out, 'FREE');
  assert.equal(gate(['busy', 'card'], [ON, [200, 'LOCK card']]).code, 3);
  assert.equal(gate(['busy', 'card'], [ON, [301, 'LOCK card']]).out, 'FREE');
});

test('G06 daily cap counts LOCKs of both lanes; unknown lane is refused', () => {
  const c = [[1000, 'ON'], ...[700, 650, 600, 550, 500, 450].map((m) => [m, m % 100 ? 'LOCK ui' : 'LOCK card']), [400, 'UNLOCK']];
  assert.match(gate(['check', 'opus'], c, [[420, 'v0.63.1: x']]).out, /^STOP daily cap: 6/);
  const bad = gate(['busy', 'web'], [ON]);
  assert.equal(bad.code, 2); assert.match(bad.err, /unknown lane 'web'/);
});

test('G07 status names every running lane; manual in one lane is not stopped by a manual in the other', () => {
  const c = [ON, [20, 'MANUAL card']];
  assert.match(gate(['status'], c).out, /manual session \(card lane\) running \(20 min\)/);
  assert.equal(gate(['busy', 'ui'], c).out, 'FREE');
});

test('G08 file ownership: shared files and the other lane are refused on a lane branch, free files pass', async () => {
  const { owner, problems } = await import('../../tools/lanes.mjs');
  assert.equal(owner('apps/web/src/13-render.js'), 'ui');
  assert.equal(owner('src/styles.css'), 'ui');
  assert.equal(owner('packages/engine/src/02-effects.js'), 'card');
  assert.equal(owner('data/import/saga-50.json'), 'card');
  assert.equal(owner('index.html'), 'shared');
  assert.equal(owner('CHANGELOG.md'), 'shared');
  assert.equal(owner('tests/unit/ui63.test.mjs'), 'free');
  assert.equal(owner('docs/rules/manual-17.json'), 'q3');
  assert.equal(owner('tools/rules_kb.py'), 'q3');
  assert.equal(owner('tests/unit/rules_kb.test.mjs'), 'q3');
  assert.deepEqual(problems('q3', ['docs/rules/a.json', 'tools/rules_kb.py', 'docs/ai/lanes/q3.md']), []);
  assert.equal(problems('q3', ['packages/engine/src/02-effects.js', 'apps/web/src/a.js', 'CLAUDE.md']).length, 3, 'q3 may not touch engine, UI or shared files');
  assert.deepEqual(problems('ui', ['apps/web/src/a.js', 'tests/unit/x.test.mjs', 'docs/ai/lanes/ui.md']), []);
  const p = problems('ui', ['index.html', 'packages/engine/src/x.js'], true);
  assert.equal(p.length, 3);
  assert.match(p[0], /index\.html: shared file/); assert.match(p[1], /belongs to the card lane/); assert.match(p[2], /VERSION line/);
});

// 2026-10-19 (owner): token-saving switch "hemat"; newest HEMAT ON/OFF comment wins, none = ON; other comments are ignored.
test('G20 hemat switch: default ON, newest HEMAT comment wins, ON/OFF auto comments do not count', () => {
  assert.equal(gate(['hemat'], [ON]).out, 'Mode hemat: ON');
  assert.equal(gate(['hemat', 'status'], [ON, [50, 'HEMAT OFF'], [40, 'OFF']]).out, 'Mode hemat: OFF');
  assert.equal(gate(['hemat', 'status'], [[60, 'HEMAT OFF'], [30, 'hemat on'], [10, 'DONE v0.69.0']]).out, 'Mode hemat: ON');
  assert.equal(gate(['hemat', 'maybe'], [ON]).code, 2);
});
