from playwright.sync_api import sync_playwright
import time
F="file:///mnt/user-data/outputs/aeterna-v0.11.1.html"
SETUP="""(()=>{BS.testSetup(); window.mk=(k,id,cores,opts)=>{const p=BS.G.p[k]; const i=BS.mkInst(id); i.cores=cores; Object.assign(i,opts||{}); if(BS.CARDS[id].type==='Spirit') p.spirits.push(i); else p.nexus.push(i); return i.uid;}; return 1})()"""
bad=[]
def chk(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n,x)
    if not c: bad.append(n)
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in [(390,844),(1280,800)]:
        T=f'{w}: '
        for fmt in ['eternal','standard']:
            F2=T+fmt+': '
            pg=b.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.goto(F)
            pg.evaluate("BS.setFormat('%s')"%fmt); pg.evaluate(SETUP)
            chips=pg.evaluate("[...document.querySelectorAll('.step-chip')].map(e=>e.textContent)")
            chk(F2+'chips',chips==(['START','CORE','DRAW','REFRESH','MAIN','ATTACK','MAIN 2','END'] if fmt=='standard' else ['START','CORE','DRAW','REFRESH','MAIN','ATTACK','END']),chips)
            # human flow: turn 3, step 4 -> next -> attack -> next
            pg.evaluate("mk('player','TRAIN-02',2); BS.G.p.player.hand=[BS.mkInst('TRAIN-01'),BS.mkInst('TRAIN-N1')]; BS.G.p.player.reserve.n=3; BS.G.busy=false; BS.G.turnNo=3; BS.render()")
            pg.evaluate("BS.G.turnResolver=()=>{window.__done=true}; window.__done=false;0")
            pg.click('.inline-next-btn'); pg.wait_for_timeout(150)
            chk(F2+'next -> attack step',pg.evaluate("BS.G.step")==5)
            pg.click('.inline-next-btn'); pg.wait_for_timeout(250)
            if fmt=='standard':
                chk(F2+'attack -> second main',pg.evaluate("BS.G.step")==6 and pg.evaluate("document.querySelector('.step-chip.active').textContent")=='MAIN 2',pg.evaluate("BS.G.step"))
                chk(F2+'turn not ended yet',pg.evaluate("window.__done")==False)
                # can summon in second main
                pg.locator("#view-playmat .hand-area .tcg-card").first.click(); pg.wait_for_timeout(200)
                has=pg.locator("#modal-actions .modal-btn",has_text='Summon').count()
                chk(F2+'summon offered in Second Main',has==1,pg.inner_text('#modal-actions'))
                if has:
                    pg.locator("#modal-actions .modal-btn",has_text='Summon').click(); pg.wait_for_timeout(300)
                    chk(F2+'summoned in Second Main',pg.evaluate("BS.G.p.player.spirits.length")==2)
                # attack not allowed in second main
                chk(F2+'next enabled in Second Main',pg.locator('.inline-next-btn').is_enabled())
                u=pg.evaluate("BS.G.p.player.spirits[0].uid")
                pg.locator("[data-v='player:spirit:%d']"%u).first.click(force=True); pg.wait_for_timeout(200)
                chk(F2+'no Attack button in Second Main',pg.locator("#modal-actions .modal-btn",has_text='Attack').count()==0,pg.inner_text('#modal-actions'))
                pg.locator("#modal-actions .modal-btn",has_text='Cancel').click()
                pg.click('.inline-next-btn'); pg.wait_for_timeout(250)
                chk(F2+'next in Second Main ends turn',pg.evaluate("window.__done")==True)
            else:
                chk(F2+'attack -> ends turn (no Second Main)',pg.evaluate("window.__done")==True and pg.evaluate("BS.G.step")!=6)
            # first turn skip
            pg.evaluate(SETUP); pg.evaluate("BS.G.busy=false; BS.G.turnNo=1; BS.G.turnResolver=()=>{window.__d2=true}; window.__d2=false; BS.render();0")
            pg.click('.inline-next-btn'); pg.wait_for_timeout(200)
            chk(F2+'first turn: next ends turn (no attack/second main)',pg.evaluate("window.__d2")==True and pg.evaluate("BS.G.step")==4)
            chk(F2+'no errors',not errs,errs)
            pg.close()
    # sim games track steps
    for fmt in ['eternal','standard']:
        seen_all=set(); done=0
        for i in range(6):
            ctx=b.new_context(); pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('bse.format','%s')"%fmt)
            pg.goto(F+"?sim=1"); pg.evaluate("window.__seen=new Set(); setInterval(()=>{if(BS.G) window.__seen.add(BS.G.step+':'+BS.G.steps[BS.G.step])},15);0")
            t0=time.time()
            while time.time()-t0<30 and not pg.evaluate("BS.G&&BS.G.over"): time.sleep(.2)
            if pg.evaluate("BS.G&&BS.G.over"): done+=1
            seen_all|=set(pg.evaluate("[...window.__seen]"))
            if errs: print('ERRS',errs[:2]); bad.append('sim errors')
            ctx.close()
        print(fmt,'sim finished',done,'/6 steps seen',sorted(seen_all))
        chk(fmt+' sim games finish',done==6)
        chk(fmt+' MAIN 2 step reached by CPU' if fmt=='standard' else 'eternal never has MAIN 2',(('6:MAIN 2' in seen_all) if fmt=='standard' else not any('MAIN 2' in x for x in seen_all)),sorted(seen_all))
print('FAILS',bad)
