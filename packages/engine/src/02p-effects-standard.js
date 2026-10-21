/* v0.88.0 S1 Standard Magic (roadmap item L, owner 2026-10-21 "agar game playable"): the shared shapes of the Standard (block A)
   Magic cards that had no runnable paragraph.
   Conditions (fxIf, 02a):
     lifeReduced: true|false      "If your Life was reduced (during) this turn" (any Life core left the owner's Life this turn;
                                  lifeTake records the turn in p.lifeRedTurn)
     allHave: {family, team, costIn: [n..], spiritsOnly}
                                  "If all your Spirits/Nexuses have the X family / have <Team>" and "If all your Spirits are Cost
                                  2/4/6/8 with the X family": every card on the owner's Field (Spirits only with spiritsOnly)
                                  matches; with no such card the condition is not met (house reading, rules audit).
   Match field (fxMatch, 02a): familyAll ['RYUKI', 'Kamen'] = '"RYUKI" & "Kamen" family' (every listed family).
   Actions:
     DESTROY_OWN {match}          "Target one of your <X> Spirits. Destroy it." (own effect; ctx.did = false when nothing was
                                  destroyed, so "If you've done so, ..." follows with {"if": {"prev": true}})
     EXHAUST_OPP + coresLe        "Target an opposing Spirit with one core or less on it. Exhaust it."
     CANT_ATTACK_BLOCK + turn, costLe
                                  "Target an opposing Cost N or less Spirit. During this turn, it can't attack/block." (turn: the
                                  flag ends in the End Step, 07-turn.js; without turn it lasts the game as before)
   A team is printed as the card's head line "[Team: X]" / "[Teams: X/Y]"; cardTeams reads it from the card text. */
function cardTeams(k) { const m = /\[Teams?:\s*([^\]]+)\]/.exec((k && (k.desc || k.text)) || ''); return m ? m[1].split('/').map(x => x.trim()).filter(Boolean) : []; }
function allHaveShapeOK(q) { return !!q && typeof q === 'object' && (q.family != null || q.team != null || q.costIn != null)
  && (q.family == null || typeof q.family === 'string') && (q.team == null || typeof q.team === 'string')
  && (q.costIn == null || (Array.isArray(q.costIn) && q.costIn.length > 0 && q.costIn.every(n => Number.isInteger(n) && n >= 0 && n <= 30)))
  && (q.spiritsOnly == null || q.spiritsOnly === true); }
function allHaveOK(owner, q) {
  if (!allHaveShapeOK(q)) return fxUnknown('condition', 'allHave');
  const L = q.spiritsOnly ? owner.spirits : fieldList(owner);
  return L.length > 0 && L.every(f => { const k = CARDS[f.id];
    return (!q.family || (k.families || []).includes(q.family)) && (!q.team || cardTeams(k).includes(q.team)) && (!q.costIn || q.costIn.includes(k.cost)); });
}
(() => {
  FX_ACTIONS.DESTROY_OWN = {
    chk: a => hasMatch(a.match),
    txt: a => 'destroy one of your matching Spirits',
    cands: (c, a) => c.p.spirits.filter(s => fxMatch(CARDS[s.id], a.match)),
    can: (c, a) => FX_ACTIONS.DESTROY_OWN.cands(c, a).length > 0,
    run: async (c, a) => {
      const L = FX_ACTIONS.DESTROY_OWN.cands(c, a); if (!L.length) { c.ctx.did = false; return; }
      // the CPU gives up its weakest matching Spirit; the human taps one
      const t = c.p.cpu ? L.slice().sort((x, y) => (bpOf(x) - bpOf(y)) || (x.cores - y.cores))[0]
        : await fxPickTarget(c, L, `✨ <b>${esc(CARDS[c.src.id].name)}</b><br>Tap one of your Spirits to destroy (glowing).`);
      if (!t || !c.p.spirits.includes(t)) { c.ctx.did = false; return; }
      log(`${CARDS[c.src.id].name}: ${poss(c.p)} ${CARDS[t.id].name} is destroyed.`);
      removeSpirit(c.p, t, 'destroyed', false); checkDepletion(c.p);
    } };
  const E = FX_ACTIONS.EXHAUST_OPP, eChk = E.chk, eCands = E.cands, eTxt = E.txt;
  E.chk = a => eChk(a) && (a.coresLe == null || (Number.isInteger(a.coresLe) && a.coresLe >= 0 && a.coresLe <= 10));
  E.cands = (c, a) => eCands(c, a).filter(t => a.coresLe == null || totalCores(t) <= a.coresLe);
  E.txt = a => eTxt(a) + (a.coresLe != null ? ` with ${a.coresLe} core${a.coresLe === 1 ? '' : 's'} or less on it` : '');
  const N = FX_ACTIONS.CANT_ATTACK_BLOCK, nChk = N.chk, nCands = N.cands, nRun = N.run, nTxt = N.txt;
  const okN = a => (a.turn == null || a.turn === true) && (a.costLe == null || (Number.isInteger(a.costLe) && a.costLe >= 0 && a.costLe <= 30));
  N.chk = a => nChk(a) && okN(a);
  N.cands = (c, a) => nCands(c, a).filter(t => !a || a.costLe == null || CARDS[t.id].cost <= a.costLe);
  N.can = (c, a) => N.cands(c, a).length > 0;
  N.txt = a => a.turn ? `during this turn, ${a.n === 1 ? 'an opposing Spirit/Ultimate' : a.n + ' opposing Spirits/Ultimates'}${a.costLe != null ? ' with cost ' + a.costLe + ' or less' : ''} can't attack/block` : nTxt(a);
  N.run = async (c, a) => {
    if (!a.turn && a.costLe == null) return nRun(c, a);
    const L = N.cands(c, a); if (!L.length) { c.ctx.did = false; return; }
    const T = await pickOppSpirits(c, L, a.n, `✨ <b>${esc(CARDS[c.src.id].name)}</b><br>Tap the opposing Spirit that can't attack/block${a.turn ? ' this turn' : ''} (glowing).`);
    if (!T.length) { c.ctx.did = false; return; }
    for (const t of T) { t.noAB = true; if (a.turn) t.noABTurn = G.turnNo; log(`${CARDS[c.src.id].name}: ${poss(c.opp)} ${CARDS[t.id].name} can't attack/block during this ${a.turn ? 'turn' : 'game'}.`); }
    io.view({ type: 'board' });
  };
})();
