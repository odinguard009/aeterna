// v0.98.0 Standard rules (JP Standard Rule Manual Ver.1.1, 2026-10-02; kb chunk SJP:setup): differences from the engine found in the
// comparison with the EN Comprehensive Rules 1.0 (docs/rules/standard-jp-1.1.md). Setup step 7: the players decide on the one redraw
// in turn order, the first player first, so the second player knows the first player's choice.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { getBrowser, closeBrowser, GAME_URL } from './lib/game.mjs';

let page = null;
async function open() {
  if (page) return page;
  const ctx = await (await getBrowser()).newContext({ viewport: { width: 1366, height: 768 } });
  page = await ctx.newPage();
  await page.goto(GAME_URL); await page.waitForFunction(() => !!window.BS);
  return page;
}
after(async () => { if (page) await page.context().close(); await closeBrowser(); });

// start a match with a fixed Math.random, win the coin toss and take `seat` (FIRST / SECOND); returns the redraw order seen while
// the Starting Hand prompt is open and after the player keeps the hand
async function redrawOrder(seat) {
  const pg = await open();
  for (const pick of ['HEADS', 'TAILS']) {      // a fixed Math.random gives a fixed seed: one of the two calls wins the toss
    await pg.evaluate(() => { window.__mr = window.__mr || Math.random; Math.random = () => 0.37; BS.testSetup(); document.querySelector('[data-a="start"]').click(); return 1; });
    await pg.waitForFunction(() => document.querySelector('#action-modal.active #modal-actions .modal-btn'));
    await pg.locator('#modal-actions .modal-btn', { hasText: pick }).click();
    await pg.waitForFunction(() => !/Coin Toss/.test((document.querySelector('#action-modal.active') || {}).textContent || 'Coin Toss'));
    const t = await pg.$$eval('#modal-actions .modal-btn', b => b.map(x => x.textContent));
    if (!t.includes('FIRST')) { await pg.evaluate(() => { BS.testSetup(); return 1; }); continue; }
    await pg.locator('#modal-actions .modal-btn', { hasText: seat }).click();
    await pg.waitForFunction(() => /Starting Hand|Contract card/.test((document.querySelector('#action-modal.active') || {}).textContent || ''));
    if (await pg.evaluate(() => /Contract card/.test(document.querySelector('#action-modal.active').textContent))) {      // a deck with a Contract card asks first
      await pg.locator('#modal-actions .modal-btn').first().click();
      await pg.waitForFunction(() => /Starting Hand/.test((document.querySelector('#action-modal.active') || {}).textContent || ''));
    }
    const during = await pg.evaluate(() => BS.G.setupRedraw.slice());
    await pg.locator('#modal-actions .modal-btn', { hasText: 'Keep hand' }).click();
    await pg.waitForFunction(() => BS.G.setupRedraw.length === 2);
    const done = await pg.evaluate(() => { const r = BS.G.setupRedraw.slice(); Math.random = window.__mr; BS.testSetup(); return r; });
    return { during, done };
  }
  throw new Error('the coin toss was never won');
}

test('SR11-01 player goes first: the player decides on the redraw before the CPU', async () => {
  assert.deepEqual(await redrawOrder('FIRST'), { during: [], done: ['player', 'opponent'] });
});
test('SR11-02 CPU goes first: the CPU has decided on its redraw before the player is asked', async () => {
  assert.deepEqual(await redrawOrder('SECOND'), { during: ['opponent'], done: ['opponent', 'player'] });
});
