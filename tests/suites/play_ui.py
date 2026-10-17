from playwright.sync_api import sync_playwright
F="file:///mnt/user-data/outputs/wip.html"; res=[]
def chk(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+f'[{len(res)}] '+n, x if not c else '')
with sync_playwright() as p:
    b=p.chromium.launch()
    for i,(w,h) in enumerate([(1280,800),(390,844)]*10):
        ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page(); errs=[]
        pg.on("pageerror",lambda e:errs.append(str(e)[:200])); pg.goto(F); pg.wait_for_timeout(200)
        t=pg.locator('#view-lobby .menu-btn.primary').inner_text()
        ok=('PLAY' in t) and not pg.locator('#view-lobby #format-btn').count() and not pg.locator('#view-lobby [data-a=start]').count()
        pg.click('[data-a=go-play]'); vis=pg.locator('#view-play').is_visible() and pg.locator('#format-btn').is_visible() and pg.locator('#view-play [data-a=start]').is_visible()
        f0=pg.inner_text('#format-btn'); pg.click('#format-btn'); f1=pg.inner_text('#format-btn')
        pg.click('#format-btn')
        pg.click('#view-play [data-a=go-lobby]'); back=pg.locator('#view-lobby').is_visible()
        pg.click('[data-a=go-play]'); pg.click('[data-a=start]'); pg.wait_for_timeout(500)
        chk(f'#{i+1} {w}x{h}: lobby shows PLAY only; play page has format + start; toggle works; back works; match starts', ok and vis and f0!=f1 and back and pg.locator('#view-playmat').is_visible() and not errs, [t,ok,vis,f0,f1,back,errs])
        ctx.close()
print('TOTAL %d/%d'%(sum(res),len(res)))
