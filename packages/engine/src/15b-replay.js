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
  return { t: G.turnNo, st: G.step, sn: G.steps[G.step] || '', a: G.active, n: G.hn || 0, last: G.history.length ? G.history[G.history.length - 1] : '', over: !!G.over, w: G.winner || null, p: { player: side(G.p.player), opponent: side(G.p.opponent) } };
}
/** Re-runs a port record in this engine (any host: headless, or the web page when no match is open). Every decision is
 *  answered from the record in order (same seat and kind, else "diverged at answer N"); the host is restored afterwards.
 *  Resolves { ok, reason, at, total, over, final, same, cut, sameCut, build, recBuild, frames? } (frames: viewer: true).
 * @returns {Promise<PortRunResult>} */
async function runPortRecord(rec, opts) {
  opts = opts || {};
  if (rec && rec.port && rec.port.v === 2) rec = rec.port;           // a fuzz case file
  if (!rec || rec.v !== 2 || !Array.isArray(rec.answers) || !rec.deckA || !rec.deckB || rec.seed == null) return { ok: false, reason: 'not a port record (v 2)' };
  if (!!rec.sim !== SIM) return { ok: false, reason: rec.sim ? 'a CPU-vs-CPU sim record: replay it with packages/engine/headless.mjs --replay' : 'a record of a real match: this page runs sims only' };
  const frames = [], MAXF = opts.maxFrames || 4000, fmt = FORMAT, errors = [];
  let i = 0, stop = null, last = '';
  const never = () => new Promise(() => {});
  const prev = bindHost({
    name: 'replay',
    view(ev) { if (opts.viewer && ev.type === 'board' && G && frames.length < MAXF) { const f = JSON.stringify(boardSnapshot()); if (f !== last) { frames.push(JSON.parse(f)); last = f; } } },
    log() {},
    decide(seat, d) {
      if (stop) return never();
      const a = rec.answers[i];
      if (!a) { stop = 'end'; return never(); }                     // the record ends: the match waits here
      if (a.s !== seat || a.k !== d.kind) { stop = `diverged at answer ${i}: the engine asks ${seat} for ${d.kind}, the record has ${a.s} ${a.k}`; return never(); }
      i++; return Promise.resolve(a.v);
    }
  });
  const fast = REPLAY, simH = SIM_HUMAN, prof = CPU_SIM_PROFILES, fz = FUZZ;
  REPLAY = { fast: true, i: 0, port: true };
  if (rec.format && rec.format !== FORMAT) setFormat(rec.format);
  if (SIM) { SIM_HUMAN = (rec.human || []).includes('player'); CPU_SIM_PROFILES = Object.assign({}, rec.cpu && rec.cpu.profiles); FUZZ = Object.assign({}, rec.cpu && rec.cpu.fuzz); }
  const t0 = Date.now(), timeoutMs = opts.timeoutMs || 60000;
  /** @type {PortRunResult} */
  let res;
  try {
    startNewGame({ seed: rec.seed, deckA: rec.deckA, deckB: rec.deckB, noHistory: true, watch: !!rec.watch }).catch(e => { if (e !== ABORT && errors.length < 3) errors.push(String(e && e.message)); });
    while (!(G && G.over) && !stop && !errors.length && Date.now() - t0 < timeoutMs) await new Promise(r => setTimeout(r, 2));
    const over = !!(G && G.over), final = over ? matchSummary() : null, cut = G ? { log: G.hn || 0, hash: (G.hh >>> 0).toString(16) } : null;
    const same = !!(rec.final && final && ['winner', 'turn', 'log', 'hash'].every(k => rec.final[k] === final[k]));
    const sameCut = !!(rec.cut && cut && stop === 'end' && rec.cut.log === cut.log && rec.cut.hash === cut.hash);
    const reason = errors.length ? 'error: ' + errors[0] : stop && stop !== 'end' ? stop : !over && !stop ? 'time limit' : over && i < rec.answers.length ? `${rec.answers.length - i} answers are left after the end of the match` : '';
    res = { ok: !reason, reason, at: i, total: rec.answers.length, over, final, same, cut, sameCut, build: VERSION, recBuild: rec.build };
    if (opts.viewer) res.frames = frames;
  } finally {
    io.host = prev; REPLAY = fast; if (FORMAT !== fmt) setFormat(fmt);
    if (SIM) { SIM_HUMAN = simH; CPU_SIM_PROFILES = prof; FUZZ = fz; }
    if (opts.close) { SESSION++; G = null; }                         // the web page: drop the replayed (maybe waiting) match
  }
  return res;
}
/** Viewer replay (v 1) of a port record: board frames that play back in any later version without the engine. */
async function viewerReplayOf(rec, opts) {
  const r = await runPortRecord(rec, Object.assign({}, opts, { viewer: true }));
  if (!r.ok) return { ok: false, reason: r.reason };
  const p = rec.port && rec.port.v === 2 ? rec.port : rec;
  return { ok: true, replay: { v: 1, kind: 'aeterna-viewer', build: r.build, seed: p.seed, final: r.final, frames: r.frames } };
}
