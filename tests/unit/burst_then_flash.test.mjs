// v0.44 K_FLASH_BURST_FOLLOWUP: "Then by paying the cost, activate this card's (Flash) effect" (burst.thenFlash) for BS75-073 Crimson Meteor Defense and BS75-076 Magma Call,
// plus Magma Call's Flash effect: SYMBOL_PLUS_TURN (extra Red symbol this turn on a Lava Fish), SOUL_TO_NEXUS_THEN (Soul Core to Contractor Ometeotl, once more), magic.noMain.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(async () => { await g.page.close(); await closeBrowser(); });
const MD = 'BS75-073', MC = 'BS75-076', CR = 'BS75-001', PAC = 'BS75-004', TOD = 'BS75-010', OME = 'BS74-CX01', EK = 'BS74-038';
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent;
  P.cpu = true; O.cpu = true; G.active = 'player'; G.turnNo = 3; G.attackEnded = 0; G.endAttackAfter = null; G.attacker = null;
  for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; q.hand = []; q.deck = []; q.removed = []; q.reserve.n = 10; q.reserve.soul = false; q.trashCores.n = 0; q.trashCores.soul = false; q.tokens = {}; q.onceUsed = {}; q.life = 5; }
  for (let k = 0; k < 6; k++) { P.deck.push(BS.mkInst('${EK}')); O.deck.push(BS.mkInst('${EK}')); }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, nx = (id, q = P, n = 0) => { const i = BS.mkInst(id); i.cores = n; q.nexus.push(i); return i; }, hd = (id, q = P) => { const i = BS.mkInst(id); q.hand.push(i); return i; }, tr = (id, q = P) => { const i = BS.mkInst(id); q.trash.push(i); return i; }, bu = (id, q = P) => { const i = BS.mkInst(id); q.burst = i; return i; };
  const cast = async (q, m) => BS.castMagic(q, { inst: m, target: null, plan: null, ctx: 'flash' });`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);

test('F01 data: both Bursts carry thenFlash; Magma Call Flash is noMain with SYMBOL_PLUS_TURN then SOUL_TO_NEXUS_THEN', async () => {
  const r = await g.page.evaluate(([a, b]) => [BS.CARDS[a].burst.thenFlash, BS.CARDS[b].burst.thenFlash, BS.CARDS[b].magic.noMain, BS.CARDS[b].magic.actions.map(x => x.do).join('>')], [MD, MC]);
  assert.deepEqual(r, [true, true, true, 'SYMBOL_PLUS_TURN>SOUL_TO_NEXUS_THEN']);
});
test("F02 Magma Call can't be used in the Main Step, but in a Flash Timing with a Lava Fish on the Field", async () => {
  const r = await ev(`sp('${PAC}'); const m = hd('${MC}'); return [BS.magicUsable(P, m), BS.magicUsable(P, m, 'flash')];`);
  assert.deepEqual(r, [false, true]);
});
test('F03 without a Lava Fish on the Field Magma Call is not usable', async () => {
  const r = await ev(`sp('${EK}'); const m = hd('${MC}'); return BS.magicUsable(P, m, 'flash');`);
  assert.equal(r, false);
});
test('F04 the extra Red symbol adds to attacks this turn and is gone next turn', async () => {
  const r = await ev(`const s = sp('${PAC}'); await cast(P, hd('${MC}')); const a = BS.attackSymbols(s); G.turnNo++; return [a, BS.attackSymbols(s)];`);
  assert.deepEqual(r, [2, 1]);
});
test('F05 the extra Red symbol also counts as a Field symbol for reductions', async () => {
  const r = await ev(`sp('${PAC}'); const a = BS.symbolsOn(P).red || 0; await cast(P, hd('${MC}')); return [a, BS.symbolsOn(P).red || 0];`);
  assert.deepEqual(r, [1, 2]);
});
test('F06 "fixed as zero" beats the extra symbol', async () => {
  const r = await ev(`const s = sp('${PAC}'); await cast(P, hd('${MC}')); s.symZeroTurn = G.turnNo; return BS.attackSymbols(s);`);
  assert.equal(r, 0);
});
test('F07 with Contractor Ometeotl and the Soul Core: the CPU sends it and gives the extra symbol once more', async () => {
  const r = await ev(`const s = sp('${PAC}'); const o = nx('${OME}'); P.reserve.soul = true; await cast(P, hd('${MC}')); return [BS.attackSymbols(s), o.soul, P.reserve.soul];`);
  assert.deepEqual(r, [3, true, false]);
});
test('F08 without Contractor Ometeotl: only one extra symbol, the Soul Core stays', async () => {
  const r = await ev(`const s = sp('${PAC}'); P.reserve.soul = true; await cast(P, hd('${MC}')); return [BS.attackSymbols(s), P.reserve.soul];`);
  assert.deepEqual(r, [2, true]);
});
test('F09 the CPU gives the symbol to the attacking Lava Fish', async () => {
  const r = await ev(`const a = sp('${PAC}'), b = sp('${TOD}', P, 4); G.attacker = a; await cast(P, hd('${MC}')); G.attacker = null; return [BS.attackSymbols(a), BS.attackSymbols(b)];`);
  assert.deepEqual(r, [2, 1]);
});
test('F10 Crimson Meteor Defense Burst, CPU defender with another attacker ready: returns a Crimson, pays and ends the Attack Step after the battle', async () => {
  const r = await ev(`const a = sp('${EK}', P, 3); sp('${EK}', P, 3); G.attacker = a; tr('${CR}', O); bu('${MD}', O); const res = O.reserve.n;
    const used = await BS.maybeBurst(O, 'LIFE_DECREASE', { attacker: a }); const flag = G.endAttackAfter; G.endAttackAfter = null; G.attacker = null;
    return [used, flag, O.trash.map(x => x.id).sort().join(), O.hand.length, res - O.reserve.n > 0];`);
  assert.deepEqual(r, [true, 'opponent', [CR, MD].sort().join(), 0, true]);
});
test('F11 same Burst with no other attacker ready: the CPU does not pay, keeps the returned card', async () => {
  const r = await ev(`const a = sp('${EK}', P, 3); G.attacker = a; tr('${CR}', O); bu('${MD}', O); const res = O.reserve.n;
    await BS.maybeBurst(O, 'LIFE_DECREASE', { attacker: a }); G.attacker = null; return [G.endAttackAfter, O.hand.map(x => x.id), O.reserve.n === res, O.trash.map(x => x.id)];`);
  assert.deepEqual(r, [null, [CR], true, [MD]]);
});
test('F12 not enough cores: no follow-up, the Burst card goes to the Trash once', async () => {
  const r = await ev(`const a = sp('${EK}', P, 3); sp('${EK}', P, 3); G.attacker = a; tr('${CR}', O); bu('${MD}', O); O.reserve.n = 1;
    await BS.maybeBurst(O, 'LIFE_DECREASE', { attacker: a }); G.attacker = null; return [G.endAttackAfter, O.trash.filter(x => x.id === '${MD}').length];`);
  assert.deepEqual(r, [null, 1]);
});
test("F13 Magma Call Burst in the CPU's own turn: summons a Lava Fish, pays, gives the extra Red symbol", async () => {
  const r = await ev(`G.active = 'opponent'; hd('${PAC}', O); bu('${MC}', O); await BS.maybeBurst(O, 'ALLY_DESTROYED', {});
    const s = O.spirits.find(x => x.id === '${PAC}'); return [!!s, s ? BS.attackSymbols(s) : -1, O.trash.filter(x => x.id === '${MC}').length];`);
  assert.deepEqual(r, [true, 2, 1]);
});
test("F14 Magma Call Burst in the opponent's turn: the CPU summons but does not pay for the Flash effect", async () => {
  const r = await ev(`hd('${PAC}', O); bu('${MC}', O); const res = O.reserve.n; await BS.maybeBurst(O, 'ALLY_DESTROYED', {});
    const s = O.spirits.find(x => x.id === '${PAC}'); return [!!s, BS.attackSymbols(s), res - O.reserve.n];`);
  assert.deepEqual(r, [true, 1, 1]);
});
test('F15 the CPU attacker casts Magma Call in the Flash Timing when its Lava Fish is not blocked', async () => {
  const r = await ev(`const a = sp('${PAC}'); G.attacker = a; hd('${MC}'); const ch = BS.cpuFlashChoice(P, 'player', a, null); G.attacker = null; return !!ch && ch.inst.id;`);
  assert.equal(r, MC);
});
test('F16 action checks: SYMBOL_PLUS_TURN needs a colour, SOUL_TO_NEXUS_THEN refuses nesting itself', async () => {
  const r = await g.page.evaluate(() => { const A = BS.FX_ACTIONS; const m = { name: ['Ometeotl'] }, s = { do: 'SYMBOL_PLUS_TURN', color: 'red' };
    return [A.SYMBOL_PLUS_TURN.chk({ color: 'red' }), A.SYMBOL_PLUS_TURN.chk({ color: 'pink' }), A.SOUL_TO_NEXUS_THEN.chk({ match: m, then: [s] }), A.SOUL_TO_NEXUS_THEN.chk({ match: m, then: [{ do: 'SOUL_TO_NEXUS_THEN', match: m, then: [s] }] })]; });
  assert.deepEqual(r, [true, false, true, false]);
});
test('F17 the card text names the extra Red symbol and the Ometeotl repeat', async () => {
  const r = await g.page.evaluate(i => BS.magicText(BS.CARDS[i]), MC);
  assert.ok(/extra Red symbol/.test(r) && /Ometeotl/.test(r) && /once more/.test(r), r);
});
test('F18 the log tells that the cost was paid for the (Flash) effect', async () => {
  const r = await ev(`G.active = 'opponent'; hd('${PAC}', O); bu('${MC}', O); await BS.maybeBurst(O, 'ALLY_DESTROYED', {}); return G.history.slice(-8).map(String);`);
  assert.ok(r.some(l => /pays the cost to activate the \(Flash\) effect of Magma Call/.test(l)), r.join(' | '));
});
test('F19 cpuBurstFlash: yes for other Flash effects, no for ending its own Attack Step', async () => {
  const r = await ev(`const a = sp('${EK}', O, 3); sp('${EK}', O, 3); G.active = 'opponent'; G.attacker = a; const x = BS.cpuBurstFlash(O, BS.mkInst('${MD}')); G.attacker = null; return x;`);
  assert.equal(r, false);
});
const startHuman = extra => g.page.evaluate(`(async () => { ${PRE}\n P.cpu = false; G.active = 'player'; ${extra} window.__s = sp('${PAC}'); window.__m = BS.mkInst('${MC}'); window.__p = BS.burstFlash(P, __m); return 1; })()`);
test('F20 human: the follow-up asks "Pay" or "Do not pay"; declining pays nothing', async () => {
  await startHuman('');
  await g.page.waitForSelector('.modal-btn[data-mi="1"]');
  const labels = await g.page.$$eval('.modal-btn[data-mi]', b => b.map(x => x.textContent.trim().toLowerCase()));
  await g.page.click('.modal-btn[data-mi="1"]');
  const r = await g.page.evaluate(() => window.__p.then(v => [v, BS.G.p.player.reserve.n]));
  assert.ok(labels[0].startsWith('pay') && labels[1].includes('not pay'), labels.join('|'));
  assert.deepEqual(r, [false, 10]);
});
test('F21 human: paying runs the Flash effect on the chosen Lava Fish', async () => {
  await startHuman('');
  await g.page.waitForSelector('.modal-btn[data-mi="0"]'); await g.page.click('.modal-btn[data-mi="0"]');
  await g.page.waitForSelector('.modal-btn[data-mi="0"]'); await g.page.click('.modal-btn[data-mi="0"]');
  const r = await g.page.evaluate(() => window.__p.then(v => [v, BS.attackSymbols(window.__s), BS.G.p.player.reserve.n < 10]));
  assert.deepEqual(r, [true, 2, true]);
});
test('F22 a Magic cast from the Hand is counted in limbo while its effect runs (SIM card-count invariant), then goes to the Trash', async () => {
  const r = await ev(`sp('${PAC}'); const m = hd('${MC}'); const A = BS.FX_ACTIONS.SYMBOL_PLUS_TURN, run = A.run; let seen = null;
    A.run = async (c, a) => { seen = P.limbo === m; return run(c, a); };
    try { await cast(P, m); } finally { A.run = run; } return [seen, !P.limbo, P.trash.filter(x => x === m).length];`);
  assert.deepEqual(r, [true, true, 1]);
});
test('F23 cast from the Burst: stays in limbo during the Flash effect, one copy in the Trash afterwards', async () => {
  const r = await ev(`G.active = 'opponent'; hd('${PAC}', O); const b = bu('${MC}', O); const A = BS.FX_ACTIONS.SYMBOL_PLUS_TURN, run = A.run; let seen = null;
    A.run = async (c, a) => { seen = [O.limbo === b, O.trash.includes(b)]; return run(c, a); };
    try { await BS.maybeBurst(O, 'ALLY_DESTROYED', {}); } finally { A.run = run; } return [seen, O.limbo, O.trash.filter(x => x === b).length];`);
  assert.deepEqual(r, [[true, false], null, 1]);
});
