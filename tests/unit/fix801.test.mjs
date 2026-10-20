// v0.80.1 (A1 follow-ups (e) and the v0.79.0 player-view note): Escape closes the deck builder card detail, and the
// Library counts leave out the built-in Training cards (they are not real cards).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { getBrowser, closeBrowser, GAME_URL } from './lib/game.mjs';

after(closeBrowser);

async function open() {
  const ctx = await (await getBrowser()).newContext({ viewport: { width: 1366, height: 768 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(GAME_URL); await page.waitForFunction(() => !!window.BS);
  return { page, errors };
}

test('FX801-01 Escape closes the deck builder card detail', async () => {
  const { page, errors } = await open();
  await page.evaluate(async () => { BS.switchView('view-deckbuilder'); await new Promise(r => requestAnimationFrame(() => setTimeout(r))); });
  await page.click('#db-card-list [data-a="dbcard"]', { button: 'right' });
  await page.waitForSelector('#action-modal.active');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('action-modal').classList.contains('active'), null, { timeout: 2000 });
  assert.equal(await page.evaluate(() => document.getElementById('view-deckbuilder').classList.contains('active')), true);
  assert.deepEqual(errors, []);
});

test('FX801-02 the Library counts leave out the built-in Training cards', async () => {
  const { page, errors } = await open();
  const r = await page.evaluate(() => {
    BS.switchView('view-library');
    const ids = Object.keys(BS.CARDS).filter(k => !BS.CARDS[k].token);
    return { text: document.getElementById('lib-imgcount').textContent, all: ids.length, train: ids.filter(k => k.startsWith('TRAIN-')).length };
  });
  assert.ok(r.train > 0, 'Training cards are built in');
  const known = Number(/([\d,]+) card\(s\) known/.exec(r.text)[1].replace(/,/g, ''));
  assert.equal(known, r.all - r.train, r.text);
  assert.deepEqual(errors, []);
});
