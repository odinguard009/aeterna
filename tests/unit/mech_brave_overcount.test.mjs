// v0.34 missing mechanics (issue #4): Brave (combine / separate / direct summon, Saga Brave onto a Spirit) and Over Count.
// Eternal rule manual VER.17.0: p. 34-36 (Brave), p. 38 (Saga Brave), p. 61 (Over Count). Quiet boards only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
const FIX = [
  { id: 'B-DRG', name: 'Brave Host Dragon', type: 'Spirit', color: 'red', cost: 4, symbols: 1, families: ['Ancient Dragon'], levels: [{ cores: 1, bp: 4000 }, { cores: 3, bp: 6000 }] },
  { id: 'B-OTH', name: 'Plain Beast', type: 'Spirit', color: 'red', cost: 2, symbols: 1, families: ['Emperor Beast'], levels: [{ cores: 1, bp: 3000 }] },
  { id: 'B-LOW', name: 'Low Dragon', type: 'Spirit', color: 'red', cost: 1, symbols: 1, families: ['Ancient Dragon'], levels: [{ cores: 1, bp: 1000 }] },
  { id: 'B-SW', name: 'Test Sword', type: 'Brave', color: 'blue', cost: 3, symbols: 1, levels: [{ cores: 1, bp: 3000 }, { cores: 2, bp: 4000 }], brave: { bp: 3000, family: ['Ancient Dragon'] } },
  { id: 'B-SW0', name: 'Saga Edge', type: 'Brave', color: 'red', cost: 2, symbols: 1, brave: { bp: 5000, family: ['Ancient Dragon'] } },
  { id: 'B-COST', name: 'Heavy Edge', type: 'Brave', color: 'red', cost: 2, symbols: 1, brave: { bp: 2000, costGe: 3 } },
  { id: 'B-OC', name: 'Count Wurm', type: 'Spirit', color: 'red', cost: 5, symbols: 1, levels: [{ cores: 1, bp: 5000 }], overCount: { count: 4, bp: 5000 },
    effects: [{ trigger: 'ATTACKS', oc: true, actions: [{ do: 'DRAW', n: 1 }] }] },
  { id: 'B-ALLY', name: 'Summon Watcher', type: 'Nexus', color: 'red', cost: 1, levels: [{ cores: 0 }], effects: [{ trigger: 'ALLY_SUMMONED', actions: [{ do: 'COUNTER', n: 1 }] }] },
  { id: 'B-OCS', name: 'Count Aura', type: 'Spirit', color: 'red', cost: 3, symbols: 1, levels: [{ cores: 1, bp: 2000 }], overCount: { count: 2, bp: 0 },
    effects: [{ trigger: 'STATIC', oc: true, bp: 1000 }] },
];
before(async () => {
  g = await openGame('');
  const r = await g.page.evaluate(fix => BS.importCards(JSON.stringify(fix)), FIX);
  assert.equal(r.ok, FIX.length, JSON.stringify(r));
});
after(async () => { await g.page.close(); await closeBrowser(); });
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent;
  P.cpu = true; O.cpu = true; for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; q.hand = []; q.reserve.n = 10; q.reserve.soul = false; }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, hd = (id, q = P) => { const i = BS.mkInst(id); q.hand.push(i); return i; };`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);
const parse = o => g.page.evaluate(x => { const r = BS.parseCard(x); return r.card ? { ok: true, card: r.card } : { ok: false, err: r.errors.join(' ') }; }, o);

test('V01 parse: Brave is a supported card type with its BP+ and condition', async () => {
  const r = await parse(FIX[3]);
  assert.equal(r.ok, true, r.err); assert.equal(r.card.type, 'Brave'); assert.deepEqual(r.card.brave, { bp: 3000, family: ['Ancient Dragon'] });
  assert.deepEqual(r.card.levels, [{ cores: 1, bp: 3000 }, { cores: 2, bp: 4000 }]);
});
test('V02 parse: a Brave without level data is accepted (direct combining only)', async () => {
  const r = await parse(FIX[4]); assert.equal(r.ok, true, r.err); assert.deepEqual(r.card.levels, []);
});
test('V03 parse: a Brave without "brave" data, or "brave" on a Spirit, is rejected', async () => {
  assert.equal((await parse({ id: 'X1', name: 'X', type: 'Brave', color: 'red', cost: 1 })).ok, false);
  assert.equal((await parse({ id: 'X2', name: 'X', type: 'Spirit', color: 'red', cost: 1, levels: [{ cores: 1, bp: 1000 }], brave: { bp: 1000 } })).ok, false);
});
test('V04 parse: overCount needs a count 1-30 and a Spirit; oc:true needs to be true', async () => {
  assert.deepEqual((await parse(FIX[6])).card.overCount, { count: 4, bp: 5000 });
  assert.equal((await parse({ id: 'X3', name: 'X', type: 'Nexus', color: 'red', cost: 1, overCount: { count: 4, bp: 1 } })).ok, false);
  assert.equal((await parse({ id: 'X4', name: 'X', type: 'Spirit', color: 'red', cost: 1, levels: [{ cores: 1, bp: 1000 }], overCount: { count: 0, bp: 1 } })).ok, false);
  assert.match(await g.page.evaluate(() => BS.parseEffects([{ trigger: 'ATTACKS', oc: 'yes', actions: [{ do: 'DRAW', n: 1 }] }]).error), /oc/);
});
test('V05 the built-in Yaj-Veda (BS76-060) is now registered as a Brave (complete since v0.35)', async () => {
  const r = await g.page.evaluate(() => { const c = BS.CARDS['BS76-060']; return c && [c.type, c.brave.bp, c.brave.family, c.levels, c.partial]; });
  assert.deepEqual(r, ['Brave', 5000, ['Ancient Dragon', 'Creation'], [{ cores: 1, bp: 2000 }], false]);
});
test('V06 the Over Count Spirits of BS75/BS76 carry their OC condition', async () => {
  const r = await g.page.evaluate(() => ['BS75-CX01', 'BS75-X01', 'BS75-X03', 'BS76-X01'].map(id => BS.CARDS[id].overCount));
  assert.deepEqual(r, [{ count: 4, bp: 5000 }, { count: 4, bp: 5000 }, { count: 9, bp: 10000 }, { count: 4, bp: 5000 }]);
});
test('V07 Brave condition: family match, one Brave per Spirit, cost condition', async () => {
  const r = await ev(`const d = sp('B-DRG'), o = sp('B-OTH'), l = sp('B-LOW'), b = hd('B-SW0'), c = hd('B-COST');
    const t1 = BS.braveTargets(P, b).map(x => x.id), t2 = BS.braveTargets(P, c).map(x => x.id);
    BS.braveSummon(P, b, d, null); return [t1, t2, BS.braveTargets(P, c).map(x => x.id)];`);
  assert.deepEqual(r, [['B-DRG', 'B-LOW'], ['B-DRG'], []]);
});
test('V08 direct summon: pays the cost, no cores on the Brave, BP+ added to the Spirit', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); const r0 = P.reserve.n, bp0 = BS.bpOf(d);
    BS.braveSummon(P, b, d, null); return [r0 - P.reserve.n, P.hand.includes(b), P.spirits.includes(b), d.brave === b, BS.bpOf(d) - bp0, d.cores];`);
  assert.deepEqual(r, [2, false, false, true, 5000, 1]);
});
test('V09 a Brave summoned in Spirit form is a Spirit on the Field with its own BP and Lv', async () => {
  const r = await ev(`const b = hd('B-SW'); BS.summon(P, b, null); return [P.spirits.includes(b), b.cores, BS.bpOf(b), BS.lvIndex(b), BS.isSpiritForm(BS.CARDS['B-SW']), BS.isSpiritForm(BS.CARDS['B-SW0'])];`);
  assert.deepEqual(r, [true, 1, 3000, 0, true, false]);
});
// rules: ETR:brave.combine@0d0e7d3a
test('V10 combining from the Field moves the Brave cores onto the Spirit (manual p. 35)', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = sp('B-SW', P, 2); BS.combineBrave(P, b, d); return [P.spirits.length, d.cores, d.brave === b, b.cores, BS.bpOf(d)];`);
  assert.deepEqual(r, [1, 3, true, 0, 9000]);
});
test('V11 combining: an exhausted Brave or Spirit makes the combined Spirit exhausted', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = sp('B-SW'); b.exhausted = true; BS.combineBrave(P, b, d); return d.exhausted;`);
  assert.equal(r, true);
});
test('V12 a combined Brave adds its symbol to the Spirit (reduction symbols)', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW'); const s0 = BS.symbolsOn(P).blue || 0; BS.braveSummon(P, b, d, null); return [s0, BS.symbolsOn(P).blue || 0, BS.symbolsOn(P).red];`);
  assert.deepEqual(r, [0, 1, 1]);
});
test('V13 separating: the Brave returns to Spirit form with cores for its Lv1', async () => {
  const r = await ev(`const d = sp('B-DRG', P, 3), b = hd('B-SW'); BS.braveSummon(P, b, d, null); const can = BS.canSeparate(P, d);
    BS.separateBrave(P, d); return [can, d.brave, P.spirits.includes(b), b.cores >= 1, BS.bpOf(d)];`);
  assert.deepEqual(r, [true, null, true, true, 6000]);
});
test('V14 a Brave without level data cannot separate', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); BS.braveSummon(P, b, d, null); return BS.canSeparate(P, d);`);
  assert.equal(r, false);
});
// rules: ETR:brave.leave@6a4612ac
test('V15 the combined Spirit destroyed: Spirit and Brave both go to the Trash (manual p. 36)', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); BS.braveSummon(P, b, d, null); BS.removeSpirit(P, d, 'destroyed', true);
    return [P.trash.includes(d), P.trash.includes(b), d.brave, P.spirits.length];`);
  assert.deepEqual(r, [true, true, null, 0]);
});
test('V16 the combined Spirit depleted: the Brave goes with it', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); BS.braveSummon(P, b, d, null); d.cores = 0; BS.checkDepletion(P); return [P.trash.includes(b), P.spirits.length];`);
  assert.deepEqual(r, [true, 0]);
});
test('V17 the combined Spirit returned to the Hand: the Brave returns too', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); BS.braveSummon(P, b, d, null); BS.bounceCard(P, d, 'hand'); return [P.hand.includes(d), P.hand.includes(b)];`);
  assert.deepEqual(r, [true, true]);
});
test('V18 the combined Spirit to Soul State: the Brave goes to the Trash', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); BS.braveSummon(P, b, d, null); BS.toSoulState(P, d); return [P.soulState.includes(d), P.trash.includes(b)];`);
  assert.deepEqual(r, [true, true]);
});
test('V19 braveRecheck: a Spirit that no longer fits separates; without Lv1 data the Brave goes to the Trash', async () => {
  const r = await ev(`const o = sp('B-OTH', P, 3), b = BS.mkInst('B-SW'), b0 = BS.mkInst('B-SW0'); o.brave = b; BS.braveRecheck(P, o);
    const o2 = sp('B-OTH', P, 1); o2.brave = b0; BS.braveRecheck(P, o2); return [o.brave, P.spirits.includes(b), o2.brave, P.trash.includes(b0)];`);
  assert.deepEqual(r, [null, true, null, true]);
});
test('V20 a Brave summoned directly is not a Spirit summon: no SUMMONED effects fire', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = hd('B-SW0'); const c0 = P.count; BS.braveSummon(P, b, d, null); return [P.count === c0, G.evQ ? G.evQ.length : 0];`);
  assert.equal(r[0], true);
});
test('V21 Hand buttons: a Brave with no level data offers only the combined summon', async () => {
  const r = await ev(`P.cpu = false; sp('B-DRG'); const b = hd('B-SW0'); return BS.handButtons(P, b).map(x => x.value);`);
  assert.ok(r.includes('brave')); assert.ok(!r.includes('play'));
});
test('V22 Hand buttons: the combined summon is disabled when no Spirit meets the condition', async () => {
  const r = await ev(`P.cpu = false; sp('B-OTH'); const b = hd('B-SW0'); const x = BS.handButtons(P, b).find(y => y.value === 'brave'); return [x.dis, x.label];`);
  assert.equal(r[0], true); assert.match(r[1], /Brave condition/);
});
test('V23 CPU: combines a Brave from the Hand with its strongest fitting Spirit', async () => {
  const r = await ev(`sp('B-LOW'); const d = sp('B-DRG', P, 3), b = hd('B-SW0'); await BS.cpuBrave(P); return [d.brave === b, P.hand.includes(b)];`);
  assert.deepEqual(r, [true, false]);
});
test('V24 CPU: combines a Brave in Spirit form on the Field', async () => {
  const r = await ev(`const d = sp('B-DRG'), b = sp('B-SW'); await BS.cpuBrave(P); return [d.brave === b, P.spirits.length];`);
  assert.deepEqual(r, [true, 1]);
});
// rules: ETR:over-count@4d2dd197
test('V25 Over Count: BP+ only while the Count meets the condition, whatever the Lv (manual p. 61)', async () => {
  const r = await ev(`const w = sp('B-OC'); const a = BS.bpOf(w), a1 = BS.ocActive(w); P.count = 4; return [a, a1, BS.bpOf(w), BS.ocActive(w)];`);
  assert.deepEqual(r, [5000, false, 10000, true]);
});
test('V26 Over Count: [During OC] effects only resolve while OC is active', async () => {
  const r = await ev(`const w = sp('B-OC'); P.deck = P.deck.length ? P.deck : [BS.mkInst('B-OTH')]; const h0 = P.hand.length; await BS.fireFx(P, 'ATTACKS', w);
    const h1 = P.hand.length; P.count = 5; await BS.fireFx(P, 'ATTACKS', w); return [h1 - h0, P.hand.length - h1];`);
  assert.deepEqual(r, [0, 1]);
});
test('V27 Over Count: a [During OC] STATIC BP effect follows the Count', async () => {
  const r = await ev(`const w = sp('B-OCS'); const a = BS.bpOf(w); P.count = 2; return [a, BS.bpOf(w)];`);
  assert.deepEqual(r, [2000, 3000]);
});
test('V28 Over Count and a Brave stack on the same Spirit', async () => {
  const r = await ev(`BS.CARDS['B-OC'].families = ['Ancient Dragon']; const w = sp('B-OC'), b = hd('B-SW0'); BS.braveSummon(P, b, w, null); P.count = 4; const v = BS.bpOf(w); BS.CARDS['B-OC'].families = []; return v;`);
  assert.equal(r, 15000);
});
test('V29 Yaj-Veda (card image: LV1 1 core, 2000 BP) summoned in Spirit form: counter +1 and the CPU destroys an opposing Nexus', async () => {
  const r = await ev(`const y = hd('BS76-060'); const n = BS.mkInst('B-ALLY'); O.nexus.push(n); BS.summon(P, y, null); await BS.fireFx(P, 'SUMMONED', y);
    return [P.spirits.includes(y), BS.bpOf(y), P.count, O.nexus.length];`);
  assert.deepEqual(r, [true, 2000, 1, 0]);
});
// rules: ETR:brave.summon@380cd6ee
test('V30 a Brave summon is not a Spirit summon: "when your Spirit is summoned" effects do not fire (manual p. 35)', async () => {
  const r = await ev(`const n = BS.mkInst('B-ALLY'); P.nexus.push(n); const b = hd('B-SW'); BS.summon(P, b, null); await BS.fireFx(P, 'SUMMONED', b);
    const c1 = P.count; const s = hd('B-OTH'); BS.summon(P, s, null); await BS.fireFx(P, 'SUMMONED', s); return [c1, P.count];`);
  assert.deepEqual(r, [0, 1]);
});
test('V31 Yaj-Veda summoned directly combined: its [LV1](When Summoned) does not fire (no Lv of its own)', async () => {
  const r = await ev(`const d = sp('B-DRG'), y = hd('BS76-060'); BS.braveSummon(P, y, d, null); return [d.brave === y, P.count, BS.bpOf(d)];`);
  assert.deepEqual(r, [true, 0, 9000]);
});
