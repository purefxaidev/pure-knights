// PURE Knights v2 — unique ultimate VFX per character. Each FX(b, u, sk, foes) animates and applies damage/effects.
'use strict';
const FX = (()=>{
  const top=(b,t)=>b.top(t);
  const hitAll=(b,u,sk,ts)=>ts.forEach(t=>t.alive&&b.applyHit(u,sk,t,sk.mult,true));
  const enemyCenter=(b,ts)=>({x:ts.reduce((a,t)=>a+t.x,0)/Math.max(1,ts.length), y:ts.reduce((a,t)=>a+t.y,0)/Math.max(1,ts.length)});
  const bolt=(x0,y0,x1,y1,seg=10,j=26)=>{ const pts=[]; for(let i=0;i<=seg;i++){ const k=i/seg; pts.push([lerp(x0,x1,k)+(i&&i<seg?rnd(-j,j):0), lerp(y0,y1,k)+(i&&i<seg?rnd(-j/3,j/3):0)]); } return pts; };
  const serpent=async(b,u,ts,color,color2,ms=700)=>{ // a dragon body of glowing orbs flowing from caster across all targets
    const pts=[[u.x,top(b,u)]].concat(ts.map(t=>[t.x,top(b,t)])); if(pts.length<2) return;
    const t0=performance.now(), dur=ms/b.speed;
    await new Promise(r=>{ const step=()=>{ const k=clamp((performance.now()-t0)/dur,0,1); const f=k*(pts.length-1), i=Math.min(pts.length-2,Math.floor(f)), q=f-i;
      const x=lerp(pts[i][0],pts[i+1][0],q), y=lerp(pts[i][1],pts[i+1][1],q)+Math.sin(k*18)*b.U*.18;
      for(let n=0;n<4;n++) b.parts.push({x:x+rnd(-6,6),y:y+rnd(-6,6),vx:rnd(-.4,.4),vy:rnd(-.4,.4),life:1,max:rnd(26,40),size:rnd(8,15),color:n%2?color:color2});
      b.parts.push({k:'shard',x,y,vx:rnd(-3,3),vy:rnd(-4,0),life:1,max:30,size:rnd(5,9),color:color2});
      k<1?requestAnimationFrame(step):r(); }; step(); }); };
  return {
    lion: async(b,u,sk,ts)=>{ const c='#ffd36b'; b.ring(u.x,top(b,u),c,30); b.parts.push({k:'ring',x:u.x,y:u.y-u.hpx*.4,life:1,max:50,size:u.hpx*.6,grow:b.W*.6,color:c,lw:10});
      Voice.sfx('roar'); b.shake=16; b.flash=.6; b.flashColor='#ffe9a8'; await b.wait(260);
      for(const t of ts){ b.parts.push({k:'flashd',x:t.x,y:top(b,t),life:1,max:18,size:t.hpx*.8,color:'#fff'}); b.ring(t.x,top(b,t),c,20); } hitAll(b,u,sk,ts); await b.wait(300); },
    claws: async(b,u,sk,ts)=>{ for(let i=0;i<sk.hits;i++){ const f=b.foes(u); if(!f.length) break; const t=f[Math.floor(Math.random()*f.length)]; await b.dashTo(u,t);
        for(let s=0;s<3;s++) b.parts.push({k:'slash',x:t.x+rnd(-10,10),y:top(b,t)+rnd(-14,14),ang:-0.8+s*0.5,life:1,max:18,size:t.hpx*.9,color:'#ff9a3a',lw:9});
        b.applyHit(u,sk,t,sk.mult,true); Voice.sfx('slash'); await b.wait(90); } await b.back(u); },
    icedragon: async(b,u,sk,ts)=>{ b.dark=.35; b.darkColor='0,20,60'; Voice.sfx('magic'); await serpent(b,u,ts,'#4fc3ff','#e4fbff',800);
      for(const t of ts){ for(let i=0;i<14;i++) b.parts.push({k:'shard',x:t.x,y:top(b,t),vx:rnd(-5,5),vy:rnd(-7,-1),life:1,max:40,size:rnd(6,12),color:'#bff3ff'}); }
      b.flash=.5; b.flashColor='#cfefff'; hitAll(b,u,sk,ts); b.tween(b,{dark:0},500); await b.wait(300); },
    starrain: async(b,u,sk,ts)=>{ Voice.sfx('magic'); const n=26; for(let i=0;i<n;i++){ const t=ts[i%ts.length]; if(!t) break; const ex=t.x+rnd(-30,30), ey=top(b,t)+rnd(-20,20);
        const sx=ex-(b.land?-200:120)*(u.side==='hero'?-1:1)*.5, sy=-60; const d=Math.floor(i*1.2);
        for(let k=0;k<8;k++){ const q=k/8; b.parts.push({x:lerp(sx,ex,q),y:lerp(sy,ey,q),life:1,max:14+k*2,size:5+k,color:k%2?'#ffe36b':'#7fa8ff',delay:d+k}); }
        b.parts.push({k:'flashd',x:ex,y:ey,life:1,max:12,size:28,color:'#fff',delay:d+8}); }
      await b.wait(420); b.shake=12; hitAll(b,u,sk,ts); await b.wait(350); },
    shadow: async(b,u,sk,ts)=>{ const t=ts.slice().sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0]; if(!t) return; b.dark=.8; b.darkColor='10,0,20'; Voice.sfx('dash');
      u.alpha=.2; await b.dashTo(u,t,0); u.alpha=1;
      for(let s=0;s<4;s++){ b.parts.push({k:'slash',x:t.x,y:top(b,t),ang:rnd(-2,2),life:1,max:20,size:t.hpx*1.4,color:'#c77dff',lw:12}); Voice.sfx('slash'); await b.wait(90); }
      b.parts.push({k:'slash',x:t.x,y:top(b,t),ang:0,life:1,max:28,size:b.W*.5,color:'#ffffff',lw:6}); b.flash=.6; b.flashColor='#e0b3ff';
      b.applyHit(u,sk,t,sk.mult,true); b.tween(b,{dark:0},450); await b.wait(200); await b.back(u); },
    lotus: async(b,u,sk)=>{ const al=(u.side==='hero'?b.heroes:b.enemies); for(const a of al){ b.parts.push({k:'beam',x:a.x,y:a.y,w:a.hpx*.3,h:b.A*1.2,life:1,max:60,color:'rgba(255,230,150,.55)'});
        for(let i=0;i<18;i++) b.parts.push({k:'petal',x:a.x+rnd(-40,40),y:a.y-rnd(0,20),vx:rnd(-.6,.6),vy:rnd(-2.6,-1),life:1,max:rnd(50,80),size:rnd(5,9),ph:rnd(0,6),color:Math.random()<.5?'#ffd1e8':'#ffe9a8'}); }
      b.flash=.4; b.flashColor='#fff3c4'; await b.wait(300); b.heal(u,sk); await b.wait(300); },
    firestorm: async(b,u,sk,ts)=>{ Voice.sfx('fire'); b.dark=.3; b.darkColor='40,0,0'; const t0=performance.now(), dur=900/b.speed;
      await new Promise(r=>{ const step=()=>{ const k=(performance.now()-t0)/dur; for(const t of ts){ const a=k*30, rr=t.hpx*.35*(1-k*.3);
          for(let n=0;n<3;n++){ const h=rnd(0,t.hpx*1.3); b.parts.push({x:t.x+Math.cos(a+n*2)*rr*(.4+h/t.hpx),y:t.y-h,vx:0,vy:-1.5,life:1,max:22,size:rnd(6,12),color:n%2?'#ff7a2f':'#ffd36b'}); } }
        k<1?requestAnimationFrame(step):r(); }; step(); });
      b.shake=14; hitAll(b,u,sk,ts); b.tween(b,{dark:0},500); await b.wait(300); },
    lightning: async(b,u,sk,ts)=>{ for(const t of ts){ const x=t.x+rnd(-10,10); b.parts.push({k:'bolt',pts:bolt(x+rnd(-60,60),-20,x,top(b,t)),life:1,max:14,color:'#9fc0ff'}); b.flash=.55; b.flashColor='#dfe9ff'; Voice.sfx('zap'); b.applyHit(u,sk,t,sk.mult,true); await b.wait(140); }
      for(let i=0;i<4;i++){ const x=rnd(0,b.W); b.parts.push({k:'bolt',pts:bolt(x,-20,x+rnd(-80,80),b.A*.9),life:1,max:10,color:'#7fa8ff'}); } await b.wait(250); },
    emerald: async(b,u,sk,ts)=>{ Voice.sfx('roar'); await serpent(b,u,ts,'#4dff9a','#d6ffe6',750); b.shake=14; hitAll(b,u,sk,ts); for(const t of ts) b.ring(t.x,top(b,t),'#4dff9a',16); await b.wait(300); },
    sakura: async(b,u,sk,ts)=>{ for(let i=0;i<90;i++) b.parts.push({k:'petal',x:(u.side==='hero'?-20:b.W+20),y:rnd(0,b.A),vx:(u.side==='hero'?1:-1)*rnd(6,11),vy:rnd(-1,1),life:1,max:rnd(60,90),size:rnd(4,8),ph:rnd(0,6),color:['#ffb7d5','#ffd6e7','#ff8fbf'][i%3],delay:Math.floor(rnd(0,20))});
      await b.wait(350); for(let s=0;s<3;s++){ for(const t of ts) b.parts.push({k:'slash',x:t.x,y:top(b,t),ang:rnd(-2,2),life:1,max:16,size:t.hpx,color:'#ffb7d5',lw:8}); Voice.sfx('slash'); await b.wait(110); }
      hitAll(b,u,sk,ts); await b.wait(250); },
    tsunami: async(b,u,sk,ts)=>{ Voice.sfx('wave'); const L=b.land, dir=u.side==='hero'?1:-1;
      const x0=L?(dir>0?b.W*.25:b.W*.75):(dir>0?b.A*.8:b.A*.2), x1=L?(dir>0?b.W*1.1:-b.W*.1):(dir>0?-b.A*.1:b.A*1.1);
      b.parts.push({k:'wave',x0,x1,w:L?b.W*.18:b.A*.18,top:b.A*.1,bot:b.A,life:1,max:55,color:'rgba(80,190,255,.75)'});
      for(let i=0;i<60;i++) b.parts.push({x:L?x0:rnd(0,b.W),y:L?rnd(b.A*.2,b.A):x0,vx:L?dir*rnd(5,9):0,vy:L?rnd(-1,1):-dir*rnd(5,9),life:1,max:rnd(40,55),size:rnd(4,8),color:'#e4fbff'});
      await b.wait(450); b.shake=12; hitAll(b,u,sk,ts); await b.wait(350); },
    holyspear: async(b,u,sk,ts)=>{ const c=enemyCenter(b,ts); Voice.sfx('magic'); b.parts.push({k:'beam',x:c.x,y:c.y,w:b.U*.25,h:b.A*1.3,life:1,max:40,color:'rgba(255,240,170,.9)'});
      await b.wait(250); b.flash=.9; b.flashColor='#fffbe0'; b.shake=18; b.parts.push({k:'ring',x:c.x,y:c.y,life:1,max:40,size:20,grow:b.W*.5,color:'#ffe36b',lw:10,flat:.35});
      for(let i=0;i<40;i++){ const a=rnd(0,TAU); b.parts.push({k:'line',x:c.x,y:c.y-b.U*.4,a,len:rnd(60,140),life:1,max:20,color:'#fff3b0'}); }
      hitAll(b,u,sk,ts); await b.wait(350); },
    charm: async(b,u,sk,ts)=>{ Voice.sfx('charm'); b.dark=.35; b.darkColor='60,0,50';
      for(const t of ts){ for(let i=0;i<10;i++){ const q=i/10; b.parts.push({k:'heart',x:lerp(u.x,t.x,q),y:lerp(top(b,u),top(b,t),q)-Math.sin(q*Math.PI)*40,vx:0,vy:-.3,life:1,max:30,size:10,color:i%2?'#ff6fd0':'#b46bff',delay:i*2}); } }
      await b.wait(400); for(const t of ts) b.hearts(t,10); b.flash=.4; b.flashColor='#ffb3ff'; hitAll(b,u,sk,ts); b.tween(b,{dark:0},500); await b.wait(300); },
    bonequake: async(b,u,sk,ts)=>{ await b.tween(u,{oy:-b.U*.5},220); await b.tween(u,{oy:0},140,t=>t*t); Voice.sfx('boom'); b.shake=24;
      for(let i=0;i<10;i++){ const x=rnd(0,b.W); b.parts.push({k:'bolt',pts:bolt(u.x,u.y,x,b.A*rnd(.4,1),6,30),life:1,max:24,color:'#d9a066'}); }
      for(const t of ts) for(let i=0;i<10;i++) b.parts.push({k:'shard',x:t.x,y:t.y,vx:rnd(-4,4),vy:rnd(-8,-3),life:1,max:40,size:rnd(5,10),color:'#c9a27a'});
      hitAll(b,u,sk,ts); await b.wait(350); },
    nightcurse: async(b,u,sk,ts)=>{ b.dark=.6; b.darkColor='25,0,45'; Voice.sfx('magic');
      for(const t of ts){ for(let k=0;k<10;k++) b.parts.push({x:t.x+rnd(-8,8),y:lerp(-40,top(b,t),k/10),life:1,max:16+k*2,size:9+k,color:'#7a2cff',delay:k}); }
      await b.wait(380); hitAll(b,u,sk,ts); for(const t of ts) b.ring(t.x,top(b,t),'#b46bff',20); b.tween(b,{dark:0},500); await b.wait(300); },
    bloodblade: async(b,u,sk,ts)=>{ const c=enemyCenter(b,ts); b.dark=.5; b.darkColor='40,0,0'; await b.tween(u,{sc:1.15},200);
      b.parts.push({k:'slash',x:c.x,y:c.y-b.U*.5,ang:b.land?0.4:1.9,life:1,max:30,size:b.W*.9,color:'#ff2a3a',lw:18}); Voice.sfx('slash'); b.flash=.6; b.flashColor='#ff6b6b'; b.shake=20;
      for(const t of ts) b.burst(t.x,top(b,t),'#ff2a3a',30,7); hitAll(b,u,sk,ts); await b.tween(u,{sc:1},200); b.tween(b,{dark:0},500); },
    roots: async(b,u,sk,ts)=>{ Voice.sfx('boom'); for(const t of ts){ for(let i=0;i<5;i++) b.parts.push({k:'bolt',pts:bolt(t.x+rnd(-30,30),t.y+20,t.x+rnd(-20,20),t.y-t.hpx*rnd(.6,1.1),5,14),life:1,max:30,color:'#5bbf4a',delay:i*2}); }
      b.shake=14; await b.wait(250); hitAll(b,u,sk,ts); await b.wait(300); },
    firebreath: async(b,u,sk,ts)=>{ Voice.sfx('fire'); const sx=u.x-(b.land?u.hpx*.3:0), sy=u.y-u.hpx*.7; const t0=performance.now(), dur=900/b.speed;
      await new Promise(r=>{ const step=()=>{ const k=(performance.now()-t0)/dur; for(let n=0;n<6;n++){ const t=ts[Math.floor(Math.random()*ts.length)]; if(!t) break; const dx=t.x-sx, dy=top(b,t)-sy, s=rnd(.02,.035);
          b.parts.push({x:sx,y:sy,vx:dx*s+rnd(-1,1),vy:dy*s+rnd(-1,1),life:1,max:32,size:rnd(8,16),color:n%2?'#ff5a1f':'#ffcf5a'}); }
        k<1?requestAnimationFrame(step):r(); }; step(); });
      b.shake=16; hitAll(b,u,sk,ts); await b.wait(300); },
    goldspear: async(b,u,sk,ts)=>{ b.dark=.4; b.darkColor='20,10,0'; Voice.sfx('magic'); b.parts.push({k:'ring',x:u.x,y:top(b,u),life:1,max:40,size:u.hpx*.3,grow:u.hpx*.9,color:'#ffd36b',lw:8,flat:.5});
      await b.wait(250); const n=30; for(let i=0;i<n;i++){ const t=ts[i%ts.length]; if(!t) break; const ex=t.x+rnd(-26,26), ey=top(b,t)+rnd(-26,26), sx=ex+rnd(-80,80), sy=-80, d=Math.floor(i*1.1);
        for(let k=0;k<9;k++){ const q=k/9; b.parts.push({x:lerp(sx,ex,q),y:lerp(sy,ey,q),life:1,max:12+k*2,size:4+k*.9,color:k%2?'#fff3b0':'#ffb020',delay:d+k}); }
        b.parts.push({k:'flashd',x:ex,y:ey,life:1,max:12,size:30,color:'#ffe9a8',delay:d+9}); }
      await b.wait(520); b.shake=16; b.flash=.5; b.flashColor='#ffe9a8'; hitAll(b,u,sk,ts); b.tween(b,{dark:0},500); await b.wait(300); },
    redcape: async(b,u,sk,ts)=>{ b.dark=.3; b.darkColor='40,0,0'; Voice.sfx('slash'); for(let i=0;i<sk.hits;i++){ const f=b.foes(u); if(!f.length) break; const t=f[i%f.length]; await b.dashTo(u,t);
        b.parts.push({k:'slash',x:t.x,y:top(b,t),ang:-0.9+i*0.7,life:1,max:22,size:t.hpx*1.2,color:'#ff2a3a',lw:14});
        for(let q=0;q<10;q++) b.parts.push({k:'petal',x:t.x,y:top(b,t),vx:rnd(-3,3),vy:rnd(-3,1),life:1,max:40,size:rnd(4,8),color:'#d81e2c',ph:rnd(0,6)});
        b.applyHit(u,sk,t,sk.mult,true); b.shake=10; await b.wait(110); } await b.back(u); b.tween(b,{dark:0},400); },
    sunblade: async(b,u,sk,ts)=>{ const c=enemyCenter(b,ts); Voice.sfx('magic'); b.flash=.5; b.flashColor='#fffbe0';
      for(let i=0;i<5;i++) b.parts.push({k:'beam',x:c.x+(i-2)*b.U*.5,y:c.y+b.U*.2,w:b.U*.14,h:b.A*1.3,life:1,max:36,color:'rgba(255,240,170,.85)',delay:i*5});
      await b.wait(360); b.parts.push({k:'ring',x:c.x,y:c.y,life:1,max:40,size:20,grow:b.W*.4,color:'#fff3b0',lw:10,flat:.35}); b.shake=16;
      for(let i=0;i<30;i++){ const a=rnd(0,TAU); b.parts.push({k:'line',x:c.x,y:c.y-b.U*.4,a,len:rnd(60,140),life:1,max:22,color:'#fff3b0'}); }
      hitAll(b,u,sk,ts); await b.wait(350); },
    bluethunder: async(b,u,sk,ts)=>{ b.dark=.45; b.darkColor='0,10,40'; Voice.sfx('zap'); await b.tween(u,{sc:1.12},200);
      for(let i=0;i<12;i++){ const t=ts[i%ts.length]; if(!t) break; b.parts.push({k:'bolt',pts:bolt(t.x+rnd(-40,40),-20,t.x,top(b,t),9,34),life:1,max:26,color:'#5aa2ff',delay:i*3}); }
      b.parts.push({k:'slash',x:u.x+(u.dir||1)*u.hpx*.5,y:top(b,u),ang:-.5,life:1,max:26,size:u.hpx*1.4,color:'#7fc4ff',lw:16});
      await b.wait(380); b.flash=.55; b.flashColor='#bcd8ff'; b.shake=18; hitAll(b,u,sk,ts); await b.tween(u,{sc:1},200); b.tween(b,{dark:0},500); },
    crystal: async(b,u,sk,ts)=>{ b.dark=.5; b.darkColor='30,0,25'; Voice.sfx('magic');
      for(let i=0;i<22;i++){ const t=ts[i%ts.length]; if(!t) break; const ex=t.x+rnd(-34,34), ey=top(b,t)+rnd(-28,28); for(let k=0;k<7;k++) b.parts.push({k:'shard',x:ex+rnd(-60,60),y:-40+k*8,vx:(ex-t.x)*.01,vy:6+k*.5,life:1,max:28,size:rnd(8,13),color:k%2?'#ff4d6e':'#ffd6e0',delay:i*2+k});
        b.parts.push({k:'flashd',x:ex,y:ey,life:1,max:14,size:32,color:'#ff9db4',delay:i*2+12}); }
      await b.wait(520); b.shake=16; b.flash=.45; b.flashColor='#ffd0dc'; for(const t of ts) for(let i=0;i<14;i++) b.parts.push({k:'shard',x:t.x,y:top(b,t),vx:rnd(-6,6),vy:rnd(-8,-2),life:1,max:42,size:rnd(6,12),color:'#ff5f82'});
      hitAll(b,u,sk,ts); b.tween(b,{dark:0},500); await b.wait(300); },
    nightbreath: async(b,u,sk,ts)=>{ b.dark=.5; b.darkColor='25,0,45'; Voice.sfx('fire'); b.shake=10; const sx=u.x-(b.land?u.hpx*.55:0), sy=u.y-u.hpx*.62; const t0=performance.now(), dur=1000/b.speed;
      await new Promise(r=>{ const step=()=>{ for(let n=0;n<8;n++){ const t=ts[Math.floor(Math.random()*ts.length)]; if(!t) break; const dx=t.x-sx, dy=top(b,t)-sy, s=rnd(.02,.036);
          b.parts.push({x:sx,y:sy,vx:dx*s+rnd(-1,1),vy:dy*s+rnd(-1,1),life:1,max:34,size:rnd(10,20),color:n%3?'#a94bff':(n%2?'#ff7bff':'#ffd36b')}); }
        (performance.now()-t0)<dur?requestAnimationFrame(step):r(); }; step(); });
      b.flash=.6; b.flashColor='#d9b3ff'; b.shake=22; for(const t of ts) b.burst(t.x,top(b,t),'#c57bff',26,6); hitAll(b,u,sk,ts); b.tween(b,{dark:0},600); await b.wait(350); },
  };
})();
