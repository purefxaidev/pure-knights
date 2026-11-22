# Process ChatGPT-made art (dark bg) -> transparent sprites. rembg isnet-anime on gamma-lifted image, mask inverted.
import sys,os;sys.path.insert(0,os.path.dirname(__file__))
from artlib import trim,fit
from PIL import Image, ImageOps, ImageFilter
import numpy as np, cv2
from rembg import remove, new_session
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=R+'/tools/src'
sess=new_session('isnet-anime')
def cut(im):
    a=np.asarray(im.convert('RGB')).astype(np.float32)/255
    lift=Image.fromarray((np.power(a,0.45)*255).astype(np.uint8))
    m=np.asarray(remove(lift,session=sess,only_mask=True)).astype(np.float32)
    bd=np.concatenate([m[0],m[-1],m[:,0],m[:,-1]]).mean()
    if bd>128: m=255-m
    print('border',bd); m=np.clip((m-45)/150,0,1)
    # keep only the largest components (drop specks)
    b=(m>.3).astype(np.uint8); n,lab,st,_=cv2.connectedComponentsWithStats(b,8)
    keep=np.zeros_like(b)
    for i in range(1,n):
        if st[i,4]>400: keep[lab==i]=1
    keep=cv2.dilate(keep,np.ones((9,9),np.uint8)); m=m*keep
    out=im.convert('RGBA'); out.putalpha(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))); return out
def finish(key,im,man=None,face=0.30):
    im=trim(im)
    fit(im,720,900).save(f'{R}/assets/img/{key}_art.webp','WEBP',quality=88)
    fit(im,420,330).save(f'{R}/assets/spr/hero_{key}.webp','WEBP',quality=88)
    H,W=im.height,im.width
    cx,top,side = man if man else (0.5,0.02,face)
    side=int(H*side); cx=int(W*cx); top=int(H*top)
    x0=max(0,min(W-side,cx-side//2)); y0=max(0,min(H-side,top))
    c=im.crop((x0,y0,x0+side,y0+side)).resize((256,256),Image.LANCZOS)
    bg=Image.new('RGBA',(256,256),(34,18,66,255)); bg.alpha_composite(c); bg.save(f'{R}/assets/img/{key}_icon.webp','WEBP',quality=88)
if __name__=='__main__':
    sheet=Image.open(f'{S}/heroes5_sheet.png').convert('RGB'); W,H=sheet.size
    full=cut(sheet); al=np.asarray(full.getchannel('A')).astype(np.float32).sum(0)
    cuts=[0]
    for x in (198,400,575,772):
        c=int(x*W/1000); w=60; seg=al[c-w:c+w]; cuts.append(c-w+int(np.argmin(seg)))
    cuts.append(W); print(cuts)
    names=['seline','lucius','seraphina','raven','veronica']
    for i,k in enumerate(names):
        crop=full.crop((cuts[i],0,cuts[i+1],H)); crop.save(f'/tmp/crop_{k}.png'); finish(k,crop,face=0.17)
    lil=Image.open(f'{S}/lilith_b.png').convert('RGB'); finish('succubus',cut(lil),man=(0.52,0.02,0.15))
    print('done')

def icons12():
    im=Image.open(f'{S}/icons12.png').convert('RGB'); W,H=im.size; cw,ch=W/6,H/2
    names=['helmet','chess','sword','upgrade','gem','star','book','gift','calendar','crown','quest','mail']
    for i,nm in enumerate(names):
        r,c=divmod(i,6); cell=np.asarray(im.crop((int(c*cw),int(r*ch),int((c+1)*cw),int((r+1)*ch)))).astype(np.int32)
        d=np.sqrt(((cell-np.array([12,10,14]))**2).sum(-1)); cand=(d<26).astype(np.uint8)
        # flood from border over cand
        h,w=cand.shape; ff=cand.copy(); mask=np.zeros((h+2,w+2),np.uint8)
        seed=np.zeros_like(cand)
        for (x,y) in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
            if cand[y,x]: cv2.floodFill(ff,mask,(x,y),2)
        bg=(ff==2)
        al=np.where(bg,0,255).astype(np.uint8); al=cv2.GaussianBlur(cv2.erode(al,np.ones((3,3),np.uint8)),(3,3),0)
        out=Image.fromarray(cell.astype(np.uint8)).convert('RGBA'); out.putalpha(Image.fromarray(al))
        fit(trim(out),192,192).save(f'{R}/assets/ui/ic_{nm}.webp','WEBP',quality=92)
if __name__=='__main__': icons12(); print('icons ok')
