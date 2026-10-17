// v0.33 missing mechanics (issue #4): (When Blocks), (When Destroyed), "When your X destroys" in battle,
// effects from the Hand when your Spirit is blocked, and "When this card is revealed from the deck".
// Eternal rule manual VER.17.0: p. 30 (When Blocking activates after the block is declared), p. 31 (When Destroyed). Quiet boards only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
const CNT = n => ({ do: 'COUNTER', n });
const FIX = [
  { id: 'M-ATK', name: 'Crimson Tester', type: 'Spirit', color: 'red', cost: 3, symbols: 1, levels: [{ cores: 1, bp: 9000 }] },
  { id: 'M-WEAK', name: 'Crimson Weakling', type: 'Spirit', color: 'red', cost: 1, symbols: 1, levels: [{ cores: 1, bp: 1000 }] },
  { id: 'M-PLAIN', name: 'Plain Attacker', type: 'Spirit', color: 'blue', cost: 3, symbols: 1, levels: [{ cores: 1, bp: 9000 }] },
  { id: 'M-BLK', name: 'Block Counter', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 2000 }, { cores: 3, bp: 4000 }], effects: [{ trigger: 'BLOCKS', actions: [CNT(1)] }] },
  { id: 'M-BLK2', name: 'Block Counter Lv2', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 2000 }, { cores: 3, bp: 4000 }], effects: [{ trigger: 'BLOCKS', lv: [2], actions: [CNT(1)] }] },
  { id: 'M-AB', name: 'Attack Block', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 2000 }], effects: [{ trigger: 'ATTACKS', alsoBlocks: true, actions: [CNT(2)] }] },
  { id: 'M-AO', name: 'Attack Only', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 2000 }], effects: [{ trigger: 'ATTACKS', actions: [CNT(2)] }] },
  { id: 'M-ONCE', name: 'Once Shared', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 20000 }], effects: [{ trigger: 'ATTACKS', alsoBlocks: true, once: true, actions: [CNT(1)] }] },
  { id: 'M-DIE', name: 'Death Counter', type: 'Spirit', color: 'white', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 1000 }, { cores: 3, bp: 2000 }], effects: [{ trigger: 'DESTROYED', lv: [2], actions: [CNT(1)] }] },
  { id: 'M-AD', name: 'Ally Destroys', type: 'Nexus', color: 'red', cost: 3, levels: [{ cores: 0 }], effects: [{ trigger: 'ALLY_DESTROYS', match: { name: ['Crimson'] }, actions: [CNT(1)] }] },
  { id: 'M-PAIR', name: 'Pair Key', type: 'Spirit', color: 'red', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 3000 }], effects: [
    { trigger: 'SUMMONED', once: true, onceKey: 'k', actions: [CNT(1)] }, { trigger: 'ATTACKS', once: true, onceKey: 'k', actions: [CNT(1)] }] },
];
before(async () => {
  g = await openGame('');
  const r = await g.page.evaluate(fix => BS.importCards(JSON.stringify(fix)), FIX);
  assert.equal(r.ok, FIX.length, JSON.stringify(r));
});
after(async () => { await g.page.close(); await closeBrowser(); });
const PRE = `BS.testSetup(); BS.SETTINGS.speed = 'instant'; const G = BS.G, P = G.p.player, O = G.p.opponent;
  P.cpu = true; O.cpu = true; for (const q of [P, O]) { q.spirits = []; q.nexus = []; q.soulState = []; q.burst = null; q.mirage = null; q.count = 0; q.revealed = []; q.trash = []; }
  const sp = (id, q = P, n = 1) => { const i = BS.mkInst(id); i.cores = n; q.spirits.push(i); return i; }, nx = (id, q = P, n = 0) => { const i = BS.mkInst(id); i.cores = n; q.nexus.push(i); return i; };
  const block = b => { window.cpuChooseBlock = () => b; };
  const noBlock = () => { window.cpuChooseBlock = () => null; };
  const deckTop = (q, ids) => { q.deck = ids.map(id => BS.mkInst(id)).concat(q.deck); };`;
const ev = body => g.page.evaluate(`(async () => { ${PRE}\n${body} })()`);

