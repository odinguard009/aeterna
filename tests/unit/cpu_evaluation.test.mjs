// v0.32 CPU evaluation policy (issue #1, Aegis study point 7): weight profiles, one-unit scoring,
// lethal check, guard blockers, block choice. Quiet boards only (no match loop); cards without effects.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openGame, closeBrowser } from './lib/game.mjs';

let g;
before(async () => { g = await openGame(''); });
after(async () => { await g.page.close(); await closeBrowser(); });

// helpers run in the page: a fresh quiet board, then put(side, id, cores, exhausted)
const PRE = `BS.testSetup(); BS.setSimProfiles({}); BS.SETTINGS.cpuProfile = 'balanced';
  const G = BS.G, P = G.p.player, O = G.p.opponent; P.life = 5; O.life = 5; P.nexus = []; O.nexus = []; P.spirits = []; O.spirits = [];
  const put = (side, id, cores = 1, ex = false) => { const i = BS.mkInst(id); i.cores = cores; i.exhausted = ex; G.p[side].spirits.push(i); return i; };`;
const ev = body => g.page.evaluate(`(() => { ${PRE}\n${CARDS_JS}\n${body} })()`);
// effect-free Spirits: S1 1000 BP, S3 3000, S4 4000, S5 5000, S9 9000 (2 symbols: S9x2)
const CARDS_JS = "const S1 = 'BS76-001', S3 = 'BS76-005', S4 = 'BS74-047', S5 = 'BS75-CX01', S9 = 'BS75-X02', S9x2 = 'BS75-X03';";

