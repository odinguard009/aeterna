// Headless host (v0.82.0, phase F2 = monorepo step M2): runs the engine in Node without a DOM.
// The protocol + engine script parts (tools/build.mjs engineScript, same card pack as the game) run in a
// node:vm context that has no `document` and no `window`; the engine talks to this host only through `io`
// (packages/protocol/src/00p-protocol.js). The CPU plays both sides (?sim=1 rules).
//
//   import { playHeadless } from './packages/engine/headless.mjs';
//   const r = await playHeadless({ seed: 7, deckA: 'red', deckB: 'mitra' });   // { over, winner, turn, hash, views, ... }
//
// WEB_GAPS: web functions the engine still calls directly; empty since v0.83.0 (F3 = M3 part 1: every human prompt
// is a decision record through io.decide, packages/engine/src/05b-decide.js). Test H82-02 keeps it empty.
//
// Human seat (v0.83.0): playHeadless({ human: true, answer }) makes the first seat a human whose decisions are
// answered by answer(seat, record) (default firstAnswer). v0.84.0 (F3 = M3 rest): its board actions are answers too:
// the action decision {kind: 'action', step, turn} takes an intent record (packages/engine/src/05c-intent.js). An answer
// of undefined lets the engine's port answerer cpuAnswer() decide (firstAnswer does so for actions and payments), so the
// CPU plays that seat through the port; human: 'pass' ends every turn of that seat at once.
import vm from 'node:vm';
import { engineScript } from '../../tools/build.mjs';

export const WEB_GAPS = [];

/** Scripted answer: the first usable button of a choice, the first glowing card of a pick; actions and payments: the CPU (undefined). */
export function firstAnswer(seat, d) {
  if (d.kind === 'action' || d.kind === 'payment') return undefined;
  if (d.kind === 'choice') { const b = (d.buttons || []).find(x => !x.hidden && !x.dis); return b ? b.value : null; }
  if (d.kind === 'pick') return d.uids && d.uids.length ? d.uids[0] : (d.buttons && d.buttons[0] ? d.buttons[0].value : null);
  return null;
}

const EXPORTS = `
;globalThis.__engine = { io, bindHost, VIEW_TYPES, DECISION_KINDS, cpuTurn, cpuAnswer, applyIntent, INTENT_TYPES, portRecord, boardSnapshot, setFormat, ABORT,
  setReplayFast() { REPLAY = { fast: true, i: 0 }; }, get FORMAT() { return FORMAT; }, startNewGame, PREBUILT, PRESET_DECK, VERSION, CARDS, matchSummary, checkInvariants,
  setSimDeckB(d) { SIM_DECK_B = d; }, setSimHuman(v) { SIM_HUMAN = !!v; }, setSimProfiles(o) { CPU_SIM_PROFILES = Object.assign({}, o || {}); }, setFuzz(o) { FUZZ = Object.assign({}, o || {}); },
  get G() { return G; }, get SIM() { return SIM; } };
`;

let SCRIPT = null;   // the joined script is the same for every match of a process: build it once
function script() { return SCRIPT || (SCRIPT = new vm.Script(engineScript() + EXPORTS, { filename: 'aeterna-engine.js' })); }

/** A fresh engine in its own vm context (no DOM). Returns the export object (live getters for G). */
export function loadEngine({ sim = true } = {}) {
  const store = new Map();
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, URLSearchParams, TextDecoder, TextEncoder, atob, btoa,
    location: { search: sim ? '?sim=1' : '' },          // sim: false = the rules of a real web match (coin toss, Starting Hand prompts), no delays
    navigator: { webdriver: true },                     // strict effect checks, as in the Playwright sims
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } }
  };
  for (const n of WEB_GAPS) ctx[n] = () => { throw new Error(`headless: the engine called the web prompt ${n}() (M3 routes it through io.decide)`); };
  vm.createContext(ctx);
  script().runInContext(ctx);
  if (!sim) ctx.__engine.setReplayFast();
  return ctx.__engine;
}

const deckOf = (E, d) => (typeof d === 'string' ? (E.PREBUILT.find(x => x.id === d) || { cards: null }).cards : d);

