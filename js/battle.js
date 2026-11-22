// Turn-based battle engine + canvas renderer (particles, damage numbers, cut-ins)
'use strict';
const IMGS = {};
function IMG(p){ if(!IMGS[p]){ const i = new Image(); i.src = 'assets/'+p; IMGS[p]=i; } return IMGS[p]; }
function preload(list){ return Promise.all(list.map(p=>new Promise(r=>{ const i=IMG(p); if(i.complete&&i.naturalWidth) r(); else { i.onload=r; i.onerror=r; } }))); }
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), ease=t=>1-Math.pow(1-t,3);

function heroStats(id, lvl, stars){
  const d = HEROES[id], m = (1+0.11*(lvl-1)) * (1+0.18*(stars-d.rar));
  return {hp:Math.round(d.hp*m), atk:Math.round(d.atk*m), def:Math.round(d.def*(1+0.06*(lvl-1))), spd:d.spd + Math.floor(lvl/5)};
}
function power(id,lvl,stars){ const s=heroStats(id,lvl,stars); return Math.round(s.hp*0.25+s.atk*3+s.def*2+s.spd); }

class Battle {
  constructor(opts){
    Object.assign(this, opts); // canvas, team:[{id,lvl,stars}], stage, onEnd, ui
    this.cv = this.canvas; this.g = this.cv.getContext('2d');
    this.parts=[]; this.floats=[]; this.shake=0; this.flash=0; this.flashColor='#fff';
    this.speed = +(localStorage.getItem('pk_speed')||1); this.auto = localStorage.getItem('pk_auto')==='1';
    this.queue=[]; this.wave=0; this.over=false; this.ults=0; this.log=[]; this.t0=performance.now();
    this.bg = IMG('bg/bg_battle.webp');
    this.resize(); this._rs = ()=>this.resize(); addEventListener('resize', this._rs);
    this.heroes = this.team.map((h,i)=>this.mkUnit(h.id,'hero',h.lvl,h.stars,i));
    this.enemies=[];
    this.layout(this.heroes);
    this.raf = requestAnimationFrame(this.frame.bind(this));
  }
  resize(){ const dpr=Math.min(2,devicePixelRatio||1), r=this.cv.getBoundingClientRect(); this.W=r.width; this.H=r.height; this.cv.width=r.width*dpr; this.cv.height=r.height*dpr; this.g.setTransform(dpr,0,0,dpr,0,0);
    const p=document.getElementById('bpanel'); this.A = this.H - (p? p.offsetHeight : 200); if(this.heroes){ this.layout(this.heroes); this.layout(this.enemies); } }
  mkUnit(id, side, lvl, stars, slot){
    let d, s, img, h;
    if(side==='hero' || id.startsWith('@')){ id=id.replace('@',''); d=HEROES[id]; s=heroStats(id,lvl,stars||d.rar); img=IMG(d.spr); h = d.general? 0.25 : 0.17; }
    else { d=MONS[id]; const m=1+0.13*(lvl-1); s={hp:Math.round(d.hp*m),atk:Math.round(d.atk*m),def:Math.round(d.def*m),spd:d.spd}; img=IMG(d.spr); h=d.h*1.25; }
    return {id, d, side, lvl, slot, name:d.name, maxHp:s.hp, hp:s.hp, atk:s.atk, def:s.def, spd:s.spd, img, h,
      energy: side==='hero'?20:0, cd:0, shield:0, stun:0, burn:0, burnDmg:0, taunt:0, atkUp:0, alive:true,
      ox:0, oy:0, sc:1, fl:0, alpha: side==='hero'?1:0, enter: side==='hero'?1:0, general: !!d.general, boss: !!d.boss};
  }
  layout(units){
    const W=this.W, A=this.A, n=units.length; if(!n) return;
    units.forEach((u,i)=>{
      if(u.side==='hero'){ // 3 front (melee), 2 back (ranged)
        const front=[0,1,2], fx=[.5,.22,.78], bx=[.33,.67];
        if(i<3){ u.x=W*fx[i]; u.y=A*0.72; } else { u.x=W*bx[i-3]; u.y=A*0.9; }
        if(n<=3){ u.x=W*[.5,.2,.8][i]; u.y=A*0.8; }
      } else {
        if(n<=3){ u.x=W*[.5,.2,.8][i]; u.y=A*(u.general||u.boss?0.43:0.40); if(i>0&&n===3) u.y=A*0.36; }
        else { const row = i<3?0:1; const xs = row===0?[.5,.2,.8]:[.33,.67]; u.x=W*xs[row===0?i:i-3]; u.y=A*(row===0?0.42:0.30); }
      }
    });
  }
  all(){ return this.heroes.concat(this.enemies); }
  foes(u){ return (u.side==='hero'?this.enemies:this.heroes).filter(x=>x.alive); }
  allies(u){ return (u.side==='hero'?this.heroes:this.enemies).filter(x=>x.alive); }
  wait(ms){ return new Promise(r=>setTimeout(r, ms/this.speed)); }
  tween(u, props, ms){ const from={}; for(const k in props) from[k]=u[k]; const t0=performance.now(), dur=ms/this.speed;
    return new Promise(r=>{ const step=()=>{ const t=clamp((performance.now()-t0)/dur,0,1), e=ease(t); for(const k in props) u[k]=from[k]+(props[k]-from[k])*e; t<1? requestAnimationFrame(step) : r(); }; step(); }); }

