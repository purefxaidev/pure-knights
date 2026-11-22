import asyncio,sys
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    for name,(w,h,mob) in {'land':(844,390,True),'port':(390,844,True)}.items():
      b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
      ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if mob else 1,is_mobile=mob,has_touch=mob,locale='th-TH')
      pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
      await pg.evaluate("(()=>{const S=PK.S;S.cleared=14;S.stam=150;for(const k in S.roster){S.roster[k].lvl=40;}PK.save();PK.startBattle(12);})()")
      await pg.wait_for_timeout(1500)
      if await pg.evaluate("document.getElementById('story').classList.contains('on')"): await pg.click('#story .st-skip',force=True)
      await pg.click('#b-speed'); await pg.click('#b-speed')
      n=0
      for i in range(120):
        await pg.wait_for_timeout(1500)
        if await pg.evaluate("!!(window.battle&&window.battle.enemies.some(e=>e.alive&&e.id==='nightdragon'))"):
          for k in range(3):
            await pg.wait_for_timeout(1800); await pg.screenshot(path=f'shots/v3/dragon_{name}_{k}.png')
          break
      print(name,errs); await b.close()
asyncio.run(main())
