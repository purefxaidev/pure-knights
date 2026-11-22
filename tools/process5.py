# v3 chat2 assets: battle bg, dragon boss cutout, purple skill icons, UI kit crops (gold frames)
import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import trim,fit
from process_gpt import cut
from PIL import Image
import numpy as np, cv2
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=R+'/tools/src'
# battle bg
Image.open(f'{S}/bg_battle.png').convert('RGB').resize((1600,900),Image.LANCZOS).save(f'{R}/assets/bg/bgL_ruins.webp','WEBP',quality=86)
# dragon
d=cut(Image.open(f'{S}/boss_dragon.png').convert('RGB')); d=trim(d)
fit(d,900,560).save(f'{R}/assets/spr/boss_nightdragon.webp','WEBP',quality=88)
fit(d,720,450).save(f'{R}/assets/img/nightdragon_art.webp','WEBP',quality=88)
H,W=d.height,d.width; c=d.crop((int(W*.2),int(H*.02),int(W*.2+W*.28),int(H*.02+W*.28))).resize((256,256),Image.LANCZOS)
bg=Image.new('RGBA',(256,256),(34,18,66,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/nightdragon_icon.webp','WEBP',quality=88)
# skill icons 2x2 (dark bg, rounded gold frames)
sk=Image.open(f'{S}/skill_icons4.png').convert('RGB'); W,H=sk.size
for i,n in enumerate(['slash','orb','shield','circle']):
    r,c=divmod(i,2); cell=sk.crop((c*W//2,r*H//2,(c+1)*W//2,(r+1)*H//2))
    a=np.asarray(cell).astype(int); g=(a.max(-1)<26)&((a.max(-1)-a.min(-1))<18)
    m=(~g).astype(np.uint8)*255; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); n_,lab,st,_=cv2.connectedComponentsWithStats((m>0).astype(np.uint8))
    if n_>1: m=((lab==1+int(np.argmax(st[1:,4]))).astype(np.uint8))*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)); m=cv2.GaussianBlur(m,(3,3),0)
    # fill holes
    ff=m.copy(); mk=np.zeros((m.shape[0]+2,m.shape[1]+2),np.uint8); cv2.floodFill(ff,mk,(0,0),255); holes=cv2.bitwise_not(ff); m=m|holes
    o=cell.convert('RGBA'); o.putalpha(Image.fromarray(m)); fit(trim(o),160,160).save(f'{R}/assets/ui/sk_{n}.webp','WEBP',quality=92)
# UI kit crops (checkerboard baked -> key greyish-dark outside)
kit=Image.open(f'{S}/ui_kit.png').convert('RGB'); K=np.asarray(kit).astype(int)
def keyed(box,punch=None,name=None,maxw=512):
    x0,y0,x1,y1=box; a=K[y0:y1,x0:x1]; mx=a.max(-1); mn=a.min(-1)
    grey=((mx-mn)<20)&(mx<110); h,w=grey.shape; ff=grey.astype(np.uint8)*255; fg=ff.copy(); mk=np.zeros((h+2,w+2),np.uint8)
    out=np.zeros((h,w),np.uint8)
    for sx,sy in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]:
        if grey[sy,sx]:
            t=ff.copy(); cv2.floodFill(t,mk.copy(),(sx,sy),128); out|=(t==128).astype(np.uint8)
    al=np.where(out>0,0,255).astype(np.uint8); al=cv2.GaussianBlur(cv2.erode(al,np.ones((2,2),np.uint8)),(3,3),0)
    if punch:
        cy,cx=h//2,w//2; r=min(h,w)/2*punch; yy,xx=np.ogrid[:h,:w]; al=np.where((yy-cy)**2+(xx-cx)**2<r*r,0,al).astype(np.uint8)
    if punch:
        al=np.where(((mx-mn)<16)&(mx<170),0,al).astype(np.uint8)
        n_,lab,st,_=cv2.connectedComponentsWithStats((al>40).astype(np.uint8)); k=1+int(np.argmax(st[1:,4])); al=np.where(lab==k,al,0).astype(np.uint8)
    im=Image.fromarray(a.astype(np.uint8)).convert('RGBA'); im.putalpha(Image.fromarray(al)); im=trim(im); fit(im,maxw,maxw).save(f'{R}/assets/ui/{name}.webp','WEBP',quality=92); return im
rings=[(452,17,672,228),(696,17,930,235),(901,17,1135,235),(1118,17,1348,235),(1340,17,1527,235)]
for i,b in enumerate(rings): keyed(b,punch=0.80,name=f'ring{i+1}',maxw=300)
keyed((396,478,905,806),name='kit_panel',maxw=640)
keyed((14,201,290,290),name='kit_btn_purple',maxw=400); keyed((293,222,495,293),name='kit_btn_gold',maxw=400)
print('ok')
