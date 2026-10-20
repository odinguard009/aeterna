/* ---------------------------------------------------------------------
   REPLAY RECORDS (v0.85.0, phase F4 = monorepo step M4 part 1; docs/ai/monorepo-plan.md "Design" 2)
   Port input record (v 2): what a host answered through io.decide, so any host re-runs the match: the web game, the
   headless runner (packages/engine/headless.mjs replayPort) and later the server. Kept in G.prec by every match:
     {v: 2, build, seed, format, sim, watch, deckA, deckB, human: [seat], cpu: {profiles, fuzz} | null,
      answers: [{s: seat, k: kind, v: answer}], wait: {s, k} | null (a decision is open), final: matchSummary() | absent}
   Answers come from 05b-decide.js (portAsk): choices, picks, payments, info, and the action intents of 05c-intent.js.
   The CPU seat decides inline and needs no answers. portRecord() adds `cut` {log, hash} (the log count and hash at a
   moment a decision is open), so a record of an unfinished match is checked up to that moment. The record depends on the
   engine version (`build`); the v1 record of v0.26 (G.rec, web clicks) stays for the browser replay.
   Viewer replay (v 1): {v: 1, kind: 'aeterna-viewer', build, seed, frames: [boardSnapshot()]}: plain board frames that
   play back without the engine; exported from a port record by headless viewerReplay().
   --------------------------------------------------------------------- */
function newPortRecord(seed, deckA, deckB, watch) {
  const human = ['player', 'opponent'].filter(k => G.p[k] && !G.p[k].cpu);
  return { v: 2, build: VERSION, s: SESSION, seed, format: FORMAT, sim: SIM, watch: !!watch, deckA: Object.assign({}, deckA), deckB: Object.assign({}, deckB), human,
    cpu: SIM ? { profiles: Object.assign({}, CPU_SIM_PROFILES), fuzz: Object.assign({}, FUZZ) } : null, answers: [], wait: null };
}
/** A copy of the current match's port record; `cut` when a decision is open now (the match waits for a host). */
function portRecord() {
  if (!G || !G.prec) return null;
  const r = JSON.parse(JSON.stringify(G.prec)); delete r.s;
  if (G.prec.wait && !G.over) r.cut = { log: G.hn || 0, hash: (G.hh >>> 0).toString(16) };
  delete r.wait;
  return r;
}
/** One viewer-replay frame: the visible board as plain data (the CPU seat's Hand and Burst only as counts / "set"). */
function boardSnapshot() {
  const fc = f => ({ id: f.id, uid: f.uid, c: f.cores, s: f.soul ? 1 : 0, x: f.exhausted ? 1 : 0, lv: lvNo(f), u: f.under.length ? f.under.map(x => x.id) : undefined, b: f.brave ? f.brave.id : undefined });
  const side = p => ({
    name: p.name, life: p.life, ls: p.lifeSoul ? 1 : 0, res: p.reserve.n, rs: p.reserve.soul ? 1 : 0, tc: p.trashCores.n, ts: p.trashCores.soul ? 1 : 0, count: p.count, deck: p.deck.length,
    hand: p.cpu ? p.hand.length : p.hand.map(h => h.id), spirits: p.spirits.map(fc), nexus: p.nexus.map(fc), trash: p.trash.map(x => x.id), soulState: p.soulState.map(x => x.id),
    removed: p.removed.map(x => x.id), burst: p.burst ? (p.cpu ? 'set' : p.burst.id) : null, mirage: p.mirage ? p.mirage.id : null
  });
  return { t: G.turnNo, st: G.step, a: G.active, n: G.hn || 0, last: G.history.length ? G.history[G.history.length - 1] : '', over: !!G.over, w: G.winner || null, p: { player: side(G.p.player), opponent: side(G.p.opponent) } };
}
