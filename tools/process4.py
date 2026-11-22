import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import trim,fit
from PIL import Image
import numpy as np
from artlib import chroma
import cv2
def biggest(im):
    a=np.asarray(im.getchannel('A')); b=(a>60).astype(np.uint8); n,lab,st,_=cv2.connectedComponentsWithStats(b,8)
    if n<=2: return im
    i=1+int(np.argmax(st[1:,4])); k=cv2.dilate((lab==i).astype(np.uint8),np.ones((9,9),np.uint8)); o=im.copy(); o.putalpha(Image.fromarray((a*k).astype(np.uint8))); return o
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=R+'/tools/src'
Image.open(f'{S}/bgL_ruins.jpg').convert('RGB').resize((1600,900),Image.LANCZOS).save(f'{R}/assets/bg/bgL_ruins.webp','WEBP',quality=86)
im=trim(chroma(Image.open(f'{S}/boss_nightdragon.jpg').convert('RGB')))
fit(im,900,560).save(f'{R}/assets/spr/boss_nightdragon.webp','WEBP',quality=88)
fit(im,720,450).save(f'{R}/assets/img/nightdragon_art.webp','WEBP',quality=88)
# boss medallion icon (head crop)
H,W=im.height,im.width; c=im.crop((int(W*.22),int(H*.18),int(W*.52),int(H*.18+W*.30))).resize((256,256),Image.LANCZOS)
bg=Image.new('RGBA',(256,256),(34,18,66,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/nightdragon_icon.webp','WEBP',quality=88)
sk=Image.open(f'{S}/skillicons.jpg').convert('RGB'); W,H=sk.size; cw,ch=W//4,H//2
names=['vortex','slash','orb','circle','spear','flame','ice','lotus']
for i,n in enumerate(names):
    r,c=divmod(i,4); cell=sk.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch)); t=biggest(chroma(cell)); t=trim(t); fit(t,160,160).save(f'{R}/assets/ui/sk_{n}.webp','WEBP',quality=90)
print('ok')