/** Plays one CPU-vs-CPU match to the end. deckA/deckB: a prebuilt id ('red', 'mitra', ...) or a {cardId: count} map.
 *  Checks the rules invariants after every board view. Resolves a plain summary; never rejects. */
export async function playHeadless({ seed = 1, deckA = 'red', deckB = 'mitra', timeoutMs = 60000, profiles = null, fuzz = null, human = false, answer = firstAnswer } = {}) {
  const E = loadEngine(), views = {}, errors = [], decisions = [], acted = { ok: 0, refused: 0 };
  let logs = 0;
  const A = deckOf(E, deckA), B = deckOf(E, deckB);
  if (!A || !B) return { over: false, errors: ['unknown deck ' + (A ? deckB : deckA)] };
  E.bindHost({
    name: 'headless',
    view(ev) {
      if (!ev || !E.VIEW_TYPES.includes(ev.type)) throw new Error('unknown view record ' + JSON.stringify(ev));
      JSON.stringify(ev);                               // every record is serializable (M4 replays, M6 server)
      views[ev.type] = (views[ev.type] || 0) + 1;
      if (ev.type === 'acted') { acted[ev.ok ? 'ok' : 'refused']++; return; }
      if (ev.type === 'board' && E.G && errors.length < 3) { try { E.checkInvariants(); } catch (e) { errors.push('invariant: ' + e.message); } }
    },
    log() { logs++; },
    async decide(seat, d) {
      if (!d || !E.DECISION_KINDS.includes(d.kind)) throw new Error('unknown decision record ' + JSON.stringify(d));
      const rec = JSON.parse(JSON.stringify(d));        // every record is serializable (M4 replays, M6 server)
      let v = human === 'pass' && d.kind === 'action' ? { type: 'end' } : await answer(seat, rec);
      if (v === undefined) v = E.cpuAnswer(seat, rec);
      if (d.kind === 'action' && !(v && E.INTENT_TYPES.includes(v.type))) throw new Error('not an intent record: ' + JSON.stringify(v));
      if (JSON.stringify(v === undefined ? null : v) === undefined) throw new Error('answer is not serializable');
      decisions.push({ seat, kind: d.kind, v: v === undefined ? null : v });
      return v === undefined ? null : v;
    }
  });
  for (const k of Object.keys(E.PRESET_DECK)) delete E.PRESET_DECK[k];
  Object.assign(E.PRESET_DECK, A);
  E.setSimDeckB(B);
  if (profiles) E.setSimProfiles(profiles);
  if (fuzz) E.setFuzz(fuzz);
  E.setSimHuman(human);
  const onRej = e => { if (errors.length < 3) errors.push('unhandled: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e))); };
  process.on('unhandledRejection', onRej);
  const t0 = Date.now();
  try {
    await E.startNewGame({ seed });
    while (!(E.G && E.G.over) && !errors.length && Date.now() - t0 < timeoutMs) {
      await new Promise(r => setTimeout(r, 2));
    }
  } catch (e) { errors.push('thrown: ' + (e && e.message)); } finally { process.off('unhandledRejection', onRej); }
  const G = E.G, over = !!(G && G.over);
  return { seed, over, errors, views, logs, decisions, acted, port: G ? JSON.parse(JSON.stringify(E.portRecord())) : null, ms: Date.now() - t0, build: E.VERSION, ...(over ? E.matchSummary() : {}), lives: G ? [G.p.player.life, G.p.opponent.life] : null };
}

// Port replay (v0.85.0, F4 = M4 part 1; record format: packages/engine/src/15b-replay.js). Re-runs a port input record
// (from G.prec / portRecord() of any host, or the `port` of a fuzz case) without a browser: every decision is answered
// from the record in order and must be asked by the same seat with the same kind. Resolves
// { ok, reason, at, total, over, final, same, cut, sameCut, frames? }: `same` = the recorded final result and log hash,
// `sameCut` = the log count and hash where the record of an unfinished match was cut. viewer: true adds viewer frames.
export async function replayPort(rec, { timeoutMs = 60000, viewer = false } = {}) {
  if (rec && rec.port && rec.port.v === 2) rec = rec.port;           // a fuzz case file
  if (!rec || rec.v !== 2 || !Array.isArray(rec.answers) || !rec.deckA || !rec.deckB || rec.seed == null) return { ok: false, reason: 'not a port record (v 2)' };
  const E = loadEngine({ sim: !!rec.sim }), frames = [], errors = [];
  let i = 0, stop = null, last = '';
  const never = () => new Promise(() => {});
  E.bindHost({
    name: 'replay',
    view(ev) { if (viewer && ev.type === 'board' && E.G) { const f = JSON.stringify(E.boardSnapshot()); if (f !== last) { frames.push(JSON.parse(f)); last = f; } } },
    log() {},
    decide(seat, d) {
      if (stop) return never();
      const a = rec.answers[i];
      if (!a) { stop = 'end'; return never(); }                     // the record ends: the match waits here
      if (a.s !== seat || a.k !== d.kind) { stop = `diverged at answer ${i}: the engine asks ${seat} for ${d.kind}, the record has ${a.s} ${a.k}`; return never(); }
      i++; return Promise.resolve(a.v);
    }
  });
  if (rec.format && rec.format !== E.FORMAT) E.setFormat(rec.format);
  if (rec.sim) {
    E.setSimHuman((rec.human || []).includes('player'));
    if (rec.cpu && rec.cpu.profiles) E.setSimProfiles(rec.cpu.profiles);
    if (rec.cpu && rec.cpu.fuzz) E.setFuzz(rec.cpu.fuzz);
  }
  const onRej = e => { if (errors.length < 3) errors.push(String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); };
  process.on('unhandledRejection', onRej);
  const t0 = Date.now();
  try {
    E.startNewGame({ seed: rec.seed, deckA: rec.deckA, deckB: rec.deckB, noHistory: true, watch: !!rec.watch }).catch(onRej);
    while (!(E.G && E.G.over) && !stop && !errors.length && Date.now() - t0 < timeoutMs) await new Promise(r => setTimeout(r, 2));
  } finally { process.off('unhandledRejection', onRej); }
  const G = E.G, over = !!(G && G.over), final = over ? E.matchSummary() : null;
  const cut = G ? { log: G.hn || 0, hash: (G.hh >>> 0).toString(16) } : null;
  const same = !!(rec.final && final && ['winner', 'turn', 'log', 'hash'].every(k => rec.final[k] === final[k]));
  const sameCut = !!(rec.cut && cut && stop === 'end' && rec.cut.log === cut.log && rec.cut.hash === cut.hash);
  const reason = errors.length ? 'error: ' + errors[0] : stop && stop !== 'end' ? stop : !over && !stop ? 'time limit' : over && i < rec.answers.length ? `${rec.answers.length - i} answers are left after the end of the match` : '';
  const out = { ok: !reason, reason, at: i, total: rec.answers.length, over, final, same, cut, sameCut, build: E.VERSION, recBuild: rec.build };
  if (viewer) out.frames = frames;
  return out;
}

/** Viewer replay (v 1) of a port record: board frames that play back in any later version without the engine. */
export async function viewerReplay(rec, opts = {}) {
  const r = await replayPort(rec, Object.assign({}, opts, { viewer: true }));
  if (!r.ok && !(r.reason === '' || r.reason == null)) return { ok: false, reason: r.reason };
  const p = rec.port && rec.port.v === 2 ? rec.port : rec;
  return { ok: true, replay: { v: 1, kind: 'aeterna-viewer', build: r.build, seed: p.seed, final: r.final, frames: r.frames } };
}

// CLI: node packages/engine/headless.mjs [seed] [deckA] [deckB]
//      node packages/engine/headless.mjs --replay <port record or fuzz case .json>   (re-runs it, prints the result)
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href && process.argv[2] === '--replay') {
  const { readFileSync } = await import('node:fs');
  replayPort(JSON.parse(readFileSync(process.argv[3], 'utf8'))).then(r => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); });
} else if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const [seed = '1', a = 'red', b = 'mitra'] = process.argv.slice(2);
  playHeadless({ seed: Number(seed), deckA: a, deckB: b }).then(r => { console.log(JSON.stringify(r)); process.exit(r.over && !r.errors.length ? 0 : 1); });
}
