/* ---------------------------------------------------------------------
   TURN FLOW
   --------------------------------------------------------------------- */
function setStep(i) { G.step = i; render(); }
async function beginTurn(key) {
  const p = G.p[key];
  G.active = key; G.turnNo++; p.burstSetThisTurn = false; p.mirageSetThisTurn = false; G.burstQ.length = 0; releaseStandby(true); G.evQ.length = 0;
  log(`— Turn ${G.turnNo}: ${p.name} —`);
  setStep(0); await wait(300);
  if (p.deck.length === 0) { win(other(key), `${poss(p)} deck is empty at the start step`); return; }
  setStep(1);
  if (G.turnNo === 1) log('First turn: the Core Step is skipped.');
  else { takeFromVoid(p, 1); p.reserve.n++; log(`${who(p)} ${p.cpu ? 'adds' : 'add'} 1 core from the Void to the Reserve.`); }   // Comprehensive Rules 7-3-2
  await wait(300);
  setStep(2); draw(p, 1); log(`${who(p)} ${p.cpu ? 'draws' : 'draw'} a card.`); await wait(300);
  setStep(3);
  for (const f of fieldList(p)) refreshOne(f);
  p.reserve.n += p.trashCores.n; p.trashCores.n = 0;
  if (p.trashCores.soul) { p.reserve.soul = true; p.trashCores.soul = false; }
  log('Refresh Step: cards refreshed, Trash cores returned to the Reserve.');
  await wait(300);
  setStep(4);
}
async function endStep(key) {
  setStep(G.steps.length - 1);
  for (const k of ['player', 'opponent']) for (const f of fieldList(G.p[k])) f.bpMod = 0;
  log(`${who(G.p[key])} ${G.p[key].cpu ? 'ends' : 'end'} the turn.`);
  await wait(300);
}
function win(key, why) {
  if (G.over) return;
  G.over = true; G.winner = key; G.busy = true;
  log(`${who(G.p[key])} ${G.p[key].cpu || key === 'opponent' ? 'wins' : 'win'}: ${why}.`);
  if (G.rec) G.rec.final = matchSummary();
  render();
  if (G.turnResolver) { const r = G.turnResolver; G.turnResolver = null; r(); }
  if (!SIM) { recordMatch(key); showGameOver(); }
}
async function matchLoop() {
  const my = SESSION;
  try {
    while (!G.over && SESSION === my) {
      const key = G.next, p = G.p[key];
      await beginTurn(key);
      if (G.over) break;
      if (p.cpu) { G.busy = true; render(); await cpuTurn(p); }
      else { G.busy = false; render(); await new Promise(r => { G.turnResolver = r; }); G.busy = true; }
      if (G.over || SESSION !== my) break;
      await endStep(key);
      G.next = other(key);
    }
  } catch (e) { if (e !== ABORT) throw e; }
}

