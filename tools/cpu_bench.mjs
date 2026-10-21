#!/usr/bin/env node
// CPU benchmark (roadmap U/I item "CPU benchmark", v0.102.0): CPU-vs-CPU matches with the ten Standard starter decks on
// the headless engine (packages/engine/headless.mjs, no browser), so a release can show whether the CPU plays worse.
//
//   node tools/cpu_bench.mjs                 full set (~240 matches, about 2-3 min), prints the summary
//   node tools/cpu_bench.mjs --check         full set + compare with docs/reports/cpu-bench.json: exit 1 on FAIL, WARN lines only warn
//   node tools/cpu_bench.mjs --write         full set + write the baseline docs/reports/cpu-bench.json (+ cpu-bench.md)
//   node tools/cpu_bench.mjs --quick         a 6-match sample (tests)
// Runs in GitHub Actions with the Regression workflow (job cpu-bench); a session only rewrites the baseline when the CPU or the
// Standard decks changed on purpose (the commit says why).
//
// Matches (fixed seeds, so the same build always gives the same numbers):
//   colours: every ordered pair of the ten starters, balanced vs balanced, 2 seeds (180 matches);
//   styles: aggressive / defensive / balanced against each other, both seats, on ten deck pairs (60 matches).
// Per match: winner, turns, errors, timeout, and two passivity counts taken at each End Step of the CPU's own turn (turn 2 on):
//   idleAttack = a Spirit that could still attack was kept back and no attack was made that turn;
//   idleSummon = a card in the hand could still be paid and nothing was played that turn.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playHeadless } from '../packages/engine/headless.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_FILE = join(ROOT, 'docs/reports/cpu-bench.json');
export const DECKS = ['std01', 'std02', 'std03', 'std04', 'std05', 'std06', 'std07', 'std08', 'std09', 'std10'];
export const STYLES = ['balanced', 'aggressive', 'defensive'];

/** The match list: [{ kind, a, b, pa, pb, seed }]. */
export function plan({ quick = false } = {}) {
  const out = [];
  if (quick) {
    for (const [a, b, s] of [['std01', 'std02', 1], ['std03', 'std04', 2], ['std05', 'std06', 3]]) out.push({ kind: 'colour', a, b, pa: 'balanced', pb: 'balanced', seed: s });
    for (const [pa, pb, s] of [['aggressive', 'balanced', 4], ['defensive', 'balanced', 5], ['aggressive', 'defensive', 6]]) out.push({ kind: 'style', a: 'std07', b: 'std08', pa, pb, seed: s });
    return out;
  }
  let seed = 1000;
  for (const a of DECKS) for (const b of DECKS) if (a !== b) for (let k = 0; k < 2; k++) out.push({ kind: 'colour', a, b, pa: 'balanced', pb: 'balanced', seed: seed++ });
  const pairs = [['aggressive', 'balanced'], ['defensive', 'balanced'], ['aggressive', 'defensive']];
  for (let i = 0; i < DECKS.length; i++) {
    const a = DECKS[i], b = DECKS[(i + 3) % DECKS.length];
    for (const [x, y] of pairs) { out.push({ kind: 'style', a, b, pa: x, pb: y, seed: seed++ }); out.push({ kind: 'style', a, b, pa: y, pb: x, seed: seed++ }); }
  }
  return out;
}

