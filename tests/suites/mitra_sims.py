from playwright.sync_api import sync_playwright
from waits import settle, ready
import sys, time, json
N = int(sys.argv[1]); TAG = sys.argv[2]; MODE = sys.argv[3] if len(sys.argv) > 3 else 'mirror'
F = "file:///mnt/user-data/outputs/wip.html"
WH = open('/tmp/claude-0/fixtures/white_mitra_awakened_dragon.json', encoding='utf-8').read()
RED = open('/tmp/claude-0/fixtures/red_cards_BS75_BS76.json', encoding='utf-8').read()
DECK = {'BS74-CX03':3,'BS74-072':3,'BS74-038':3,'BS74-040':2,'BS74-041':3,'BS74-042':3,'BS74-043':2,'BS74-045':2,'BS74-047':2,'BS74-048':2,'BS74-049':2,'BS74-050':2,'BS75-028':3,'BS75-030':2,'BS75-035':3,'BS75-037':1,'BS75-041':1,'BS75-X08':1}
out = {'games': 0, 'finished': 0, 'inv': [], 'errs': [], 'maxturn': 0, 'soul': 0, 'activate': 0, 'void': 0, 'bounce': 0, 'neo': 0, 'wins': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    for g in range(N):
        pg = b.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:300])); pg.on("dialog", lambda d: (errs.append('DIALOG'), d.dismiss()))
        pg.goto(F + '?sim=1'); ready(pg)
        r = pg.evaluate("(t)=>BS.importCards(t)", WH); assert r['ok'] == 18 and not r['bad'], r
        pg.evaluate("(t)=>BS.importCards(t)", RED)
        pg.evaluate("(d)=>{const D=BS.PRESET_DECK; for(const k of Object.keys(D)) delete D[k]; for(const [id,c] of Object.entries(d)) D[id]=c;}", DECK)
        if MODE == 'preset':
            pg.evaluate("BS.setSimDeckB(BS.PRESET_DECK)")
        elif MODE == 'red':
            pg.evaluate("BS.setSimDeckB({'BS75-011':3,'BS75-073':3,'BS75-076':3,'BS76-007':3,'BS75-002':3,'BS75-003':3,'BS75-007':3,'BS75-008':3,'BS75-010':3,'BS75-012':3,'BS75-013':3,'BS76-002':3,'BS76-003':1})")
        else:
            pg.evaluate("(d)=>BS.setSimDeckB(d)", DECK)
        pg.evaluate("BS.startNewGame()")
        t0 = time.time(); bad = []
        while time.time() - t0 < 45:
            time.sleep(0.25)
            if pg.evaluate("BS.G&&BS.G.over"): break
            r = pg.evaluate("(()=>{try{BS.checkInvariants();return 'ok'}catch(e){return e.message}})()")
            if r != 'ok': bad.append(r)
        fin = pg.evaluate("BS.G&&BS.G.over")
        r = pg.evaluate("(()=>{try{BS.checkInvariants();return 'ok'}catch(e){return e.message}})()")
        if r != 'ok': bad.append('END ' + r)
        h = pg.evaluate("BS.G.history")
        if not fin: out.setdefault('stuck', []).append([pg.evaluate("[BS.G.turnNo,BS.G.active,BS.G.step,!!BS.G.busy,document.getElementById('action-modal').classList.contains('active')]"), h[-10:]])
        out['soul'] += len([x for x in h if 'enters Soul State' in x]); out['activate'] += len([x for x in h if '[Activate]' in x])
        out['void'] += len([x for x in h if 'Void' in x]); out['bounce'] += len([x for x in h if 'returns to the' in x]); out['cadv'] = out.get('cadv',0) + len([x for x in h if 'Contract Advent' in x or 'for the Manifest' in x]); out['neo'] += len([x for x in h if 'from the Deck go to the Trash' in x])
        w = pg.evaluate("BS.G.winner"); out['wins'][str(w)] = out['wins'].get(str(w), 0) + 1
        out['games'] += 1; out['finished'] += 1 if fin else 0; out['inv'] += bad[:2]; out['errs'] += errs[:2]
        out['maxturn'] = max(out['maxturn'], pg.evaluate("BS.G.turnNo"))
        pg.close()
print(TAG, MODE, json.dumps(out))
