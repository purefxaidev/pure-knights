import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT = sys.argv[2] if len(sys.argv)>2 else '/workspace/pure-rpg/shots/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='th-TH')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'01_home.png')
        p0 = await pg.evaluate('PK.S.pure')
        await pg.evaluate("localStorage.setItem('pk_speed','3');localStorage.setItem('pk_auto','1');localStorage.setItem('pk_voice','off')")
        await pg.click('#nav button[data-go=map]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'02_map.png')
        await pg.click('.node.current'); await pg.wait_for_timeout(400)
        await pg.click('#go-fight')
        shot=False
        for i in range(240):
            await pg.wait_for_timeout(500)
            if not shot and await pg.evaluate("document.getElementById('cutin').classList.contains('show')"):
                await pg.wait_for_timeout(250); await pg.screenshot(path=OUT+'04_ultimate_cutin.png'); shot=True
            if i==6: await pg.screenshot(path=OUT+'03_battle.png')
            if await pg.evaluate("document.getElementById('modal').classList.contains('on')"): break
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT+'05_victory.png')
        p1 = await pg.evaluate('PK.S.pure'); txt = await pg.inner_text('.modal-box')
        print('PURE before', p0, 'after', p1, '| modal:', txt[:80].replace('\n',' '))
        # general capture test: jump to stage 5 with a boosted team
        await pg.evaluate("""(()=>{const S=PK.S; S.cleared=4; for(const k in S.roster){S.roster[k].lvl=25;} S.talisman=3; PK.save();})()""")
        await pg.evaluate("closeModal(); PK.startBattle(4)")
        for i in range(300):
            await pg.wait_for_timeout(500)
            if not shot and await pg.evaluate("document.getElementById('cutin').classList.contains('show')"):
                await pg.wait_for_timeout(250); await pg.screenshot(path=OUT+'04_ultimate_cutin.png'); shot=True
            if await pg.evaluate("!!document.getElementById('cap-stage')"): break
        await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+'06_capture.png')
        await pg.evaluate("window.__rnd=Math.random; Math.random=()=>0.01"); await pg.click('#cap-tal'); await pg.wait_for_timeout(2800)
        await pg.screenshot(path=OUT+'07_captured.png')
        print('roster', list((await pg.evaluate('PK.S.roster')).keys()), 'team', await pg.evaluate('PK.S.team'))
        await pg.click('#cap-ok'); await pg.wait_for_timeout(500)
        await pg.evaluate("Math.random=window.__rnd; closeModal(); PK.go('summon')"); await pg.wait_for_timeout(300)
        await pg.evaluate("PK.S.gems=2000"); await pg.click('#sum10'); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=OUT+'08_summon.png')
        await pg.evaluate("PK.go('hero','tiger')"); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'09_hero.png')
        for s in ['wallet','settings','quests']:
            await pg.evaluate(f"PK.go('{s}')"); await pg.wait_for_timeout(400); await pg.screenshot(path=OUT+f'10_{s}.png')
        print('ERRORS', json.dumps(errs, ensure_ascii=False))
        await b.close()
asyncio.run(main())