/** One match with the passivity counters. */
export async function playOne(m, { timeoutMs = 60000 } = {}) {
  const idle = { attack: 0, summon: 0, turns: 0 };
  let cur = null;                                       // { key, turn, attacked, played, done }
  const onBoard = (E) => {
    const G = E.G; if (!G || G.over) return;
    const key = G.active, p = G.p[key];
    if (!cur || cur.key !== key || cur.turn !== G.turnNo) cur = { key, turn: G.turnNo, attacked: false, played: false, done: false, hand: p.hand.length, field: p.spirits.length + p.nexus.length, trash: p.trash.length };
    if (G.attacker) cur.attacked = true;
    if (p.spirits.length + p.nexus.length > cur.field || p.trash.length > cur.trash && p.hand.length < cur.hand) cur.played = true;
    cur.field = Math.max(cur.field, p.spirits.length + p.nexus.length);
    if (E.STEPS[G.step] === 'END' && !cur.done && G.turnNo >= 2) {
      cur.done = true; idle.turns++;
      const ready = p.spirits.filter(s => !s.exhausted && !s.noAB && E.abTaxOK(p, s));
      if (!cur.attacked && ready.length) idle.attack++;
      if (!cur.played && p.hand.some(h => { try { return E.canPlayCard(p, h); } catch { return false; } })) idle.summon++;
    }
  };
  const r = await playHeadless({ seed: m.seed, deckA: m.a, deckB: m.b, format: 'standard', profiles: { player: m.pa, opponent: m.pb }, timeoutMs, onBoard });
  return { ...m, over: r.over, winner: r.over ? (r.winner === 'player' ? 'a' : r.winner === 'opponent' ? 'b' : 'draw') : null, turns: r.turn || 0,
    errors: (r.errors || []).slice(0, 2), idleAttack: idle.attack, idleSummon: idle.summon, ownTurns: idle.turns };
}

const colourOf = id => ({ std01: 'red', std02: 'purple', std03: 'green', std04: 'white', std05: 'yellow', std06: 'blue', std07: 'purple', std08: 'yellow', std09: 'red', std10: 'blue' })[id] || '?';
const pct = (w, n) => (n ? Math.round(1000 * w / n) / 10 : 0);

/** Totals from match rows (JSON-friendly; the baseline file stores this plus the build). */
export function summarize(rows) {
  const done = rows.filter(r => r.over), n = rows.length, s = { matches: n, finished: done.length, timeouts: n - done.length,
    errors: rows.filter(r => r.errors.length).length, avgTurns: 0, firstSeatWin: 0, idleAttackPerTurn: 0, idleSummonPerTurn: 0, decks: {}, colours: {}, styles: {}, stylePairs: {} };
  const own = rows.reduce((t, r) => t + r.ownTurns, 0);
  s.avgTurns = done.length ? Math.round(10 * done.reduce((t, r) => t + r.turns, 0) / done.length) / 10 : 0;
  s.firstSeatWin = pct(done.filter(r => r.winner === 'a').length, done.length);
  s.idleAttackPerTurn = own ? Math.round(1000 * rows.reduce((t, r) => t + r.idleAttack, 0) / own) / 1000 : 0;
  s.idleSummonPerTurn = own ? Math.round(1000 * rows.reduce((t, r) => t + r.idleSummon, 0) / own) / 1000 : 0;
  const tally = (obj, k, won) => { const o = obj[k] || (obj[k] = { games: 0, wins: 0, winPct: 0 }); o.games++; if (won) o.wins++; o.winPct = pct(o.wins, o.games); };
  for (const r of done) {
    if (r.kind === 'colour') { tally(s.decks, r.a, r.winner === 'a'); tally(s.decks, r.b, r.winner === 'b'); tally(s.colours, colourOf(r.a), r.winner === 'a'); tally(s.colours, colourOf(r.b), r.winner === 'b'); }
    else if (r.pa !== r.pb) {
      tally(s.styles, r.pa, r.winner === 'a'); tally(s.styles, r.pb, r.winner === 'b');
      const [x, y] = [r.pa, r.pb].sort(), wx = (r.winner === 'a' ? r.pa : r.pb) === x;   // "x vs y": games and wins of x
      tally(s.stylePairs, `${x} vs ${y}`, wx);
    }
  }
  return s;
}

/** Compares a new summary with the baseline: FAIL = errors or timeouts rose; WARN = the CPU plays clearly more passively,
 *  games run clearly longer, or a style lost a lot of its win rate. */
export function compare(base, cur) {
  const fails = [], warns = [];
  if (cur.errors > base.errors) fails.push(`errors ${base.errors} -> ${cur.errors}`);
  if (cur.timeouts > base.timeouts) fails.push(`timeouts ${base.timeouts} -> ${cur.timeouts}`);
  for (const k of ['idleAttackPerTurn', 'idleSummonPerTurn']) if (cur[k] > base[k] * 1.25 && cur[k] - base[k] >= 0.03) warns.push(`${k} ${base[k]} -> ${cur[k]} (more passive turns)`);
  if (cur.avgTurns > base.avgTurns * 1.2) warns.push(`avgTurns ${base.avgTurns} -> ${cur.avgTurns}`);
  for (const [k, v] of Object.entries(base.styles || {})) if (cur.styles[k] && v.winPct - cur.styles[k].winPct >= 15) warns.push(`style ${k} win rate ${v.winPct}% -> ${cur.styles[k].winPct}%`);
  return { fails, warns };
}

