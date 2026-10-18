// v0.36.1 performance and size budgets. Limits are ~2x (size) to ~10x (time) above the v0.36.0 measurements
// (index.html 370 KB / 96 KB gzip, load 224 ms, render 6.6 ms, heap 10 MB), so only real regressions fail, not CI noise.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { ROOT, openGame, closeBrowser, getBrowser } from './lib/game.mjs';
import { srcParts } from '../../tools/src_parts.mjs';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b); assert.ok(i > 0 && j > i, a); return j - i; };
let g;
before(async () => { g = await openGame(''); });
after(async () => { await closeBrowser(); });

// v0.51.0: the pack is compressed (packages/engine/src/01a-card-pack.js) and grows with every promoted card, so the code budget
// (B01/B02) is measured without it and the pack has its own budget (B03, B13: all cards, 8,709 since v0.62.0).
const packLen = between('/*PACK_START*/', '/*PACK_END*/'), code = html.slice(0, html.indexOf('/*PACK_START*/')) + html.slice(html.indexOf('/*PACK_END*/'));
test('B01 index.html without the card pack stays under 700 KB', () => assert.ok(Buffer.byteLength(code) < 700e3, Buffer.byteLength(code)));
test('B02 index.html without the card pack, gzipped, stays under 200 KB', () => { const n = gzipSync(code, { level: 9 }).length; assert.ok(n < 200e3, n); });
test('B03 the embedded card pack stays under 1.6 MB (room for all cards; never embed staging data)', () => assert.ok(packLen < 1.6e6, packLen));
test('B04 the stylesheet stays under 90 KB', () => {
  const css = (html.match(/<style[\s\S]*?<\/style>/g) || []).reduce((n, s) => n + s.length, 0);
  assert.ok(css < 90e3, css);
});
test('B05 the page has exactly one script and no external requests', () => {
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:/);
});
test('B06 no base64 data URIs in the page', () => assert.doesNotMatch(html, /data:[a-z/+-]+;base64,/));
test('B07 staging data (data/import) is never read by the build', () => {
  for (const f of ['tools/build.mjs', 'tools/build_cards.py']) assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /data\/import/, f);
});
test('B08 no script part grows past 60 KB (split it first)', () => {
  for (const p of srcParts(ROOT)) assert.ok(statSync(join(ROOT, p.rel)).size < 60e3, p.rel);
});
test('B09 the page is ready in under 3 s', async () => {
  const n = await g.page.evaluate(() => performance.getEntriesByType('navigation')[0].loadEventEnd);
  assert.ok(n < 3000, n);
});
test('B10 render() of a started match averages under 60 ms', async () => {
  const ms = await g.page.evaluate(() => { BS.startNewGame({ seed: 7 }); const t = performance.now(); for (let i = 0; i < 20; i++) BS.render(); return (performance.now() - t) / 20; });
  assert.ok(ms < 60, ms);
});
test('B11 JS heap after a started match stays under 80 MB', async () => {
  const mb = await g.page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1e6 : 0);
  assert.ok(mb < 80, mb);
});
test('B12 starting a new match takes under 1.5 s', async () => {
  const ms = await g.page.evaluate(() => { const t = performance.now(); BS.startNewGame({ seed: 11 }); return performance.now() - t; });
  assert.ok(ms < 1500, ms);
});
// B13 (v0.51.0): the whole card list in the pack, phone layout, CPU slowed 4x (~ a mid-range phone; measured 2.3 s).
// Limit 4 s so only real regressions fail. v0.60.2: skipped in the quick loop (BS_QUICK), where parallel test files on a
// 2-core session machine gave 4-8 s for the same build; CI (npm test) still guards it. Skipped in the light clone without data/import.
test('B13 with all cards in the pack the phone layout is ready in under 4 s with no errors', { skip: (!existsSync(join(ROOT, 'data/import/saga-01.json')) && 'light clone without data/import') || (process.env.BS_QUICK && 'timing test: runs in CI (npm test), not in the parallel quick loop') }, async () => {
  const { buildParts } = await import('../../tools/build.mjs'), { projectedCards } = await import('../../tools/pack_size.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'bse-pack-')), file = join(dir, 'full.html');
  writeFileSync(file, buildParts({ cards: projectedCards() }).html);
  const b = await getBrowser(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(pathToFileURL(file).href); await page.waitForFunction(() => !!window.BS);
    const r = await page.evaluate(() => ({ ms: performance.getEntriesByType('navigation')[0].loadEventEnd, pack: BS.PACK_IDS.size, pc: BS.isPC() }));
    assert.deepEqual(errors, []); assert.equal(r.pc, false);
    assert.ok(r.pack > 6000, String(r.pack));
    assert.ok(r.ms < 4000, String(r.ms));
  } finally { await ctx.close(); rmSync(dir, { recursive: true, force: true }); }
});
