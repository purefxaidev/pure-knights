import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import remove_bg,trim,fit
from PIL import Image
import numpy as np
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=os.path.join(R,'tools','src')
for b in ['bgL_forest','bgL_desert','bgL_castle','mapL']:
    im=Image.open(f'{S}/{b}.jpg').convert('RGB'); im=im.resize((1280,720),Image.LANCZOS) if im.width<1280 else fit(im,1600,900)
    im.save(f'{R}/assets/bg/{b}.webp','WEBP',quality=84)
chars=['hero_'+k for k in 'tank fighter mage marksman assassin support flame thunder dragon sakura ocean valkyrie succubus'.split()]+['gen_tiger','gen_witch','gen_demon','boss_treant','boss_firedragon']
for n in chars:
    im=trim(remove_bg(Image.open(f'{S}/{n}.jpg').convert('RGB')))
    key=n.split('_',1)[1]
    fit(im,720,900).save(f'{R}/assets/img/{key}_art.webp','WEBP',quality=86)
    fit(im,420,330).save(f'{R}/assets/spr/{n}.webp','WEBP',quality=88)
    a=np.asarray(im.getchannel('A'))>60; H,W=a.shape
    rows=np.where(a.sum(1)>2)[0]; top=rows[0]
    band=a[top:top+int(H*.18)]; xs=np.where(band.any(0))[0]; cx=int(xs.mean()) if len(xs) else W//2
    side=int(min(W,H)*(0.55 if not n.startswith('boss') else 0.9)); x0=max(0,min(W-side,cx-side//2)); y0=max(0,top-int(side*.05))
    c=im.crop((x0,y0,x0+side,y0+side)).resize((256,256),Image.LANCZOS)
    bg=Image.new('RGBA',(256,256),(34,18,66,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/{key}_icon.webp','WEBP',quality=86)
for n in ['ui_frame','ui_btn']:
    im=trim(remove_bg(Image.open(f'{S}/{n}.jpg').convert('RGB'),tol=60)); im.save(f'{R}/assets/ui/{n.replace("ui_","")}.png')
print('done')