function report(s, build) {
  const row = (o) => Object.entries(o).sort((x, y) => y[1].winPct - x[1].winPct).map(([k, v]) => `| ${k} | ${v.games} | ${v.winPct}% |`).join('\n');
  return `# CPU benchmark (${build})\n\nGenerated by \`node tools/cpu_bench.mjs --write\`; Standard starter decks on the headless engine, fixed seeds. ` +
    `Matches ${s.matches}, finished ${s.finished}, timeouts ${s.timeouts}, with errors ${s.errors}. Average turns ${s.avgTurns}; first seat wins ${s.firstSeatWin}%. ` +
    `Passive own turns: a ready attacker kept back with no attack ${s.idleAttackPerTurn} per turn, a payable card kept with nothing played ${s.idleSummonPerTurn} per turn.\n\n` +
    `## Styles (against each other)\n| Style | Games | Win |\n|---|---|---|\n${row(s.styles)}\n\n| Pairing (win of the first) | Games | Win |\n|---|---|---|\n${row(s.stylePairs)}\n\n## Colours (balanced vs balanced)\n| Colour | Games | Win |\n|---|---|---|\n${row(s.colours)}\n\n` +
    `## Decks\n| Deck | Games | Win |\n|---|---|---|\n${row(s.decks)}\n`;
}

async function main() {
  const a = process.argv.slice(2), quick = a.includes('--quick');
  const t0 = Date.now(), rows = [];
  for (const m of plan({ quick })) rows.push(await playOne(m));
  const s = summarize(rows);
  const { VERSION } = await import('../packages/engine/headless.mjs').then(h => h.loadEngine());
  console.log(`[cpu-bench] ${VERSION}: ${s.matches} matches in ${Math.round((Date.now() - t0) / 1000)} s; finished ${s.finished}, timeouts ${s.timeouts}, errors ${s.errors}; ` +
    `avg turns ${s.avgTurns}; first seat ${s.firstSeatWin}%; idle attack ${s.idleAttackPerTurn}/turn, idle summon ${s.idleSummonPerTurn}/turn`);
  console.log('[cpu-bench] styles ' + Object.entries(s.stylePairs).map(([k, v]) => `${k} ${v.winPct}%`).join(', ') + ' | colours ' + Object.entries(s.colours).map(([k, v]) => `${k} ${v.winPct}%`).join(', '));
  for (const r of rows.filter(x => x.errors.length || !x.over).slice(0, 5)) console.log(`[cpu-bench] ${r.over ? 'error' : 'timeout'} ${r.a}/${r.pa} vs ${r.b}/${r.pb} seed ${r.seed}: ${r.errors.join(' | ')}`);
  if (a.includes('--write') && !quick) {
    writeFileSync(BASE_FILE, JSON.stringify({ build: VERSION, note: 'Baseline of tools/cpu_bench.mjs (fixed seeds). Rewrite with --write only when the CPU or the Standard decks changed on purpose.', summary: s }, null, 1) + '\n');
    writeFileSync(BASE_FILE.replace(/\.json$/, '.md'), report(s, VERSION));
    console.log('[cpu-bench] baseline written: docs/reports/cpu-bench.json, .md');
  }
  if (a.includes('--check') && !quick) {
    if (!existsSync(BASE_FILE)) { console.log('[cpu-bench] no baseline yet'); return 0; }
    const base = JSON.parse(readFileSync(BASE_FILE, 'utf8'));
    const { fails, warns } = compare(base.summary, s);
    for (const w of warns) console.log(`WARN ${w} (baseline ${base.build})`);
    for (const f of fails) console.log(`FAIL ${f} (baseline ${base.build})`);
    if (!fails.length && !warns.length) console.log(`[cpu-bench] same or better than the baseline (${base.build})`);
    return fails.length ? 1 : 0;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().then(c => process.exit(c), e => { console.error(e); process.exit(1); });
