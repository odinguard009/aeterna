/* ---------------------------------------------------------------------
   GAME STATE
   --------------------------------------------------------------------- */
/* ---- settings (saved in this browser) ---- */
const SET_KEY = 'bse.settings.v1';
const SETTINGS = Object.assign({ speed: 'normal', sound: false, cpuDeck: 'train' }, (() => { try { const o = JSON.parse(localStorage.getItem(SET_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } })());
const SPEEDS = { normal: 1, fast: 0.45, instant: 0.08 };
if (!SPEEDS[SETTINGS.speed]) SETTINGS.speed = 'normal';
SETTINGS.sound = SETTINGS.sound === true;
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); } catch (e) { /* blocked */ } }
let AUDIO = null;
function sfx(kind) {                                   // tiny synthesized sounds, no files
  if (!SETTINGS.sound || SIM) return;
  try {
    AUDIO = AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    const tones = { attack: [330, 0.09, 'square'], hit: [150, 0.14, 'sawtooth'], destroy: [90, 0.2, 'sawtooth'], summon: [520, 0.1, 'triangle'], card: [700, 0.04, 'sine'], win: [880, 0.35, 'triangle'], lose: [110, 0.4, 'sine'] }[kind];
    if (!tones) return;
    const o = AUDIO.createOscillator(), g = AUDIO.createGain(); o.type = tones[2]; o.frequency.value = tones[0];
    g.gain.setValueAtTime(0.06, AUDIO.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AUDIO.currentTime + tones[1]);
    o.connect(g); g.connect(AUDIO.destination); o.start(); o.stop(AUDIO.currentTime + tones[1] + 0.02);
  } catch (e) { /* audio blocked */ }
}
let G = null, SESSION = 0, UID = 0, MODAL = null, REPLAY = null;
const fnv = (h, t) => { let x = h == null ? 2166136261 : h; for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };   // running hash of the whole log (history keeps only 300 lines)
/* v0.26 input record: every prompt answer (m), field pick (k:'pick') and board action (a) of the human, in order */
function recIn(o) { if (G && G.rec && !G.rec.closed && !G.over) { let x = o; try { x = JSON.parse(JSON.stringify(o)); } catch (e) { G.rec.lossy = true; x = { lossy: true }; } G.rec.inputs.push(x); } }
let SIM_DECK_B = null;   // test hook (?sim=1 only): the second CPU deck
const delay = ms => new Promise(r => setTimeout(r, SIM || (REPLAY && REPLAY.fast) ? 0 : Math.round(ms * (SPEEDS[SETTINGS.speed] || 1))));
async function wait(ms) { const s = SESSION; await delay(ms); if (s !== SESSION) throw ABORT; }
function log(t) { if (!G) return; G.last = t; G.history.push(t); G.hh = fnv(G.hh, t); G.hn = (G.hn || 0) + 1;
  if (SETTINGS.sound) sfx(/attacks with/.test(t) ? 'attack' : /destroyed|depleted/.test(t) ? 'destroy' : /lose[s]? \d+ Life/.test(t) ? 'hit' : /summon|deploy/.test(t) ? 'summon' : /draw/.test(t) ? 'card' : ''); if (G.history.length > 300) G.history.shift(); }

function mkInst(id) { return { uid: ++UID, id, mirage: false, cores: 0, soul: false, exhausted: false, under: [], summonedTurn: 0, bpMod: 0, inSoulState: false }; }
function newPlayer(key, name, cpu, counts) {
  const all = [];
  for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) all.push(mkInst(id));
  let contract = null;
  const ci = all.findIndex(c => CARDS[c.id].contract);
  if (ci >= 0) contract = all.splice(ci, 1)[0];          // setup: a Contract card may be added to the starting Hand
  shuffle(all);
  const hand = all.splice(0, contract ? 3 : 4);
  if (contract) hand.push(contract);
  const P = {
    key, name, cpu, deckSize: deckTotal(counts), deck: all, hand, spirits: [], nexus: [], soulState: [], standby: [], trash: [], removed: [],
    life: 5, lifeSoul: false, made: 8, reserve: { n: 3, soul: true }, trashCores: { n: 0, soul: false }, count: 0, void: 0, revealed: [], onceUsed: {},
    burst: null, burstSetThisTurn: false, mirage: null, mirageSetThisTurn: false
  };
  prepareTokens(P, counts);                 // Token cards are prepared outside the Deck (no shuffle, no RNG use)
  return P;
}
function contractToDeck(p) {                // setup choice (manual p.12): a Contract card in the starting Hand goes back to the Deck, one card is drawn instead
  const i = p.hand.findIndex(h => CARDS[h.id].contract);
  if (i < 0) return false;
  p.deck.push(p.hand.splice(i, 1)[0]); shuffle(p.deck);
  const j = p.deck.findIndex(d => !CARDS[d.id].contract);        // the replacement is never another Contract card (the choice is kept)
  p.hand.push(p.deck.splice(j < 0 ? 0 : j, 1)[0]);
  return true;
}
function redrawHand(p) {                    // setup redraw (Eternal manual p.11 step 7, JP 17.1 game setup): the whole Hand, a Contract card too, goes back to the Deck; shuffle; draw 4; a Contract card cannot be added again
  p.deck.push(...p.hand.splice(0)); shuffle(p.deck); p.hand = p.deck.splice(0, 4);
}
function cpuWantsRedraw(hand) {             // CPU: redraw only a hand of cost 4+ cards, and never give up its Contract card (it would be lost for the game)
  if (hand.some(h => CARDS[h.id].contract)) return false;
  return hand.every(h => CARDS[h.id].cost > 3);
}
function newGame(deckA, deckB, format) {
  format = format || FORMAT;
  return {
    format, steps: format === 'standard' ? STEPS_STANDARD : STEPS,
    p: { player: newPlayer('player', SIM ? 'Sim A' : 'You', SIM, deckA), opponent: newPlayer('opponent', SIM ? 'Sim B' : 'CPU', true, deckB) },
    step: 0, turnNo: 0, active: 'player', next: 'player', over: false, winner: null, busy: true,
    last: 'Match started.', history: [], turnResolver: null, burstQ: [], evQ: []
  };
}

