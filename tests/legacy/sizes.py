from playwright.sync_api import sync_playwright
F="file:///mnt/user-data/outputs/aeterna-v0.11.1.html"
SETUP="""(()=>{BS.testSetup(); window.mk=(k,id,cores,opts)=>{const p=BS.G.p[k]; const i=BS.mkInst(id); i.cores=cores; Object.assign(i,opts||{}); if(BS.CARDS[id].type==='Spirit') p.spirits.push(i); else p.nexus.push(i); return i.uid;}; return 1})()"""
import sys
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in [(360,640),(360,740),(375,667),(390,844),(412,915),(430,932),(360,560),(800,360),(844,390),(915,412),(768,1024),(1024,600),(1280,720),(1280,800),(1366,768),(1920,1080)]:
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto(F); pg.evaluate(SETUP)
        pg.evaluate("mk('player','TRAIN-01',1); mk('player','TRAIN-02',2); mk('player','TRAIN-N1',0); mk('opponent','TRAIN-05',2); BS.G.p.player.hand=['TRAIN-01','TRAIN-02','TRAIN-03','TRAIN-10','TRAIN-05'].map(i=>BS.mkInst(i)); BS.render()")
        r=pg.evaluate("""(()=>{const f=document.querySelector('.field-row .tcg-card'),hd=document.querySelector('.hand-area .tcg-card');const a=f.getBoundingClientRect(),c=hd.getBoundingClientRect();return [Math.round(a.width),Math.round(a.height),Math.round(c.width),Math.round(c.height),BS.isPC()]})()""")
        print(f"{w}x{h}", 'field card',r[0],'x',r[1],'| hand card',r[2],'x',r[3],'| PC' if r[4] else '| phone')
        pg.screenshot(path=f"sz_{w}x{h}.png"); pg.close()
