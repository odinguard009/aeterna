// v0.59.5 in-game error catcher (Q1 quality bundle, Aegis idea): window "error" / "unhandledrejection" -> notice with
// "Copy report" (message, stack, version, match record) and "Close"; the events are not cancelled.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(closeBrowser);

test('E595-01 no notice without an error', async () => {
  assert.equal(await g.page.locator('#err-notice').count(), 0);
});
test('E595-02 an uncaught error shows the notice and still reaches the page error handlers', async () => {
  await g.page.evaluate(() => { setTimeout(() => { throw new Error('E595 boom'); }, 0); return 1; });
  await g.page.waitForSelector('#err-notice', { state: 'visible' });
  assert.match(await g.page.textContent('#err-notice-text'), /Something went wrong \(1 error\)/);
  assert.ok(g.errors.some(e => e.includes('E595 boom')), 'pageerror still fired');
});
test('E595-03 an unhandled promise rejection is counted', async () => {
  await g.page.evaluate(() => { Promise.reject(new Error('E595 promise')); return 1; });
  await g.page.waitForFunction(() => BS.ERR_LOG.length === 2);
  assert.match(await g.page.textContent('#err-notice-text'), /\(2 errors\)/);
  assert.equal(await g.page.locator('#err-notice').count(), 1, 'one notice, not one per error');
});
test('E595-04 the report carries version, messages, stack and the match record', async () => {
  const r = await g.page.evaluate(() => { BS.testSetup(); BS.G.rec = { v: 1, build: BS.VERSION, seed: 4242, format: 'eternal', sim: false, deckA: {}, deckB: {}, inputs: [{ a: 'x' }] }; return BS.errReport(); });
  const v = await g.page.evaluate(() => BS.VERSION);
  assert.match(r, new RegExp('^Aeterna error report\\nversion: ' + v.replace(/\./g, '\\.')));
  assert.match(r, /error 1 \(error, [^)]+\): (Uncaught )?(Error: )?E595 boom/);
  assert.match(r, /error 2 \(promise, [^)]+\): E595 promise/);
  assert.match(r, /\nError: E595 boom/, 'stack text');
  assert.match(r, /match: turn 3, step 4, active player/);
  assert.match(r, /record: \{"v":1,"build":"[\d.]+","seed":4242,.*"inputs":\[\{"a":"x"\}\]/);
});
test('E595-05 Copy report copies or shows the text; Close removes the notice', async () => {
  await g.page.click('#err-copy');
  await g.page.waitForFunction(() => document.getElementById('err-copy').textContent === 'Copied' || !document.getElementById('err-text').hidden);
  const shown = await g.page.evaluate(() => document.getElementById('err-text').hidden ? null : document.getElementById('err-text').value);
  if (shown !== null) assert.match(shown, /^Aeterna error report/);
  await g.page.click('#err-close');
  assert.equal(await g.page.locator('#err-notice').count(), 0);
});
test('E595-06 the log keeps the newest 10 errors', async () => {
  const n = await g.page.evaluate(() => { for (let i = 0; i < 15; i++) BS.onGameError('error', 'e' + i, ''); return [BS.ERR_LOG.length, BS.ERR_LOG[9].msg]; });
  assert.deepEqual(n, [10, 'e14']);
  assert.equal(await g.page.locator('#err-notice').count(), 1, 'a new error after Close shows the notice again');
});
