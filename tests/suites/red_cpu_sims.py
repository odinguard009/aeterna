# v0.25 CPU-vs-CPU sims: the Red prebuilt deck (Crimson / Lava Fish with Ometeotl) against the white Mitra deck or itself.
# Usage: python3 tests/make_fixtures.py && python3 tests/suites/red_cpu_sims.py 10 tagA white   (or: ... 10 tagB mirror)
from playwright.sync_api import sync_playwright
from waits import settle, ready
import sys, time, json
N = int(sys.argv[1]); TAG = sys.argv[2]; MODE = sys.argv[3] if len(sys.argv) > 3 else 'white'
F = "file:///mnt/user-data/outputs/wip.html"
WHITE = {'BS74-CX03':3,'BS74-072':3,'BS74-038':3,'BS74-040':2,'BS74-041':3,'BS74-042':3,'BS74-043':2,'BS74-045':2,'BS74-047':2,'BS74-048':2,'BS74-049':2,'BS74-050':2,'BS75-028':3,'BS75-030':2,'BS75-035':3,'BS75-037':1,'BS75-041':1,'BS75-X08':1}
out = {'games': 0, 'finished': 0, 'inv': [], 'errs': [], 'stuck': [], 'maxturn': 0, 'soulToOm': 0, 'omCounters': 0, 'manifest': 0, 'whenManifests': 0, 'revealDeploy': 0, 'gwVoid': 0, 'banish': 0, 'wins': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    for g in range(N):
        pg = b.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:300])); pg.on("dialog", lambda d: (errs.append('DIALOG'), d.dismiss()))
        pg.on("console", lambda m: errs.append('CONSOLE:' + m.text[:200]) if m.type == 'error' else None)
        pg.goto(F + '?sim=1'); ready(pg)
        pg.evaluate("(()=>{const r=BS.PREBUILT.find(x=>x.id==='red').cards;const D=BS.PRESET_DECK;for(const k of Object.keys(D)) delete D[k];Object.assign(D,r);return 1})()")
        if MODE == 'mirror': pg.evaluate("BS.setSimDeckB(BS.PREBUILT.find(x=>x.id==='red').cards)")
        else: pg.evaluate("(d)=>BS.setSimDeckB(d)", WHITE)
        pg.evaluate("BS.startNewGame()")
        t0 = time.time(); bad = []
        while time.time() - t0 < 50:
            time.sleep(0.25)
            if pg.evaluate("BS.G&&BS.G.over"): break
            r = pg.evaluate("(()=>{try{BS.checkInvariants();return 'ok'}catch(e){return e.message}})()")
            if r != 'ok': bad.append(r)
        fin = pg.evaluate("BS.G&&BS.G.over")
        r = pg.evaluate("(()=>{try{BS.checkInvariants();return 'ok'}catch(e){return e.message}})()")
        if r != 'ok': bad.append('END ' + r)
        h = pg.evaluate("BS.G.history")
        if not fin: out['stuck'].append([pg.evaluate("[BS.G.turnNo,BS.G.active,BS.G.step,!!BS.G.busy,document.getElementById('action-modal').classList.contains('active')]"), h[-8:]])
        out['soulToOm'] += len([x for x in h if 'Soul Core is sent to The Light-DarkContractor Ometeotl' in x])
        out['omCounters'] += len([x for x in h if x.startswith('The Light-DarkContractor Ometeotl: counter +2')])
        out['manifest'] += len([x for x in h if 'for the Manifest' in x]); out['whenManifests'] += len([x for x in h if '[When Manifests]' in x])
        out['revealDeploy'] += len([x for x in h if x.startswith('The LavaAstralFish Magmatodon: ') and 'reveal' in x])
        out['gwVoid'] += len([x for x in h if 'sent to the opposing Void' in x]); out['banish'] += len([x for x in h if 'is banished' in x])
        w = pg.evaluate("BS.G.winner"); out['wins'][str(w)] = out['wins'].get(str(w), 0) + 1
        out['games'] += 1; out['finished'] += 1 if fin else 0; out['inv'] += bad[:2]; out['errs'] += errs[:2]
        out['maxturn'] = max(out['maxturn'], pg.evaluate("BS.G.turnNo"))
        pg.close()
print(TAG, MODE, json.dumps(out))
