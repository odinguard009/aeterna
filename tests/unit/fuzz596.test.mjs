// v0.59.6 match fuzzer (Q1 quality bundle, Aegis idea): random legal CPU choices (BS.setFuzz) over many seeds; tools/fuzz.mjs saves
// every crash / invariant break / match that does not end as tests/fuzz-cases/<mode>-<seed>.json, and this file replays them.
// Slow file (CI `npm test`; not in the quick loop).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openGame, simMatch, closeBrowser } from './lib/game.mjs';
import { fuzzOne, FUZZ_BOTH } from '../../tools/fuzz.mjs';

after(closeBrowser);

test('F596-01 fuzzPick: off = no say; on = a seeded uniform pick of an option or a pass', async () => {
  const { page } = await openGame('');
  const r = await page.evaluate(() => {
    BS.testSetup(); const P = BS.G.p.player, opts = ['a', 'b', 'c'];
    BS.setFuzz({}); const off = BS.fuzzPick(P, opts) === undefined;
    BS.setFuzz({ player: true }); const empty = BS.fuzzPick(P, []) === undefined, other = BS.fuzzPick(BS.G.p.opponent, opts) === undefined;
    const run = () => { BS.seedRng(99); return Array.from({ length: 400 }, () => BS.fuzzPick(P, opts)); };
    const a = run(), b = run(), n = k => a.filter(x => x === k).length;
    BS.setFuzz({});
    return { off, empty, other, same: JSON.stringify(a) === JSON.stringify(b), counts: [n('a'), n('b'), n('c'), n(null)] };
  });
  await page.close();
  assert.ok(r.off && r.empty && r.other, 'no fuzz unless that side is on and there is an option');
  assert.ok(r.same, 'same rng seed, same picks');
  for (const c of r.counts) assert.ok(c > 60 && c < 140, 'roughly uniform over 3 options + pass: ' + r.counts);
});
test('F596-02 a fuzzed match is reproducible from its seed and differs from the normal CPU', async () => {
  const a = await simMatch(31337, { mode: 'white', fuzz: FUZZ_BOTH }), b = await simMatch(31337, { mode: 'white', fuzz: FUZZ_BOTH }), n = await simMatch(31337, { mode: 'white' });
  assert.ok(a.over && b.over && n.over, 'all three end');
  assert.equal(a.hash, b.hash, 'same seed + fuzz = same final state');
  assert.notEqual(a.hash, n.hash, 'fuzz changes the CPU choices');
});
test('F596-03 a small live fuzz batch stays healthy', async () => {
  const fails = [];
  for (const [seed, mode] of [[20261017, 'mirror'], [596, 'yellowpurple'], [8041, 'greenblue']]) { const { reason } = await fuzzOne(seed, mode); if (reason) fails.push(`${mode} ${seed}: ${reason}`); }
  assert.deepEqual(fails, [], 'save them with: node tools/fuzz.mjs --runs 1 ...; or debug with simMatch(seed, {mode, fuzz})');
});
test('F596-04 every saved fuzz case replays healthy', async () => {
  const dir = join(ROOT, 'tests/fuzz-cases'), files = readdirSync(dir).filter(f => f.endsWith('.json')), fails = [];
  for (const f of files) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const r = await simMatch(c.seed, { mode: c.mode, fuzz: c.fuzz, timeoutMs: 90000 });
    if (r.errors.length || r.inv.length || !r.over) fails.push(`${f}: ${r.errors[0] || r.inv[0] || 'not over (turn ' + r.turn + ')'} (first seen: ${c.reason})`);
  }
  assert.deepEqual(fails, []);
});
