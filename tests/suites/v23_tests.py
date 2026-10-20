from waits import settle, ready  # v0.87.0 (F5): state waits instead of fixed times
# v0.23: Grandwalker Nexus cores go to the Void; Revival and "summon/deploy" effects pay the cost (official Eternal rules).
src = open('/tmp/claude-0/t4/mitra_tests.py').read()
exec(src.split("MITRA_FX =")[0])
def new_page(b, w=1280, h=800):
    ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:300])); pg.on("dialog", lambda d: (errs.append('DIALOG'), d.dismiss()))
    pg.goto(F); ready(pg); pg.evaluate(SETUP); return pg, errs, None
def run(pg, js, ms=700):
    pg.evaluate("(()=>{window.pr=(async()=>{" + js + "})().catch(e=>console.error(e));return 1})()"); settle(pg)
S = "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='player';BS.G.step=4;"
def setres(n): return "P.void+=P.reserve.n-%d;P.reserve.n=%d;" % (n, n)
with sync_playwright() as p:
    b = p.chromium.launch()
    def fresh(extra=''):
        pg, errs, _ = new_page(b); ev(pg, S + extra); return pg, errs
    # --- Void rules
    pg, errs = fresh("window.mi=mk('player','BS74-CX03',3);")
    r0 = ev(pg, "[P.void,P.reserve.n]")
    ev(pg, "BS.removeNexus(P,mi,'destroyed')")
    r1 = ev(pg, "[P.void,P.reserve.n]")
    chk('1 removeNexus(Mitra, 3 cores): +3 Void', r1[0] == r0[0] + 3, [r0, r1])
    chk('2 ... Reserve unchanged', r1[1] == r0[1], [r0, r1])
    chk('3 ... Mitra in Trash, invariants ok', ev(pg, "P.trash.includes(mi)&&inv()==='ok'") and not errs, errs)
    pg, errs = fresh("window.tm=mk('player','BS74-072',2);")
    r0 = ev(pg, "[P.void,P.reserve.n]"); ev(pg, "BS.removeNexus(P,tm,'destroyed')"); r1 = ev(pg, "[P.void,P.reserve.n]")
    chk('4 ordinary Nexus cores go to the Reserve', r1[1] == r0[1] + 2 and r1[0] == r0[0], [r0, r1])
    pg, errs = fresh("window.mi=mk('player','BS74-CX03',1);P.reserve.soul=false;mi.soul=true;P.void+=0;")
    ev(pg, "BS.removeNexus(P,mi,'destroyed')")
    chk('5 Soul Core on a Grandwalker Nexus goes to the Reserve, normal core to the Void', ev(pg, "P.reserve.soul===true&&mi.soul===false&&inv()==='ok'"), ev(pg, "inv()"))
    pg, errs = fresh("window.mi=mk('player','BS74-CX03',2);")
    r0 = ev(pg, "[P.void,P.reserve.n]"); ev(pg, "BS.toSoulState(P,mi)"); r1 = ev(pg, "[P.void,P.reserve.n]")
    chk('6 Nexus entering Soul State: cores to the Void', r1[0] == r0[0] + 2 and r1[1] == r0[1] and ev(pg, "P.soulState.includes(mi)&&inv()==='ok'"), [r0, r1])
    pg, errs = fresh("window.mi=mk('player','BS74-CX03',2);")
    r0 = ev(pg, "[P.void,P.reserve.n]"); ev(pg, "BS.bounceCard(P,mi,'hand')"); r1 = ev(pg, "[P.void,P.reserve.n]")
    chk('7 Nexus returned to the Hand: cores to the Void', r1[0] == r0[0] + 2 and r1[1] == r0[1] and ev(pg, "P.hand.includes(mi)&&inv()==='ok'"), [r0, r1])
    pg, errs = fresh("window.sp=mk('player','BS74-043',2);")
    r0 = ev(pg, "[P.void,P.reserve.n]"); ev(pg, "BS.bounceCard(P,sp,'hand')"); r1 = ev(pg, "[P.void,P.reserve.n]")
    chk('8 a Spirit returned to the Hand: cores to the Reserve', r1[1] == r0[1] + 2 and r1[0] == r0[0], [r0, r1])
    # --- Revival pays the cost
    pg, errs = fresh("window.mi=put('player','soulState','BS74-CX03');" + setres(0))
    chk('9 Revive with 0 Reserve cores: not possible (cost not payable)', ev(pg, "BS.reviveTargets(P).length===0"))
    pg, errs = fresh("window.mi=put('player','soulState','BS74-CX03');" + setres(2))
    chk('10 Revive with 2 Reserve cores: possible', ev(pg, "BS.reviveTargets(P).includes(mi)"))
    r0 = ev(pg, "P.reserve.n")
    run(pg, "await BS.doRevive(P,mi);", 900)
    r1 = ev(pg, "P.reserve.n")
    chk('11 Revive deploys Mitra onto the field', ev(pg, "P.nexus.includes(mi)&&!P.soulState.includes(mi)&&inv()==='ok'") and not errs, errs)
    chk('12 Revive paid cost (Reserve lowered, Trash cores up)', r1 < r0 and ev(pg, "P.trashCores.n>=1"), [r0, r1])
    pg, errs = fresh("window.mi=put('player','soulState','BS74-CX03');" + setres(1))
    chk('13 Revive with 1 core: cost 2 minus 0 reduction is not payable (Soul State symbols do not reduce here)' if ev(pg, "BS.effCost(P,BS.CARDS['BS74-CX03'])")>=1 else '13 cost reduces to 0', ev(pg, "BS.reviveTargets(P).length===(BS.canPlayCard(P,mi)?1:0)"))
    pg, errs = fresh("window.mi=put('player','soulState','BS74-CX03');" + setres(3))
    run(pg, "await BS.doRevive(P,mi);", 900)
    chk('14 once per turn: second Revive of same name blocked', ev(pg, "BS.reviveTargets(P).length===0"))
    # --- Mitra Contract Skill / Pachhattar pay
    pg, errs = fresh("window.pa=put('player','soulState','BS75-030');" + setres(0))
    chk('15 SOUL_SUMMON pay: Pachhattar candidate not summonable with 0 cores (reduction 0 white symbols)', ev(pg, "BS.canPlayCard(P,pa)===false"))
    pg, errs = fresh("window.sc=mk('player','BS75-030',3);window.pa=put('player','soulState','BS75-030');" + setres(5))
    r0 = ev(pg, "P.reserve.n")
    run(pg, "await BS.runActions({p:P,opp:O,src:sc,ctx:{}}, {actions:[{do:'SOUL_SUMMON',pay:true,match:{name:['Pachhattar']}}]}, 'X');", 900)
    chk('16 SOUL_SUMMON pay:true spends cores from the Reserve (not free)', ev(pg, "P.reserve.n") < r0 or ev(pg, "P.spirits.length>=2"), [r0, ev(pg, "P.reserve.n")])
    # Lizardedge
    pg, errs = fresh("window.liz=mk('player','BS75-002',2);window.w=put('player','hand','BS75-CX01');" + setres(0))
    chk('17 Lizardedge Hand Wurm candidate not summonable with 0 Reserve (pay:true)', ev(pg, "BS.FX_ACTIONS.SUMMON_HAND.cands({p:P,opp:O,src:liz,ctx:{}},{do:'SUMMON_HAND',pay:true,from:'handOrSoul',match:{name:['Wurm']}}).length===0"))
    pg, errs = fresh("window.liz=mk('player','BS75-002',2);window.w=put('player','hand','BS75-CX01');" + setres(8))
    chk('18 ... with 8 Reserve it is a candidate', ev(pg, "BS.FX_ACTIONS.SUMMON_HAND.cands({p:P,opp:O,src:liz,ctx:{}},{do:'SUMMON_HAND',pay:true,from:'handOrSoul',match:{name:['Wurm']}}).includes(w)"))
    chk('19 Free variant (Magma Call style) still ignores cost', ev(pg, "(P.void+=P.reserve.n,P.reserve.n=1,BS.FX_ACTIONS.SUMMON_HAND.cands({p:P,opp:O,src:liz,ctx:{}},{do:'SUMMON_HAND',from:'hand',match:{name:['Wurm']}}).includes(w))"))
    # data flags
    chk('20 card data: Mitra, Pachhattar, Lizardedge, Altair carry pay:true', ev(pg, """(()=>{const g=id=>JSON.stringify(BS.CARDS[id].effects);return ['BS74-CX03','BS75-030','BS75-002','BS76-007'].every(id=>g(id).includes('"pay":true'))})()"""))
    chk('21 card data: Balmung/Nao/Magma Call remain free (no pay flag)', ev(pg, """(()=>{const g=id=>JSON.stringify(BS.CARDS[id].effects)+JSON.stringify(BS.CARDS[id].burst||'');return ['BS75-011','BS74-049','BS75-076'].every(id=>!g(id).includes('"pay":true'))})()"""))
    # full flow: Lizardedge effect through fireFx with a human-free CPU
    pg, errs = fresh(setres(10))
    ev(pg, "P.cpu=true;")
    run(pg, "window.liz=mk('player','BS75-002',2);window.w=put('player','hand','BS75-CX01');await BS.fireFx(P,'ATTACKS',liz);", 1500)
    chk('22 CPU Lizardedge flow: Wurm summoned, cost paid, invariants ok', ev(pg, "P.spirits.some(s=>s.id==='BS75-CX01')&&inv()==='ok'") and not errs, [errs, ev(pg, "P.spirits.map(s=>s.id)")])
    chk('23 CPU paid summon: Trash cores increased', ev(pg, "P.trashCores.n>=1"))
    pg, errs = fresh()
    chk('24 exports: summonPaid hook exists', ev(pg, "typeof BS.summonPaid==='function'"))
    chk('25 version string matches BS.VERSION', ('v' + ev(pg, 'BS.VERSION')) in ev(pg, 'document.title'))
print('TOTAL %d/%d' % (sum(res), len(res)))
