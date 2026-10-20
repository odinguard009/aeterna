// Headless host (v0.82.0, phase F2 = monorepo step M2): runs the engine in Node without a DOM.
// The protocol + engine script parts (tools/build.mjs engineScript, same card pack as the game) run in a
// node:vm context that has no `document` and no `window`; the engine talks to this host only through `io`
// (packages/protocol/src/00p-protocol.js). The CPU plays both sides (?sim=1 rules).
//
//   import { playHeadless } from './packages/engine/headless.mjs';
//   const r = await playHeadless({ seed: 7, deckA: 'red', deckB: 'mitra' });   // { over, winner, turn, hash, views, ... }
//
// WEB_GAPS: web prompts the engine still calls directly. They are human-only paths, so a CPU-vs-CPU match never
// reaches them; here they throw. M3 (phase F3) routes every one through io.decide and empties this list
// (test H82-02 keeps it shrink-only).
import vm from 'node:vm';
import { engineScript } from '../../tools/build.mjs';

export const WEB_GAPS = ['ask', 'askBlock', 'askPayment', 'cardStripHTML', 'humanFlashChoice', 'info', 'mullCardHTML', 'pickFromField', 'prepareHumanMagic'];

const EXPORTS = `
;globalThis.__engine = { io, bindHost, VIEW_TYPES, startNewGame, PREBUILT, PRESET_DECK, VERSION, CARDS, matchSummary, checkInvariants,
  setSimDeckB(d) { SIM_DECK_B = d; }, setSimProfiles(o) { CPU_SIM_PROFILES = Object.assign({}, o || {}); }, setFuzz(o) { FUZZ = Object.assign({}, o || {}); },
  get G() { return G; }, get SIM() { return SIM; } };
`;

let SCRIPT = null;   // the joined script is the same for every match of a process: build it once
function script() { return SCRIPT || (SCRIPT = new vm.Script(engineScript() + EXPORTS, { filename: 'aeterna-engine.js' })); }

/** A fresh engine in its own vm context (no DOM). Returns the export object (live getters for G). */
export function loadEngine() {
  const store = new Map();
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, URLSearchParams, TextDecoder, TextEncoder, atob, btoa,
    location: { search: '?sim=1' },
    navigator: { webdriver: true },                     // strict effect checks, as in the Playwright sims
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } }
  };
  for (const n of WEB_GAPS) ctx[n] = () => { throw new Error(`headless: the engine called the web prompt ${n}() (M3 routes it through io.decide)`); };
  vm.createContext(ctx);
  script().runInContext(ctx);
  return ctx.__engine;
}

const deckOf = (E, d) => (typeof d === 'string' ? (E.PREBUILT.find(x => x.id === d) || { cards: null }).cards : d);

/** Plays one CPU-vs-CPU match to the end. deckA/deckB: a prebuilt id ('red', 'mitra', ...) or a {cardId: count} map.
 *  Checks the rules invariants after every board view. Resolves a plain summary; never rejects. */
export async function playHeadless({ seed = 1, deckA = 'red', deckB = 'mitra', timeoutMs = 60000, profiles = null, fuzz = null } = {}) {
  const E = loadEngine(), views = {}, errors = [];
  let logs = 0;
  const A = deckOf(E, deckA), B = deckOf(E, deckB);
  if (!A || !B) return { over: false, errors: ['unknown deck ' + (A ? deckB : deckA)] };
  E.bindHost({
    name: 'headless',
    view(ev) {
      if (!ev || !E.VIEW_TYPES.includes(ev.type)) throw new Error('unknown view record ' + JSON.stringify(ev));
      JSON.stringify(ev);                               // every record is serializable (M4 replays, M6 server)
      views[ev.type] = (views[ev.type] || 0) + 1;
      if (ev.type === 'board' && E.G && errors.length < 3) { try { E.checkInvariants(); } catch (e) { errors.push('invariant: ' + e.message); } }
    },
    log() { logs++; }
  });
  for (const k of Object.keys(E.PRESET_DECK)) delete E.PRESET_DECK[k];
  Object.assign(E.PRESET_DECK, A);
  E.setSimDeckB(B);
  if (profiles) E.setSimProfiles(profiles);
  if (fuzz) E.setFuzz(fuzz);
  const onRej = e => { if (errors.length < 3) errors.push('unhandled: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e))); };
  process.on('unhandledRejection', onRej);
  const t0 = Date.now();
  try {
    await E.startNewGame({ seed });
    while (!(E.G && E.G.over) && !errors.length && Date.now() - t0 < timeoutMs) await new Promise(r => setTimeout(r, 2));
  } catch (e) { errors.push('thrown: ' + (e && e.message)); } finally { process.off('unhandledRejection', onRej); }
  const G = E.G, over = !!(G && G.over);
  return { seed, over, errors, views, logs, ms: Date.now() - t0, build: E.VERSION, ...(over ? E.matchSummary() : {}), lives: G ? [G.p.player.life, G.p.opponent.life] : null };
}

// CLI: node packages/engine/headless.mjs [seed] [deckA] [deckB]
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const [seed = '1', a = 'red', b = 'mitra'] = process.argv.slice(2);
  playHeadless({ seed: Number(seed), deckA: a, deckB: b }).then(r => { console.log(JSON.stringify(r)); process.exit(r.over && !r.errors.length ? 0 : 1); });
}
