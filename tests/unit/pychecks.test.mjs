// v0.47.5 (process fix 5, owner 2026-10-16): Node copies of the Python Regression checks that need no browser,
// so `npm run -s loop` catches them before the GitHub Regression run. The Python originals stay until both agree.
// Sources: tests/suites/v21_tests.py (glossary consistency) and v28_tests.py [26].
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { srcParts } from '../../tools/src_parts.mjs';

const G = JSON.parse(readFileSync('data/glossary/effects.json', 'utf8'));
const src = srcParts().map(p => readFileSync(p.rel, 'utf8')).join('\n');
// engine names known statically: FX_TRIGGERS entries and every "NAME: {" key inside FX_ACTIONS blocks (v21 adds three flags by hand)
const trig = (src.match(/const FX_TRIGGERS = \[([^\]]*)\]/) || ['', ''])[1].match(/'([A-Z_]+)'/g).map(s => s.slice(1, -1));
const acts = [...src.matchAll(/^\s{2}([A-Z][A-Z0-9_]{2,}):\s*\{/gm)].map(m => m[1]);
const known = new Set([...trig, ...acts, 'MUST_BLOCK', 'NO_RETURN', 'CORES_DRAW']);

test('P01 glossary: unique ids and required fields (v21)', () => {
  assert.equal(new Set(G.map(g => g.id)).size, G.length);
  assert.deepEqual(G.filter(g => !(g.kind && g.meaning && ['wired', 'partial', 'missing'].includes(g.status))).map(g => g.id), []);
});
test('P02 glossary: every wired trigger/action names a real engine trigger or action (v21)', () => {
  const bad = G.filter(g => ['trigger', 'action'].includes(g.kind) && g.status === 'wired').filter(g => {
    const toks = new Set((g.engine.match(/\b[A-Z][A-Z_]{3,}\b/g) || []).filter(t => t !== 'MAGIC_FX' && t !== 'ONLY'));
    return toks.size && ![...toks].some(t => known.has(t));
  }).map(g => g.id);
  assert.deepEqual(bad, []);
});
test('P03 glossary: every wired entry has engine text; core timing/keyword entries have a rule note (v21)', () => {
  assert.deepEqual(G.filter(g => g.status === 'wired' && !g.engine).map(g => g.id), []);
  const core = ['T_SUMMONED', 'T_ATTACKS', 'T_ACTIVATE', 'C_ONCE', 'K_BURST', 'K_MIRAGE', 'K_ADVENT', 'S_UNAFFECTED', 'K_SEAL'];
  assert.deepEqual(G.filter(g => core.includes(g.id) && !g.rule).map(g => g.id), []);
});
test('P04 glossary: "by doing X" is wired and cites FAQ Q5 (v28 [26])', () => {
  const g = G.find(x => x.id === 'M_BY_DOING');
  assert.ok(g && g.status === 'wired' && /Q5/.test(g.rule));
});
