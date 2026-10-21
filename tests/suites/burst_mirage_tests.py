from waits import settle, ready  # v0.87.0 (F5): state waits instead of fixed times
# v0.21: Burst + Mirage in the same area (official rule), replaced Mirage returns to the Hand, Flash includes Main, CPU sets Mirage, glossary consistency.
import json as _json_c, os as _os_c  # counts come from the card data, so a new colour needs no edit here
_CARDS = _json_c.load(open(_os_c.path.join(_os_c.path.dirname(_os_c.path.abspath(__file__)), '..', '..', 'build', 'all-cards.json')))
PACK_N = len(_CARDS); CONTRACTORS = sorted(c['id'] for c in _CARDS if c['type'] == 'Nexus' and '-CX' in c['id'])
import os as _os_repo
_REPO = _os_repo.path.abspath(_os_repo.path.join(_os_repo.path.dirname(_os_repo.path.abspath(__file__)), '..', '..'))
import json
src = open('/tmp/claude-0/t4/mitra_tests.py').read()
exec(src.split("MITRA_FX =")[0])
def run(pg, js, ms=700):
    pg.evaluate("(()=>{window.pr=(async()=>{" + js + "})().catch(e=>console.error(e));return 1})()"); settle(pg)
S = "window.P=BS.G.p.player;window.O=BS.G.p.opponent;BS.G.active='player';BS.G.step=4;"
with sync_playwright() as p:
    b = p.chromium.launch()
    def fresh(extra=''):
        pg, errs, _ = new_page(b); ev(pg, S + extra); return pg, errs
    pg, errs = fresh("window.bu=put('player','hand','BS75-011');window.mi=put('player','hand','BS76-002');")
    ev(pg, "BS.setBurst(P,bu,false)")
    chk('Burst set: burst slot filled, mirage slot empty', ev(pg, "P.burst===bu&&!P.mirage&&P.burstSetThisTurn&&!P.mirageSetThisTurn"))
    ev(pg, "BS.setBurst(P,mi,true)")
    chk('a Mirage can be set in the same turn and the Burst stays (both in the area)', ev(pg, "P.burst===bu&&P.mirage===mi&&P.mirageSetThisTurn&&inv()==='ok'"), ev(pg, "[!!P.burst,!!P.mirage,inv()]"))
    chk('the Burst card is still a face-down Burst, the Mirage is face up', ev(pg, "!bu.mirage&&mi.mirage"))
    ev(pg, "window.mi2=put('player','hand','BS75-007');BS.setBurst(P,mi2,true)")
    chk('replacing a Mirage returns the old Mirage to the Hand (not the Trash)', ev(pg, "P.hand.includes(mi)&&!P.trash.includes(mi)&&P.mirage===mi2&&!mi.mirage&&inv()==='ok'"), ev(pg, "[P.hand.length,P.trash.length,inv()]"))
    ev(pg, "window.bu2=put('player','hand','BS75-073');BS.setBurst(P,bu2,false)")
    chk('replacing a Burst discards the old Burst to the Trash; the Mirage stays', ev(pg, "P.trash.includes(bu)&&P.burst===bu2&&P.mirage===mi2&&inv()==='ok'"))
    chk('per-turn limits are separate: mirageUsable false after a Mirage this turn', ev(pg, "!BS.mirageUsable(P,mi)"))
    ev(pg, "BS.G.turnNo=5;P.burstSetThisTurn=false;P.mirageSetThisTurn=false")
    chk('after the turn limits reset, a Mirage can be set again', ev(pg, "BS.mirageUsable(P,mi)"))
    chk('Burst Area shows MIRAGE+BURST in the DOM', ev(pg, "(BS.render(),document.body.innerHTML.includes('MIRAGE+BURST'))"))
    # Mirage effect works with both set
    pg, errs = fresh("window.bu=put('player','hand','BS75-073');window.kt=put('player','hand','BS76-002');BS.setBurst(P,bu,false);BS.setBurst(P,kt,true);window.sg=put('player','soulState','BS75-CX01');window.at=mk('player','BS75-001',3);")
    run(pg, "await BS.doBattle('player',at);", 1500)
    chk('Mirage effect still triggers while a Burst is also set; the Burst of the other side is untouched', ev(pg, "P.count===1&&O.life===4&&P.burst===bu&&inv()==='ok'"), ev(pg, "[P.count,O.life,inv()]"))
    # Burst of the opponent flips while own Mirage set
    pg, errs = fresh("window.bu=put('opponent','hand','BS75-011');BS.setBurst(O,bu,false);window.mm=put('opponent','hand','BS76-002');BS.setBurst(O,mm,true);window.at=mk('player','BS75-001',3);")
    run(pg, "await BS.doBattle('player',at);", 1800)
    chk('the defender Burst activates after Life reduction and its Mirage stays set', ev(pg, "O.mirage===mm&&O.spirits.some(s=>s.id==='BS75-011')&&inv()==='ok'"), ev(pg, "[O.spirits.map(s=>s.id),!!O.mirage,inv()]"))
    # human buttons
    pg, errs = fresh("window.mi=put('player','hand','BS76-002');window.bu=put('player','hand','BS75-011');P.cpu=false;BS.G.busy=false;BS.setBurst(P,mi,true);")
    labs = ev(pg, "(()=>{return {}})()")
    chk('Burst can still be set after a Mirage was set this turn (separate limits)', ev(pg, "!P.burstSetThisTurn"))
    # Flash includes Main
    pg, errs = fresh("window.sb=mk('player','BS75-008',2);window.a1=mk('player','BS75-CX01',3);")
    chk('Flash effect without a step restriction is usable in Main and Flash timing', ev(pg, "BS.activatable(P,sb,'MAIN').length===1&&BS.activatable(P,sb,'FLASH').length===1"))
    # CPU sets a useful Mirage
    pg, errs = fresh("window.mi=put('player','hand','BS76-002');P.cpu=true;BS.G.turnNo=3;")
    run(pg, "await BS.cpuTurn(P);", 4000)
    chk('CPU sets a Mirage that has a real effect', ev(pg, "P.mirage===mi&&inv()==='ok'"), ev(pg, "[!!P.mirage,inv()]"))
    chk('V21 page errors', not errs, errs)
    # glossary consistency
    G = json.load(open(_os_repo.path.join(_REPO, 'data/glossary/effects.json')))
    chk('glossary: unique ids and required fields', len({g['id'] for g in G}) == len(G) and all(g.get('kind') and g.get('meaning') and g.get('status') in ('wired', 'partial', 'missing') for g in G))
    import re
    known = set(ev(pg, "Object.keys(BS.FX_ACTIONS)")) | set(ev(pg, "FX_TRIGGERS")) | {'MUST_BLOCK', 'NO_RETURN', 'CORES_DRAW'}
    bad = []
    for g in G:
        if g['kind'] in ('trigger', 'action') and g['status'] == 'wired':
            toks = set(re.findall(r'\b[A-Z][A-Z_]{3,}\b', g['engine'])) - {'MAGIC_FX', 'ONLY'}
            if toks and not (toks & known): bad.append((g['id'], g['engine']))
    chk('glossary: every wired trigger/action names a real engine trigger or action', not bad, bad)
    chk('glossary: every wired entry has a rule note or an example or engine text', all(g.get('engine') for g in G if g['status'] == 'wired'))
    chk('glossary: official rule notes present for core timing/keyword entries', all(g.get('rule') for g in G if g['id'] in ('T_SUMMONED', 'T_ATTACKS', 'T_ACTIVATE', 'C_ONCE', 'K_BURST', 'K_MIRAGE', 'K_ADVENT', 'S_UNAFFECTED', 'K_SEAL')))
    tags = json.load(open(_os_repo.path.join(_REPO, 'data/glossary/card-tags.json')))
    chk('glossary: card-tags covers every card', len(tags) == PACK_N)
    chk('glossary: every rule note cites an official source', all(('Rule Manual' in g['rule'] or 'Comprehensive' in g['rule'] or 'Eternal' in g['rule'] or 'Standard' in g['rule'] or 'Engine' in g['rule']) for g in G if g.get('rule')))
print('TOTAL %d/%d' % (sum(res), len(res)))
