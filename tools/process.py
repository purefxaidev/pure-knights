import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import remove_bg,trim,fit
from PIL import Image
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=os.path.join(R,'tools','src')
for b in ['bg_battle','bg_map','bg_summon']:
    Image.open(f'{S}/{b}.jpg').convert('RGB').save(f'{R}/assets/bg/{b}.webp','WEBP',quality=82)
for n in ['hero_flame','hero_thunder','hero_dragon','gen_demon','gen_witch','gen_tiger']:
    im=trim(remove_bg(Image.open(f'{S}/{n}.jpg').convert('RGB')))
    key=n.split('_')[1]
    art=fit(im,576,768); art.save(f'{R}/assets/img/{key}_art.webp','WEBP',quality=86)
    spr=fit(im,400,240); spr.save(f'{R}/assets/spr/{n}.webp','WEBP',quality=86)
    # icon: head/upper crop
    w,h=im.size; c=im.crop((int(w*.15),0,int(w*.85),int(w*.7))); c=c.resize((256,256)); 
    bg=Image.new('RGBA',(256,256),(30,20,60,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/{key}_icon.webp','WEBP',quality=85)
print('ok')
