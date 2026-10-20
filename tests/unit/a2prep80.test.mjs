// v0.80.0 (roadmap item A2, prep b + c): data checks for partial cards and the machine-readable card counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const cards = JSON.parse(readFileSync('data/cards/all-cards.json', 'utf8'));
// Cards allowed to be partial without a residual list, each with a reason. Keep this empty: a partial card must name the
// printed clauses that do not run (the card detail lists them, roadmap item A1 follow-up d).
const ALLOW = {};

test('A80-01 every partial card (fxComplete false) names its missing clauses in residual', () => {
  const bad = cards.filter(c => c.fxComplete === false && !(c.residual || []).length && !ALLOW[c.id]).map(c => c.id);
  assert.deepEqual(bad, [], `partial cards without residual: ${bad.slice(0, 20).join(' ')}`);
  for (const [id, why] of Object.entries(ALLOW)) assert.ok(why && cards.some(c => c.id === id), `allow-list entry ${id} needs a reason and a card`);
});

test('A80-02 residual entries are non-empty strings within the parseCard limits and only sit on partial cards', () => {
  for (const c of cards) {
    if (!c.residual) continue;
    assert.ok(Array.isArray(c.residual) && c.residual.every(s => typeof s === 'string' && s.trim()), `${c.id}: residual must be non-empty strings`);
    // parseCard (03-imported-cards.js) drops a card whose residual has more than 12 entries or one over 400 characters
    assert.ok(c.residual.length <= 12 && c.residual.every(s => s.length <= 400), `${c.id}: residual over parseCard limits (12 entries, 400 chars each)`);
    if (c.residual.length) assert.notEqual(c.fxComplete, true, `${c.id}: fxComplete true with a residual list`);
  }
});

test('A80-03 docs/reports/card-counts.json matches tools/card_counts.py and data/cards (the README line reads it)', () => {
  const j = JSON.parse(readFileSync('docs/reports/card-counts.json', 'utf8'));
  const line = execFileSync('python3', ['tools/card_counts.py'], { encoding: 'utf8' }).trim();
  assert.equal(line, `playable ${j.playable.toLocaleString('en-US')}, complete ${j.complete.toLocaleString('en-US')}`, 'run python3 tools/unlock_report.py');
  assert.equal(j.playable, cards.length);
  assert.equal(j.total, j.playable + j.staged);
  const readme = readFileSync('README.md', 'utf8');
  assert.ok(readme.includes(`(${j.playable.toLocaleString('en-US')} of ${j.total.toLocaleString('en-US')} cards playable, ${j.complete.toLocaleString('en-US')} complete)`), 'README Current build line follows card-counts.json');
});
