// v0.42 A_DISCARD_OPP: "Unless the opponent discards a Magic card from their Hand, <effect>" (OPP_DISCARD_MAGIC_OR). First card: BS72-054 Vaha
// (During Brave Lv2-3, when it attacks, once per turn: refresh unless the opponent discards a Magic card). Quiet boards, CPU opponent (CPU rule in cpuKeepMagicOrPay).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(async () => { await g.page.close(); await closeBrowser(); });
const VAHA = 'BS72-054', M1 = 'BS68-076', M2 = 'BS68-077', BRAVE = 'BS71-063';
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent;
  P.cpu = true; O.cpu = true; for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; q.hand = []; q.deck = []; q.removed = []; q.reserve.n = 10; q.reserve.soul = false; q.tokens = {}; q.onceUsed = {}; }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, nx = (id, q = P, n = 0) => { const i = BS.mkInst(id); i.cores = n; q.nexus.push(i); return i; }, hd = (id, q = P) => { const i = BS.mkInst(id); q.hand.push(i); return i; }, dk = (id, q = P) => { const i = BS.mkInst(id); q.deck.push(i); return i; };
  const ids = L => L.map(x => x.id);`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);
const attack = (opts) => `const v = sp('${VAHA}', P, 2); v.exhausted = true; ${opts.brave === false ? '' : `v.brave = BS.mkInst('${BRAVE}');`}
  ${(opts.oppMagic || []).map(id => `hd('${id}', O);`).join(' ')} O.life = ${opts.oppLife || 5}; await BS.fireFx(P, 'ATTACKS', v, {});`;

test('D01 Vaha has the new refresh effect: braved, Lv2-3, once per turn, OPP_DISCARD_MAGIC_OR then REFRESH', async () => {
  const r = await g.page.evaluate(i => BS.CARDS[i].effects.map(e => [e.trigger, e.lv.join(''), !!e.braved, !!e.once, e.actions.map(a => a.do).join('>')]), VAHA);
  assert.deepEqual(r.at(-1), ['ATTACKS', '23', true, true, 'OPP_DISCARD_MAGIC_OR>REFRESH']);
});
test('D02 no Magic card in the opposing Hand: Vaha refreshes', async () => {
  const r = await ev(attack({}) + ' return [v.exhausted, O.trash.length];');
  assert.deepEqual(r, [false, 0]);
});
test('D03 the CPU keeps a single Magic card at Life above 2: Vaha refreshes, the Magic card stays in the Hand', async () => {
  const r = await ev(attack({ oppMagic: [M1] }) + ' return [v.exhausted, O.hand.length, O.trash.length];');
  assert.deepEqual(r, [false, 1, 0]);
});
test('D04 the CPU with two Magic cards discards the cheaper one: Vaha stays exhausted', async () => {
  const r = await ev(attack({ oppMagic: [M2, M1] }) + ' return [v.exhausted, O.hand.map(x => x.id), O.trash.map(x => x.id)];');
  assert.deepEqual(r, [true, [M2], [M1]]);
});
test('D05 the CPU at Life 2 pays with its only Magic card', async () => {
  const r = await ev(attack({ oppMagic: [M1], oppLife: 2 }) + ' return [v.exhausted, O.hand.length, O.trash.length];');
  assert.deepEqual(r, [true, 0, 1]);
});
test('D06 without a Brave the effect does not apply (During Brave): nothing is discarded, Vaha stays exhausted', async () => {
  const r = await ev(attack({ oppMagic: [M2, M1], brave: false }) + ' return [v.exhausted, O.hand.length, O.trash.length];');
  assert.deepEqual(r, [true, 2, 0]);
});
test('D07 once per turn: a second attack in the same turn does not refresh again', async () => {
  const r = await ev(attack({}) + ' const a = v.exhausted; v.exhausted = true; await BS.fireFx(P, "ATTACKS", v, {}); return [a, v.exhausted];');
  assert.deepEqual(r, [false, true]);
});
test('D08 an already refreshed Vaha does not ask the opponent anything (needExhausted)', async () => {
  const r = await ev(`const v = sp('${VAHA}', P, 2); v.brave = BS.mkInst('${BRAVE}'); hd('${M2}', O); hd('${M1}', O); O.life = 1; await BS.fireFx(P, 'ATTACKS', v, {}); return [O.hand.length, O.trash.length];`);
  assert.deepEqual(r, [2, 0]);
});

// ---- human opponent: the modal ----
const startHuman = (extra = '') => g.page.evaluate(`(async () => { ${PRE}\n O.cpu = false; hd('${M1}', O); ${extra} const v = sp('${VAHA}', P, 2); v.exhausted = true; v.brave = BS.mkInst('${BRAVE}'); window.__t = { v, O }; window.__p = BS.fireFx(P, 'ATTACKS', v, {}); return 1; })()`);
const done = () => g.page.evaluate(() => window.__p.then(() => [__t.v.exhausted, __t.O.hand.length, __t.O.trash.length]));
test('D09 human opponent: the modal offers the Magic card and "Do not discard"; declining lets Vaha refresh', async () => {
  await startHuman();
  await g.page.waitForSelector('.modal-btn[data-mi="1"]');
  const labels = await g.page.$$eval('.modal-btn[data-mi]', b => b.map(x => x.textContent.trim().toLowerCase()));
  assert.ok(labels[0].includes('plutonic wall') && labels[1].includes('not discard'), labels.join('|'));
  await g.page.click('.modal-btn[data-mi="1"]');
  assert.deepEqual(await done(), [false, 1, 0]);
});
test('D10 human opponent: discarding the Magic card stops the refresh', async () => {
  await startHuman();
  await g.page.waitForSelector('.modal-btn[data-mi="0"]');
  await g.page.click('.modal-btn[data-mi="0"]');
  assert.deepEqual(await done(), [true, 0, 1]);
});
test('D11 human opponent without a Magic card is not asked (a non-Magic card in the Hand stays)', async () => {
  await g.page.evaluate(`(async () => { ${PRE}\n O.cpu = false; hd('BS75-001', O); const v = sp('${VAHA}', P, 2); v.exhausted = true; v.brave = BS.mkInst('${BRAVE}'); window.__t = { v, O }; window.__p = BS.fireFx(P, 'ATTACKS', v, {}); return 1; })()`);
  assert.deepEqual(await done(), [false, 1, 0]);
});
// ---- action definition ----
test('D12 chk accepts the plain and the needExhausted form, rejects other values', async () => {
  const r = await g.page.evaluate(() => { const a = BS.FX_ACTIONS.OPP_DISCARD_MAGIC_OR; return [a.chk({}), a.chk({ needExhausted: true }), a.chk({ needExhausted: 'yes' })]; });
  assert.deepEqual(r, [true, true, false]);
});
test('D13 can() follows needExhausted: false for a refreshed source, true for an exhausted one, always true without the flag', async () => {
  const r = await g.page.evaluate(() => { const a = BS.FX_ACTIONS.OPP_DISCARD_MAGIC_OR; return [a.can({ src: { exhausted: false } }, { needExhausted: true }), a.can({ src: { exhausted: true } }, { needExhausted: true }), a.can({ src: { exhausted: false } }, {})]; });
  assert.deepEqual(r, [false, true, true]);
});
test('D14 the CPU rule keeps the Magic card at Life 3+ with one Magic, pays at Life 2, pays with the cheapest of two', async () => {
  const r = await g.page.evaluate(({ a, b }) => { const i = id => ({ id }); const f = BS.cpuKeepMagicOrPay; return [f({ life: 5 }, null, [i(a)]), (f({ life: 2 }, null, [i(a)]) || {}).id, (f({ life: 5 }, null, [i(b), i(a)]) || {}).id, f({ life: 1 }, null, [])]; }, { a: M1, b: M2 });
  assert.deepEqual(r, [null, M1, M1, null]);
});
test('D15 the unchanged first two Vaha effects still read When Summoned and Attacks, Lv1-3, destroy lowest cost', async () => {
  const r = await g.page.evaluate(i => BS.CARDS[i].effects.slice(0, 2).map(e => [e.trigger, e.lv.join(''), e.actions[0].do, e.actions[0].costRank]), VAHA);
  assert.deepEqual(r, [['SUMMONED', '123', 'DESTROY', 'lowest'], ['ATTACKS', '123', 'DESTROY', 'lowest']]);
});

// ---- log and edge cases ----
test('D16 the log says who discarded and that the effect does not apply', async () => {
  const r = await ev(attack({ oppMagic: [M2, M1] }) + ' return G.history.slice(-8).map(String);');
  assert.ok(r.some(l => /discards .*Plutonic Wall.*effect does not apply/i.test(l)), r.join(' | '));
});
test('D17 the log says the opponent did not discard when the CPU keeps its Magic card', async () => {
  const r = await ev(attack({ oppMagic: [M1] }) + ' return G.history.slice(-8).map(String);');
  assert.ok(r.some(l => /do(es)? not discard a Magic card/i.test(l)), r.join(' | '));
});
test('D18 a CPU opponent at Life 1 with only non-Magic cards in the Hand discards nothing and Vaha refreshes', async () => {
  const r = await ev(`const v = sp('${VAHA}', P, 2); v.exhausted = true; v.brave = BS.mkInst('${BRAVE}'); hd('BS75-001', O); hd('BS75-004', O); O.life = 1; await BS.fireFx(P, 'ATTACKS', v, {}); return [v.exhausted, O.hand.length, O.trash.length];`);
  assert.deepEqual(r, [false, 2, 0]);
});
