# NOTE: superseded by process_gpt.py for heroes (v3). Kept for reference; running it overwrites hero art.
import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import remove_bg,trim,fit
from PIL import Image, ImageFilter
import numpy as np
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=os.path.join(R,'tools','src')
# lobby key art
im=Image.open(f'{S}/bg_lobby_v3.jpg').convert('RGB'); im=im.resize((1600,900),Image.LANCZOS); im.save(f'{R}/assets/bg/bg_lobby.webp','WEBP',quality=88)
def chroma(img):
    a=np.asarray(img).astype(np.float32); r,g,b=a[...,0],a[...,1],a[...,2]
    key=g-np.maximum(r,b)
    al=np.clip(1-(key-8)/12,0,1)
    gg=np.minimum(g,np.maximum(r,b)+6)
    out=np.stack([r,gg,b],-1)
    A=Image.fromarray((al*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))
    im=Image.fromarray(out.clip(0,255).astype(np.uint8)).convert('RGBA'); im.putalpha(A); return im
FACE={'veronica':0.30,'seline':0.36,'succubus':0.26,'lucius':0.33,'seraphina':0.34,'raven':0.34}
MAN={'veronica':(0.52,0.04,0.30),'lucius':(0.48,0.075,0.19),'succubus':(0.46,0.015,0.19)}
chars={'succubus':'hero_succubus_v3','seline':'hero_seline','lucius':'hero_lucius','seraphina':'hero_seraphina','raven':'hero_raven','veronica':'hero_veronica'}
for key,n in chars.items():
    im=trim(chroma(Image.open(f'{S}/{n}.jpg').convert('RGB')))
    fit(im,720,900).save(f'{R}/assets/img/{key}_art.webp','WEBP',quality=88)
    fit(im,420,330).save(f'{R}/assets/spr/hero_{key}.webp','WEBP',quality=88)
    a=np.asarray(im.getchannel('A'))>60; H,W=a.shape
    rows=np.where(a.sum(1)>2)[0]; top=rows[0]
    band=a[top:top+int(H*.18)]; xs=np.where(band.any(0))[0]; cx=int(xs.mean()) if len(xs) else W//2
    if key in MAN: cx=int(W*MAN[key][0]); top=int(H*MAN[key][1]); side=int(H*MAN[key][2])
    else: side=int(min(W,H)*FACE.get(key,0.40))
    x0=max(0,min(W-side,cx-side//2)); y0=max(0,top-int(side*.04))
    c=im.crop((x0,y0,x0+side,y0+side)).resize((256,256),Image.LANCZOS)
    bg=Image.new('RGBA',(256,256),(34,18,66,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/{key}_icon.webp','WEBP',quality=88)
# icon sheets: 4x3 grid
A=['helmet','chess','sword','upgrade','gem','star','book','crown','friends','guild','exchange','mail']
B=['gift','calendar','pass','quest','chat','gear','bolt','coins','ruby','crystal','pure','plus']
for sheet,names in (('icons_a',A),('icons_b',B)):
    im=Image.open(f'{S}/{sheet}.jpg').convert('RGB'); W,H=im.size; cw,ch=W//4,H//3
    for i,nm in enumerate(names):
        r,c=divmod(i,4); cell=im.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch))
        t=trim(remove_bg(cell,tol=55)); t=fit(t,192,192)
        t.save(f'{R}/assets/ui/ic_{nm}.webp','WEBP',quality=90)
print('ok')
