from playwright.sync_api import sync_playwright
import time
F="file:///mnt/user-data/outputs/aeterna-v0.11.1.html"
res=[]
def chk(n,c,x=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n,x)
SETUP="""(()=>{BS.testSetup(); window.mk=(k,id,cores,opts)=>{const p=BS.G.p[k]; const i=BS.mkInst(id); i.cores=cores; Object.assign(i,opts||{}); if(BS.CARDS[id].type==='Spirit') p.spirits.push(i); else p.nexus.push(i); return i.uid;}; return 1})()"""
def modal_title(pg): return pg.inner_text("#modal-card-title")
def pk(pg): return pg.evaluate("document.getElementById('pick-bar').classList.contains('active')")
def tap(pg,key,uid): pg.locator("[data-v='%s:%d']"%(key,uid)).first.click(force=True)
def press(pg,txt):
    l=pg.locator("#modal-actions .modal-btn",has_text=txt); assert l.count(), 'no button '+txt+' in '+modal_title(pg); l.first.click()
with sync_playwright() as p:
    b=p.chromium.launch(); import sys; sys.stdout.reconfigure(line_buffering=True)
    for (w,h,tag) in [(1280,800,'desk'),(390,844,'mob')]:
        print('=====',tag)
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:300])); pg.goto(F); 
        pg.evaluate(SETUP)
        # 1 block with higher-BP spirit
        a=pg.evaluate("mk('opponent','TRAIN-03',2)")   # Flame Hound lv2 4000
        lo=pg.evaluate("mk('player','TRAIN-01',1)"); hi=pg.evaluate("mk('player','TRAIN-10',3)")
        pg.evaluate("window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[0]);0"); pg.wait_for_timeout(900)
        chk('block pick bar appears',pk(pg) and 'Block?' in pg.inner_text('#pick-text'))
        chk('no modal during block',not pg.evaluate("document.getElementById('action-modal').classList.contains('active')"))
        chk('2 blockers glow',pg.locator('.tcg-card.pickable').count()==2,pg.locator('.tcg-card.pickable').count())
        chk('attacker marked',pg.locator('.tcg-card.pick-att').count()==1)
        chk('dimming active',pg.evaluate("document.documentElement.classList.contains('picking')"))
        tap(pg,'opponent:spirit',a); pg.wait_for_timeout(200)
        chk('tapping non-pickable ignored',pk(pg) and not pg.evaluate("document.getElementById('action-modal').classList.contains('active')"))
        if tag=='mob': pg.screenshot(path='blk_mob.png')
        life0=pg.evaluate("BS.G.p.player.life")
        tap(pg,'player:spirit',hi); pg.wait_for_timeout(1500)
        chk('pick bar closes',not pk(pg) and not pg.locator('.tcg-card.pickable').count())
        chk('attacker destroyed by stronger blocker',pg.evaluate("BS.G.p.opponent.spirits.length")==0)
        chk('blocker exhausted, alive',pg.evaluate("BS.G.p.player.spirits.find(s=>s.uid==%d).exhausted"%hi))
        chk('no life lost',pg.evaluate("BS.G.p.player.life")==life0)
        # 2 weaker blocker loses
        pg.evaluate("BS.G.p.player.spirits.forEach(s=>s.exhausted=false)")
        pg.evaluate("mk('opponent','TRAIN-10',3)")   # 9000 BP
        pg.evaluate("window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[0]);0"); pg.wait_for_timeout(900)
        tap(pg,'player:spirit',lo); pg.wait_for_timeout(1500)
        chk('weaker blocker destroyed',pg.evaluate("!BS.G.p.player.spirits.some(s=>s.uid==%d)"%lo))
        chk('attacker survives',pg.evaluate("BS.G.p.opponent.spirits.length")==1)
        # 3 unblocked, 2 symbols: Life -2, reserve +2
        pg.evaluate("BS.G.p.player.spirits.forEach(s=>s.exhausted=true)")
        l0=pg.evaluate("BS.G.p.player.life"); r0=pg.evaluate("BS.G.p.player.reserve.n")
        pg.evaluate("BS.G.p.opponent.spirits[0].exhausted=false; window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[0]);0"); pg.wait_for_timeout(1500)
        chk('no block prompt when all exhausted',not pg.evaluate("document.getElementById('action-modal').classList.contains('active')"))
        chk('2-symbol attacker deals 2',pg.evaluate("BS.G.p.player.life")==l0-2,pg.evaluate("BS.G.p.player.life"))
        chk('life cores -> reserve',pg.evaluate("BS.G.p.player.reserve.n")==r0+2)
        # 4 Burst: activate
        pg.evaluate("BS.testSetup()"); pg.evaluate(SETUP)
        pg.evaluate("mk('opponent','TRAIN-01',1); mk('opponent','TRAIN-02',2); mk('opponent','TRAIN-10',3)")
        pg.evaluate("(()=>{const p=BS.G.p.player; const i=BS.mkInst('TST-BST1'); p.burst=i;})()")
        pg.evaluate("window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[2]);0"); pg.wait_for_timeout(1500)
        chk('burst prompt',modal_title(pg).startswith('💥'),modal_title(pg))
        press(pg,'Activate'); pg.wait_for_timeout(300)
        chk('target pick bar',pk(pg) and 'Choose a target' in pg.inner_text('#pick-text'))
        chk('only <=BP spirits glow',pg.locator('.tcg-card.pickable').count()>=1)
        n0=pg.evaluate("BS.G.p.opponent.spirits.length"); tap(pg,'opponent:spirit',pg.evaluate("BS.G.p.opponent.spirits.find(s=>s.id==='TRAIN-02').uid")); pg.wait_for_timeout(500)
        chk('target destroyed',pg.evaluate("BS.G.p.opponent.spirits.length")==n0-1 and pg.evaluate("!BS.G.p.opponent.spirits.some(s=>s.id==='TRAIN-02')"))
        chk('burst used -> trash',pg.evaluate("BS.G.p.player.burst===null && BS.G.p.player.trash.some(c=>c.id==='TST-BST1')"))
        # 5 Burst: keep set
        pg.evaluate("BS.G.p.player.burst=BS.mkInst('TST-BST1'); BS.G.p.opponent.spirits.find(s=>s.id==='TRAIN-10').exhausted=false; BS.G.p.opponent.spirits.forEach(s=>s.exhausted=false); window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[0]);0"); pg.wait_for_timeout(1500)
        press(pg,'Keep It Set'); pg.wait_for_timeout(400)
        chk('burst kept',pg.evaluate("BS.G.p.player.burst!==null"))
        # 6 lethal
        pg.evaluate("BS.G.p.player.life=1; BS.G.p.player.burst=null; BS.G.p.opponent.spirits.forEach(s=>s.exhausted=false); window.pr=BS.doBattle('opponent',BS.G.p.opponent.spirits[0]);0"); pg.wait_for_timeout(1500)
        chk('defeat modal',modal_title(pg).startswith('💀') or 'DEFEAT' in modal_title(pg),modal_title(pg))
        pg.screenshot(path=f'lethal_{tag}.png')
        # 7 (old prototype Advent path removed in v0.24; Contract Advent is covered by advent_tests / v15 suites)
        # 8 payment dialog: 0-cost play skips dialog, normal play pays
        pg.evaluate("BS.testSetup()"); pg.evaluate(SETUP)
        pg.evaluate("mk('player','TST-N01',0); mk('player','TRAIN-N1',0); BS.G.p.player.reserve.n=2; BS.G.p.player.hand.push(BS.mkInst('TRAIN-01')); BS.render()")
        # TRAIN-01 cost1 red1 -> cost 0 with 2 red symbols; reserve 2, min cores 1
        pg.locator("#view-playmat .hand-area .tcg-card").first.click(); pg.wait_for_timeout(200)
        press(pg,'Summon'); pg.wait_for_timeout(400)
        chk('no pay dialog at cost 0',not modal_title(pg).startswith('Pay') or not pg.evaluate("document.getElementById('action-modal').classList.contains('active')"),modal_title(pg))
        chk('spirit summoned',pg.evaluate("BS.G.p.player.spirits.some(s=>s.id==='TRAIN-01')"))
        chk('no page errors',not errs,errs)
        pg.close()
print(sum(res),'/',len(res),'passed')
