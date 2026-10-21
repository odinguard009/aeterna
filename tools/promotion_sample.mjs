#!/usr/bin/env node
// v0.80.0 (A2 prep a, docs/ai/token-economy.md section 10 "promotion check by sample"): one line per card whose effects
// or residual changed against a base commit, and the cards main must read in full (text vs JSON):
//   - every card that uses an action, trigger or effect key the base commit's shipped cards never used (new vocabulary),
//   - every card with an action that has no generated test in tests/unit/lib/fx-props.mjs,
//   - a seeded random 1 in 4 of the rest (the seed is printed; list the ids in the release notes).
// A wrong card found in the sample = read the whole batch.
//   node tools/promotion_sample.mjs [--base origin/main] [--seed N] [--json]
import { readFileSync } from 'node:fs';
import { ensureAllCards, cardsAtRev } from './all_cards.mjs';
import { caseFor } from '../tests/unit/lib/fx-props.mjs';

const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt('--base', 'origin/main'), seed = Number(opt('--seed', Date.now() % 100000));
const now = JSON.parse(readFileSync(ensureAllCards(), 'utf8'));
const old = cardsAtRev(base);      // the base commit may still carry data/cards/all-cards.json (before v0.96.0) or only the Saga files
const oldById = new Map(old.map(c => [c.id, c]));
const J = v => JSON.stringify(v ?? null);
const vocab = cards => {
  const s = new Set();
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { s.add(k); if (k === 'do' || k === 'trigger' || k === 'flag') s.add(`${k}:${x}`); walk(x); } };
  for (const c of cards) if (c.fxComplete) walk(c.effects || []);
  return s;
};
const known = vocab(old);
let r = seed >>> 0; const rnd = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const rows = [];
for (const c of now) {
  const o = oldById.get(c.id);
  if (o && J(o.effects) === J(c.effects) && J(o.residual) === J(c.residual) && o.fxComplete === c.fxComplete) continue;
  const acts = (c.effects || []).flatMap((e, ei) => (e.actions || []).map((a, ai) => ({ a, ei, ai })));
  const novel = [...vocab([{ ...c, fxComplete: true }])].filter(k => !known.has(k));
  const noGen = acts.filter(({ a, ei, ai }) => caseFor(c, ei, ai, a).skip).map(({ a }) => a.do);
  const why = novel.length ? 'new: ' + novel.slice(0, 4).join(',') : noGen.length ? 'no generator: ' + [...new Set(noGen)].join(',') : rnd() < 0.25 ? 'random 1/4' : '';
  rows.push({ id: c.id, complete: c.fxComplete === true && !(c.residual || []).length, actions: acts.map(x => x.a.do), residual: (c.residual || []).length, read: why });
}
if (args.includes('--json')) { console.log(JSON.stringify({ seed, rows }, null, 1)); process.exit(0); }
for (const x of rows) console.log(`${x.id} ${x.complete ? 'complete' : 'partial '} [${x.actions.join(' ')}] residual ${x.residual}${x.read ? '  READ: ' + x.read : ''}`);
const read = rows.filter(x => x.read);
console.log(`[promotion_sample] ${rows.length} changed card(s), ${rows.filter(x => x.complete).length} complete; read in full: ${read.length} (seed ${seed}): ${read.map(x => x.id).join(' ')}`);
