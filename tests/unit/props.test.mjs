// Property tests over seeded CPU-vs-CPU matches (the fast-check role): every property must hold for every generated seed.
// A failure prints the seed; rerun just that case with  PROP_ONLY=<seed> node --test tests/unit/props.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { simMatch, openGame, closeBrowser } from './lib/game.mjs';
import { caseSeeds, forAll, MASTER } from './lib/prop.mjs';

const RUNS = Number(process.env.PROP_RUNS || 10);
const results = {};
const PROFILES = { player: 'aggressive', opponent: 'defensive' };      // v0.32: weight profiles play each other
async function playAll(mode, runs = RUNS) {
  const seeds = caseSeeds('match-' + mode, runs), out = [];
  let i = 0;
  const opt = mode === 'profiles' ? { mode: 'mirror', profiles: PROFILES } : { mode };
  const worker = async () => { while (i < seeds.length) { const s = seeds[i++]; out.push({ ...(await simMatch(s, opt)), mode }); } };
  await worker();          // sequential: parallel pages in one headless Chromium stall (seen on a 2-CPU runner)
  return out;
}
const failing = (rs, pred) => rs.filter(r => !pred(r)).map(r => `seed ${r.seed} (${r.mode})`);

before(async () => { results.white = await playAll('white'); results.mirror = await playAll('mirror'); results.profiles = await playAll('profiles', Math.max(4, Math.ceil(RUNS / 2)));
  results.blue = await playAll('blue', Math.max(3, Math.ceil(RUNS / 3))); results.bluemirror = await playAll('bluemirror', Math.max(3, Math.ceil(RUNS / 3)));
  results.purple = await playAll('purple', Math.max(3, Math.ceil(RUNS / 3))); results.purplemirror = await playAll('purplemirror', Math.max(3, Math.ceil(RUNS / 3))); });      // v0.39: the purple Hades deck      // v0.37: the blue Nuadha deck
after(async () => { await closeBrowser(); });

for (const mode of ['white', 'mirror', 'profiles', 'blue', 'bluemirror', 'purple', 'purplemirror']) {
  test(`P01-${mode} every match ends (no stuck game)`, () => {
    assert.deepEqual(failing(results[mode], r => r.over), [], `master seed ${MASTER}`);
  });
  test(`P02-${mode} core/card/Soul Core invariants hold during the whole match`, () => {
    const bad = results[mode].filter(r => r.inv.length).map(r => `seed ${r.seed}: ${r.inv[0]}`);
    assert.deepEqual(bad, []);
  });
  test(`P03-${mode} no page errors, console errors or dialogs`, () => {
    const bad = results[mode].filter(r => r.errors.length).map(r => `seed ${r.seed}: ${r.errors[0]}`);
    assert.deepEqual(bad, []);
  });
  test(`P04-${mode} the match has a winner and the loser lost by Life 0 or an empty deck`, () => {
    assert.deepEqual(failing(results[mode], r => {
      if (r.winner !== 'player' && r.winner !== 'opponent') return false;
      const L = r.winner === 'player' ? 1 : 0;
      return r.lives[L] === 0 || r.decks[L] === 0;
    }), []);
  });
  test(`P05-${mode} matches stay within a sane length (turn <= 80)`, () => {
    assert.deepEqual(failing(results[mode], r => r.turn > 0 && r.turn <= 80), []);
  });
  test(`P06-${mode} every finished match recorded a final hash and log digest for replays`, () => {
    assert.deepEqual(failing(results[mode], r => !r.over || (r.hash != null && r.log != null)), []);
  });
}

test('P07 determinism: the same seed and decks give exactly the same match', async () => {
  await forAll('determinism', 4, async seed => {
    const a = await simMatch(seed), b = await simMatch(seed);
    if (a.hash !== b.hash || a.log !== b.log || a.turn !== b.turn || a.winner !== b.winner) return `differs: ${a.turn}/${a.winner} vs ${b.turn}/${b.winner}`;
  });
});
test('P08 replay: BS.runReplay(lastReplay) reproduces the recorded match', async () => {
  await forAll('replay', 3, async seed => {
    const a = await simMatch(seed, { keepPage: true });
    try {
      const r = await a.page.evaluate(rec => BS.runReplay(rec, { timeoutMs: 60000 }), a.replay);
      if (!r.ok || !r.same) return `replay ok=${r.ok} same=${r.same} ${r.reason}`;
    } finally { await a.page.close(); }
  });
});
test('P09 the first player is decided by the seed and both players can go first', () => {
  const all = results.white.concat(results.mirror);
  assert.ok(all.length >= 4);
  const firsts = new Set(all.map(r => r.firstPlayer));
  assert.ok(firsts.size === 2 || all.length < 6, `only ${[...firsts]} ever went first`);
});
test('P10 both sides win at least once across the mirror matches (no side bias in the engine)', () => {
  const w = new Set(results.mirror.map(r => r.winner));
  assert.ok(w.size === 2 || results.mirror.length < 8, `only ${[...w]} won ${results.mirror.length} mirror matches`);
});
test('P11 a normal (non-sim) page load starts no match by itself', async () => {
  const { page, errors } = await openGame('');
  try {
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => !!(BS.G && BS.G.rec)), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('P12 profiles: aggressive vs defensive matches last 3+ turns and both win at least once over enough seeds', () => {
  const rs = results.profiles;
  assert.ok(rs.every(r => r.turn >= 3), rs.map(r => r.turn).join(','));
  const w = new Set(rs.map(r => r.winner));
  assert.ok(w.size === 2 || rs.length < 8, `only ${[...w]} won ${rs.length} profile matches`);
});
