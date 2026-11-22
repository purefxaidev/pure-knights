import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT = sys.argv[2] if len(sys.argv)>2 else '/workspace/pure-rpg/shots/v2/'
VP = {'land':(844,390,True),'desk':(1280,720,False),'port':(390,844,True)}
FULL = len(sys.argv)>3 and sys.argv[3]=='full'
async def wait_modal(pg, n=300, shot=None):
    for i in range(n):
        await pg.wait_for_timeout(500)
        if shot and not shot[0] and await pg.evaluate("document.getElementById('cutin').classList.contains('show')"):
            await pg.wait_for_timeout(300); await pg.screenshot(path=shot[1]); shot[0]=True
        if await pg.evaluate("document.getElementById('modal').classList.contains('on')"): return True
    return False
async def run(p, name):
    w,h,mob = VP[name]; o=OUT+name+'_'
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob, locale='th-TH')
    pg = await ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(2500)
    await pg.evaluate("localStorage.setItem('pk_speed','3');localStorage.setItem('pk_auto','1');localStorage.setItem('pk_voice','off');localStorage.setItem('pk_ultvid','off')")
    await pg.screenshot(path=o+'01_lobby.png'); p0 = await pg.evaluate('PK.S.pure')
    await pg.click('.start-btn', force=True); await pg.wait_for_timeout(900); await pg.screenshot(path=o+'02_map.png')
    await pg.click('.node.current', force=True); await pg.wait_for_timeout(400); await pg.screenshot(path=o+'03_stage.png')
    await pg.click('#go-fight', force=True); await pg.wait_for_timeout(700)
    if await pg.evaluate("document.getElementById('story').classList.contains('on')"):
        await pg.screenshot(path=o+'04_story.png'); await pg.click('#story .st-skip', force=True)
    await pg.wait_for_timeout(3500); await pg.screenshot(path=o+'05_battle.png')
    shot=[False,o+'06_ult.png']; ok=await wait_modal(pg,300,shot)
    await pg.wait_for_timeout(1200); await pg.screenshot(path=o+'07_victory.png')
    p1 = await pg.evaluate('PK.S.pure'); txt = (await pg.inner_text('.modal-box'))[:60].replace('\n',' ')
    res={'vp':name,'battle_done':ok,'pure':[p0,p1],'modal':txt}
    if FULL:
        # boss stage 1-3
        await pg.evaluate("(()=>{const S=PK.S; S.cleared=4; S.stam=150; for(const k in S.roster){S.roster[k].lvl=22;} S.talisman=3; PK.save(); closeModal(); PK.startBattle(2);})()")
        await pg.wait_for_timeout(6000); await pg.screenshot(path=o+'08_boss.png')
        res['boss_done']=await wait_modal(pg,300,shot); await pg.screenshot(path=o+'09_boss_win.png')
        await pg.evaluate("closeModal(); PK.startBattle(4)")
        for i in range(300):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("!!document.getElementById('cap-stage')"): break
        await pg.wait_for_timeout(800); await pg.screenshot(path=o+'10_capture.png')
        await pg.evaluate("window.__r=Math.random; Math.random=()=>0.01"); await pg.click('#cap-tal', force=True); await pg.wait_for_timeout(2900)
        await pg.screenshot(path=o+'11_captured.png'); await pg.evaluate("Math.random=window.__r")
        res['tiger']= await pg.evaluate("!!PK.S.roster.tiger")
        await pg.click('#cap-ok', force=True); await pg.wait_for_timeout(800); await pg.evaluate("closeModal()")
        # skill upgrade
        await pg.evaluate("PK.S.gold=99999;PK.S.books=50;PK.save();PK.go('hero','tank|skill')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=o+'12_skill.png'); await pg.click('[data-skup="1"]'); await pg.wait_for_timeout(400)
        res['tank_sk']=await pg.evaluate("PK.S.roster.tank.sk"); await pg.screenshot(path=o+'13_skill_up.png')
        await pg.evaluate("PK.go('hero','succubus')"); await pg.wait_for_timeout(300)
        await pg.evaluate("PK.S.roster.succubus=PK.S.roster.succubus||{lvl:1,stars:6,shards:0,sk:[1,1]};PK.go('hero','succubus')"); await pg.wait_for_timeout(600); await pg.screenshot(path=o+'14_hero.png')
        await pg.evaluate("PK.S.gems=2000;PK.go('summon')"); await pg.wait_for_timeout(500); await pg.screenshot(path=o+'15_summon.png')
        await pg.click('#sum10', force=True); await pg.wait_for_timeout(4200); await pg.screenshot(path=o+'16_summon10.png')
        for s in ['heroes','collection','wallet','settings','quests','home']:
            await pg.evaluate(f"PK.go('{s}')"); await pg.wait_for_timeout(600); await pg.screenshot(path=o+f'17_{s}.png')
        await pg.click('#ev-checkin', force=True); await pg.wait_for_timeout(400); await pg.screenshot(path=o+'18_checkin.png')
        # succubus charm ult in battle
        await pg.evaluate("closeModal();PK.S.team=['succubus','valkyrie','tank','support'];['valkyrie'].forEach(i=>PK.S.roster[i]=PK.S.roster[i]||{lvl:22,stars:6,shards:0,sk:[1,1]});PK.S.roster.succubus.lvl=22;PK.save();PK.startBattle(5)")
        shot2=[False,o+'19_ult_succubus.png']; res['b3']=await wait_modal(pg,300,shot2)
    res['errors']=errs; print(json.dumps(res,ensure_ascii=False)); await b.close()
async def main():
    async with async_playwright() as p:
        for n in (sys.argv[4].split(',') if len(sys.argv)>4 else VP): await run(p,n)
asyncio.run(main())
