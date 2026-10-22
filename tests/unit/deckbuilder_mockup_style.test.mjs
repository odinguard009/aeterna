// v0.94.0 U7 deck builder in the mockup v11 style (docs/DESIGN.md section 0): back to My decks, FILTERS button with the active
// count (PC: shows / hides the filter column), removable filter chips + Clear all, deck panel tabs DECK LIST / CURVE AND CHECK /
// DECK LOOK, and the Deck look (sleeve tint, core colour, Soul Core colour) saved per deck slot and used on the battle board.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { getBrowser, closeBrowser, GAME_URL } from './lib/game.mjs';

const SCREENS = {
  pc: { viewport: { width: 1366, height: 768 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};
const ctxs = [];
async function open(screen) {
  const ctx = await (await getBrowser()).newContext(SCREENS[screen]); ctxs.push(ctx);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('u94')) { localStorage.clear(); sessionStorage.setItem('u94', '1'); } } catch (e) { /* none */ } });
  await page.goto(GAME_URL); await page.waitForFunction(() => !!window.BS);
  await page.evaluate(() => { BS.switchView('view-deckbuilder'); return 1; });
  return { page, errors };
}
after(async () => { for (const c of ctxs) await c.close(); await closeBrowser(); });

for (const screen of ['pc', 'phone']) {
  test(`U94-1 ${screen}: back to My decks; FILTERS shows the count; chips remove one filter; Clear all resets`, async () => {
    const { page, errors } = await open(screen);
    await page.evaluate(() => { BS.DBF.colors.add('red'); BS.DBF.types.add('Spirit'); BS.DBF.legal = true; BS.renderDeckBuilder(); return 1; });
    const r = await page.evaluate(() => ({ btn: document.getElementById('db-filter-btn').textContent, chips: [...document.querySelectorAll('#db-achips [data-a="db-unchip"]')].map(c => c.textContent.replace('×', '').trim()),
      clear: !!document.querySelector('#db-achips [data-a="db-freset"]') }));
    assert.match(r.btn, /FILTERS\s*3/); assert.deepEqual(r.chips, ['Red', 'Spirit', 'Legal in format']); assert.equal(r.clear, true);
    const n0 = await page.evaluate(() => parseInt(document.getElementById('db-count').textContent, 10));
    await page.click('#db-achips [data-a="db-unchip"][data-v="colors:red"]');
    const r2 = await page.evaluate(() => ({ red: BS.DBF.colors.has('red'), n: parseInt(document.getElementById('db-count').textContent, 10), chips: document.querySelectorAll('#db-achips [data-a="db-unchip"]').length }));
    assert.deepEqual([r2.red, r2.chips], [false, 2]); assert.ok(r2.n > n0);
    await page.click('#db-achips [data-a="db-freset"]');
    assert.deepEqual(await page.evaluate(() => [BS.DBF.types.size, BS.DBF.legal, document.querySelectorAll('#db-achips [data-a="db-unchip"]').length, document.getElementById('db-filter-btn').textContent.trim()]), [0, false, 0, 'FILTERS']);
    if (screen === 'pc') {
      const vis = () => page.evaluate(() => document.getElementById('db-rail').getBoundingClientRect().width > 0);
      assert.equal(await vis(), true);
      await page.click('#db-filter-btn'); assert.equal(await vis(), false, 'FILTERS hides the column');
      assert.equal(await page.evaluate(() => document.getElementById('db-filter-btn').getAttribute('aria-expanded')), 'false');
      await page.click('#db-filter-btn'); assert.equal(await vis(), true);
    }
    await page.click('#view-deckbuilder [data-a="go-decks"]');
    assert.equal(await page.evaluate(() => document.getElementById('view-decks').classList.contains('active')), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
  });

  test(`U94-2 ${screen}: deck panel tabs (list, curve and check, look) and the Deck look saved per slot`, async () => {
    const { page, errors } = await open(screen);
    if (screen === 'phone') await page.evaluate(() => { BS.dbSheet('deck'); return 1; });
    const pane = () => page.evaluate(() => ['list', 'curve', 'look'].filter(k => document.getElementById('db-deck').classList.contains(`tab-${k}`)));
    const waitForPane = tab => page.waitForFunction(tab => {
      const deck = document.getElementById('db-deck'), button = deck && deck.querySelector(`[data-a="db-tab"][data-v="${tab}"]`);
      return !!button && deck.classList.contains(`tab-${tab}`) && button.getAttribute('aria-selected') === 'true';
    }, tab);
    const expectedLook = { sleeve: 'jade', core: 'red', soul: 'gold' };
    const waitForLook = () => page.waitForFunction(expected => {
      const bs = window.BS, look = bs && bs.SLOTS()[bs.ACTIVE_SLOT]?.look;
      return !!look && look.sleeve === expected.sleeve && look.core === expected.core && look.soul === expected.soul;
    }, expectedLook);
    await waitForPane('list');
    assert.deepEqual(await pane(), ['list'], 'stage: initial list tab');
    await page.click('#db-deck [data-a="db-tab"][data-v="curve"]');
    await waitForPane('curve');
    assert.deepEqual(await pane(), ['curve'], 'stage: curve tab selected');
    assert.ok(await page.evaluate(() => document.querySelectorAll('#db-check li').length >= 2), 'stage: deck check list rendered');
    await page.click('#db-deck [data-a="db-tab"][data-v="look"]');
    await waitForPane('look');
    assert.deepEqual(await pane(), ['look'], 'stage: look tab selected');
    assert.equal(await page.evaluate(() => document.querySelector('#db-deck [data-a="db-tab"][data-v="look"]').getAttribute('aria-selected')), 'true', 'stage: look tab announces selection');
    const n = await page.evaluate(() => ['sleeve', 'core', 'soul'].map(k => document.querySelectorAll(`#db-look [data-v^="${k}:"]`).length));
    assert.deepEqual(n, [6, 9, 9], 'stage: all look options rendered');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#db-look [aria-pressed="true"]')].map(b => b.dataset.v)), ['sleeve:silver', 'core:blue', 'soul:red'], 'stage: default look selected');
    for (const v of ['sleeve:jade', 'core:red', 'soul:gold']) await page.click(`#db-look [data-v="${v}"]`);
    await waitForLook();
    assert.deepEqual(await page.evaluate(() => BS.SLOTS()[BS.ACTIVE_SLOT].look), expectedLook, 'stage: selected look saved in active slot');
    await page.reload(); await page.waitForFunction(() => !!window.BS);
    await waitForLook();
    assert.deepEqual(await page.evaluate(() => BS.SLOTS()[BS.ACTIVE_SLOT].look), expectedLook, 'stage: saved look restored after reload');
    assert.deepEqual(errors, [], 'stage: no page errors');
  });
}

test('U94-3 the Deck look colours your cores and sleeve on the board; the CPU keeps the default look', async () => {
  const { page, errors } = await open('pc');
  const r = await page.evaluate(() => {
    BS.SLOTS()[BS.ACTIVE_SLOT].look = { sleeve: 'jade', core: 'red', soul: 'gold' }; BS.testSetup();
    const v = (sel, p) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).getPropertyValue(p).trim() : null; };
    return { you: v('#view-playmat .side-you .g-core', '--ae-core2'), cpu: v('#view-playmat .side-cpu .g-core', '--ae-core2'), sl: v('#view-playmat .side-you .sleeve', '--sl-tint'), cslv: v('#view-playmat .side-cpu .sleeve', '--sl-tint') };
  });
  assert.equal(r.you, '#e5484d'); assert.equal(r.cpu, '#3a8cf0'); assert.equal(r.sl, '#6fe0b8'); assert.notEqual(r.cslv, '#6fe0b8');
  assert.deepEqual(errors, []);
});
