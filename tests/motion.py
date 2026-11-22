# ~6s motion capture of one battle turn vs the Night Dragon -> shots/v4/motion.mp4
import asyncio, sys, io, os, subprocess
from playwright.async_api import async_playwright
from PIL import Image
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT=sys.argv[2] if len(sys.argv)>2 else 'shots/v4/'
os.makedirs(OUT, exist_ok=True)
TEAM="['seline','lucius','seraphina','raven','veronica']"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':844,'height':390}, device_scale_factor=2)
        await pg.goto(URL); await pg.wait_for_timeout(1800)
        await pg.evaluate("localStorage.setItem('pk_speed','3');localStorage.setItem('pk_auto','1');localStorage.setItem('pk_voice','off');localStorage.setItem('pk_ultvid','off')")
        await pg.evaluate(f"""(()=>{{const S=PK.S;S.cleared=14;S.stam=150;S.team={TEAM};for(const id of S.team) S.roster[id]=Object.assign(S.roster[id]||{{lvl:40,stars:6,shards:0,sk:[3,3]}},{{lvl:40,stars:6,sk:[3,3]}}); PK.save();}})()""")
        await pg.evaluate("PK.startBattle(12)")
        await pg.wait_for_timeout(800)
        if await pg.evaluate("document.getElementById('story').classList.contains('on')"):
            await pg.click('#story .st-skip', force=True)
        # wait until the dragon is on screen
        for i in range(120):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("!!(window.battle&&window.battle.enemies.some(e=>e.alive&&e.id==='nightdragon'))"):
                break
        await pg.evaluate("if(window.battle) window.battle.speed=1; localStorage.setItem('pk_speed','1');")
        # click the HUD speed button until it reads x1
        for _ in range(3):
            label=await pg.inner_text('#b-speed')
            if label.strip()=='x1': break
            await pg.click('#b-speed', force=True); await pg.wait_for_timeout(150)
        await pg.evaluate("if(window.battle) window.battle.speed=1;")
        await pg.wait_for_timeout(200)
        frames=[]; 
        for i in range(90):  # ~6s at 15fps
            await pg.wait_for_timeout(66)
            png=await pg.screenshot(type='jpeg',quality=80)
            frames.append(Image.open(io.BytesIO(png)).convert('RGB'))
        print('frames',len(frames), frames[0].size)
        os.makedirs('/tmp/mf4',exist_ok=True)
        for i,f in enumerate(frames):
            f.resize((844,390)).save(f'/tmp/mf4/{i:04d}.jpg', quality=85)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','15','-i','/tmp/mf4/%04d.jpg','-c:v','libx264','-pix_fmt','yuv420p','-crf','20',OUT+'motion.mp4'], check=True)
        # also a short gif (every 2nd frame, smaller)
        g=[f.resize((640,296)) for f in frames[::2]]
        g[0].save(OUT+'motion.gif', save_all=True, append_images=g[1:], duration=130, loop=0, optimize=True)
        await b.close()
asyncio.run(main())
