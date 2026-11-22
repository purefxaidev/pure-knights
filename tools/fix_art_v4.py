# v4 art cleanup: hero slivers, skill-icon dark corners, ring1 checker patch
import sys,os; sys.path.insert(0,os.path.dirname(__file__))
from artlib import trim,fit
from process_gpt import cut,finish
from PIL import Image
import numpy as np, cv2

R=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S=R+'/tools/src'

def solo(im, drop_edge=None):
    a=np.asarray(im)
    al=a[:,:,3]
    n,lab,st,_=cv2.connectedComponentsWithStats((al>18).astype(np.uint8),8)
    if n<=1: return im
    main=1+int(np.argmax(st[1:,4]))
    keep=(lab==main)
    h,w=al.shape
    for i in range(1,n):
        if i==main: continue
        area=st[i,4]; cx=st[i,0]+st[i,2]/2; cy=st[i,1]+st[i,3]/2
        # keep reasonably large pieces that sit near the body (hair/cape)
        if area>1200 and abs(cx- (st[main,0]+st[main,2]/2))<w*0.45:
            keep|=(lab==i)
            continue
        # drop edge slivers
        if drop_edge=='left' and cx<w*0.28: continue
        if drop_edge=='right' and cx>w*0.72: continue
        if area<900: continue
    out=a.copy(); out[:,:,3]=np.where(keep,al,0)
    return Image.fromarray(out)

# --- heroes: re-cut each column separately so neighbors can't leak ---
sheet=Image.open(f'{S}/heroes5_sheet.png').convert('RGB')
W,H=sheet.size
# same fractions used previously, with a slight inward nudge to avoid overlap
fracs=[0,198,400,575,772,1000]
cuts=[int(x*W/1000) for x in fracs]
# pull cuts toward gutters a bit if needed; use midpoints already
names=['seline','lucius','seraphina','raven','veronica']
edges={'lucius':'right','seraphina':'left'}
for i,k in enumerate(names):
    x0,x1=cuts[i],cuts[i+1]
    # tiny inward inset so a neighbor cape isn't in this crop
    pad=4
    crop=sheet.crop((x0+pad,0,x1-pad,H))
    cuto=cut(crop)
    cuto=solo(cuto, drop_edge=edges.get(k))
    finish(k,cuto,face=0.17)
    print('hero',k,'done',cuto.size)

# --- skill icons: flood dark leftover from the border, keep gold frame ---
sk=Image.open(f'{S}/skill_icons4.png').convert('RGB'); SW,SH=sk.size
for i,n in enumerate(['slash','orb','shield','circle']):
    r,c=divmod(i,2)
    cell=sk.crop((c*SW//2,r*SH//2,(c+1)*SW//2,(r+1)*SH//2))
    a=np.asarray(cell).astype(np.int32)
    luma=(0.3*a[:,:,0]+0.59*a[:,:,1]+0.11*a[:,:,2])
    # background is near-black navy
    cand=(luma<58).astype(np.uint8)
    h,w=cand.shape
    ff=cand.copy(); mk=np.zeros((h+2,w+2),np.uint8)
    for sx,sy in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
        if cand[sy,sx]:
            cv2.floodFill(ff,mk,(sx,sy),2)
    bg=(ff==2)
    al=np.where(bg,0,255).astype(np.uint8)
    # drop crumbs
    n_,lab,st,_=cv2.connectedComponentsWithStats((al>40).astype(np.uint8))
    if n_>1:
        k=1+int(np.argmax(st[1:,4])); al=np.where(lab==k,al,0).astype(np.uint8)
    al=cv2.GaussianBlur(al,(3,3),0)
    o=cell.convert('RGBA'); o.putalpha(Image.fromarray(al))
    fit(trim(o),160,160).save(f'{R}/assets/ui/sk_{n}.webp','WEBP',quality=92)
    print('sk',n,'ok')

# --- ring1: drop leftover checker (low-chroma mid-dark) ---
im=Image.open(f'{R}/assets/ui/ring1.webp').convert('RGBA')
a=np.asarray(im).copy(); al=a[:,:,3]; rgb=a[:,:,:3].astype(int)
mx=rgb.max(-1); mn=rgb.min(-1); luma=rgb.mean(-1)
leftover=(al>6)&((mx-mn)<45)&(luma<150)&~((rgb[:,:,0]>130)&(rgb[:,:,1]>90))
# also anything almost grey and darker than the gold
a[:,:,3]=np.where(leftover,0,al)
# keep only the main ring component
n,lab,st,_=cv2.connectedComponentsWithStats((a[:,:,3]>40).astype(np.uint8))
if n>1:
    k=1+int(np.argmax(st[1:,4]))
    a[:,:,3]=np.where(lab==k,a[:,:,3],0)
Image.fromarray(a).save(f'{R}/assets/ui/ring1.webp','WEBP',quality=92)
print('ring1 leftover removed', int(leftover.sum()))
print('done')
