// CPU benchmark (v0.102.0, tools/cpu_bench.mjs): Standard starters CPU vs CPU on the headless engine. The full set runs in
// the Regression workflow (job cpu-bench, --check against docs/reports/cpu-bench.json); here: the quick sample, the
// comparison rules and the baseline file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plan, playOne, summarize, compare, DECKS, BASE_FILE } from '../../tools/cpu_bench.mjs';

test('CB1 the full plan: every ordered pair of the ten starters twice, three style pairings both seats on ten deck pairs, unique seeds', () => {
  const p = plan();
  assert.equal(p.filter((m) => m.kind === 'colour').length, 180);
  assert.equal(p.filter((m) => m.kind === 'style').length, 60);
  assert.equal(new Set(p.map((m) => m.seed)).size, p.length);
  assert.ok(p.every((m) => DECKS.includes(m.a) && DECKS.includes(m.b) && m.a !== m.b));
});

test('CB2 quick sample: six Standard matches finish without errors; the same seed gives the same result', async () => {
  const rows = [];
  for (const m of plan({ quick: true })) rows.push(await playOne(m));
  const s = summarize(rows);
  assert.equal(s.finished, 6); assert.equal(s.errors, 0); assert.equal(s.timeouts, 0);
  assert.ok(s.avgTurns >= 3 && s.idleAttackPerTurn >= 0 && s.idleAttackPerTurn <= 1);
  assert.deepEqual(Object.keys(s.stylePairs).sort(), ['aggressive vs balanced', 'aggressive vs defensive', 'balanced vs defensive']);
  const again = await playOne(plan({ quick: true })[0]);
  assert.deepEqual([again.winner, again.turns, again.idleAttack], [rows[0].winner, rows[0].turns, rows[0].idleAttack]);
});

test('CB3 compare: more errors or timeouts fail; clearly more passive turns, longer games or a style losing 15 points warn', () => {
  const base = { errors: 0, timeouts: 0, avgTurns: 6, idleAttackPerTurn: 0.1, idleSummonPerTurn: 0.02, styles: { aggressive: { winPct: 50 } } };
  assert.deepEqual(compare(base, { ...base, styles: { aggressive: { winPct: 45 } } }), { fails: [], warns: [] });
  const c = compare(base, { ...base, errors: 1, timeouts: 2, idleAttackPerTurn: 0.2, avgTurns: 7.5, styles: { aggressive: { winPct: 30 } } });
  assert.equal(c.fails.length, 2); assert.equal(c.warns.length, 3);
  assert.equal(compare(base, { ...base, idleSummonPerTurn: 0.03 }).warns.length, 0, 'a small absolute change is noise');
});

test('CB4 baseline file: the full set, all finished, no errors', () => {
  const b = JSON.parse(readFileSync(BASE_FILE, 'utf8'));
  assert.match(b.build, /^\d+\.\d+\.\d+$/);
  assert.equal(b.summary.matches, 240); assert.equal(b.summary.finished, 240); assert.equal(b.summary.errors, 0);
  assert.equal(Object.keys(b.summary.decks).length, 10);
});
