
/* =====================================================================
   v0.58 IMMUNITY (rules audit R3 item 2 + session E): every effect action that lists targets (FX_ACTIONS[k].cands) skips a card
   on the OPPOSING Field that is unaffected by this effect's source (fxImmune with the acting effect c). An action marked
   ignoreImmune ("cannot be prevented") keeps them: FAQ Q3 order "cannot be prevented" > "unaffected" > "cannot activate".
   Trash: a card with trashUnaffected ("this card in Trash is unaffected by any effects") is never picked from a Trash by an effect.
   ===================================================================== */
const trashSafe = t => !!(t && CARDS[t.id] && CARDS[t.id].trashUnaffected);
for (const A of Object.values(FX_ACTIONS)) {
  if (typeof A.cands !== 'function' || A.cands.immunityWrapped) continue;
  const raw = A.cands;
  A.cands = function (c, ...rest) {
    const L = raw.call(this, c, ...rest);
    if (!Array.isArray(L) || !c || !c.p || !G) return L;
    const a = rest.find(x => x && typeof x === 'object' && typeof x.do === 'string');
    const opp = G.p[other(c.p.key)], oppField = fieldList(opp);
    return L.filter(x => !(x && ((G.p.player.trash.includes(x) || G.p.opponent.trash.includes(x)) && trashSafe(x)))
      && !(x && !(a && a.ignoreImmune === true) && oppField.includes(x) && fxImmune(opp, x, c)));
  };
  A.cands.immunityWrapped = true;
}
