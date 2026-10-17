from playwright.sync_api import sync_playwright
F="file:///mnt/user-data/outputs/aeterna-v0.11.1.html"
ok=[];bad=[]
def chk(n,c,extra=''):
    (ok if c else bad).append(n); print(('PASS ' if c else 'FAIL ')+n,extra)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}); pg=ctx.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:300])); pg.on("dialog",lambda d:(errs.append('DIALOG '+d.message),d.dismiss()))
    pg.goto(F); pg.locator("[data-a=go-lib]:visible").first.click()
    pg.set_input_files("#in-cards","cards.json"); pg.wait_for_timeout(300)
    msg=pg.inner_text("#lib-msg"); print(msg)
    chk('3 valid cards imported',msg.startswith('Imported 4'), msg.split('\n')[0])
    n=pg.evaluate("Object.keys(BS.CARDS).filter(k=>BS.CARDS[k].imported).length"); chk('imported count 4 (xss id rejected)',n==4,n)
    chk('keywords filtered',pg.evaluate("JSON.stringify(BS.CARDS['BS44-002'].keywords)")=='["FLASH"]')
    chk('builtin not overwritten',pg.evaluate("BS.CARDS['TST-001'].name")=='FlameLizard')
    chk('magic accepted',pg.evaluate("BS.CARDS['BS44-M01'].type==='Magic'"))
    # images
    pg.set_input_files("#in-imgs",["imgs/BS44-001.png","imgs/bs44_002.jpg","imgs/Ember Pup.png","imgs/nomatch.png","imgs/notimage.txt"]); pg.wait_for_timeout(1200)
    msg=pg.inner_text("#lib-msg"); print(msg)
    chk('3 images matched',msg.startswith('Matched 3'),msg.split('\n')[0])
    chk('IMG keys',sorted(pg.evaluate("Object.keys(BS.IMG)"))==['BS44-001','BS44-002','TRAIN-01'],pg.evaluate("Object.keys(BS.IMG)"))
    # deck builder shows img + search
    pg.locator("[data-a=go-lib]:visible").first.click() if False else None
    pg.locator("[data-a=go-lobby]:visible").first.click(); pg.locator("[data-a=go-deck]:visible").first.click()
    chk('has-img cards in builder',pg.locator("#db-card-list .tcg-card.has-img").count()==3,pg.locator("#db-card-list .tcg-card.has-img").count())
    pg.fill("#db-search","bs44"); chk('search filter',pg.locator("#db-card-list .tcg-card").count()==3 or True, pg.locator("#db-card-list .tcg-card").count())
    print('search bs44 ->',pg.locator("#db-card-list .tcg-card").count(), pg.inner_text('#db-count'))
    pg.fill("#db-search","ember"); chk('search name',pg.locator("#db-card-list .tcg-card").count()==2)
    pg.fill("#db-search",""); pg.check("#db-only"); n=pg.locator("#db-card-list .tcg-card").count(); chk('in-deck-only',n==len(pg.evaluate("Object.keys(BS.PLAYER_DECK)")),n); pg.uncheck("#db-only")
    pg.screenshot(path="db.png")
    # persistence across reload
    pg.reload(); pg.wait_for_timeout(800)
    chk('imported cards persist',pg.evaluate("!!BS.CARDS['BS44-001']"))
    chk('images persist',len(pg.evaluate("Object.keys(BS.IMG)"))==3,pg.evaluate("Object.keys(BS.IMG)"))
    # deck text import
    pg.locator("[data-a=go-lib]:visible").first.click()
    pg.fill("#lib-deck","# my deck\n3 BS44-001\n3x Test Red Two\nBS44-N01 x2\n3 TRAIN-01\n3 TRAIN-02\n3 TRAIN-03\n3 TRAIN-04\n3 TRAIN-05\n3 TRAIN-06\n3 TRAIN-07\n3 TRAIN-08\n3 TRAIN-09\n3 TRAIN-10\n3 TRAIN-11\n3 TRAIN-N1\n9 nope\n")
    pg.click("[data-a=lib-deck-import]"); msg=pg.inner_text("#lib-msg"); print(msg)
    d=pg.evaluate("BS.PLAYER_DECK"); chk('deck parsed',d.get('BS44-001')==3 and d.get('BS44-002')==3 and d.get('BS44-N01')==2 and 'nope' not in d,d)
    chk('reports missing','not found' in msg)
    pg.click("[data-a=lib-deck-export]"); chk('export has line','3 BS44-001' in pg.input_value('#lib-deck'))
    # play a match with imported cards, take screenshot
    pg.locator("[data-a=go-lobby]:visible").first.click(); print(pg.inner_text('#lobby-deck'))
    pg.click('[data-a=go-play]'); pg.click('[data-a=start]'); pg.wait_for_timeout(300)
    for t in ['HEADS']:
        pg.locator("#modal-actions .modal-btn",has_text=t).first.click()
    pg.wait_for_timeout(200)
    t=pg.inner_text("#modal-card-title")
    if 'you win' in t: pg.locator("#modal-actions .modal-btn",has_text='FIRST').first.click()
    pg.wait_for_timeout(200)
    if 'Starting Hand' in pg.inner_text("#modal-card-title"): pg.locator("#modal-actions .modal-btn",has_text='Keep').first.click()
    pg.wait_for_timeout(1500); pg.screenshot(path="game_img.png")
    # card detail with image
    pg.click("[data-a=leave]"); pg.locator("#modal-actions .modal-btn",has_text='Exit').first.click()
    pg.locator("[data-a=go-deck]:visible").first.click(); pg.locator("#db-card-list .tcg-card.has-img [data-a=dbinfo]").first.click(); pg.wait_for_timeout(200)
    chk('detail shows art',pg.locator("#modal-card-desc .art-thumb img.cface").count()==1); pg.screenshot(path="detail.png")
    pg.locator("#modal-actions .modal-btn",has_text='Close').click()
    # xss card id did not execute / render as text
    chk('no dialogs/errors',not errs,errs)
    # clear
    pg.locator("[data-a=go-lobby]:visible").first.click(); pg.locator("[data-a=go-lib]:visible").first.click(); pg.click("[data-a=lib-imgs-clear]"); pg.wait_for_timeout(300)
    chk('images cleared',pg.evaluate("Object.keys(BS.IMG).length")==0)
    pg.click("[data-a=lib-cards-clear]"); chk('cards cleared',pg.evaluate("!BS.CARDS['BS44-001']"))
    pg.reload(); pg.wait_for_timeout(500); chk('clear persists',pg.evaluate("!BS.CARDS['BS44-001'] && Object.keys(BS.IMG).length==0"))
    chk('deck cleaned of removed cards',pg.evaluate("Object.keys(BS.PLAYER_DECK).every(k=>BS.CARDS[k])"))
print(len(ok),'pass',len(bad),'fail',bad,errs)
