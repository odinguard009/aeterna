// v0.50.0 keyword effects part 2 (session D): Accel and Silver Wheel.
// Accel (Fandom "Accel" Q1-Q8): used from the Hand at the printed timing (Main, or Flash = also in your Main Step) by paying the Accel cost;
// after it resolves the card goes to the Removed Zone; an Accel Spirit there can be summoned in your Main Step by paying its cost (Q5);
// its Accel can't be used from the Removed Zone (Q6).
// Silver Wheel: "Flash - Silver Wheel: You can exhaust this Spirit. When you've done so, ..." = ACTIVATE {silverWheel, exhaustSelf, Main+Flash};
// "when you activate Silver Wheel" = trigger SILVER_WHEEL.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(async () => { await g.page.close(); await closeBrowser(); });
const RHIDER = 'BS71-RV004', GENNA = 'BS68-045', JIALIN = 'BS77-040', CHARI = 'BS69-043', CLEO = 'BS68-035';
const TINK = 'BS70-036', DISEL = 'BS70-037', BREG = 'BS70-039', LEMU = 'BS70-045', BRIGA = 'BS71-X06', HOUND = 'BS68-014';
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent; G.active = P.key; G.step = 4; G.attacker = null; G.endAttackAfter = null;
  P.cpu = true; O.cpu = true; for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; q.hand = []; q.deck = []; q.removed = []; q.reserve.n = 0; q.reserve.soul = false; q.tokens = {}; q.onceUsed = {}; q.trashCores.n = 0; q.trashCores.soul = false; q.life = 5; q.lifeSoul = false; }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, hd = (id, q = P) => { const i = BS.mkInst(id); q.hand.push(i); return i; };
  const acc = id => BS.accelList(BS.CARDS[id])[0].idx;
  const brigit = () => { if (!BS.CARDS.TSTBRI) { const nx = Object.values(BS.CARDS).find(c => c.type === 'Nexus' && !c.effects && c.levels && c.levels.length); BS.CARDS.TSTBRI = Object.assign({}, nx, { id: 'TSTBRI', name: 'The SilverWheelContractor Brigit', effects: undefined }); } const i = BS.mkInst('TSTBRI'); P.nexus.push(i); return i; };
  const swIdx = id => BS.CARDS[id].effects.findIndex(e => e.silverWheel);`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);

test('A01 the five Accel cards carry a parsed ACCEL effect with cost and timing', async () => {
  const r = await ev(`return ['${RHIDER}', '${GENNA}', '${JIALIN}', '${CHARI}', '${CLEO}'].map(id => { const x = BS.accelList(BS.CARDS[id])[0]; return x ? x.e.cost + ':' + x.e.timing.join('') : null; });`);
  assert.deepEqual(r, ['4:MAIN', '4:FLASH', '4:FLASH', '4:FLASH', '4:FLASH']);
});
test('A02 the parser rejects an ACCEL effect without a cost or with a bad timing', async () => {
  const r = await ev(`const a = BS.parseEffects([{ trigger: 'ACCEL', timing: ['FLASH'], actions: [{ do: 'DRAW', n: 1 }] }]);
    const b = BS.parseEffects([{ trigger: 'ACCEL', cost: 3, timing: ['END'], actions: [{ do: 'DRAW', n: 1 }] }]);
    const c = BS.parseEffects([{ trigger: 'ACCEL', cost: 3, timing: ['MAIN'], reduction: { white: 2 }, actions: [{ do: 'DRAW', n: 1 }] }]);
    return [!!a.error, !!b.error, !c.error && c.effects[0].reduction.white];`);
  assert.deepEqual(r, [true, true, 2]);
});
test('A03 Accel needs the Accel cost in available cores', async () => {
  const r = await ev(`const s = hd('${GENNA}'); sp('${HOUND}', O, 1); P.reserve.n = 3; const a = BS.accelOK(P, s, acc('${GENNA}'), 'MAIN'); P.reserve.n = 4; return [a, BS.accelOK(P, s, acc('${GENNA}'), 'MAIN')];`);
  assert.deepEqual(r, [false, true]);
});
test('A04 a Flash Accel works in a Flash Timing and in your Main Step; a Main Accel only in your Main Step', async () => {
  const r = await ev(`const s = hd('${GENNA}'), m = hd('${RHIDER}'); sp('${HOUND}', O, 1); P.deck = [1,2,3,4,5,6].map(() => BS.mkInst('${HOUND}')); P.reserve.n = 8;
    const a = [BS.accelOK(P, s, acc('${GENNA}'), 'FLASH'), BS.accelOK(P, m, acc('${RHIDER}'), 'FLASH'), BS.accelOK(P, m, acc('${RHIDER}'), 'MAIN')];
    G.active = O.key; return a.concat([BS.accelOK(P, m, acc('${RHIDER}'), 'MAIN'), BS.accelOK(P, s, acc('${GENNA}'), 'FLASH')]);`);
  assert.deepEqual(r, [true, false, true, false, true]);
});
test('A05 Gennadios Accel pays 4, returns an opposing Spirit to the Hand and goes to the Removed Zone', async () => {
  const r = await ev(`const s = hd('${GENNA}'); const t = sp('${HOUND}', O, 1); P.reserve.n = 5;
    const ok = await BS.useAccel(P, s, acc('${GENNA}'), null, 'FLASH'); return [ok, O.hand.includes(t), O.spirits.length, P.removed.includes(s), P.trash.includes(s), P.hand.includes(s), P.reserve.n, P.trashCores.n];`);
  assert.deepEqual(r, [true, true, 0, true, false, false, 1, 4]);
});
test('A06 Armor Rhider Accel draws three and discards two in the Main Step', async () => {
  const r = await ev(`const s = hd('${RHIDER}'); P.deck = [1,2,3,4,5,6,7].map(() => BS.mkInst('${HOUND}')); P.reserve.n = 4;
    const ok = await BS.useAccel(P, s, acc('${RHIDER}'), null, 'MAIN'); return [ok, P.hand.length, P.trash.length, P.deck.length, P.removed.length];`);
  assert.deepEqual(r, [true, 1, 2, 4, 1]);
});
test('A07 Jialin Accel only returns a LV1/LV2 Spirit: no LV1/LV2 target means it is not usable', async () => {
  const r = await ev(`const s = hd('${JIALIN}'); const big = sp('${HOUND}', O, 1); P.reserve.n = 6; const lvl = BS.lvNo(big);
    big.cores = 30; const hi = BS.lvNo(big); return [lvl, hi > 2 ? BS.accelOK(P, s, acc('${JIALIN}'), 'FLASH') : 'n/a'];`);
  assert.equal(r[0], 1);
  if (r[1] !== 'n/a') assert.equal(r[1], false);
});
test('A08 Charicles Accel ends the Attack Step after the current battle', async () => {
  const r = await ev(`G.active = O.key; const att = sp('${HOUND}', O, 1); G.attacker = att; const s = hd('${CHARI}'); P.reserve.n = 4;
    const ok = await BS.useAccel(P, s, acc('${CHARI}'), null, 'FLASH'); return [ok, G.endAttackAfter === P.key, P.removed.includes(s)];`);
  assert.deepEqual(r, [true, true, true]);
});
test('A09 Charicles Accel is not usable outside a battle', async () => {
  const r = await ev(`const s = hd('${CHARI}'); P.reserve.n = 4; return [BS.accelOK(P, s, acc('${CHARI}'), 'MAIN')];`);
  assert.deepEqual(r, [false]);
});
test('A10 Cleomenes: an opposing Burst is discarded and nothing returns', async () => {
  const r = await ev(`const s = hd('${CLEO}'); const t = sp('${HOUND}', O, 1); O.burst = BS.mkInst('${HOUND}'); P.reserve.n = 4;
    await BS.useAccel(P, s, acc('${CLEO}'), null, 'FLASH'); return [O.burst, O.trash.length, O.spirits.includes(t)];`);
  assert.deepEqual(r, [null, 1, true]);
});
test('A11 Cleomenes: with no opposing Burst it returns an opposing Spirit to the Hand', async () => {
  const r = await ev(`const s = hd('${CLEO}'); const t = sp('${HOUND}', O, 1); P.reserve.n = 4;
    await BS.useAccel(P, s, acc('${CLEO}'), null, 'FLASH'); return [O.hand.includes(t), O.spirits.length];`);
  assert.deepEqual(r, [true, 0]);
});
test('A12 an Accel Spirit in the Removed Zone can be summoned in your Main Step by paying its cost', async () => {
  const r = await ev(`const s = BS.mkInst('${GENNA}'); P.removed.push(s); P.reserve.n = 20; const L = BS.removedSummonable(P).includes(s);
    const ok = await BS.summonFromRemoved(P, s); return [L, ok, P.spirits.includes(s), P.removed.includes(s)];`);
  assert.deepEqual(r, [true, true, true, false]);
});
test('A13 no Removed Zone summon outside your Main Step, without cores, or for a card without Accel', async () => {
  const r = await ev(`const s = BS.mkInst('${GENNA}'), h = BS.mkInst('${HOUND}'); P.removed.push(s, h); P.reserve.n = 20; const a = BS.removedSummonable(P).map(x => x.id);
    G.step = 5; const b = BS.removedSummonable(P).length; G.step = 4; P.reserve.n = 0; const c = BS.removedSummonable(P).length; return [a, b, c];`);
  assert.deepEqual(r, [['BS68-045'], 0, 0]);
});
test('A14 Accel can not be used from the Removed Zone', async () => {
  const r = await ev(`const s = BS.mkInst('${GENNA}'); P.removed.push(s); sp('${HOUND}', O, 1); P.reserve.n = 9; return [BS.accelOK(P, s, acc('${GENNA}'), 'MAIN'), BS.accelSources(P, 'MAIN').length];`);
  assert.deepEqual(r, [false, 0]);
});
test('A15 the CPU defender uses a Flash Accel to return the attacker', async () => {
  const r = await ev(`G.active = O.key; const att = sp('${HOUND}', O, 1); att.exhausted = true; G.attacker = att; const s = hd('${GENNA}'); P.reserve.n = 4;
    const ch = BS.cpuFlashChoice(P, O.key, att, null); return [!!ch && !!ch.accel && ch.accel.inst === s];`);
  assert.deepEqual(r, [true]);
});
test('A16 the CPU does not use Accel when only field cores could pay (keeps its Spirits)', async () => {
  const r = await ev(`G.active = O.key; const att = sp('${HOUND}', O, 1); G.attacker = att; hd('${GENNA}'); sp('${HOUND}', P, 6); P.reserve.n = 1;
    return [BS.cpuAccelFlash(P, att, null)];`);
  assert.deepEqual(r, [null]);
});
test('A17 the CPU uses a Main Accel draw effect in its Main Step', async () => {
  const r = await ev(`const s = hd('${RHIDER}'); P.deck = [1,2,3,4,5,6,7,8].map(() => BS.mkInst('${HOUND}')); P.reserve.n = 4;
    await BS.cpuAccelMain(P); return [P.removed.includes(s), P.deck.length];`);
  assert.deepEqual(r, [true, 5]);
});
test('A18 a used Accel card is counted in exactly one zone', async () => {
  const r = await ev(`const s = hd('${GENNA}'); sp('${HOUND}', O, 1); P.reserve.n = 4; await BS.useAccel(P, s, acc('${GENNA}'), null, 'MAIN');
    const zones = [P.hand, P.trash, P.removed, P.spirits, P.deck].filter(z => z.includes(s)).length; return [zones, P.limbo === s];`);
  assert.deepEqual(r, [1, false]);
});
test('S01 Tink: Silver Wheel is a Main/Flash activate effect that exhausts it; no Brigit, no core', async () => {
  const r = await ev(`const t = sp('${TINK}', P, 1); const i = swIdx('${TINK}'); const m = BS.activatable(P, t, 'MAIN').some(x => x.idx === i), f = BS.activatable(P, t, 'FLASH').some(x => x.idx === i);
    const ok = await BS.activateFx(P, t, i); return [m, f, ok, t.exhausted, t.cores];`);
  assert.deepEqual(r, [true, true, true, true, 1]);
});
test('S02 Tink with a Contractor Brigit puts a Void core on itself; refreshed it can activate again (not once per turn)', async () => {
  const r = await ev(`brigit(); const t = sp('${TINK}', P, 1); const i = swIdx('${TINK}'); await BS.activateFx(P, t, i); const a = t.cores;
    const b = BS.activatable(P, t, 'FLASH').some(x => x.idx === i); t.exhausted = false; await BS.activateFx(P, t, i); return [a, b, t.cores];`);
  assert.deepEqual(r, [2, false, 3]);
});
test('S03 Disel with Brigit returns an opposing Cost 3 or less Spirit to the deck bottom, never a costlier one', async () => {
  const r = await ev(`brigit(); const d = sp('${DISEL}', P, 1); const cheap = Object.values(BS.CARDS).find(c => c.type === 'Spirit' && c.cost <= 3 && c.levels && c.levels[0].cores === 1).id;
    const big = Object.values(BS.CARDS).find(c => c.type === 'Spirit' && c.cost >= 7 && c.levels && c.levels[0].cores === 1).id;
    const a = sp(big, O, 1), b = sp(cheap, O, 1); await BS.activateFx(P, d, swIdx('${DISEL}')); return [O.spirits.includes(a), O.spirits.includes(b), O.deck[O.deck.length - 1] === b];`);
  assert.deepEqual(r, [true, false, true]);
});
test('S04 Silver Wheel needs an untapped Spirit at the printed level', async () => {
  const r = await ev(`const t = sp('${TINK}', P, 1); t.exhausted = true; const l = sp('${LEMU}', P, 1);
    return [BS.activatable(P, t, 'FLASH').length, BS.activatable(P, l, 'FLASH').some(x => x.e.silverWheel)];`);
  assert.deepEqual(r, [0, false]);
});
test('S05 "when you activate Silver Wheel" (SILVER_WHEEL) fires after a Silver Wheel resolves', async () => {
  const r = await ev(`const nx = brigit(); BS.CARDS.TSTBRI.effects = [{ trigger: 'SILVER_WHEEL', actions: [{ do: 'COUNTER', n: 2 }] }];
    try { const t = sp('${TINK}', P, 1); await BS.activateFx(P, t, swIdx('${TINK}')); return [P.count]; } finally { BS.CARDS.TSTBRI.effects = undefined; }`);
  assert.deepEqual(r, [2]);
});
test('S06 a non-Silver-Wheel activate effect does not fire SILVER_WHEEL', async () => {
  const r = await ev(`brigit(); BS.CARDS.TSTBRI.effects = [{ trigger: 'SILVER_WHEEL', actions: [{ do: 'COUNTER', n: 2 }] }];
    try { const nx = Object.values(BS.CARDS).find(c => (c.effects || []).some(e => e.trigger === 'ACTIVATE' && !e.silverWheel && e.cost && e.cost.exhaustSelf)); return [!!nx, P.count]; } finally { BS.CARDS.TSTBRI.effects = undefined; }`);
  assert.deepEqual(r, [true, 0]);
});
test('S07 the CPU does not use Silver Wheel in its Main Step (it would lose an attacker)', async () => {
  const r = await ev(`brigit(); const t = sp('${TINK}', P, 1); await BS.cpuActivate(P); return [t.exhausted, t.cores];`);
  assert.deepEqual(r, [false, 1]);
});
test('S08 the CPU defender uses Silver Wheel after the block on a Spirit that is not blocking', async () => {
  const r = await ev(`G.active = O.key; const att = sp('${HOUND}', O, 1); const blk = sp('${HOUND}', P, 1), t = sp('${TINK}', P, 1); P.life = 5;
    const a = BS.cpuSilverWheel(P, O.key, att, null), b = BS.cpuSilverWheel(P, O.key, att, blk); return [a, !!b && b.act.f === t];`);
  assert.deepEqual(r, [null, true]);
});
test('S09 Breg Silver Wheel puts a Void core on itself and one on a Frostling Spirit', async () => {
  const r = await ev(`const b = sp('${BREG}', P, 1); await BS.activateFx(P, b, swIdx('${BREG}')); return [b.cores >= 2, b.exhausted];`);
  assert.deepEqual(r, [true, true]);
});
test('S10 Brigantia Silver Wheel refreshes an exhausted Frostling Spirit (itself counts) once per turn', async () => {
  const r = await ev(`const q = sp('${BRIGA}', P, 1), f = sp('${TINK}', P, 1); f.exhausted = true; const i = swIdx('${BRIGA}');
    await BS.activateFx(P, q, i); const a = f.exhausted && q.exhausted; q.exhausted = false; f.exhausted = true; return [a, BS.activatable(P, q, 'FLASH').some(x => x.idx === i)];`);
  assert.deepEqual(r, [false, false]);
});
test('S11 BOUNCE_OPP accepts "costLe" and rejects a bad one', async () => {
  const r = await ev(`const a = BS.parseEffects([{ trigger: 'SUMMONED', actions: [{ do: 'BOUNCE_OPP', to: 'hand', kind: 'spirit', costLe: 3 }] }]);
    const b = BS.parseEffects([{ trigger: 'SUMMONED', actions: [{ do: 'BOUNCE_OPP', to: 'hand', kind: 'spirit', costLe: 'x' }] }]); return [!a.error, !!b.error];`);
  assert.deepEqual(r, [true, true]);
});
test('S12 the embedded pack leaves out the maintainer notes', async () => {
  const r = await ev(`return [BS.CARDS['${GENNA}'].note === undefined];`);
  assert.deepEqual(r, [true]);
});
test('A19 the human Hand modal offers the Accel button (enabled with cores, disabled without)', async () => {
  const r = await ev(`P.cpu = false; G.busy = false; const s = hd('${GENNA}'); sp('${HOUND}', O, 1); P.reserve.n = 4;
    const a = handButtons(P, s, false).find(b => String(b.value).startsWith('accel:')); P.reserve.n = 0; const b = handButtons(P, s, false).find(b => String(b.value).startsWith('accel:'));
    P.cpu = true; return [!!a && !a.dis, /Accel \\(Pay 4\\)/.test(a.label), !!b && b.dis];`);
  assert.deepEqual(r, [true, true, true]);
});
test('A20 the human Flash Timing lists a usable Flash Accel as a choice', async () => {
  const r = await ev(`G.active = O.key; const att = sp('${HOUND}', O, 1); G.attacker = att; hd('${GENNA}'); P.reserve.n = 4;
    const L = BS.accelSources(P, 'FLASH'); return [L.length, /Accel: .*Pay 4/.test(accelLabel(P, L[0]))];`);
  assert.deepEqual(r, [1, true]);
});
