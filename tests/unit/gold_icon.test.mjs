// v0.41.5: Fandom's gold reduction icon = our `ultimate` reduction symbol (issue #5 icon check). No browser.
// Evidence: Fandom lists a gold symbol on 241 Ultimate cards, the engine gives Ultimates the `ultimate` symbol attribute, and manual p. 40
// says the Ultimate symbol pays Ultimate reduction symbols. Engine matching is proven in rules32.test.mjs (R06, R18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/game.mjs';

const COLORS = ['red', 'blue', 'white', 'green', 'purple', 'yellow'];
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const staged = readdirSync(join(ROOT, 'data/import')).filter(f => /^saga-\d+\.json$/.test(f))
  .flatMap(f => { const d = read(`data/import/${f}`); return Array.isArray(d) ? d : d.cards; });
const curated = read('data/cards/all-cards.json');
const SRC = join(ROOT, 'data/sources/fandom-cards-bs01-bs77.json');
const have = existsSync(SRC);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

test('no card data carries a raw "gold" reduction key', () => {
  for (const c of staged.concat(curated)) assert.ok(!('gold' in (c.reduction || {})), c.id);
});
test('staged reduction keys are colours or ultimate only (god stays dropped until the image check)', () => {
  for (const c of staged) for (const k of Object.keys(c.reduction || {})) assert.ok(COLORS.includes(k) || k === 'ultimate', `${c.id} ${k}`);
});
test('the four cards named in the roadmap carry their Ultimate reduction symbols (BS74-X14 promoted to the game data in v0.46.0)', () => {
  const by = Object.fromEntries(staged.concat(read('data/cards/all-cards.json')).map(c => [c.id, c]));
  assert.deepEqual([by['BS74-X14'], by['BS75-016'], by['BS75-077'], by['BS75-X04']].map(c => c.reduction.ultimate), [1, 1, 1, 2]);
});
test('staged ultimate count equals the Fandom gold count of the chosen record (skipped without data/sources)', { skip: !have }, () => {
  const rows = read('data/sources/fandom-cards-bs01-bs77.json').cards;
  let withGold = 0;
  for (const c of staged) {
    const r = rows.find(x => x.id === c.id && norm(x.name) === norm(c.name));
    assert.ok(r, `${c.id} missing in Fandom`);
    const g = (r.reduction || {}).gold || 0;
    assert.equal((c.reduction || {}).ultimate || 0, g, c.id);
    if (g) withGold++;
  }
  assert.ok(withGold > 300, `expected 300+ staged cards with a gold icon, got ${withGold}`);
});
