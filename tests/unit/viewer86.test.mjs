// v0.86.0 (phase F4 part 2 = monorepo step M4 rest): the replay viewer of the web page (apps/web/src/13f-replay.js).
// A port record re-runs in the page's own engine (runPortRecord) and in Node (headless) to the same frames; the viewer
// plays the frames back without the engine; the match history keeps the record of the last 3 matches (Watch / Save).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { playHeadless, replayPort, viewerReplay } from '../../packages/engine/headless.mjs';
import { closeBrowser, openGame } from './lib/game.mjs';

after(async () => { await closeBrowser(); });
let REC = null;
const realRec = async () => REC || (REC = (await playHeadless({ seed: 21, deckA: 'red', deckB: 'green', human: true, real: true, timeoutMs: 30000 })).port);

test('V86-01 a web-rules match recorded headless replays in the page to the same frames as in Node', async () => {
  const rec = await realRec();
  assert.equal(rec.sim, false); assert.ok(rec.final && rec.answers.some(a => a.k === 'choice') && rec.answers.some(a => a.k === 'action'));
  const n = await replayPort(rec); assert.ok(n.ok && n.same, n.reason);
  const hv = await viewerReplay(rec); assert.ok(hv.ok);
  const { page, errors } = await openGame('');
  const r = await page.evaluate(async rec => { const v = await BS.viewerReplayOf(rec, { close: true }); return { ok: v.ok, reason: v.reason, frames: v.ok ? v.replay.frames : null, G: !!BS.G, host: io.host.name }; }, rec);   // eslint-disable-line no-undef
  await page.close();
  assert.deepEqual(errors, []);
  assert.ok(r.ok, r.reason); assert.equal(r.G, false, 'the replayed match is dropped'); assert.equal(r.host, 'web', 'the web host is bound again');
  assert.equal(r.frames.length, hv.replay.frames.length);
  assert.deepEqual(r.frames[r.frames.length - 1], hv.replay.frames[hv.replay.frames.length - 1]);
});

test('V86-02 the viewer steps by frame and by turn; the history row watches and saves the record', async () => {
  const rec = await realRec();
  const { page, errors } = await openGame('');
  const r = await page.evaluate(async rec => {
    /* eslint-disable no-undef */
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const bar = () => document.querySelector('#modal-card-desc .rv-bar')?.textContent || '';
    const press = lbl => { const b = [...document.querySelectorAll('#modal-actions button')].find(x => x.textContent.toLowerCase().includes(lbl.toLowerCase())); b.click(); };
    const out = {};
    HISTORY.push({ t: Date.now(), fmt: 'eternal', you: 'Test', cpu: 'Test', won: true, turns: rec.final.turn, port: rec });
    BS.switchView('view-settings'); await sleep(50);
    out.watchBtn = !!document.querySelector('[data-a="rv-watch"]');
    document.querySelector('[data-a="rv-watch"]').click();
    for (let k = 0; k < 200 && !bar(); k++) await sleep(50);
    out.first = bar(); press('Next'); await sleep(50); out.second = bar();
    press('Turn ▶'); await sleep(50); out.turn = bar(); press('End'); await sleep(50); out.end = bar();
    out.sides = document.querySelectorAll('#modal-card-desc .rv-side').length;
    press('Close'); await sleep(50); out.closed = !MODAL;
    BS.testSetup(); await sleep(50);                       // a match is open
    const p = BS.replayFromRecord(rec); await sleep(100); out.busyMsg = document.querySelector('#modal-card-desc')?.textContent || ''; closeModal(null); await p;
    return out;
    /* eslint-enable no-undef */
  }, rec);
  await page.close();
  assert.deepEqual(errors, []);
  assert.ok(r.watchBtn);
  assert.match(r.first, /^Frame 1 \//); assert.match(r.second, /^Frame 2 \//);
  const turnOf = s => Number((s.match(/Turn (\d+)/) || [])[1]);
  assert.ok(turnOf(r.turn) > turnOf(r.second), `${r.second} -> ${r.turn}`);
  assert.match(r.end, /Match over/); assert.equal(r.sides, 2); assert.ok(r.closed);
  assert.match(r.busyMsg, /Finish or leave the current match/);
});

test('V86-03 a sim record, a broken file and an empty viewer file are refused with a message', async () => {
  const sim = (await playHeadless({ seed: 2, deckA: 'red', deckB: 'mitra', timeoutMs: 30000 })).port;
  const { page, errors } = await openGame('');
  const r = await page.evaluate(async sim => {
    const a = await BS.runPortRecord(sim); const b = await BS.runPortRecord({ v: 7 });
    return [a.reason, b.reason];
  }, sim);
  await page.close();
  assert.deepEqual(errors, []);
  assert.match(r[0], /headless\.mjs --replay/); assert.match(r[1], /not a port record/);
});
