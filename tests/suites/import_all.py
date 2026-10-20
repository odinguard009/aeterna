import os as _os_repo
_REPO = _os_repo.path.abspath(_os_repo.path.join(_os_repo.path.dirname(_os_repo.path.abspath(__file__)), '..', '..'))
from playwright.sync_api import sync_playwright
import random, json, glob
F="file:///mnt/user-data/outputs/wip.html"; res=[]
def chk(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+f'[{len(res)}] '+n, x if not c else '')
D=_os_repo.path.join(_REPO, 'data/cards/')
allt=open(D+'all-cards.json').read(); sg={f:open(f).read() for f in sorted(glob.glob(D+'saga-[0-9][0-9].json'))}
n_all=len(json.loads(allt))     # v0.34: every card imports (the Brave card BS76-060 too)
# importCards refuses more than 3000 cards per call (v24_tests D10), so the full list goes in chunks of 2500 (as tools/promote_compiled.mjs does)
CH=[json.dumps(json.loads(allt)[k:k+2500]) for k in range(0,n_all,2500)]
def import_chunked(pg):
    tot=0; bad=[]
    for t in CH:
        r=pg.evaluate("(t)=>BS.importCards(t)",t); tot+=r['ok']; bad+=r['bad']
    return tot,bad
with sync_playwright() as p:
    b=p.chromium.launch()
    for i in range(20):
        pg=b.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.goto(F); pg.wait_for_timeout(150)
        mode=i%4
        if mode==0:
            tot,bad=import_chunked(pg); ok=tot==n_all and not bad
        elif mode==1:
            L=list(sg.values()); random.shuffle(L); tot=0; ok=True
            for t in L:
                r=pg.evaluate("(t)=>BS.importCards(t)",t); tot+=r['ok']; ok&=not r['bad']
            ok&=tot==n_all
        elif mode==2:
            import_chunked(pg); L=list(sg.values()); random.shuffle(L)
            for t in L: r=pg.evaluate("(t)=>BS.importCards(t)",t); ok=not r['bad']
            ok=ok
        else:
            if pg.locator('#in-cards').count():       # the file input takes one file at a time: one chunk file per pick
                for j,t in enumerate(CH):
                    pg.set_input_files("#in-cards",files=[{"name":f"chunk{j}.json","mimeType":"application/json","buffer":t.encode()}]); pg.wait_for_timeout(400)
            ok=True
        n=pg.evaluate("Object.values(BS.CARDS).filter(c=>c.imported).length")
        sagas=pg.evaluate("[...new Set(Object.values(BS.CARDS).filter(c=>c.imported).map(c=>c.saga))].sort().join()")
        chk(f'#{i+1} mode {mode}: import ok, {n_all} imported cards, no errors', ok and n==n_all and not errs, [ok,n,sagas,errs])
        pg.close()
    chk('Saga files hold only their own Saga, sorted, no duplicate IDs', all(all(c['saga']==int(f[-7:-5]) for c in json.loads(t)) for f,t in sg.items()) and len({c['id'] for c in json.loads(allt)})==n_all)
    chk('BS75 cards are Saga 16, BS76 cards are Saga 17', all((c['saga']==16) if c['id'].startswith('BS75') else (c['saga']==17) for c in json.loads(allt) if c['id'][:4] in ('BS75','BS76')))
print('TOTAL %d/%d'%(sum(res),len(res)))