test('M01 parse: BLOCKS, DESTROYED, REVEALED and ALLY_DESTROYS are triggers; alsoBlocks, zone and onceKey are kept', async () => {
  const r = await ev(`const x = BS.parseEffects([{ trigger: 'BLOCKS', actions: [{ do: 'COUNTER', n: 1 }] }, { trigger: 'ATTACKS', alsoBlocks: true, onceKey: 'a', actions: [{ do: 'COUNTER', n: 1 }] },
    { trigger: 'ALLY_BLOCKED', zone: 'hand', actions: [{ do: 'DEPLOY_SELF' }] }, { trigger: 'DESTROYED', actions: [{ do: 'DRAW', n: 1 }] }, { trigger: 'REVEALED', actions: [{ do: 'MIRAGE_SET' }] }, { trigger: 'ALLY_DESTROYS', actions: [{ do: 'DRAW', n: 1 }] }]);
    return [x.error || null, x.effects.map(e => e.trigger), x.effects[1].alsoBlocks, x.effects[1].onceKey, x.effects[2].zone];`);
  assert.deepEqual(r, [null, ['BLOCKS', 'ATTACKS', 'ALLY_BLOCKED', 'DESTROYED', 'REVEALED', 'ALLY_DESTROYS'], true, 'a', 'hand']);
});
test('M02 parse: alsoBlocks only on ATTACKS, zone only on ALLY_BLOCKED', async () => {
  const r = await ev(`const x = BS.parseEffects([{ trigger: 'SUMMONED', alsoBlocks: true, zone: 'hand', actions: [{ do: 'COUNTER', n: 1 }] }]); return [!!x.effects[0].alsoBlocks, x.effects[0].zone || null];`);
  assert.deepEqual(r, [false, null]);
});
test('M03 parse: a bad onceKey is rejected', async () => {
  assert.match(await ev(`return BS.parseEffects([{ trigger: 'SUMMONED', onceKey: 'no spaces allowed!', actions: [{ do: 'COUNTER', n: 1 }] }]).error;`), /onceKey/);
});
test('M04 parse: REVEAL_PICK needs n 1-10, a match and rest trash/bottom', async () => {
  const r = await ev(`const f = a => !!BS.parseActionList([a]).error; return [f({ do: 'REVEAL_PICK', n: 3, match: { name: ['Crimson'] }, rest: 'trash' }), f({ do: 'REVEAL_PICK', n: 0, match: { name: ['C'] }, rest: 'trash' }), f({ do: 'REVEAL_PICK', n: 3, rest: 'trash' }), f({ do: 'REVEAL_PICK', n: 3, match: { name: ['C'] }, rest: 'hand' })];`);
  assert.deepEqual(r, [false, true, true, true]);
});
test('M05 (When Blocks) activates when the Spirit blocks (p. 30)', async () => {
  assert.equal(await ev(`const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); return O.count;`), 1);
});
test('M06 an (When Attacks/Blocks) effect also activates on a block', async () => {
  assert.equal(await ev(`const a = sp('M-ATK'), b = sp('M-AB', O); block(b); await BS.doBattle('player', a); return O.count;`), 2);
});
test('M07 a plain (When Attacks) effect does not activate on a block', async () => {
  assert.equal(await ev(`const a = sp('M-ATK'), b = sp('M-AO', O); block(b); await BS.doBattle('player', a); return O.count;`), 0);
});
test('M08 (When Blocks) does not activate when that Spirit attacks', async () => {
  assert.equal(await ev(`const a = sp('M-BLK'); noBlock(); await BS.doBattle('player', a); return P.count;`), 0);
});
test('M09 (When Blocks) respects its level', async () => {
  const r = await ev(`const a = sp('M-ATK'), b = sp('M-BLK2', O); block(b); await BS.doBattle('player', a); const lv1 = O.count;
    const a2 = sp('M-ATK'), b2 = sp('M-BLK2', O, 3); block(b2); await BS.doBattle('player', a2); return [lv1, O.count];`);
  assert.deepEqual(r, [0, 1]);
});
test('M10 the attacker\'s "when blocked" and the blocker\'s (When Blocks) both resolve after the block', async () => {
  const r = await ev(`BS.defBuiltin({ id: 'M-WB', name: 'Crimson Blocked', type: 'Spirit', color: 'red', cost: 2, symbols: 1, levels: [{ cores: 1, bp: 9000 }] });
    const n = BS.mkInst('BS75-001'); n.cores = 1; P.spirits.push(n); P.deck = P.deck.slice(0, 10); const h = P.hand.length;
    const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); return [O.count, P.hand.length > h];`);
  assert.equal(r[0], 1);
});
test('M11 a once-per-turn (When Attacks/Blocks) effect is used once across attack and block', async () => {
  const r = await ev(`const s = sp('M-ONCE'); noBlock(); await BS.doBattle('player', s); const first = P.count; s.exhausted = false;
    const a = sp('M-ATK', O); block(s); await BS.doBattle('opponent', a); return [first, P.count];`);
  assert.deepEqual(r, [1, 1]);
});
test('M12 (When Destroyed) activates on battle destruction with the level the Spirit had (p. 31)', async () => {
  const r = await ev(`const a = sp('M-ATK'), b = sp('M-DIE', O, 3); block(b); await BS.doBattle('player', a); return [O.count, O.trash.includes(b)];`);
  assert.deepEqual(r, [1, true]);
});
test('M13 (When Destroyed) checks the level: a Lv1 Spirit with a Lv2 effect does nothing', async () => {
  assert.equal(await ev(`const a = sp('M-ATK'), b = sp('M-DIE', O, 1); block(b); await BS.doBattle('player', a); return O.count;`), 0);
});
test('M14 depletion is not destruction: (When Destroyed) does not activate (p. 28)', async () => {
  assert.equal(await ev(`const b = sp('M-DIE', O, 3); b.cores = 0; BS.checkDepletion(O); await BS.flushBursts(); return [O.count, O.trash.includes(b)].join();`), '0,true');
});
test('M15 (When Destroyed) also activates on destruction by an effect', async () => {
  assert.equal(await ev(`const b = sp('M-DIE', O, 3); BS.removeSpirit(O, b, 'destroyed', true); await BS.flushBursts(); return O.count;`), 1);
});
test('M16 "when your X destroys an opposing Spirit" activates when the attacker wins the battle', async () => {
  assert.equal(await ev(`nx('M-AD'); const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); return P.count;`), 1);
});
test('M17 ... not when the attacker loses, nor for a non-matching attacker', async () => {
  const r = await ev(`nx('M-AD'); const a = sp('M-WEAK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); const lost = P.count;
    const a2 = sp('M-PLAIN'), b2 = sp('M-BLK', O); block(b2); await BS.doBattle('player', a2); return [lost, P.count];`);
  assert.deepEqual(r, [0, 0]);
});
test('M18 The Crimson Lavafalls (LV2): draw once per turn when your Crimson destroys the blocker', async () => {
  const r = await ev(`nx('BS76-069', P, 1); const h0 = P.hand.length; const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a);
    const h1 = P.hand.length; const a2 = sp('M-ATK'), b2 = sp('M-BLK', O); block(b2); await BS.doBattle('player', a2); return [h1 - h0, P.hand.length - h1];`);
  assert.deepEqual(r, [1, 0]);
});
test('M19 The Crimson Lavafalls at LV1 does not draw', async () => {
  assert.equal(await ev(`nx('BS76-069', P, 0); const h0 = P.hand.length; const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); return P.hand.length - h0;`), 0);
});
test('M20 The Crimson Lavafalls is deployed from the Hand without paying the cost when your Crimson is blocked', async () => {
  const r = await ev(`const l = BS.mkInst('BS76-069'); P.hand.push(l); const res = P.reserve.n; const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a);
    return [P.nexus.includes(l), P.hand.includes(l), P.reserve.n === res];`);
  assert.deepEqual(r, [true, false, true]);
});
test('M21 ... but not when a non-matching Spirit is blocked, and not when unblocked', async () => {
  const r = await ev(`const l = BS.mkInst('BS76-069'); P.hand.push(l); const a = sp('M-PLAIN'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a);
    const a2 = sp('M-ATK'); noBlock(); await BS.doBattle('player', a2); return [P.nexus.includes(l), P.hand.includes(l)];`);
  assert.deepEqual(r, [false, true]);
});
test('M22 a Lavafalls already on the field does not deploy itself again from the field', async () => {
  const r = await ev(`const f = nx('BS76-069'); const a = sp('M-ATK'), b = sp('M-BLK', O); block(b); await BS.doBattle('player', a); return P.nexus.length;`);
  assert.equal(r, 1);
});
test('M23 onceKey: two effects of one card share one "once per turn"', async () => {
  const r = await ev(`const s = sp('M-PAIR'); await BS.fireFx(P, 'SUMMONED', s); noBlock(); await BS.doBattle('player', s); return P.count;`);
  assert.equal(r, 1);
});
test('M24 Rainydle reveals three: a revealed Ankillersaurus sets itself as a Mirage, a Crimson goes to the Hand, the rest to the Trash, counter +1', async () => {
  const r = await ev(`const sw = BS.mkInst('BS75-CX01'); sw.inSoulState = true; P.soulState.push(sw);
    deckTop(P, ['BS75-007', 'BS75-008', 'M-PLAIN']); const top = P.deck.slice(0, 3), r0 = P.deck.length; const s = sp('BS75-006');
    await BS.fireFx(P, 'SUMMONED', s);
    return [P.mirage === top[0], P.hand.includes(top[1]), P.trash.includes(top[2]), P.count, r0 - P.deck.length, P.revealed.length];`);
  assert.deepEqual(r, [true, true, true, 1, 3, 0]);
});
test('M25 a revealed Mirage card is not set when a Mirage is already set', async () => {
  const r = await ev(`const sw = BS.mkInst('BS75-CX01'); sw.inSoulState = true; P.soulState.push(sw); const old = BS.mkInst('BS76-002'); old.mirage = true; P.mirage = old;
    deckTop(P, ['BS75-007', 'M-PLAIN', 'M-PLAIN']); const top = P.deck.slice(0, 3); const s = sp('BS75-006'); await BS.fireFx(P, 'SUMMONED', s);
    return [P.mirage === old, P.hand.includes(top[0]), P.revealed.length];`);
  assert.deepEqual(r, [true, true, 0]);
});
test('M26 The Sunstone Air Fortress is deployed when revealed from the deck by your effect', async () => {
  const r = await ev(`const sw = BS.mkInst('BS75-CX01'); sw.inSoulState = true; P.soulState.push(sw);
    deckTop(P, ['BS75-061', 'M-PLAIN', 'M-PLAIN']); const top = P.deck.slice(0, 3); const s = sp('BS75-006'); await BS.fireFx(P, 'SUMMONED', s);
    return [P.nexus.includes(top[0]), P.revealed.length];`);
  assert.deepEqual(r, [true, 0]);
});
test('M27 Rainydle needs a Siegwurm (field or Soul State)', async () => {
  const r = await ev(`deckTop(P, ['BS75-008', 'M-PLAIN', 'M-PLAIN']); const d = P.deck.length; const s = sp('BS75-006'); await BS.fireFx(P, 'SUMMONED', s); return [P.deck.length === d, P.count];`);
  assert.deepEqual(r, [true, 0]);
});
test('M28 Rainydle: one Once per Turn for When Summoned and When Attacks (Same Name)', async () => {
  const r = await ev(`const sw = BS.mkInst('BS75-CX01'); sw.inSoulState = true; P.soulState.push(sw); const s = sp('BS75-006'); await BS.fireFx(P, 'SUMMONED', s); const d = P.deck.length;
    noBlock(); await BS.doBattle('player', s); return [P.deck.length === d];`);
  assert.deepEqual(r, [true]);
});
test('M29 Teen (When Attacks/Blocks): blocking reveals a card and lets an Awakened Dragon enter Soul State', async () => {
  const r = await ev(`deckTop(O, ['BS74-038']); const t = O.deck[0]; const b = sp('BS74-041', O, 1); const a = sp('M-WEAK'); block(b); await BS.doBattle('player', a); return [O.soulState.includes(t), O.revealed.length];`);
  assert.deepEqual(r, [true, 0]);
});
test('M30 the card texts show the new triggers in the effect description', async () => {
  const r = await ev(`return [BS.parseEffects([{ trigger: 'REVEALED', actions: [{ do: 'MIRAGE_SET' }] }]).effects[0].trigger, BS.FX_ACTIONS.DEPLOY_SELF.txt({}), BS.FX_ACTIONS.MIRAGE_SET.txt({})];`);
  assert.deepEqual(r, ['REVEALED', 'summon/deploy this card without paying the cost', 'set this card as a Mirage without paying the cost (only if you have no Mirage set)']);
});
