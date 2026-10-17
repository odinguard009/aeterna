// Release smoke test: open the delivered single file like a player would (PC and phone screens),
// check the menu shows without errors, start a match with the real buttons and reach a playable board.
// RELEASE_FILE=/path/to/aeterna-vX.Y.Z.html checks a copy instead of index.html.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getBrowser, closeBrowser, ROOT } from './lib/game.mjs';

const FILE = process.env.RELEASE_FILE || join(ROOT, 'index.html');
const SCREENS = {
  pc: { viewport: { width: 1366, height: 768 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
after(async () => { await closeBrowser(); });

async function open(screen) {
  const ctx = await (await getBrowser()).newContext(SCREENS[screen]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('dialog', d => { errors.push('dialog: ' + d.message().slice(0, 100)); d.dismiss(); });
  await page.goto(pathToFileURL(FILE).href);
  return { ctx, page, errors };
}

/** Starts a match with the real start button and answers every opening prompt with its first button. */
async function startMatch(page) {
  await page.evaluate(() => { document.querySelector('[data-a="start"]').click(); return 1; });
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => {
      const m = document.getElementById('action-modal');
      if (m && m.classList.contains('active')) { const b = m.querySelector('button'); if (b) { b.click(); return 'clicked'; } }
      const G = window.BS && BS.G;
      return G && G.turnNo >= 1 && !(m && m.classList.contains('active')) ? 'ready' : 'wait';
    });
    if (st === 'ready') return true;
    await page.waitForTimeout(150);
  }
  return false;
}

for (const screen of Object.keys(SCREENS)) {
  test(`R01-${screen} the game file opens without errors and shows the main menu`, async () => {
    const { ctx, page, errors } = await open(screen);
    try {
      await page.waitForFunction(() => !!window.BS, null, { timeout: 15000 });
      const s = await page.evaluate(() => ({ view: !!document.querySelector('.app-view.active'), start: !!document.querySelector('[data-a="start"]'), ver: BS.VERSION }));
      assert.ok(s.view, 'no active screen'); assert.ok(s.start, 'no start button'); assert.match(s.ver, /^\d+\.\d+\.\d+$/);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
  test(`R02-${screen} the automatic layout matches the screen`, async () => {
    const { ctx, page, errors } = await open(screen);
    try {
      await page.waitForFunction(() => !!window.BS);
      const cls = await page.evaluate(() => document.documentElement.className);
      assert.match(cls, screen === 'pc' ? /layout-pc/ : /layout-mobile/);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
  test(`R03-${screen} a match starts from the real buttons and reaches a playable board`, async () => {
    const { ctx, page, errors } = await open(screen);
    try {
      await page.waitForFunction(() => !!window.BS);
      assert.ok(await startMatch(page), 'the match did not get past the opening prompts');
      const s = await page.evaluate(() => {
        let inv = null; try { BS.checkInvariants(); } catch (e) { inv = e.message; }
        return { playmat: document.getElementById('view-playmat').classList.contains('active'), cards: document.querySelectorAll('#view-playmat .tcg-card').length, hand: BS.G.p.player.hand.length, inv };
      });
      assert.ok(s.playmat, 'the board is not shown'); assert.ok(s.cards > 0, 'no cards drawn on the board'); assert.ok(s.hand > 0); assert.equal(s.inv, null);
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
  test(`R04-${screen} the board survives a resize and a re-render`, async () => {
    const { ctx, page, errors } = await open(screen);
    try {
      await page.waitForFunction(() => !!window.BS);
      assert.ok(await startMatch(page));
      const v = SCREENS[screen].viewport;
      await page.setViewportSize({ width: v.height, height: v.width });       // rotate
      await page.waitForTimeout(300);
      await page.evaluate(() => { BS.applyLayout(); BS.render(); return 1; });
      await page.setViewportSize(v);
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.querySelectorAll('#view-playmat .tcg-card').length > 0));
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  });
}

test('R05 the delivered copy in the outputs folder is identical to index.html (when present)', () => {
  const out = '/mnt/user-data/outputs/aeterna.html';
  if (process.env.RELEASE_FILE || !existsSync(out)) return;
  const a = readFileSync(out, 'utf8'), b = readFileSync(join(ROOT, 'index.html'), 'utf8');
  if (!a.includes(`VERSION = '${JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version}'`)) return;   // copy belongs to an older release
  assert.equal(a, b);
});
test('R06 the game is one self-contained file (no external scripts, styles or modules to load)', () => {
  const h = readFileSync(FILE, 'utf8');
  assert.doesNotMatch(h, /<script[^>]+src=/i); assert.doesNotMatch(h, /<link[^>]+rel=["']?stylesheet/i); assert.doesNotMatch(h, /type=["']module["']/i);
});
