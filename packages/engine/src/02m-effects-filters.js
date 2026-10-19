/* v0.76 destroy filters (pack bundle, docs/mechanics/pack76.md), wrapped onto DESTROY like the 02l filters:
   bpLeSelf  "with BP equal or inferior to this Spirit's" (the source's BP when it resolves)
   bpEqSelf  "with the same BP as this Spirit"
   symbolsGe "with two or more symbols" (printed symbols, like symbolsLe)
   costLePer "with a cost equal or less than the number of <X> you control" (perCount shape: {type: 'Spirit'|'Nexus', colors, family, name})
   Exactly one of them stands in for the bound; each needs the opposing Spirit/Ultimate to be a legal effect target (fxImmune). */
(() => {
  const D = FX_ACTIONS.DESTROY, dChk = D.chk, dCands = D.cands, dTxt = D.txt;
  const NEW = ['bpLeSelf', 'bpEqSelf', 'symbolsGe', 'costLePer'];
  const has = a => NEW.some(k => a[k] != null);
  const okNew = a => (a.bpLeSelf == null || a.bpLeSelf === true) && (a.bpEqSelf == null || a.bpEqSelf === true)
    && (a.symbolsGe == null || (Number.isInteger(a.symbolsGe) && a.symbolsGe >= 1 && a.symbolsGe <= 5)) && (a.costLePer == null || perOk(a.costLePer))
    && NEW.filter(k => a[k] != null).length <= 1 && !a.all && !a.nexus;
  const base = a => { const o = Object.assign({}, a); for (const k of NEW) delete o[k]; o.bpLe = 1e9; return o; };      // the old checks see an open bound
  D.chk = a => has(a) ? okNew(a) && dChk(base(a)) : dChk(a);
  D.cands = (c, a) => {
    if (!has(a)) return dCands(c, a);
    const me = ownerOf(c.src) ? bpOf(c.src) : null, lim = a.costLePer ? perCount(c.p, a.costLePer) : null;
    return dCands(c, base(a)).filter(t => !fxImmune(c.opp, t)
      && (!a.bpLeSelf || (me != null && bpOf(t) <= me)) && (!a.bpEqSelf || (me != null && bpOf(t) === me))
      && (a.symbolsGe == null || CARDS[t.id].symbols >= a.symbolsGe) && (lim == null || CARDS[t.id].cost <= lim));
  };
  D.txt = a => {
    if (!has(a)) return dTxt(a);
    const q = a.costLePer;
    const f = a.bpLeSelf ? "BP equal or inferior to this Spirit's" : a.bpEqSelf ? 'the same BP as this Spirit' : a.symbolsGe != null ? a.symbolsGe + ' or more symbols'
      : `a cost equal or less than the number of matching ${q.type === 'Nexus' ? 'Nexuses' : 'Spirits'} you control`;
    return 'destroy 1 opposing Spirit/Ultimate with ' + f + (a.exhaustedOnly ? ' (exhausted only)' : '') + (a.thenDraw ? ', then draw ' + a.thenDraw : '') + (a.noFx ? "; the effects of the destroyed target can't activate" : '');
  };
})();
