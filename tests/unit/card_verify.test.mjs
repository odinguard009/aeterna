// Q4 (skill bs-card-verify): tools/card_verify.py prints one card's dossier (game data, Fandom export diff, rule chunks
// with test pins, tests naming the card). Offline; export checks skip when data/sources is not checked out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const py = (...a) => spawnSync('python3', ['tools/card_verify.py', ...a], { encoding: 'utf8' });
const hasPy = !py().error;
const KB = JSON.parse(readFileSync('docs/rules/kb.json', 'utf8'));
const pins = new Map(KB.chunks.map((c) => [c.id, c.sha256.slice(0, 8)]));

test('CV1 every keyword chunk the tool maps to exists in the rules KB', () => {
  const src = readFileSync('tools/card_verify.py', 'utf8').split('FIELDS =')[0];
  const ids = [...src.matchAll(/'((?:ETR|STD|SJP):[a-z0-9.-]+)'/g)].map((m) => m[1]);
  assert.ok(ids.length >= 25, `${ids.length} mapped chunks`);
  assert.deepEqual(ids.filter((i) => !pins.has(i)), []);
});

test('CV2 dossier of a playable card: data, current pins, scenario tests, export diff', { skip: !hasPy && 'python3 missing' }, () => {
  const r = py('BS01-047', '--json');
  assert.equal(r.status, 0, r.stderr);
  const d = JSON.parse(r.stdout);
  assert.equal(d.file, 'data/cards/saga-01.json'); assert.equal(d.playable, true); assert.equal(d.name, 'The Witch Naja');
  assert.deepEqual(d.effects[0].trigger, 'BATTLE_WIN');
  assert.ok(d.rules.includes('STD:8-1-6@' + pins.get('STD:8-1-6')), d.rules.join());
  assert.ok(d.tests.some((t) => t.startsWith('tests/scenarios/battle-win-only-opposing-destroyed.json:')), d.tests.join());
  if (existsSync('data/sources/fandom-cards-bs01-bs77.json')) {
    assert.equal(d.export, 'data/sources/fandom-cards-bs01-bs77.json'); assert.deepEqual(d.diffs, []);
  }
  const h = py('BS17-035', '--json'); const e = JSON.parse(h.stdout);
  assert.ok(e.rules.some((x) => x.startsWith('ETR:faq.effects-q4@')) && !e.rules.some((x) => x.startsWith('ETR:brave.')), 'a "Spirit/Brave" type list is not the Brave keyword');
});

test('CV3 unknown card exits 1, no argument prints the usage', { skip: !hasPy && 'python3 missing' }, () => {
  const r = py('ZZ99-999'); assert.equal(r.status, 1); assert.match(r.stdout, /not in data\/cards or data\/import/);
  const u = py(); assert.equal(u.status, 2); assert.match(u.stdout, /card_verify\.py <card id>/);
});
