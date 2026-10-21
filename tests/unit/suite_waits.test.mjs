// v0.87.0 (phase F5 = Q2): the browser suites wait on a visible state (tests/suites/waits.py: ready, settle) instead of
// fixed times. Shrink-only ratchet: the number of fixed wait_for_timeout calls in tests/suites may only go down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/game.mjs';

const MAX_FIXED_WAITS = 1;      // lower it when you remove one; never raise it (178 on 2026-10-20, before F5)
const dir = join(ROOT, 'tests/suites');

test('W87-01 fixed waits in tests/suites only shrink', () => {
  const per = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.py') && f !== 'waits.py')) {
    const n = (readFileSync(join(dir, f), 'utf8').match(/\.wait_for_timeout\(/g) || []).length;
    if (n) per[f] = n;
  }
  const total = Object.values(per).reduce((a, b) => a + b, 0);
  assert.ok(total <= MAX_FIXED_WAITS, `fixed waits ${total} > ${MAX_FIXED_WAITS}: ${JSON.stringify(per)} (use settle(pg) / ready(pg) from tests/suites/waits.py)`);
});

test('W87-02 every suite that uses the state waits imports them', () => {
  for (const f of readdirSync(dir).filter(f => f.endsWith('.py') && f !== 'waits.py')) {
    const s = readFileSync(join(dir, f), 'utf8');
    if (/\b(settle|ready)\(/.test(s)) assert.match(s, /from waits import settle, ready/, f);
  }
});
