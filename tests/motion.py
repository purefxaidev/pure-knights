# records a short motion capture of a battle (idle sway, dash attacks, VFX, ultimate) -> shots/v3/motion.gif / motion.mp4
import asyncio, sys, io
from playwright.async_api import async_playwright
from PIL import Image
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'; OUT=sys.argv[2] if len(sys.argv)>2 else 'shots/v3/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':844,'height':390}); 
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        await pg.evaluate("localStorage.setItem('pk_speed','1');localStorage.setItem('pk_auto','1');localStorage.setItem('pk_voice','off');localStorage.setItem('pk_ultvid','off')")
        await pg.evaluate("""(()=>{const S=PK.S;S.cleared=14;S.stam=150;S.team=['seline','succubus','raven','seraphina','veronica'];for(const id of S.team) S.roster[id]=S.roster[id]||{lvl:30,stars:6,shards:0,sk:[3,3]}; for(const k in S.roster) S.roster[k].lvl=28; PK.save();})()""")
        await pg.evaluate("PK.startBattle(12)")
        frames=[]; t=0
        for i in range(260):
            await pg.wait_for_timeout(60)
            png=await pg.screenshot(type='jpeg',quality=70); frames.append(Image.open(io.BytesIO(png)).convert('RGB').resize((640,296)))
            if await pg.evaluate("document.getElementById('modal').classList.contains('on')"): break
        print(len(frames))
        # keep every frame; 15 fps-ish
        frames[0].save(OUT+'motion.gif',save_all=True,append_images=frames[1:],duration=70,loop=0,optimize=True)
        import subprocess,os
        os.makedirs('/tmp/mf',exist_ok=True)
        for i,f in enumerate(frames): f.save(f'/tmp/mf/{i:04d}.png')
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','14','-i','/tmp/mf/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','24',OUT+'motion.mp4'])
        await b.close()
asyncio.run(main())
