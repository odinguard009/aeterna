from waits import settle, ready  # v0.87.0 (F5): state waits instead of fixed times
# Contract Field (Soul State Contract Advent), Advent keeps the battle going, CPU Flash use. Every chk() is one numbered test.
import sys, random
src = open('/tmp/claude-0/t4/mitra_tests.py').read()
exec(src.split("MITRA_FX =")[0])
random.seed(7)
def run(pg, js, ms=700):
    pg.evaluate("(()=>{window.pr=(async()=>{" + js + "})().catch(e=>console.error(e));return 1})()"); settle(pg)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg, errs, r = new_page(b)
    chk('data: Mitra Contract Field has CONTRACT_FIELD_ADVENT', ev(pg, "BS.CARDS['BS74-CX03'].effects.some(e=>e.actions&&e.actions.some(a=>a.do==='CONTRACT_FIELD_ADVENT'))"))
    chk('all 18 white cards still import', r['ok'] == 18 and not r['bad'], r)
    S = "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='player';BS.G.step=4;window.mi=mk('player','BS74-CX03',2);window.pa=mk('player','BS74-043',2);"
    def fresh(extra=''):
        pg, errs, _ = new_page(b); ev(pg, S + extra); return pg, errs
    # Contract Field
    pg, errs = fresh("window.ad=put('player','hand','BS74-038');window.tnS=put('player','soulState','BS74-041');")
    chk('before Contract Field: a Soul State card cannot Contract Advent', ev(pg, "BS.contractAdventTargets(P,tnS,'main').length===0"))
    run(pg, "await BS.activateFx(P,mi,2);")
    chk('Contract Field: the card from the Hand enters Soul State, counter +2', ev(pg, "P.soulState.includes(ad)&&P.count===2&&inv()==='ok'"), ev(pg, "[P.count,inv()]"))
    chk('Contract Field: Soul State Contract Advent is now possible this turn', ev(pg, "BS.contractAdventTargets(P,tnS,'main').length>=1"))
    ev(pg, "window.rs=P.reserve.n")
    run(pg, "await BS.doContractAdvent(P,tnS,pa,'main');")
    chk('Contract Advent from Soul State: Teen stands on Paanch, left Soul State, flag cleared', ev(pg, "P.spirits.includes(tnS)&&tnS.under.includes(pa)&&!P.soulState.includes(tnS)&&!tnS.inSoulState"), ev(pg, "[P.spirits.map(x=>x.id),P.soulState.map(x=>x.id)]"))
    chk('Contract Advent from Soul State: 2 cores from the Reserve were added (+1 more went to Mitra via its ally-summoned effect)', ev(pg, "tnS.cores===4&&P.reserve.n===rs-3&&inv()==='ok'"), ev(pg, "[tnS.cores,P.reserve.n,rs,inv()]"))
    chk('the Soul Core went to the Trash', ev(pg, "P.trashCores.soul===true"))
    chk('Contract Field is Once per Turn: a second use is refused', ev(pg, "BS.activatable(P,mi,'FLASH').every(x=>x.idx!==2)&&BS.activatable(P,mi,'MAIN').every(x=>x.idx!==2)"))
    chk('CF1: no page errors', not errs, errs)
    pg, errs = fresh("window.tnS=put('player','soulState','BS74-041');P.csAdventTurn=BS.G.turnNo-1;")
    chk('Contract Field from a previous turn does not count', ev(pg, "BS.contractAdventTargets(P,tnS,'main').length===0"))
    pg, errs = fresh("window.tnS=put('player','soulState','BS74-041');P.csAdventTurn=BS.G.turnNo;")
    chk('with the flag set, a Soul State Awakened Dragon card can advent', ev(pg, "BS.contractAdventTargets(P,tnS,'main').length>=1"))
    ev(pg, "P.count=0")
    pg, errs = fresh("window.fl=put('player','soulState','TRAIN-01');P.csAdventTurn=BS.G.turnNo;")
    chk('a non-Contract-Advent card in Soul State is not a source', ev(pg, "BS.contractAdventTargets(P,fl,'main').length===0"))
    pg, errs = fresh("window.tnS=put('player','soulState','BS74-041');P.csAdventTurn=BS.G.turnNo;P.reserve.soul=false;mi.soul=false;pa.soul=false;")
    chk('no Soul Core available -> no Contract Advent from Soul State', ev(pg, "BS.contractAdventTargets(P,tnS,'main').length===0"))
    # human UI
    pg, errs = fresh("window.tnS=put('player','soulState','BS74-041');P.csAdventTurn=BS.G.turnNo;P.cpu=false;BS.G.busy=false;BS.render();")
    run(pg, "openZoneModal('player','soulstate');", 300)
    chk('UI: Soul State modal offers Contract Advent', modal_open(pg) and pg.locator("#modal-actions .modal-btn", has_text='Contract Advent').count() == 1, modal_title(pg))
    press(pg, 'Contract Advent'); settle(pg)
    chk('UI: target picker opens', modal_open(pg))
    press(pg, 'Paanch'); settle(pg)
    chk('UI: Reserve cores question appears', modal_open(pg) and 'Reserve' in pg.inner_text('#modal-card-desc'), pg.inner_text('#modal-card-desc') if modal_open(pg) else '')
    press(pg, '3'); settle(pg)
    for _ in range(3):
        if modal_open(pg):
            tx = pg.locator("#modal-actions .modal-btn").all_inner_texts(); press(pg, ([x for x in tx if 'Use' in x] or [x for x in tx if 'Skip' in x] or tx)[0]); settle(pg)
    chk('UI: the card advented with 3 Reserve cores (2 stack + 3)', ev(pg, "P.spirits.includes(tnS)&&tnS.cores===5&&inv()==='ok'"), ev(pg, "[tnS.cores,inv()]"))
    chk('CF2: no page errors', not errs, errs)
    # loop: Contract Field with random Reserve sizes
    for i in range(10):
        rs = random.randint(0, 6)
        pg, errs = fresh("window.tnS=put('player','soulState','BS74-041');P.csAdventTurn=BS.G.turnNo;P.void+=P.reserve.n-%d;P.reserve.n=%d;" % (rs, rs))
        run(pg, "await BS.doContractAdvent(P,tnS,pa,'main');")
        exp = 2 + min(rs, 2)
        chk(f'Contract Field loop #{i+1}: Reserve {rs} -> advent card has {exp} cores', ev(pg, "tnS.cores") == exp and ev(pg, "inv()") == 'ok' and not errs, [ev(pg, "tnS.cores"), ev(pg, "inv()"), errs])
    # Advent in battle keeps the battle going; CPU Flash
    B = "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='player';BS.G.step=5;window.ek=mk('player','BS74-038',%d);window.tn=put('player','hand','BS74-041');window.bl=mk('opponent','BS74-043',%d);"
    for i in range(20):
        ac = random.choice([1, 2]); bc = random.choice([1, 3])
        pg, errs, _ = new_page(b); ev(pg, B % (ac, bc))
        run(pg, "await BS.doBattle('player',ek);", 1800)
        teenBp = 3000; blBp = 2000 if bc == 1 else 6000; attBp = 1000 if ac == 1 else 1000
        adv = teenBp > blBp
        got_adv = ev(pg, "BS.G.p.player.spirits.includes(tn)&&tn.under.includes(ek)")
        won = ev(pg, "!BS.G.p.opponent.spirits.includes(bl)")
        chk(f'CPU Flash battle #{i+1}: attacker cores={ac}, blocker {blBp} BP -> {"Contract Advent and win" if adv else "no Advent (would still lose)"}',
            got_adv == adv and won == adv and ev(pg, "inv()") == 'ok' and not errs, [got_adv, won, ev(pg, "inv()"), errs])
    # successor logic with a human-free Flash: defender advent
    pg, errs, _ = new_page(b)
    ev(pg, "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='player';BS.G.step=5;window.ek=mk('player','BS74-038',3);window.bl2=mk('opponent','BS74-043',1);")
    run(pg, "await BS.doBattle('player',ek);", 1500)
    chk('plain battle without Advent still resolves (blocker destroyed or Life lost)', ev(pg, "(!BS.G.p.opponent.spirits.includes(bl2)||BS.G.p.opponent.life===4)&&inv()==='ok'") and not errs, errs)
    # CPU Flash activation of the Contract Skill / Contract Field
    pg, errs, _ = new_page(b)
    ev(pg, "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='opponent';BS.G.step=5;window.mi=mk('player','BS74-CX03',5);P.count=5;put('player','soulState','BS74-043');window.ak=mk('opponent','BS74-043',1);")
    r1 = ev(pg, "(()=>{const c=BS.cpuFlashChoice(P,'opponent',ak,null);return c&&c.act?BS.CARDS[c.act.f.id].name+'#'+c.act.idx:String(c)})()")
    chk('CPU Flash: with a Spirit in Soul State and 5 cores on Mitra it picks a Flash effect', 'Mitra' in str(r1), r1)
    chk('CF3: no page errors', not errs, errs)
    b.close()
print('TOTAL %d/%d' % (sum(res), len(res)))