test('C01 three profiles with the same weight keys', async () => {
  const r = await ev(`return Object.fromEntries(Object.entries(BS.CPU_PROFILES).map(([k, w]) => [k, Object.keys(w).sort().join(',')]));`);
  assert.deepEqual(Object.keys(r).sort(), ['aggressive', 'balanced', 'defensive']);
  assert.equal(new Set(Object.values(r)).size, 1);
});
test('C02 default profile is balanced; unknown names are refused', async () => {
  assert.deepEqual(await ev(`return [BS.cpuProfileName(O), BS.setCpuProfile('nope'), BS.cpuProfileName(O)];`), ['balanced', false, 'balanced']);
});
test('C03 a per-side sim profile applies to that side only', async () => {
  assert.deepEqual(await ev(`BS.setCpuProfile('aggressive', 'opponent'); const r = [BS.cpuProfileName(O), BS.cpuProfileName(P)]; BS.setSimProfiles({}); return r;`), ['aggressive', 'balanced']);
});
test('C04 an unknown saved profile falls back to balanced', async () => {
  assert.equal(await ev(`BS.SETTINGS.cpuProfile = 'zzz'; const r = BS.cpuProfileName(O); BS.SETTINGS.cpuProfile = 'balanced'; return r;`), 'balanced');
});
test('C05 Life value rises with Life and each lost core hurts more when Life is low', async () => {
  const [v, l1, l5] = await ev(`const v = [0,1,2,3,4,5].map(BS.lifeValue); return [v, v[1] - v[0], v[5] - v[4]];`);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1]);
  assert.ok(l1 > l5);
});
test('C06 board evaluation is 0 on an even empty board', async () => {
  assert.equal(await ev(`P.hand = []; O.hand = []; P.reserve.n = O.reserve.n = 3; P.trash = O.trash = []; return BS.cpuEval(P);`), 0);
});
test('C07 board evaluation rises with an own Spirit and falls with an opposing one', async () => {
  const [a, b, c] = await ev(`const a = BS.cpuEval(P); put('player', S5); const b = BS.cpuEval(P); put('opponent', S9); return [a, b, BS.cpuEval(P)];`);
  assert.ok(b > a && c < b);
});
test('C08 board evaluation is zero-sum between the two sides', async () => {
  const [a, b] = await ev(`put('player', S5); put('opponent', S3); O.life = 3; return [BS.cpuEval(P, BS.CPU_PROFILES.balanced), BS.cpuEval(O, BS.CPU_PROFILES.balanced)];`);
  assert.ok(Math.abs(a + b) < 0.05, `${a} vs ${b}`);
});
test('C09 lethal: ready attackers with no blockers and enough symbols', async () => {
  assert.equal(await ev(`O.life = 2; put('player', S1); put('player', S1); return BS.cpuLethal(P);`), true);
});
test('C10 not lethal when every attacker can be blocked', async () => {
  assert.equal(await ev(`O.life = 2; put('player', S1); put('player', S1); put('opponent', S9); put('opponent', S9); return BS.cpuLethal(P);`), false);
});
test('C11 lethal counts the attackers left after the best blocks (worst case)', async () => {
  assert.deepEqual(await ev(`O.life = 2; put('player', S1); put('player', S1); put('player', S9x2); put('opponent', S9);
    const a = BS.cpuLethal(P); O.life = 3; return [a, BS.cpuLethal(P)];`), [true, false]);
});
test('C12 exhausted Spirits are neither attackers nor blockers in the lethal check', async () => {
  assert.deepEqual(await ev(`O.life = 1; put('player', S1, 1, true); const a = BS.cpuLethal(P); put('player', S1); put('opponent', S9, 1, true); return [a, BS.cpuLethal(P)];`), [false, true]);
});
test('C13 attacks an empty field', async () => {
  assert.equal(await ev(`const a = put('player', S3); return BS.cpuAttackChoice(P) === a;`), true);
});
test('C14 balanced keeps a weaker Spirit home against a stronger ready blocker', async () => {
  assert.equal(await ev(`put('player', S3); put('opponent', S9); return BS.cpuAttackChoice(P);`), null);
});
test('C15 attacks with the Spirit that beats every ready blocker', async () => {
  assert.equal(await ev(`put('player', S1); const b = put('player', S9); put('player', S1); put('opponent', S5); put('opponent', S4); return BS.cpuAttackChoice(P) === b;`), true);
});
test('C16 lethal overrides caution: weak attackers swing when the blocks cannot stop all of them', async () => {
  assert.equal(await ev(`O.life = 1; put('player', S1); put('player', S1); put('opponent', S9); return !!BS.cpuAttackChoice(P);`), true);
});
test('C17 balanced keeps a guard home when the opponent can take its Life next turn', async () => {
  assert.equal(await ev(`P.life = 2; put('player', S9); put('opponent', S9, 1, true); put('opponent', S9, 1, true); return BS.cpuAttackChoice(P);`), null);
});
test('C18 aggressive attacks in the same spot (weights only, same code)', async () => {
  assert.equal(await ev(`BS.setCpuProfile('aggressive', 'player'); P.life = 2; const a = put('player', S9); put('opponent', S9, 1, true); put('opponent', S9, 1, true); const r = BS.cpuAttackChoice(P) === a; BS.setSimProfiles({}); return r;`), true);
});
test('C19 attack scores order: unblockable > beats every blocker > walks into a stronger blocker', async () => {
  const [free, beat, bad] = await ev(`const a = put('player', S5); const r0 = BS.cpuAttackScore(P, a); put('opponent', S3); const r1 = BS.cpuAttackScore(P, a); put('opponent', S9); return [r0, r1, BS.cpuAttackScore(P, a)];`);
  assert.ok(free > 0 && beat > 0 && bad <= 0, `${free} ${beat} ${bad}`);
});
test('C20 blocks with a stronger Spirit', async () => {
  assert.equal(await ev(`const b = put('opponent', S9); const a = put('player', S3); return BS.cpuChooseBlock(O, a) === b;`), true);
});
test('C21 picks the weakest blocker that still wins', async () => {
  assert.equal(await ev(`put('opponent', S9); const w = put('opponent', S5); put('opponent', S1); const a = put('player', S4); return BS.cpuChooseBlock(O, a) === w;`), true);
});
test('C22 no chump block at full Life', async () => {
  assert.equal(await ev(`put('opponent', S1); const a = put('player', S9); return BS.cpuChooseBlock(O, a);`), null);
});
test('C23 always blocks a hit that would take the last Life: a winner if any, else the cheapest body', async () => {
  assert.deepEqual(await ev(`O.life = 1; const w = put('opponent', S1); put('opponent', S3); const a = put('player', S9); const r = BS.cpuChooseBlock(O, a) === w; const k = put('opponent', S9x2); return [r, BS.cpuChooseBlock(O, put('player', S5)) === k];`), [true, true]);
});
test('C24 chump blocks get likelier as Life falls (defensive before balanced)', async () => {
  const r = await ev(`put('opponent', S1); const a = put('player', S9); const out = {};
    for (const n of ['balanced', 'defensive']) { BS.setCpuProfile(n, 'opponent'); out[n] = [5, 4, 3, 2].find(l => { O.life = l; return BS.cpuChooseBlock(O, a); }) || 0; }
    BS.setSimProfiles({}); return out;`);
  assert.ok(r.defensive >= r.balanced && r.balanced > 0, JSON.stringify(r));
});
test('C25 an even trade is taken (blocker of the same BP)', async () => {
  assert.equal(await ev(`const b = put('opponent', S5); const a = put('player', S5); return BS.cpuChooseBlock(O, a) === b;`), true);
});
test('C26 no ready blocker: no block', async () => {
  assert.equal(await ev(`put('opponent', S9, 1, true); const a = put('player', S1); return BS.cpuChooseBlock(O, a);`), null);
});
test('C27 Main Step: a new cheap Nexus first, then the strongest Spirit; Magic and a second copy score 0', async () => {
  const r = await ev(`const h = id => BS.mkInst(id);
    const nx = h('SD69-CX01'), big = h(S9), small = h(S1), mag = h('BS75-073');
    const first = BS.cpuPlayChoice(P, [small, big, nx]) === nx, second = BS.cpuPlayChoice(P, [small, big]) === big;
    const nx2 = h('SD69-CX01'); nx2.cores = 0; P.nexus.push(nx2);
    return [first, second, BS.cpuPlayScore(P, mag), BS.cpuPlayScore(P, h('SD69-CX01')), BS.cpuPlayChoice(P, [])];`);
  assert.deepEqual(r, [true, true, 0, 0, null]);
});
test('C28 the policy is deterministic (same board, same choice) and leaves the board untouched', async () => {
  const r = await ev(`put('player', S5); put('player', S3); put('opponent', S4); const before = JSON.stringify([P.spirits, O.spirits, P.life, O.life]);
    const a = BS.cpuAttackChoice(P), b = BS.cpuAttackChoice(P); return [a === b, before === JSON.stringify([P.spirits, O.spirits, P.life, O.life])];`);
  assert.deepEqual(r, [true, true]);
});
test('C29 no page errors', () => { assert.deepEqual(g.errors, []); });