  async run(){
    Voice.narrate(`ด่าน ${this.stage.name} เริ่มต้นขึ้นแล้ว! เหล่าขุนพล จงออกรบ!`);
    for(this.wave=0; this.wave<this.stage.waves.length; this.wave++){
      await this.spawnWave(this.stage.waves[this.wave]);
      while(!this.over){
        this.all().forEach(u=>u.jit=rnd(.93,1.07));
        const order = this.all().filter(u=>u.alive).sort((a,b)=>b.spd*b.jit-a.spd*a.jit);
        this.roundOrder = order;
        for(const u of order){
          if(this.over) return;
          if(!u.alive) continue;
          this.cur=u; this.ui && this.ui.turn(this.upcoming());
          await this.act(u);
          if(!this.heroes.some(h=>h.alive)) return this.finish(false);
          if(!this.enemies.some(e=>e.alive)) break;
        }
        if(!this.enemies.some(e=>e.alive)) break;
      }
      if(this.over) return;
      if(this.wave < this.stage.waves.length-1){
        this.heroes.forEach(h=>{ if(h.alive){ h.hp=Math.min(h.maxHp, h.hp+h.maxHp*0.12); h.energy=Math.min(100,h.energy+15);} });
        this.banner(`คลื่นที่ ${this.wave+2}`); await this.wait(900);
      }
    }
    this.finish(true);
  }
  upcoming(){ const out=[]; const ro=this.roundOrder||[]; const idx=ro.indexOf(this.cur);
    for(let k=idx;k<ro.length;k++) if(ro[k].alive) out.push(ro[k]);
    const next=this.all().filter(u=>u.alive).sort((a,b)=>b.spd-a.spd); while(out.length<8 && next.length) out.push(next[(out.length)%next.length]); return out.slice(0,8); }
  async spawnWave(list){
    this.enemies = list.map((id,i)=>this.mkUnit(id,'enemy',this.stage.lvl + (id.startsWith('@')?2:0) + (id==='boss'?1:0),null,i));
    this.layout(this.enemies);
    this.ui && this.ui.wave(this.wave+1, this.stage.waves.length);
    const gen = this.enemies.find(e=>e.general);
    this.enemies.forEach(e=>{ e.oy=-40; });
    await Promise.all(this.enemies.map((e,i)=>this.wait(i*120).then(()=>this.tween(e,{alpha:1,oy:0,enter:1},500))));
    if(gen){ this.banner(`ขุนพลปรากฏ! ${gen.name}`, '#ff5a5a'); Voice.hero(gen.d,'intro'); this.burst(gen.x, gen.y-gen.h*this.A*.5, ELEM[gen.d.el].c, 60, 7); await this.wait(1100); }
  }
  pickTarget(u){ const f=this.foes(u); const t=f.filter(x=>x.taunt>0); if(t.length) return t[0];
    // prefer front row
    const front = u.side==='hero' ? f.filter(x=>x.slot<3) : f.filter(x=>x.slot<3); const pool=front.length?front:f; return pool[Math.floor(Math.random()*pool.length)]; }
  async act(u){
    // start-of-turn effects
    if(u.burn>0){ u.burn--; this.damage(u, u.burnDmg, {color:'#ff8a3a', label:'ไหม้'}); if(!u.alive) return; await this.wait(200); }
    if(u.taunt>0) u.taunt--; if(u.atkUp>0) u.atkUp--;
    if(u.stun>0){ u.stun--; this.float(u.x, u.y-u.h*this.A, 'ติดแข็ง!', '#9fe8ff', 18); await this.wait(450); return; }
    let action='atk';
    if(u.side==='hero'){
      const qi = this.queue.findIndex(q=>q.u===u);
      if(qi>=0){ const q=this.queue.splice(qi,1)[0]; if(q.type==='ult' && u.energy>=100) action='ult'; else if(q.type==='skill' && u.cd===0) action='skill'; }
      else if(this.auto){ if(u.energy>=100) action='ult'; else if(u.cd===0) action='skill'; }
    } else if(u.general || u.boss){ if(u.energy>=100) action='ult'; else if(u.cd===0 && u.general) action='skill'; }
    if(action==='atk') await this.basic(u);
    else if(action==='skill'){ await this.useSkill(u, u.d.skill, false); u.cd = u.d.skill.cd; u.energy=Math.min(100,u.energy+12); }
    else { await this.useSkill(u, u.d.ult || {name:'ทุบผลึก',kind:'aoe',mult:1.6}, true); u.energy=0; if(u.side==='hero') this.ults++; }
    if(action!=='skill' && u.cd>0) u.cd--;
    this.ui && this.ui.refresh();
    await this.wait(160);
  }
  dmgCalc(u, t, mult, crit){ const atk = u.atk*(u.atkUp>0?1.3:1); let d = atk*mult*(100/(100+t.def))*rnd(.9,1.1); const c = crit || Math.random()<0.15; if(c) d*=1.6; return {d:Math.max(1,Math.round(d)), c}; }
  damage(t, amount, o={}){
    if(!t.alive) return 0; let a=amount;
    if(t.shield>0){ const s=Math.min(t.shield,a); t.shield-=s; a-=s; if(s>0) this.float(t.x+20,t.y-t.h*this.A*0.8,'-'+s,'#dfe9ff',14); }
    t.hp = Math.max(0, t.hp-a); t.fl=1; t.energy=Math.min(100,t.energy+8);
    const big = o.crit; this.float(t.x+rnd(-14,14), t.y-t.h*this.A*0.7, (big?'คริ! ':'')+(o.label?o.label+' ':'')+a, o.color||(big?'#ffe14d':'#fff'), big?30:22, big);
    if(t.hp<=0){ t.alive=false; this.burst(t.x,t.y-t.h*this.A*.4,'#ffffff',30,5); this.tween(t,{alpha:0,sc:.6},500); Voice.sfx('boom'); }
    return a;
  }
  async basic(u){
    const t=this.pickTarget(u); if(!t) return; const el=ELEM[u.d.el||'light']; const ranged = ['mage','archer','support'].includes(u.d.role);
    if(ranged){ await this.projectile(u,t,el.c,1); }
    else { await this.lunge(u,t); }
    const r=this.dmgCalc(u,t,1); this.damage(t,r.d,{crit:r.c}); this.slash(t, el.c); Voice.sfx(ranged?'magic':'slash'); this.shake=Math.max(this.shake, r.c?8:4);
    if(!ranged) await this.tween(u,{ox:0,oy:0},220);
    u.energy=Math.min(100,u.energy+22);
  }
  async lunge(u,t){ const dx=(t.x-u.x)*0.62, dy=((t.y)-u.y)*0.62; await this.tween(u,{ox:dx,oy:dy},230); }
  async projectile(u,t,color,size){ const sx=u.x+u.ox, sy=u.y-u.h*this.A*.55, ex=t.x, ey=t.y-t.h*this.A*.5; const t0=performance.now(), dur=300/this.speed;
    await this.tween(u,{sc:1.08},90); this.tween(u,{sc:1},150);
    await new Promise(r=>{ const step=()=>{ const k=clamp((performance.now()-t0)/dur,0,1); const x=sx+(ex-sx)*k, y=sy+(ey-sy)*k-Math.sin(k*Math.PI)*30;
      for(let i=0;i<3;i++) this.parts.push({x:x+rnd(-3,3),y:y+rnd(-3,3),vx:rnd(-.5,.5),vy:rnd(-.5,.5),life:1,max:rnd(14,24),size:(6+rnd(0,5))*size,color});
      k<1?requestAnimationFrame(step):r(); }; step(); });
    this.burst(ex,ey,color,22,4);
  }
  async useSkill(u, sk, ult){
    const el = ELEM[u.d.el||'light'];
    if(ult) await this.cutIn(u, sk);
    else { this.float(u.x, u.y-u.h*this.A-8, sk.name, el.c2, 17); this.ring(u.x,u.y-u.h*this.A*.4,el.c); if(u.side==='hero' || u.general) Voice.hero(u.d,'skill'); await this.wait(250); }
    const foes=this.foes(u), allies=this.allies(u);
    const hitFx=(t,m)=>{ const r=this.dmgCalc(u,t,m*(ult?1:1),sk.crit); const dealt=this.damage(t,r.d,{crit:r.c}); this.burst(t.x,t.y-t.h*this.A*.5,el.c,ult?40:24,ult?7:5); this.slash(t,el.c2);
      if(sk.burn && t.alive){ t.burn=sk.burn; t.burnDmg=Math.round(u.atk*0.35); }
      if(sk.stun && t.alive && Math.random()<sk.stun){ t.stun=1; this.float(t.x,t.y-t.h*this.A-20,'แช่แข็ง','#bff3ff',15); }
      if(sk.lifesteal) { u.hp=Math.min(u.maxHp,u.hp+dealt*sk.lifesteal); } return dealt; };
    switch(sk.kind){
      case 'hit': case 'lowest': {
        const t = sk.kind==='lowest' ? foes.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0] : this.pickTarget(u); if(!t) break;
        if(['mage','archer'].includes(u.d.role)) await this.projectile(u,t,el.c,1.8); else await this.lunge(u,t);
        hitFx(t, sk.mult); Voice.sfx(ult?'boom':'slash'); this.shake=ult?14:7; await this.tween(u,{ox:0,oy:0},220); break; }
      case 'multi': for(let i=0;i<sk.hits;i++){ const f=this.foes(u); if(!f.length) break; const t=f[Math.floor(Math.random()*f.length)];
          await this.projectile(u,t,el.c,1.3); hitFx(t, sk.mult); Voice.sfx('hit'); this.shake=6; } break;
      case 'aoe': { await this.tween(u,{sc:1.15,oy:-14},200);
        this.flash=ult?0.9:0.4; this.flashColor=el.c2; Voice.sfx('boom');
        for(const t of foes){ this.ring(t.x,t.y-t.h*this.A*.4,el.c); }
        await this.wait(180); for(const t of foes) hitFx(t, sk.mult); this.shake=ult?18:9;
        await this.tween(u,{sc:1,oy:0},220); break; }
      case 'heal': { Voice.sfx('heal'); const dead = sk.revive ? (u.side==='hero'?this.heroes:this.enemies).filter(x=>!x.alive) : [];
        for(const d of dead){ d.alive=true; d.hp=Math.round(d.maxHp*0.35); this.tween(d,{alpha:1,sc:1},400); this.float(d.x,d.y-d.h*this.A,'ฟื้นคืนชีพ!','#ffe98a',20); }
        for(const a of (u.side==='hero'?this.heroes:this.enemies).filter(x=>x.alive)){ const h=Math.round(u.atk*sk.mult*rnd(.95,1.05)); a.hp=Math.min(a.maxHp,a.hp+h); this.float(a.x,a.y-a.h*this.A*.7,'+'+h,'#6dff9e',22); this.rise(a,'#7dffb0'); if(sk.atkUp) a.atkUp=sk.atkUp; }
        if(sk.atkUp) this.banner('พลังโจมตี +30%','#ffd36b'); break; }
      case 'shield': { u.shield += Math.round(u.maxHp*sk.pct); u.taunt=sk.taunt||0; this.ring(u.x,u.y-u.h*this.A*.4,'#fff1a8'); this.float(u.x,u.y-u.h*this.A,'ยั่วยุ + โล่','#fff1a8',18); Voice.sfx('magic'); break; }
    }
    if(sk.teamShield) for(const a of allies){ a.shield+=Math.round(a.maxHp*sk.teamShield); this.ring(a.x,a.y-a.h*this.A*.4,'#fff1a8'); }
  }
  cutIn(u, sk){
    const el=ELEM[u.d.el||'light'], box=document.getElementById('cutin');
    Voice.sfx('ult'); if(u.side==='hero' || u.general) Voice.hero(u.d,'ult'); else Voice.narrate(`${u.name} ใช้ท่าไม้ตาย!`);
    if(!box) return this.wait(600);
    box.className=''; box.style.setProperty('--c', el.c); box.style.setProperty('--c2', el.c2);
    const ia=box.querySelector('.ci-art'); ia.src='assets/'+(u.d.art||u.d.spr); ia.classList.toggle('boxed',!!u.d.artBox);
    box.querySelector('.ci-name').textContent=u.name; box.querySelector('.ci-skill').textContent=sk.name;
    void box.offsetWidth; box.className='show '+(u.side==='hero'?'':'enemy');
    this.flash=0.7; this.flashColor='#ffffff';
    for(let i=0;i<70;i++) this.parts.push({x:rnd(0,this.W),y:rnd(0,this.A),vx:rnd(-2,2),vy:rnd(-3,0),life:1,max:rnd(30,60),size:rnd(3,8),color:Math.random()<.5?el.c:el.c2});
    return new Promise(r=>setTimeout(()=>{ box.className=''; r(); }, Math.max(1100, 1600/this.speed)));
  }
  // ---- FX helpers ----
  burst(x,y,c,n,sp){ for(let i=0;i<n;i++){ const a=rnd(0,Math.PI*2), v=rnd(1,sp); this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:1,max:rnd(20,45),size:rnd(2,6),color:c,grav:.08}); } }
  ring(x,y,c){ this.parts.push({x,y,ring:true,life:1,max:28,size:10,color:c}); this.parts.push({x,y,ring:true,life:1,max:40,size:4,color:'#fff'}); }
  slash(t,c){ this.parts.push({x:t.x,y:t.y-t.h*this.A*.5,slash:true,ang:rnd(-1,1),life:1,max:16,size:t.h*this.A*.7,color:c}); }
  rise(u,c){ for(let i=0;i<18;i++) this.parts.push({x:u.x+rnd(-25,25),y:u.y-rnd(0,20),vx:0,vy:rnd(-2.5,-1),life:1,max:rnd(30,50),size:rnd(2,5),color:c}); }
  float(x,y,txt,c,size,crit){ this.floats.push({x,y,txt,c,size,life:0,crit}); }
  banner(txt,c){ this.bannerT={txt,c:c||'#ffe58a',t:performance.now()}; }
  finish(win){ if(this.over) return; this.over=true; this.win=win; this.banner(win?'ชัยชนะ!':'พ่ายแพ้...', win?'#ffe14d':'#ff6b6b');
    if(win){ Voice.sfx('coin'); const h=this.heroes.find(h=>h.alive); if(h) Voice.hero(h.d,'win'); for(let i=0;i<6;i++) setTimeout(()=>this.burst(rnd(40,this.W-40),rnd(60,this.A*.6),['#ffe14d','#ff7ad9','#7fe8ff'][i%3],50,7),i*180); }
    else Voice.narrate('พ่ายแพ้... แต่ตำนานยังไม่จบ จงลุกขึ้นสู้อีกครั้ง');
    setTimeout(()=>this.onEnd({win, ults:this.ults, stage:this.stage, time:(performance.now()-this.t0)/1000}), 1600); }
  destroy(){ this.over=true; cancelAnimationFrame(this.raf); removeEventListener('resize', this._rs); }
  // ---- render ----
  frame(now){
    const g=this.g, W=this.W, H=this.H, A=this.A; this.raf=requestAnimationFrame(this.frame.bind(this));
    g.save(); if(this.shake>0){ g.translate(rnd(-this.shake,this.shake), rnd(-this.shake,this.shake)); this.shake*=0.86; if(this.shake<.4) this.shake=0; }
    // background (cover)
    const b=this.bg; if(b.naturalWidth){ const s=Math.max(W/b.naturalWidth, H/b.naturalHeight); const bw=b.naturalWidth*s, bh=b.naturalHeight*s; g.drawImage(b,(W-bw)/2,(H-bh)/2 - (bh-H)*0.1,bw,bh); } else { g.fillStyle='#1b1035'; g.fillRect(0,0,W,H); }
    const grd=g.createLinearGradient(0,0,0,H); grd.addColorStop(0,'rgba(10,5,30,.35)'); grd.addColorStop(.5,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(10,5,30,.55)'); g.fillStyle=grd; g.fillRect(0,0,W,H);
    // units sorted by y
    const units=this.all().slice().sort((a,b)=>a.y-b.y);
    for(const u of units) this.drawUnit(g,u,now);
    // particles (additive)
    g.globalCompositeOperation='lighter';
    for(let i=this.parts.length-1;i>=0;i--){ const p=this.parts[i]; p.life-=1/p.max; if(p.life<=0){ this.parts.splice(i,1); continue; }
      g.globalAlpha=Math.max(0,p.life);
      if(p.ring){ g.strokeStyle=p.color; g.lineWidth=4*p.life; g.beginPath(); g.arc(p.x,p.y,p.size+(1-p.life)*70,0,Math.PI*2); g.stroke(); continue; }
      if(p.slash){ g.save(); g.translate(p.x,p.y); g.rotate(p.ang); g.strokeStyle=p.color; g.lineWidth=7*p.life; g.lineCap='round'; g.beginPath(); g.arc(0,0,p.size*.6,-1.2+(1-p.life)*.6,0.6+(1-p.life)*1.2); g.stroke(); g.restore(); continue; }
      p.x+=p.vx; p.y+=p.vy; if(p.grav) p.vy+=p.grav; p.vx*=.97;
      const r=p.size*(0.4+p.life*.8); const rg=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2); rg.addColorStop(0,'#fff'); rg.addColorStop(.3,p.color); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.beginPath(); g.arc(p.x,p.y,r*2,0,Math.PI*2); g.fill(); }
    g.globalCompositeOperation='source-over'; g.globalAlpha=1;
    // damage numbers
    g.textAlign='center'; g.lineJoin='round';
    for(let i=this.floats.length-1;i>=0;i--){ const f=this.floats[i]; f.life+=1/60; if(f.life>1.1){ this.floats.splice(i,1); continue; }
      const pop = f.life<.12 ? 0.6+f.life/.12*0.6 : 1.2-Math.min(.2,(f.life-.12)); const y=f.y - f.life*46;
      g.globalAlpha=f.life>.8?Math.max(0,(1.1-f.life)/.3):1; g.font=`900 ${Math.round(f.size*pop)}px Kanit, sans-serif`;
      g.lineWidth=5; g.strokeStyle='rgba(20,0,30,.9)'; g.strokeText(f.txt,f.x,y); g.fillStyle=f.c; g.fillText(f.txt,f.x,y); }
    g.globalAlpha=1;
    // banner
    if(this.bannerT){ const t=(now-this.bannerT.t)/1000; if(t<1.6||this.over){ const a=this.over?Math.min(1,t*3):(t<.2?t/.2:t>1.3?(1.6-t)/.3:1);
      g.globalAlpha=Math.max(0,a); g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(0,A*.47,W,64); g.font=`900 ${this.over?44:32}px Kanit, sans-serif`; g.lineWidth=6; g.strokeStyle='#2a0b45'; g.strokeText(this.bannerT.txt,W/2,A*.47+46); g.fillStyle=this.bannerT.c; g.fillText(this.bannerT.txt,W/2,A*.47+46); g.globalAlpha=1; } }
    g.restore();
    if(this.flash>0){ g.globalAlpha=this.flash; g.fillStyle=this.flashColor; g.fillRect(0,0,W,H); g.globalAlpha=1; this.flash*=0.88; if(this.flash<.02) this.flash=0; }
    if(now-(this._ui||0)>120){ this._ui=now; this.ui && this.ui.refresh(); }
  }
  drawUnit(g,u,now){
    if(u.alpha<=0.01) return; const A=this.A, img=u.img; const hh=u.h*A*u.sc; const ratio = img.naturalWidth? img.naturalWidth/img.naturalHeight : .7; const ww=hh*ratio;
    const bob = u.alive? Math.sin(now/380 + u.slot*1.7)*2.5 : 0; const x=u.x+u.ox, y=u.y+u.oy;
    g.globalAlpha=u.alpha*.5; g.fillStyle='#000'; g.beginPath(); g.ellipse(x,y,ww*.38,hh*.06,0,0,Math.PI*2); g.fill();
    if(this.cur===u && !this.over){ g.globalAlpha=.8; g.strokeStyle= u.side==='hero'?'#7fe8ff':'#ff6b6b'; g.lineWidth=3; g.beginPath(); g.ellipse(x,y,ww*.45+Math.sin(now/120)*3,hh*.08,0,0,Math.PI*2); g.stroke(); }
    if(u.general||u.boss){ g.globalAlpha=u.alpha*.35; const rg=g.createRadialGradient(x,y-hh*.5,0,x,y-hh*.5,hh*.7); rg.addColorStop(0,ELEM[u.d.el].c); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(x-hh,y-hh*1.2,hh*2,hh*1.4); }
    g.globalAlpha=u.alpha;
    if(img.naturalWidth){ g.drawImage(img, x-ww/2, y-hh+bob, ww, hh); if(u.fl>0){ g.globalAlpha=u.alpha*u.fl*.8; g.globalCompositeOperation='lighter'; g.drawImage(img, x-ww/2, y-hh+bob, ww, hh); g.globalCompositeOperation='source-over'; u.fl*=0.85; if(u.fl<.05) u.fl=0; } }
    g.globalAlpha=u.alpha;
    if(u.alive){ // hp bar
      const bw=Math.max(56, ww*.7), bx=x-bw/2, by=y-hh-12+bob;
      g.fillStyle='rgba(0,0,0,.65)'; g.fillRect(bx-1,by-1,bw+2,8); g.fillStyle=u.side==='hero'?'#3ee87a':'#ff4d5e'; g.fillRect(bx,by,bw*u.hp/u.maxHp,6);
      if(u.shield>0){ g.fillStyle='rgba(230,240,255,.9)'; g.fillRect(bx,by-4,bw*Math.min(1,u.shield/u.maxHp),3); }
      if(u.side==='enemy'){ g.font='700 11px Kanit, sans-serif'; g.textAlign='center'; g.fillStyle=u.general?'#ffcf5a':'#fff'; g.strokeStyle='#000'; g.lineWidth=3; const nm=(u.general?'★ ':'')+u.name+' Lv.'+u.lvl; g.strokeText(nm,x,by-6); g.fillText(nm,x,by-6); }
      let ix=bx+bw+4; g.font='12px sans-serif'; g.textAlign='left';
      if(u.stun) { g.fillText('❄️',ix,by+7); ix+=14; } if(u.burn) { g.fillText('🔥',ix,by+7); ix+=14; } if(u.taunt){ g.fillText('🛡️',ix,by+7); ix+=14; } if(u.atkUp){ g.fillText('⚔️',ix,by+7); }
    }
    g.globalAlpha=1;
  }
}
