// v0.43 A_END_ATTACK: BS75-073 Crimson Meteor Defense (Flash): "By discarding a Crimson/Wurm/Kushina from your Hand, when this battle ends, end the Attack Step"
// (END_ATTACK_AFTER_BATTLE, a Magic action marked "cost") and the guard STATIC NO_END_ATTACK (BS74-050 Sunya Lv3, BS75-063 Crimson Crater Lv2).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(async () => { await g.page.close(); await closeBrowser(); });
const MD = 'BS75-073', CR = 'BS75-001', SUNYA = 'BS74-050', CRATER = 'BS75-063', EK = 'BS74-038';
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent;
  P.cpu = true; O.cpu = true; G.active = 'player'; G.turnNo = 3; G.attackEnded = 0; G.endAttackAfter = null;
  for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; q.hand = []; q.deck = []; q.removed = []; q.reserve.n = 10; q.reserve.soul = false; q.tokens = {}; q.onceUsed = {}; q.life = 5; }
  for (let k = 0; k < 6; k++) { P.deck.push(BS.mkInst('${EK}')); O.deck.push(BS.mkInst('${EK}')); }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, nx = (id, q = P, n = 0) => { const i = BS.mkInst(id); i.cores = n; q.nexus.push(i); return i; }, hd = (id, q = P) => { const i = BS.mkInst(id); q.hand.push(i); return i; };`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);

test('E01 Crimson Meteor Defense data: Flash, discard a Crimson/Wurm/Kushina as the cost, then end the Attack Step after the battle', async () => {
  const r = await g.page.evaluate(i => { const m = BS.CARDS[i].magic; return [m.timing.join(), m.effect, m.actions.map(a => a.do + (a.cost ? '*' : '')).join('>')]; }, MD);
  assert.deepEqual(r, ['FLASH', 'ACTIONS', 'DISCARD_HAND*>END_ATTACK_AFTER_BATTLE']);
});
test('E02 usable only during a battle and only with another matching card in the Hand (the Magic does not pay for itself)', async () => {
  const r = await ev(`const m = hd('${MD}', O); const a = BS.magicUsable(O, m, 'flash'); G.attacker = sp('${EK}');
    const b = BS.magicUsable(O, m, 'flash'); hd('${CR}', O); const c = BS.magicUsable(O, m, 'flash'); G.attacker = null; return [a, b, c];`);
  assert.deepEqual(r, [false, false, true]);
});
test('E03 cast in a battle: the Crimson card is discarded, and when the battle ends the Attack Step is over', async () => {
  const r = await ev(`const m = hd('${MD}', O), c = hd('${CR}', O); G.attacker = sp('${EK}');
    await BS.castMagic(O, { inst: m, target: null, plan: null, ctx: 'flash' }); const flag = G.endAttackAfter;
    BS.battleEndAttack(); G.attacker = null; return [flag, O.trash.map(x => x.id).sort().join(), O.hand.length, BS.attackStepOver()];`);
  assert.deepEqual(r, ['opponent', [CR, MD].sort().join(), 0, true]);
});
test('E04 baseline: without the Magic the CPU attacks with both Spirits', async () => {
  const r = await ev(`sp('${EK}'); sp('${EK}'); await BS.cpuAttack(P); return [P.spirits.filter(s => s.exhausted).length, O.life];`);
  assert.deepEqual(r, [2, 3]);
});
test('E05 the CPU defender uses it on the first attack: the Attack Step ends after one battle', async () => {
  const r = await ev(`sp('${EK}'); sp('${EK}'); hd('${MD}', O); hd('${CR}', O); await BS.cpuAttack(P);
    return [P.spirits.filter(s => s.exhausted).length, O.life, O.trash.length, BS.attackStepOver()];`);
  assert.deepEqual(r, [1, 4, 2, true]);
});
test('E06 the CPU attacker never ends its own Attack Step with it', async () => {
  const r = await ev(`G.attacker = sp('${EK}'); hd('${MD}', P); hd('${CR}', P); const ch = BS.cpuFlashChoice(P, 'player', G.attacker, null); G.attacker = null; return ch;`);
  assert.equal(r, null);
});
test('E07 Sunya Lv3 attacking: the opponent cannot end the Attack Step (Lv2: it can)', async () => {
  const r = await ev(`const s = sp('${SUNYA}', P, 4); G.attacker = s; const m = hd('${MD}', O); hd('${CR}', O);
    const lv3 = [BS.endAttackLocked(O), BS.magicUsable(O, m, 'flash')]; s.cores = 2; const lv2 = [BS.endAttackLocked(O), BS.magicUsable(O, m, 'flash')]; G.attacker = null; return [lv3, lv2];`);
  assert.deepEqual(r, [[true, false], [false, true]]);
});
test("E08 the lock only stops the opponent: Sunya's owner may still end its own Attack Step", async () => {
  const r = await ev(`G.attacker = sp('${SUNYA}', P, 4); const x = BS.endAttackLocked(P); G.attacker = null; return x;`);
  assert.equal(r, false);
});
test('E09 Sunya Lv3 only protects Awakened Dragon attackers', async () => {
  const r = await ev(`sp('${SUNYA}', P, 4); G.attacker = sp('${CR}'); const x = BS.endAttackLocked(O); G.attacker = null; return x;`);
  assert.equal(r, false);
});
test('E10 Crimson Crater Lv2 locks while a Wurm attacks; Lv1 or a non-Wurm attacker does not', async () => {
  const r = await ev(`BS.CARDS['TEST-WURM'] = Object.assign({}, BS.CARDS['${CR}'], { id: 'TEST-WURM', name: 'The Test Wurm' });
    const n = nx('${CRATER}', P, 1), w = sp('TEST-WURM'); G.attacker = w; const a = BS.endAttackLocked(O); n.cores = 0; const b = BS.endAttackLocked(O);
    n.cores = 1; G.attacker = sp('${CR}'); const c = BS.endAttackLocked(O); G.attacker = null; delete BS.CARDS['TEST-WURM']; return [a, b, c];`);
  assert.deepEqual(r, [true, false, false]);
});
test('E11 the lock is checked again when the battle ends: the flag set before Sunya reached Lv3 does nothing', async () => {
  const r = await ev(`const s = sp('${SUNYA}', P, 2); G.attacker = s; G.endAttackAfter = 'opponent'; s.cores = 4; BS.battleEndAttack(); G.attacker = null; return [BS.attackStepOver(), G.endAttackAfter];`);
  assert.deepEqual(r, [false, null]);
});
test('E12 an unpaid cost stops the effect: no discard possible, the Attack Step is not ended', async () => {
  const r = await ev(`G.attacker = sp('${EK}'); const m = hd('${MD}', O); await BS.castMagic(O, { inst: m, target: null, plan: null, ctx: 'flash' }); G.attacker = null; return G.endAttackAfter;`);
  assert.equal(r, null);
});
test('E13 action definitions: END_ATTACK_AFTER_BATTLE needs a battle; NO_END_ATTACK is a known STATIC flag', async () => {
  const r = await g.page.evaluate(() => { BS.testSetup(); const a = BS.FX_ACTIONS.END_ATTACK_AFTER_BATTLE; return [a.chk({}), a.can({ p: BS.G.p.opponent }, {}), BS.CARDS['BS74-050'].effects.some(e => e.flag === 'NO_END_ATTACK' && e.lv.join() === '3')]; });
  assert.deepEqual(r, [true, false, true]);
});
test('E14 the CPU defender keeps it when no other attacker is ready', async () => {
  const r = await ev(`G.attacker = sp('${EK}'); const s2 = sp('${EK}'); s2.exhausted = true; hd('${MD}', O); hd('${CR}', O); const ch = BS.cpuFlashChoice(O, 'player', G.attacker, null); G.attacker = null; return ch;`);
  assert.equal(r, null);
});
test('E15 the log tells the effect and the end of the Attack Step', async () => {
  const r = await ev(`const m = hd('${MD}', O); hd('${CR}', O); G.attacker = sp('${EK}'); await BS.castMagic(O, { inst: m, target: null, plan: null, ctx: 'flash' }); BS.battleEndAttack(); G.attacker = null; return G.history.slice(-6).map(String);`);
  assert.ok(r.some(l => /when this battle ends, the Attack Step ends/.test(l)) && r.some(l => /with it the Attack Step/.test(l)), r.join(' | '));
});
test('E16 the end only lasts for this turn', async () => {
  const r = await ev(`G.attackEnded = G.turnNo; const a = BS.attackStepOver(); G.turnNo++; return [a, BS.attackStepOver()];`);
  assert.deepEqual(r, [true, false]);
});
test('E17 the human cannot declare another attack after the Attack Step was ended', async () => {
  const r = await ev(`P.cpu = false; G.busy = false; G.step = 5; const s = sp('${EK}'); G.attackEnded = G.turnNo; await BS.humanAttack(s); return s.exhausted;`);
  assert.equal(r, false);
});
test('E18 DISCARD_HAND never offers the card that pays with it', async () => {
  const r = await ev(`const m = hd('${MD}', O); const c = hd('${CR}', O); const L = BS.FX_ACTIONS.DISCARD_HAND.cands({ p: O, src: m }, { n: 1, match: { name: ['Crimson'] } }); return L.map(x => x.id);`);
  assert.deepEqual(r, [CR]);
});
test('E19 the action text reads "when this battle ends, end the Attack Step"', async () => {
  const r = await g.page.evaluate(() => BS.FX_ACTIONS.END_ATTACK_AFTER_BATTLE.txt({}));
  assert.equal(r, 'when this battle ends, end the Attack Step');
});
test('E20 a locked attacker makes the action do nothing if it runs anyway', async () => {
  const r = await ev(`G.attacker = sp('${SUNYA}', P, 4); const c = { p: O, opp: P, src: BS.mkInst('${MD}'), ctx: {} }; await BS.FX_ACTIONS.END_ATTACK_AFTER_BATTLE.run(c, {}); G.attacker = null; return [c.ctx.did, G.endAttackAfter];`);
  assert.deepEqual(r, [false, null]);
});
test('E21 a full battle: the CPU defender casts in the Flash Timing, the battle ends the Attack Step and clears the flag', async () => {
  const r = await ev(`const s = sp('${EK}'); sp('${EK}'); hd('${MD}', O); hd('${CR}', O); await BS.doBattle('player', s); return [BS.attackStepOver(), G.endAttackAfter, G.attacker];`);
  assert.deepEqual(r, [true, null, null]);
});
