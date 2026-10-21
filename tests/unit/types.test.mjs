// M5 types (v0.101.0): the checker ratchet in tools/lint.mjs. Engine and protocol parts carry no checker errors (they are
// not in the baseline), every baseline entry is a real web part, and every record type the engine names in JSDoc is
// declared in packages/engine/types.d.ts (or as a JSDoc @typedef in a part). The checker itself runs in `npm run lint` (loop, pre-push, CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = JSON.parse(readFileSync('tools/type-baseline.json', 'utf8'));
const dts = readFileSync('packages/engine/types.d.ts', 'utf8');

test('T101-1 baseline: only web parts, each one exists, counts are positive integers, keys sorted', () => {
  const keys = Object.keys(base.parts);
  assert.deepEqual(keys.filter((k) => !k.startsWith('apps/web/src/')), [], 'engine/protocol parts must stay at 0');
  for (const k of keys) { assert.ok(existsSync(k), k); assert.ok(Number.isInteger(base.parts[k]) && base.parts[k] > 0, k); }
  assert.deepEqual(keys, keys.slice().sort());
  assert.ok(Object.values(base.parts).reduce((a, b) => a + b, 0) <= 74, 'the ratchet only goes down (v0.101.0: 74)');
});

test('T101-2 every custom type named in engine JSDoc is declared in types.d.ts or a @typedef', () => {
  const builtin = new Set(['Promise', 'Record', 'Array', 'Object', 'string', 'number', 'boolean', 'any']);
  const names = new Set(), typedefs = new Set();
  for (const dir of ['packages/engine/src', 'packages/protocol/src']) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      for (const m of src.matchAll(/@typedef\s*\{.*\}\s*([A-Z]\w*)/g)) typedefs.add(m[1]);
      for (const m of src.matchAll(/@(?:type|returns|param)\s*\{([^}]*)\}/g)) {
        for (const n of m[1].match(/\b[A-Z][A-Za-z]+\b/g) || []) if (!builtin.has(n)) names.add(n);
      }
    }
  }
  assert.ok(names.size >= 8, [...names].join());
  assert.deepEqual([...names].filter((n) => !typedefs.has(n) && !new RegExp(`\\binterface ${n}\\b`).test(dts)), []);
});
