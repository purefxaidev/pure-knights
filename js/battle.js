// PURE Knights v2 — turn-based battle engine + cinematic canvas renderer
// responsive: landscape = allies left / enemies right (Seven Knights style); portrait = allies bottom / enemies top
'use strict';
const IMGS = {};
function IMG(p){ if(!IMGS[p]){ const i = new Image(); i.decoding='async'; i.src = 'assets/'+p; IMGS[p]=i; } return IMGS[p]; }
function preload(list){ return Promise.all(list.map(p=>new Promise(r=>{ const i=IMG(p); if(i.complete&&i.naturalWidth) r(); else { i.onload=r; i.onerror=r; } }))); }
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), ease=t=>1-Math.pow(1-t,3), lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
// ---- layered mesh-style idle: draw sprite in horizontal strips with cloth/hair sway + breathing deform ----
const MESH_N=30;
function drawMesh(g,img,ww,hh,t,ph,amp,br){
  const nw=img.naturalWidth, nh=img.naturalHeight, dy=hh/MESH_N, sh=nh/MESH_N;
  for(let i=0;i<MESH_N;i++){
    const f=i/MESH_N;
    const lean=Math.sin(t*.0009+ph)*(1-f)*.007;                       // slow body weight shift (top moves most)
    const cloth=Math.sin(t*.0017+ph+f*3.4)*(.2+f*f*1.1)*.0125 + Math.sin(t*.0031+ph*2+f*6)*f*.004; // skirt / cape / hair flutter
    const bell=Math.exp(-Math.pow((f-.32)/.14,2));                     // chest region
    const sx=1+br*.016*bell, ox=(lean+cloth)*amp*ww;
    const w=ww*sx;
    g.drawImage(img,0,i*sh,nw,sh+1,-w/2+ox,-hh+i*dy+br*dy*.35*(1-f),w,dy+.9);
  }
}

// ---- per-hero basic/skill attack styles (VFX) ----
const ATK_STYLE={
  tank:{s:'bash',c:'#ffd36b',c2:'#fff3b0'}, fighter:{s:'claw',c:'#ff8a3a',c2:'#ffe08a'}, mage:{s:'beam',c:'#7fd8ff',c2:'#ffffff'},
  marksman:{s:'arrow',c:'#8fb0ff',c2:'#ffffff'}, assassin:{s:'slash',c:'#b46bff',c2:'#ffd0ff'}, support:{s:'orb',c:'#ffe98a',c2:'#ffffff'},
  flame:{s:'thrust',c:'#ff6a2a',c2:'#ffd36b'}, thunder:{s:'arrow',c:'#7fa8ff',c2:'#ffffff'}, dragon:{s:'thrust',c:'#4dff9a',c2:'#d6ffe6'},
  sakura:{s:'slash',c:'#ff8fc0',c2:'#fff0f6'}, ocean:{s:'orb',c:'#4fc3ff',c2:'#e4fbff'}, valkyrie:{s:'thrust',c:'#fff1a8',c2:'#ffffff'},
  succubus:{s:'orb',c:'#c06bff',c2:'#ff9ae6'}, seline:{s:'thrust',c:'#ffc94d',c2:'#fff3b0'}, lucius:{s:'thrust',c:'#ff3a4a',c2:'#ffb0b0'},
  seraphina:{s:'slash',c:'#fff1a8',c2:'#ffffff'}, raven:{s:'slash',c:'#5aa2ff',c2:'#e0f0ff'}, veronica:{s:'beam',c:'#ff6f8f',c2:'#ffe0e8'},
  tiger:{s:'claw',c:'#ff9a3a',c2:'#ffe0a0'}, witch:{s:'beam',c:'#b46bff',c2:'#ffb3ff'}, demon:{s:'slash',c:'#ff2a3a',c2:'#ffb0b0'}
};
function styleOf(u){ const st=ATK_STYLE[u.id]; if(st) return st; const el=ELEM[u.d.el||'light']; return {s:u.big?'bash':(['mage','archer','support'].includes(u.d.role)?'orb':'claw'),c:el.c,c2:el.c2}; }
function drawWings(g,img,ww,hh,t,ph,br){ // dragon: vertical strips -> wings flap, body breathes, tail sways
  const N=34, nw=img.naturalWidth, nh=img.naturalHeight, dx=ww/N, sw=nw/N, fl=.5+.5*Math.sin(t*.0032+ph);
  for(let i=0;i<N;i++){ const fx=(i+.5)/N, edge=Math.abs(2*fx-1), lift=-Math.pow(edge,1.7)*hh*.075*fl, tail=fx>.72?Math.sin(t*.002+ph+fx*5)*(fx-.72)*hh*.12:0;
    g.drawImage(img,i*sw,0,sw+1,nh,-ww/2+i*dx,-hh+lift+tail+br*hh*.006,dx+.9,hh); }
}
const AURA_CACHE=new Map();
function auraFor(img,color,key){
  if(AURA_CACHE.has(key)) return AURA_CACHE.get(key); if(!img.naturalWidth) return null;
  const sc=Math.min(1,260/img.naturalHeight), w=Math.round(img.naturalWidth*sc), h=Math.round(img.naturalHeight*sc), pad=36;
  const c=document.createElement('canvas'); c.width=w+pad*2; c.height=h+pad*2; const x=c.getContext('2d');
  x.shadowColor=color; x.shadowBlur=26; x.shadowOffsetX=5000; x.drawImage(img,pad-5000,pad,w,h); x.drawImage(img,pad-5000,pad,w,h);
  const o={c,pad,sc}; AURA_CACHE.set(key,o); return o;
}

function heroStats(id, lvl, stars){
  const d = HEROES[id], m = (1+0.11*(lvl-1)) * (1+0.16*(stars-d.rar)) * (1+0.08*(d.rar-4));
  return {hp:Math.round(d.hp*m), atk:Math.round(d.atk*m), def:Math.round(d.def*(1+0.06*(lvl-1))), spd:d.spd + Math.floor(lvl/5)};
}
function power(id,lvl,stars,sk){ const s=heroStats(id,lvl,stars); const k=sk?(sk[0]+sk[1]-2)*0.04:0; return Math.round((s.hp*0.25+s.atk*3+s.def*2+s.spd)*(1+k)); }
function skillScale(sk, lv){ // returns scaled copy of a skill at level lv
  const f=1+0.1*(lv-1), o=Object.assign({},sk);
  if(o.mult) o.mult=+(o.mult*f).toFixed(2); if(o.pct) o.pct=+(o.pct*f).toFixed(2); if(o.teamShield) o.teamShield=+(o.teamShield*f).toFixed(2);
  ['stun','charm'].forEach(k=>{ if(o[k]) o[k]=+Math.min(0.9,o[k]+0.03*(lv-1)).toFixed(2); });
  if(o.lifesteal) o.lifesteal=+(o.lifesteal+0.02*(lv-1)).toFixed(2);
  if(o.cd && lv>=6) o.cd=Math.max(1,o.cd-1);
  return o;
}
let ULT_VIDEOS = {};
fetch('assets/ult/manifest.json').then(r=>r.ok?r.json():{}).then(j=>{ ULT_VIDEOS=j.videos||{}; }).catch(()=>{});

class Battle {
  constructor(opts){
    Object.assign(this, opts); // canvas, team:[{id,lvl,stars,sk}], stage, onEnd, ui
    this.cv=this.canvas; this.g=this.cv.getContext('2d');
    this.parts=[]; this.floats=[]; this.shake=0; this.flash=0; this.flashColor='#fff'; this.dark=0; this.darkColor='0,0,0';
    this.cam={z:1,fx:0,fy:0}; this.hitstop=0; this.videosShown={};
    this.speed=+(localStorage.getItem('pk_speed')||1); this.auto=localStorage.getItem('pk_auto')==='1';
    this.queue=[]; this.wave=0; this.over=false; this.ults=0; this.t0=performance.now();
    this.bg=IMG(this.stage.ch.bg);
    this.heroes=this.team.map((h,i)=>this.mkUnit(h.id,'hero',h.lvl,h.stars,i,h.sk)); this.enemies=[];
    this.resize(); this._rs=()=>this.resize(); addEventListener('resize',this._rs);
    this.raf=requestAnimationFrame(this.frame.bind(this));
  }
  resize(){ const dpr=Math.min(2,devicePixelRatio||1), r=this.cv.getBoundingClientRect(); this.W=r.width; this.H=r.height; this.cv.width=r.width*dpr; this.cv.height=r.height*dpr; this.g.setTransform(dpr,0,0,dpr,0,0);
    const p=document.getElementById('bpanel'); this.A=this.H-(p?p.offsetHeight*0.62:90); this.land=this.W>this.H*1.05;
    this.U = this.land ? Math.min(this.A*0.46, this.W*0.19) : Math.min(this.A*0.21, this.W*0.30);
    this.cam.fx=this.W/2; this.cam.fy=this.A/2; this.layout(this.heroes); this.layout(this.enemies); }
  mkUnit(rawId, side, lvl, stars, slot, sk){
    let id=rawId, d, s, h, big=false;
    if(side==='hero' || id.startsWith('@')){ id=id.replace('@',''); d=HEROES[id]; s=heroStats(id,lvl,stars||d.rar); h=d.general?1.2:1; }
    else { id=id.replace('!',''); d=MONS[id]; const m=1+0.13*(lvl-1); s={hp:Math.round(d.hp*m),atk:Math.round(d.atk*m),def:Math.round(d.def*m),spd:d.spd}; h=d.h; big=!!d.big; }
    sk = sk || [1+Math.floor(lvl/8),1+Math.floor(lvl/8)];
    const skill = d.skill? skillScale(d.skill, sk[0]) : null, ult = d.ult? skillScale(d.ult, sk[1]) : null;
    return {id, d, side, lvl, slot, name:d.name, maxHp:s.hp, hp:s.hp, atk:s.atk, def:s.def, spd:s.spd, img:IMG(d.spr), h, big, skill, ult,
      energy: side==='hero'?20:(big?40:0), cd:0, shield:0, stun:0, charm:0, burn:0, burnDmg:0, taunt:0, atkUp:0, alive:true, rage:false,
      ox:0, oy:0, sc:1, fl:0, alpha: side==='hero'?1:0, trail:[], ph:Math.random()*TAU, general:!!d.general, boss:!!d.boss};
  }
  layout(units){
    const W=this.W, A=this.A, n=units.length; if(!n) return;
    units.forEach((u,i)=>{
      const big=u.big;
      if(this.land){
        const L = u.side==='hero';
        const fy=[.62,.45,.84], by=[.50,.72];
        let x,y; if(big){ x=.72; y=.80; } else if(i<3){ x=L?.36:.66; y=fy[i]; } else { x=L?.16:.86; y=by[i-3]; }
        if(!L && n<=3 && !big){ x=.68+(i===0?0:.08); }
        u.x=W*x; u.y=A*y; u.dir=L?1:-1;
      } else {
        const L = u.side==='hero'; let x,y;
        if(big){ x=.5; y=.50; }
        else if(L){ if(i<3){ x=[.5,.2,.8][i]; y=.70; } else { x=[.33,.67][i-3]; y=.90; } }
        else { if(i<3){ x=[.5,.2,.8][i]; y=.40; } else { x=[.33,.67][i-3]; y=.27; } }
        u.x=W*x; u.y=A*y; u.dir=L?-1:1;
      }
      u.hpx = this.U*u.h;
    });
  }
  all(){ return this.heroes.concat(this.enemies); }
  foes(u){ return (u.side==='hero'?this.enemies:this.heroes).filter(x=>x.alive); }
  allies(u){ return (u.side==='hero'?this.heroes:this.enemies).filter(x=>x.alive); }
  wait(ms){ return new Promise(r=>setTimeout(r, ms/this.speed)); }
  tween(o, props, ms, ez=ease){ const from={}; for(const k in props) from[k]=o[k]; const t0=performance.now(), dur=Math.max(1,ms/this.speed);
    return new Promise(r=>{ const step=()=>{ const t=clamp((performance.now()-t0)/dur,0,1), e=ez(t); for(const k in props) o[k]=from[k]+(props[k]-from[k])*e; t<1?requestAnimationFrame(step):r(); }; step(); }); }
  camTo(z,fx,fy,ms){ return this.tween(this.cam,{z,fx:fx??this.W/2,fy:fy??this.A/2},ms); }
  top(u){ return u.y - u.hpx*0.55; } // chest point

  async run(){
    Voice.clip('narr_0','ด่านเริ่มต้นขึ้นแล้ว! เหล่าขุนพล จงออกรบ!');
    for(this.wave=0; this.wave<this.stage.waves.length; this.wave++){
      await this.spawnWave(this.stage.waves[this.wave]);
      while(!this.over){
        this.all().forEach(u=>u.jit=rnd(.93,1.07));
        const order=this.all().filter(u=>u.alive).sort((a,b)=>b.spd*b.jit-a.spd*a.jit);
        this.roundOrder=order;
        for(const u of order){
          if(this.over) return; if(!u.alive) continue;
          this.cur=u; this.ui&&this.ui.turn(this.upcoming());
          await this.act(u);
          if(!this.heroes.some(h=>h.alive)) return this.finish(false);
          if(!this.enemies.some(e=>e.alive)) break;
        }
        if(!this.enemies.some(e=>e.alive)) break;
      }
      if(this.over) return;
      if(this.wave<this.stage.waves.length-1){
        this.heroes.forEach(h=>{ if(h.alive){ h.hp=Math.min(h.maxHp,h.hp+h.maxHp*0.12); h.energy=Math.min(100,h.energy+15);} h.ox=h.oy=0; });
        this.banner(`คลื่นที่ ${this.wave+2}`); await this.wait(900);
      }
    }
    this.finish(true);
  }
  upcoming(){ const out=[]; const ro=this.roundOrder||[]; const idx=ro.indexOf(this.cur);
    for(let k=idx;k<ro.length;k++) if(ro[k].alive) out.push(ro[k]);
    const next=this.all().filter(u=>u.alive).sort((a,b)=>b.spd-a.spd); let j=0; while(out.length<9 && next.length) out.push(next[(j++)%next.length]); return out.slice(0,9); }
  async spawnWave(list){
    this.enemies=list.map((id,i)=>this.mkUnit(id,'enemy',this.stage.lvl+(id.startsWith('@')?2:0)+(id==='boss'?1:0),null,i));
    this.layout(this.enemies); this.ui&&this.ui.wave(this.wave+1,this.stage.waves.length);
    const gen=this.enemies.find(e=>e.general), boss=this.enemies.find(e=>e.big);
    this.enemies.forEach(e=>{ e.ox=(this.land?140:0); e.oy=(this.land?0:-60); });
    await Promise.all(this.enemies.map((e,i)=>this.wait(i*120).then(()=>this.tween(e,{alpha:1,ox:0,oy:0},520))));
    this.ui&&this.ui.boss(boss||gen||null);
    const star = boss||gen;
    if(star){
      this.banner(boss?`⚠ บอส: ${star.name}`:`ขุนพลปรากฏ! ${star.name}`, '#ff5a5a'); Voice.sfx('boss');
      Voice.clip(VKEY(star.id,'intro'), star.d.lines&&star.d.lines.intro, star.d);
      await this.camTo(1.35, star.x, this.top(star), 450); this.shake=10; this.burst(star.x,this.top(star),ELEM[star.d.el].c,70,8);
      await this.wait(1100); await this.camTo(1,null,null,400);
    }
  }
  pickTarget(u){ const f=this.foes(u); const t=f.filter(x=>x.taunt>0); if(t.length) return t[0];
    const front=f.filter(x=>x.slot<3||x.big); const pool=front.length?front:f; return pool[Math.floor(Math.random()*pool.length)]; }
  async act(u){
    if(u.burn>0){ u.burn--; this.damage(u,u.burnDmg,{color:'#ff8a3a',label:'ไหม้'}); this.burst(u.x,this.top(u),'#ff7a2f',14,3); if(!u.alive) return; await this.wait(200); }
    if(u.taunt>0) u.taunt--; if(u.atkUp>0) u.atkUp--;
    if(u.stun>0){ u.stun--; this.float(u.x,u.y-u.hpx,'ติดแข็ง!','#9fe8ff',18); await this.wait(420); return; }
    if(u.charm>0){ u.charm--; const mates=this.allies(u).filter(x=>x!==u); this.float(u.x,u.y-u.hpx,'💗 ตกหลุมรัก!','#ff8ad8',18);
      if(mates.length){ const t=mates[Math.floor(Math.random()*mates.length)]; await this.dashTo(u,t); const r=this.dmgCalc(u,t,0.8); this.damage(t,r.d,{crit:r.c}); this.impact(t,'#ff7ad9',1); await this.back(u); }
      else await this.wait(400); return; }
    if(u.big && !u.rage && u.hp<u.maxHp*0.5){ u.rage=true; u.atk=Math.round(u.atk*1.25); this.banner(`${u.name} คลั่ง!`, '#ff4040'); this.shake=14; this.flash=.5; this.flashColor='#ff3030'; await this.wait(700); }
    let action='atk';
    if(u.side==='hero'){
      const qi=this.queue.findIndex(q=>q.u===u);
      if(qi>=0){ const q=this.queue.splice(qi,1)[0]; if(q.type==='ult'&&u.energy>=100) action='ult'; else if(q.type==='skill'&&u.cd===0) action='skill'; }
      else if(this.auto){ if(u.energy>=100) action='ult'; else if(u.cd===0) action='skill'; }
    } else if(u.general||u.boss){ if(u.energy>=100 && u.ult) action='ult'; else if(u.cd===0 && u.skill) action='skill'; }
    if(action==='atk') await this.basic(u);
    else if(action==='skill'){ await this.useSkill(u,u.skill,false); u.cd=u.skill.cd; u.energy=Math.min(100,u.energy+12); }
    else { await this.useSkill(u,u.ult,true); u.energy=0; if(u.side==='hero') this.ults++; }
    if(action!=='skill' && u.cd>0) u.cd--;
    if(u.big) u.energy=Math.min(100,u.energy+18);
    this.ui&&this.ui.refresh(); await this.wait(140);
  }
  dmgCalc(u,t,mult,crit){ const atk=u.atk*(u.atkUp>0?1.3:1); let d=atk*mult*(100/(100+t.def))*rnd(.9,1.1); const c=crit||Math.random()<0.15; if(c) d*=1.6; return {d:Math.max(1,Math.round(d)),c}; }
  damage(t,amount,o={}){
    if(!t.alive) return 0; let a=amount;
    if(t.shield>0){ const s=Math.min(t.shield,a); t.shield-=s; a-=s; if(s>0) this.float(t.x+20,t.y-t.hpx*0.8,'🛡'+s,'#dfe9ff',14); }
    t.hp=Math.max(0,t.hp-a); t.fl=1; t.energy=Math.min(100,t.energy+8);
    this.float(t.x+rnd(-16,16), t.y-t.hpx*0.75, (o.label?o.label+' ':'')+a, o.color||(o.crit?'#ffe14d':'#fff'), o.crit?32:23, o.crit);
    if(t.hp<=0){ t.alive=false; this.burst(t.x,this.top(t),'#ffffff',36,6); this.tween(t,{alpha:0,sc:.7},520); Voice.sfx('boom'); }
    return a;
  }
  // ---- movement ----
  async dashTo(u,t,dist){ const off=(dist??(t.hpx*0.35+u.hpx*0.3)); let tx,ty;
    if(this.land){ tx=t.x - u.x - off*(u.side==='hero'?1:-1); ty=t.y-u.y+2; } else { tx=t.x-u.x; ty=t.y-u.y + off*(u.side==='hero'?1:-1); }
    u.dashing=true; Voice.sfx('dash'); await this.tween(u,{ox:tx,oy:ty},210,t=>t*t*(3-2*t)); u.dashing=false; }
  async back(u){ u.dashing=true; await this.tween(u,{ox:0,oy:0},230); u.dashing=false; }
  impact(t,color,power=1){ const x=t.x,y=this.top(t);
    this.parts.push({k:'flashd',x,y,life:1,max:10,size:t.hpx*0.35*power,color:'#fff'});
    for(let i=0;i<10*power;i++){ const a=rnd(0,TAU); this.parts.push({k:'line',x,y,a,len:rnd(20,60)*power,life:1,max:rnd(10,16),color}); }
    this.burst(x,y,color,16*power,5*power); this.slash(t,color);
    const kb = (t.side==='hero'?-1:1)*(this.land?14:0)*power, kv=(this.land?0:(t.side==='hero'?10:-10))*power;
    t.ox+=kb; t.oy+=kv; this.tween(t,{ox:0,oy:0},260);
    this.shake=Math.max(this.shake,5*power); this.hitstop=45*power; }
  // glowing weapon-arc / beam VFX for one strike. returns after the visual peak.
  async strikeFx(u,t,power=1){
    const st=styleOf(u), x=t.x, y=this.top(t), ux=u.x+u.ox, uy=this.top(u), face=u.side==='hero'?1:-1, R=Math.max(t.hpx*.9,60)*power;
    const cres=(ang,size,lw,delay=0)=>this.parts.push({k:'crescent',x:x+rnd(-8,8),y:y+rnd(-8,8),ang,size,color:st.c,color2:st.c2,life:1,max:20,delay,sweep:face});
    switch(st.s){
      case 'slash': cres(-.9,R*1.1,0); cres(.7,R*.95,0,3); break;
      case 'claw': for(let i=0;i<3;i++) this.parts.push({k:'streak',x0:x-R*.5+i*R*.18,y0:y-R*.55,x1:x+R*.45+i*R*.18,y1:y+R*.55,w:12*power,color:st.c,color2:st.c2,life:1,max:16,delay:i*2}); break;
      case 'thrust': this.parts.push({k:'streak',x0:ux,y0:uy,x1:x+face*R*.6,y1:y,w:20*power,color:st.c,color2:st.c2,life:1,max:16}); cres(-.2,R*1.2,0,2); break;
      case 'bash': this.parts.push({k:'ring',x,y,life:1,max:22,size:12,grow:R*1.1,color:st.c,lw:9,flat:.55}); this.parts.push({k:'ring',x,y,life:1,max:28,size:6,grow:R*1.5,color:st.c2,lw:4,flat:.55,delay:3}); cres(-1.2,R,0); break;
      case 'beam': this.parts.push({k:'streak',x0:ux,y0:uy,x1:x,y1:y,w:26*power,color:st.c,color2:st.c2,life:1,max:18}); break;
      case 'arrow': this.parts.push({k:'streak',x0:ux,y0:uy,x1:x,y1:y,w:9*power,color:st.c,color2:st.c2,life:1,max:12}); break;
      case 'orb': this.parts.push({k:'ring',x,y,life:1,max:24,size:10,grow:R*.9,color:st.c,lw:7}); this.parts.push({k:'streak',x0:x-R*.4,y0:y,x1:x+R*.4,y1:y,w:10,color:st.c2,color2:st.c,life:1,max:14}); break;
    }
    for(let i=0;i<14*power;i++){ const a=rnd(0,TAU), v=rnd(3,9); this.parts.push({k:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,life:1,max:rnd(18,32),size:rnd(3,6),color:i%2?st.c:st.c2}); }
    this.parts.push({k:'flashd',x,y,life:1,max:12,size:R*.55,color:st.c2});
  }
  async basic(u){
    const t=this.pickTarget(u); if(!t) return; const st=styleOf(u); const ranged=['beam','arrow','orb'].includes(st.s);
    if(ranged){ await this.projectile(u,t,st.c,st.s==='arrow'?.8:1.2); } else { await this.dashTo(u,t); }
    const r=this.dmgCalc(u,t,1); this.strikeFx(u,t,r.c?1.3:1); this.damage(t,r.d,{crit:r.c}); this.impact(t,st.c,r.c?1.4:1); Voice.sfx(ranged?'magic':'slash');
    await this.wait(80); if(!ranged) await this.back(u);
    u.energy=Math.min(100,u.energy+22);
  }
  async projectile(u,t,color,size){ const sx=u.x+u.ox, sy=this.top(u), ex=t.x, ey=this.top(t); const t0=performance.now(), dur=300/this.speed;
    await this.tween(u,{sc:1.06},90); this.tween(u,{sc:1},150);
    await new Promise(r=>{ const step=()=>{ const k=clamp((performance.now()-t0)/dur,0,1); const x=lerp(sx,ex,k), y=lerp(sy,ey,k)-Math.sin(k*Math.PI)*30;
      for(let i=0;i<3;i++) this.parts.push({x:x+rnd(-3,3),y:y+rnd(-3,3),vx:rnd(-.5,.5),vy:rnd(-.5,.5),life:1,max:rnd(14,24),size:(6+rnd(0,5))*size,color});
      k<1?requestAnimationFrame(step):r(); }; step(); });
  }
  applyHit(u,sk,t,mult,ult){ const el=ELEM[u.d.el||'light']; const r=this.dmgCalc(u,t,mult,sk.crit); const dealt=this.damage(t,r.d,{crit:r.c}); this.impact(t,el.c,ult?1.3:1);
    if(sk.burn&&t.alive){ t.burn=sk.burn; t.burnDmg=Math.round(u.atk*0.35); }
    if(sk.stun&&t.alive&&Math.random()<sk.stun){ t.stun=1; this.float(t.x,t.y-t.hpx-20,'แช่แข็ง','#bff3ff',15); }
    if(sk.charm&&t.alive&&Math.random()<sk.charm){ t.charm=1; this.hearts(t,6); }
    if(sk.lifesteal){ u.hp=Math.min(u.maxHp,u.hp+dealt*sk.lifesteal); }
    return dealt; }
  async useSkill(u,sk,ult){
    const el=ELEM[u.d.el||'light'];
    if(ult){ await this.ultIntro(u,sk); }
    else { this.float(u.x,u.y-u.hpx-8,sk.name,el.c2,17); this.ring(u.x,this.top(u),el.c); this.parts.push({k:'glyph',x:u.x,y:u.y,size:u.hpx*.55,color:styleOf(u).c,life:1,max:46}); if(u.side==='hero'||u.general) Voice.clip(VKEY(u.id,'skill'),u.d.lines.skill,u.d); await this.wait(220); }
    const foes=this.foes(u);
    if(ult && sk.fx && FX[sk.fx]){ await FX[sk.fx](this,u,sk,foes); }
    else switch(sk.kind){
      case 'hit': case 'lowest': { const t=sk.kind==='lowest'?foes.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]:this.pickTarget(u); if(!t) break;
        if(['mage','archer'].includes(u.d.role)) await this.projectile(u,t,el.c,1.8); else await this.dashTo(u,t);
        this.strikeFx(u,t,1.5); this.applyHit(u,sk,t,sk.mult,ult); Voice.sfx('slash'); await this.wait(90); await this.back(u); break; }
      case 'multi': for(let i=0;i<sk.hits;i++){ const f=this.foes(u); if(!f.length) break; const t=f[Math.floor(Math.random()*f.length)];
          await this.projectile(u,t,styleOf(u).c,1.3); this.strikeFx(u,t,1.1); this.applyHit(u,sk,t,sk.mult,ult); Voice.sfx('hit'); } break;
      case 'aoe': { await this.tween(u,{sc:1.12},180); this.flash=.4; this.flashColor=el.c2; Voice.sfx('boom');
        for(const t of foes) this.ring(t.x,this.top(t),el.c); await this.wait(160); for(const t of foes) this.applyHit(u,sk,t,sk.mult,ult); await this.tween(u,{sc:1},200); break; }
      case 'heal': this.heal(u,sk); break;
      case 'shield': { u.shield+=Math.round(u.maxHp*sk.pct); u.taunt=sk.taunt||0; this.ring(u.x,this.top(u),'#fff1a8'); this.float(u.x,u.y-u.hpx,'ยั่วยุ + โล่','#fff1a8',18); Voice.sfx('magic'); break; }
    }
    if(sk.teamShield) for(const a of this.allies(u)){ a.shield+=Math.round(a.maxHp*sk.teamShield); this.ring(a.x,this.top(a),'#fff1a8'); }
    if(sk.atkUp && sk.kind!=='heal'){ for(const a of this.allies(u)) a.atkUp=sk.atkUp; this.banner('พลังโจมตีทีม +30%','#ffd36b'); }
    if(ult) await this.camTo(1,null,null,300);
  }
  heal(u,sk){ Voice.sfx('heal'); const side=u.side==='hero'?this.heroes:this.enemies;
    if(sk.revive) for(const d of side.filter(x=>!x.alive)){ d.alive=true; d.hp=Math.round(d.maxHp*0.35); this.tween(d,{alpha:1,sc:1},400); this.float(d.x,d.y-d.hpx,'ฟื้นคืนชีพ!','#ffe98a',20); }
    for(const a of side.filter(x=>x.alive)){ const h=Math.round(u.atk*sk.mult*rnd(.95,1.05)); a.hp=Math.min(a.maxHp,a.hp+h); this.float(a.x,a.y-a.hpx*.7,'+'+h,'#6dff9e',22); this.rise(a,'#7dffb0'); if(sk.atkUp) a.atkUp=sk.atkUp; }
    if(sk.atkUp) this.banner('พลังโจมตีทีม +30%','#ffd36b'); }
  // ---- ultimate intro: per-hero video (assets/ult/<id>.mp4 listed in manifest) or CSS cut-in ----
  async ultIntro(u,sk){
    const el=ELEM[u.d.el||'light'];
    Voice.sfx('ult'); Voice.clip(VKEY(u.id,'ult'), u.d.lines&&u.d.lines.ult, u.d);
    const vmode=localStorage.getItem('pk_ultvid')||'first';
    const vid=ULT_VIDEOS[u.id];
    if(vid && vmode!=='off' && !(vmode==='first'&&this.videosShown[u.id])){ this.videosShown[u.id]=1; const ok=await playUltVideo('assets/ult/'+vid, u, sk); if(ok){ await this.camTo(1.15,u.x,this.top(u),200); return; } }
    await this.camTo(1.25,u.x,this.top(u),260);
    await cutIn(u,sk,el,this.speed);
    this.flash=.7; this.flashColor='#fff';
  }
  // ---- FX helpers ----
  burst(x,y,c,n,sp){ for(let i=0;i<n;i++){ const a=rnd(0,TAU), v=rnd(1,sp); this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:1,max:rnd(20,45),size:rnd(2,6),color:c,grav:.08}); } }
  ring(x,y,c,s=10){ this.parts.push({k:'ring',x,y,life:1,max:28,size:s,color:c,grow:70}); this.parts.push({k:'ring',x,y,life:1,max:40,size:4,color:'#fff',grow:70}); }
  slash(t,c){ this.parts.push({k:'slash',x:t.x,y:this.top(t),ang:rnd(-1,1),life:1,max:16,size:t.hpx*0.6,color:c}); }
  rise(u,c){ for(let i=0;i<18;i++) this.parts.push({x:u.x+rnd(-25,25),y:u.y-rnd(0,20),vx:0,vy:rnd(-2.5,-1),life:1,max:rnd(30,50),size:rnd(2,5),color:c}); }
  hearts(t,n){ for(let i=0;i<n;i++) this.parts.push({k:'heart',x:t.x+rnd(-20,20),y:this.top(t)+rnd(-10,10),vx:rnd(-.6,.6),vy:rnd(-2,-.8),life:1,max:rnd(40,60),size:rnd(7,13),color:Math.random()<.5?'#ff6fd0':'#c77dff'}); }
  float(x,y,txt,c,size,crit){ this.floats.push({x,y,txt,c,size,life:0,crit}); }
  banner(txt,c){ this.bannerT={txt,c:c||'#ffe58a',t:performance.now()}; }
  finish(win){ if(this.over) return; this.over=true; this.win=win; this.banner(win?'ชัยชนะ!':'พ่ายแพ้...', win?'#ffe14d':'#ff6b6b');
    if(win){ Voice.sfx('coin'); const h=this.heroes.find(h=>h.alive); if(h) Voice.clip(VKEY(h.id,'win'),h.d.lines.win,h.d); for(let i=0;i<6;i++) setTimeout(()=>this.burst(rnd(40,this.W-40),rnd(60,this.A*.6),['#ffe14d','#ff7ad9','#7fe8ff'][i%3],50,7),i*180); }
    else Voice.clip('narr_2','พ่ายแพ้... แต่ตำนานยังไม่จบ จงลุกขึ้นสู้อีกครั้ง');
    setTimeout(()=>this.onEnd({win,ults:this.ults,stage:this.stage,time:(performance.now()-this.t0)/1000}),1600); }
  destroy(){ this.over=true; cancelAnimationFrame(this.raf); removeEventListener('resize',this._rs); }
  // ---- render ----
  frame(now){
    const g=this.g, W=this.W, H=this.H, A=this.A; this.raf=requestAnimationFrame(this.frame.bind(this));
    g.save();
    if(this.shake>0){ g.translate(rnd(-this.shake,this.shake),rnd(-this.shake,this.shake)); this.shake*=0.86; if(this.shake<.4) this.shake=0; }
    // camera
    const c=this.cam; g.translate(W/2,A/2); g.scale(c.z,c.z); g.translate(-c.fx,-c.fy);
    const b=this.bg; if(b.naturalWidth){ const s=Math.max(W/b.naturalWidth,H/b.naturalHeight)*1.08; const bw=b.naturalWidth*s, bh=b.naturalHeight*s; g.drawImage(b,(W-bw)/2,(H-bh)/2-(this.land?0:(bh-H)*0.05),bw,bh); } else { g.fillStyle='#1b1035'; g.fillRect(0,0,W,H); }
    const grd=g.createLinearGradient(0,0,0,H); grd.addColorStop(0,'rgba(10,5,30,.25)'); grd.addColorStop(.6,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(10,5,30,.6)'); g.fillStyle=grd; g.fillRect(-W,-H,W*3,H*3);
    // ambient motes
    if(Math.random()<.3) this.parts.push({x:rnd(0,W),y:A+10,vx:rnd(-.3,.3),vy:rnd(-.8,-.3),life:1,max:rnd(120,220),size:rnd(1,2.5),color:'#ffe9a8',amb:1});
    if(this.dark>0.01){ g.fillStyle=`rgba(${this.darkColor},${this.dark})`; g.fillRect(-W,-H,W*3,H*3); }
    const units=this.all().slice().sort((a,b)=>(a.y+a.oy)-(b.y+b.oy));
    for(const u of units) this.drawUnit(g,u,now);
    this.drawParts(g);
    this.drawFloats(g);
    g.restore();
    // banner (screen space)
    if(this.bannerT){ const t=(now-this.bannerT.t)/1000; if(t<1.6||this.over){ const a=this.over?Math.min(1,t*3):(t<.2?t/.2:t>1.3?(1.6-t)/.3:1);
      const by=this.land?A*.12:A*.47; g.globalAlpha=Math.max(0,a); const gr=g.createLinearGradient(0,0,W,0); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(.5,'rgba(0,0,0,.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,by,W,64);
      g.textAlign='center'; g.font=`900 ${this.over?46:30}px Kanit, sans-serif`; g.lineWidth=6; g.strokeStyle='#2a0b45'; g.strokeText(this.bannerT.txt,W/2,by+46); g.fillStyle=this.bannerT.c; g.fillText(this.bannerT.txt,W/2,by+46); g.globalAlpha=1; } }
    if(this.flash>0){ g.globalAlpha=this.flash; g.fillStyle=this.flashColor; g.fillRect(0,0,W,H); g.globalAlpha=1; this.flash*=0.88; if(this.flash<.02) this.flash=0; }
    if(now-(this._ui||0)>120){ this._ui=now; this.ui&&this.ui.refresh(); }
  }
  drawParts(g){
    g.globalCompositeOperation='lighter';
    for(let i=this.parts.length-1;i>=0;i--){ const p=this.parts[i]; if(p.delay>0){ p.delay--; continue; } p.life-=1/p.max; if(p.life<=0){ this.parts.splice(i,1); continue; }
      g.globalAlpha=Math.max(0,Math.min(1,p.life*(p.amb?0.8:1.4)));
      switch(p.k){
        case 'crescent': { const k=1-p.life, r=p.size*(.7+k*.5), a0=p.ang-1.1+k*.7*p.sweep, a1=p.ang+1.1+k*.7*p.sweep; g.save(); g.translate(p.x,p.y); g.globalCompositeOperation='lighter'; g.shadowColor=p.color; g.shadowBlur=22;
          g.fillStyle=p.color; g.beginPath(); g.arc(0,0,r,a0,a1); g.arc(r*.22*Math.cos(p.ang),r*.22*Math.sin(p.ang),r*.86,a1,a0,true); g.closePath(); g.fill();
          g.strokeStyle=p.color2; g.lineWidth=3*p.life+1; g.beginPath(); g.arc(0,0,r*.99,a0+.1,a1-.1); g.stroke(); g.restore(); break; }
        case 'streak': { g.save(); g.globalCompositeOperation='lighter'; g.lineCap='round'; g.shadowColor=p.color; g.shadowBlur=26; g.strokeStyle=p.color; g.lineWidth=p.w*p.life; g.beginPath(); g.moveTo(p.x0,p.y0); g.lineTo(p.x1,p.y1); g.stroke();
          g.shadowBlur=0; g.strokeStyle=p.color2; g.lineWidth=Math.max(1.5,p.w*.35*p.life); g.stroke(); g.restore(); break; }
        case 'glyph': { const k=1-p.life, r=p.size*(.8+k*.5); g.save(); g.translate(p.x,p.y+4); g.scale(1,.32); g.globalCompositeOperation='lighter'; g.strokeStyle=p.color; g.shadowColor=p.color; g.shadowBlur=14; g.lineWidth=3;
          g.beginPath(); g.arc(0,0,r,0,TAU); g.stroke(); g.beginPath(); g.arc(0,0,r*.72,0,TAU); g.stroke(); g.rotate(k*5);
          for(let i=0;i<6;i++){ g.rotate(TAU/6); g.beginPath(); g.moveTo(r*.72,0); g.lineTo(r*.98,0); g.stroke(); } g.beginPath(); for(let i=0;i<3;i++){ const a=i*TAU/3; g.lineTo(Math.cos(a)*r*.72,Math.sin(a)*r*.72);} g.closePath(); g.stroke(); g.restore(); break; }
        case 'ring': g.strokeStyle=p.color; g.lineWidth=(p.lw||4)*p.life; g.beginPath(); g.ellipse(p.x,p.y,p.size+(1-p.life)*p.grow,(p.size+(1-p.life)*p.grow)*(p.flat||1),0,0,TAU); g.stroke(); break;
        case 'slash': { g.save(); g.translate(p.x,p.y); g.rotate(p.ang); g.strokeStyle=p.color; g.lineWidth=(p.lw||7)*p.life; g.lineCap='round'; g.shadowColor=p.color; g.shadowBlur=12; g.beginPath(); g.arc(0,0,p.size*.6,-1.2+(1-p.life)*.6,0.6+(1-p.life)*1.2); g.stroke(); g.restore(); break; }
        case 'line': { const d=(1-p.life)*p.len; g.strokeStyle=p.color; g.lineWidth=3*p.life; g.beginPath(); g.moveTo(p.x+Math.cos(p.a)*d,p.y+Math.sin(p.a)*d); g.lineTo(p.x+Math.cos(p.a)*(d+p.len*.6),p.y+Math.sin(p.a)*(d+p.len*.6)); g.stroke(); break; }
        case 'flashd': { const rg=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.beginPath(); g.arc(p.x,p.y,p.size*(1.4-p.life*.4),0,TAU); g.fill(); break; }
        case 'bolt': { g.strokeStyle=p.color; g.shadowColor=p.color; g.shadowBlur=18; g.lineWidth=5*p.life+1; g.beginPath(); g.moveTo(p.pts[0][0],p.pts[0][1]); for(const q of p.pts) g.lineTo(q[0],q[1]); g.stroke(); g.strokeStyle='#fff'; g.lineWidth=2; g.stroke(); g.shadowBlur=0; break; }
        case 'beam': { const w=p.w*(0.4+p.life*.6); const gr=g.createLinearGradient(p.x-w,0,p.x+w,0); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(.5,p.color); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(p.x-w,p.y-p.h,w*2,p.h); break; }
        case 'heart': { p.x+=p.vx; p.y+=p.vy; const s=p.size; g.fillStyle=p.color; g.beginPath(); g.moveTo(p.x,p.y+s*.3); g.bezierCurveTo(p.x-s,p.y-s*.5,p.x-s*.4,p.y-s*1.1,p.x,p.y-s*.5); g.bezierCurveTo(p.x+s*.4,p.y-s*1.1,p.x+s,p.y-s*.5,p.x,p.y+s*.3); g.fill(); break; }
        case 'petal': { p.x+=p.vx; p.y+=p.vy+Math.sin(p.life*12+p.ph)*.6; p.rot=(p.rot||0)+.12; g.save(); g.translate(p.x,p.y); g.rotate(p.rot); g.fillStyle=p.color; g.beginPath(); g.ellipse(0,0,p.size,p.size*.5,0,0,TAU); g.fill(); g.restore(); break; }
        case 'shard': { p.x+=p.vx; p.y+=p.vy; p.vy+=.15; g.save(); g.translate(p.x,p.y); g.rotate(Math.atan2(p.vy,p.vx)); g.fillStyle=p.color; g.beginPath(); g.moveTo(p.size,0); g.lineTo(-p.size*.6,p.size*.35); g.lineTo(-p.size*.6,-p.size*.35); g.fill(); g.restore(); break; }
        case 'wave': { const x=lerp(p.x0,p.x1,1-p.life); const gr=this.land? g.createLinearGradient(x-p.w,0,x+p.w,0) : g.createLinearGradient(0,x-p.w,0,x+p.w); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(.7,p.color); gr.addColorStop(1,'rgba(255,255,255,.9)');
          g.fillStyle=gr; if(this.land) g.fillRect(x-p.w,p.top,p.w*1.1,p.bot-p.top); else g.fillRect(-this.W,x-p.w,this.W*3,p.w*1.1); break; }
        default: { if(p.vx!==undefined){ p.x+=p.vx; p.y+=p.vy; if(p.grav) p.vy+=p.grav; p.vx*=.97; }
          const r=p.size*(0.4+p.life*.8); const rg=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2); rg.addColorStop(0,'#fff'); rg.addColorStop(.3,p.color); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.beginPath(); g.arc(p.x,p.y,r*2,0,TAU); g.fill(); }
      }
    }
    g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  }
  drawFloats(g){ g.textAlign='center'; g.lineJoin='round';
    for(let i=this.floats.length-1;i>=0;i--){ const f=this.floats[i]; f.life+=1/60; if(f.life>1.2){ this.floats.splice(i,1); continue; }
      const pop=f.life<.12?0.6+f.life/.12*0.7:1.3-Math.min(.3,(f.life-.12)); const y=f.y-f.life*50;
      g.globalAlpha=f.life>.9?Math.max(0,(1.2-f.life)/.3):1;
      if(f.crit){ const sz=Math.round(f.size*1.55*pop); g.save(); g.translate(f.x,y); g.transform(1,0,-.18,1,0,0);
        g.font=`italic 900 ${Math.round(sz*.42)}px Kanit, sans-serif`; g.lineWidth=5; g.strokeStyle='rgba(60,10,0,.95)'; g.strokeText('Critical!',0,-sz*.78); g.fillStyle='#fff3b0'; g.fillText('Critical!',0,-sz*.78);
        g.font=`italic 900 ${sz}px Kanit, sans-serif`; g.lineWidth=9; g.strokeStyle='rgba(70,20,0,.97)'; g.strokeText(f.txt,0,0); const gr=g.createLinearGradient(0,-sz*.8,0,sz*.1); gr.addColorStop(0,'#fff6c2'); gr.addColorStop(.5,'#ffc83a'); gr.addColorStop(1,'#d9770a');
        g.shadowColor='#ff9a00'; g.shadowBlur=18; g.fillStyle=gr; g.fillText(f.txt,0,0); g.restore(); continue; }
      g.font=`900 ${Math.round(f.size*pop)}px Kanit, sans-serif`;
      g.lineWidth=6; g.strokeStyle='rgba(30,0,40,.95)'; g.strokeText(f.txt,f.x,y); g.fillStyle=f.c; g.fillText(f.txt,f.x,y); }
    g.globalAlpha=1; }
  drawUnit(g,u,now){
    if(u.alpha<=0.01) return; const img=u.img; const hh=u.hpx*u.sc; const ratio=img.naturalWidth?img.naturalWidth/img.naturalHeight:.7; const ww=hh*ratio;
    const br=u.alive?Math.sin(now/520+u.ph):0; const sy=1+br*0.018, sx=1-br*0.008; const x=u.x+u.ox, y=u.y+u.oy;
    // afterimages while dashing
    if(u.dashing){ u.trail.push([x,y]); if(u.trail.length>6) u.trail.shift(); } else if(u.trail.length) u.trail.shift();
    g.globalAlpha=u.alpha*.45; g.fillStyle='#000'; g.beginPath(); g.ellipse(x,y,ww*.36,hh*.05,0,0,TAU); g.fill();
    if(this.cur===u&&!this.over){ g.globalAlpha=.9; const col=u.side==='hero'?'#7fe8ff':'#ff6b6b'; g.strokeStyle=col; g.shadowColor=col; g.shadowBlur=12; g.lineWidth=3; g.beginPath(); g.ellipse(x,y,ww*.42+Math.sin(now/120)*3,hh*.07,0,0,TAU); g.stroke(); g.shadowBlur=0; }
    if(u.general||u.boss||u.d.tier==='UR'){ g.globalAlpha=u.alpha*(.28+.1*Math.sin(now/300)); const rg=g.createRadialGradient(x,y-hh*.5,0,x,y-hh*.5,hh*.7); rg.addColorStop(0,ELEM[u.d.el].c); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(x-hh,y-hh*1.2,hh*2,hh*1.4); }
    if(img.naturalWidth){
      const flip = (this.land && u.side==='enemy' && !u.d.lines && !u.d.faceL) ? -1 : 1; // monsters face left in landscape
      u.trail.forEach((p,i)=>{ g.globalAlpha=u.alpha*(i+1)/u.trail.length*.25; g.save(); g.translate(p[0],p[1]); g.scale(flip,1); g.drawImage(img,-ww/2,-hh,ww,hh); g.restore(); });
      // rarity aura (SR+ / bosses / generals): pulsing coloured glow hugging the silhouette + rising sparkles
      const tcol = u.boss||u.general ? ELEM[u.d.el].c : (u.d.tier&&u.d.tier!=='R' ? TIERS[u.d.tier].c : null);
      if(tcol && u.alive){ const au=auraFor(img,tcol,u.id+tcol); if(au){ const k=hh/(au.c.height-au.pad*2)*1; g.save(); g.translate(x,y); g.scale(flip,1); g.globalCompositeOperation='lighter';
          g.globalAlpha=u.alpha*((u.d.tier==='UR'?.85:.55)+.2*Math.sin(now/380+u.ph)); const aw=au.c.width*(hh/(img.naturalHeight*au.sc)), ah=au.c.height*(hh/(img.naturalHeight*au.sc));
          g.drawImage(au.c,-aw/2,-hh-au.pad*(hh/(img.naturalHeight*au.sc)),aw,ah); g.restore(); }
        if((u.d.tier==='UR'||u.d.tier==='SSR'||u.boss)&&Math.random()<(u.d.tier==='UR'?.35:.18)) this.parts.push({x:x+rnd(-ww*.3,ww*.3),y:y-rnd(0,hh*.9),vx:rnd(-.2,.2),vy:rnd(-.9,-.3),life:1,max:rnd(40,70),size:rnd(2.5,5),color:tcol,amb:true}); }
      g.globalAlpha=u.alpha; g.save(); g.translate(x,y); g.scale(flip,sy*(1+(u.lunge||0)*.02)); const amp=u.d.lines?1:(u.big?.55:.5);
      if(u.d.faceL&&u.alive) drawWings(g,img,ww,hh,now,u.ph,br); else drawMesh(g,img,ww,hh,now,u.ph,u.alive?amp:0,br);
      if(u.fl>0){ g.globalAlpha=u.alpha*u.fl*.85; g.globalCompositeOperation='lighter'; g.drawImage(img,-ww/2,-hh,ww,hh); g.globalCompositeOperation='source-over'; u.fl*=0.84; if(u.fl<.05) u.fl=0; }
      g.restore();
    }
    g.globalAlpha=u.alpha;
    if(u.alive && !u.big){
      const bw=Math.max(54,Math.min(110,ww*.75)), bx=x-bw/2, by=y-hh-10;
      g.fillStyle='rgba(0,0,0,.7)'; g.fillRect(bx-1,by-1,bw+2,8); g.fillStyle=u.side==='hero'?'#3ee87a':'#ff4d5e'; g.fillRect(bx,by,bw*u.hp/u.maxHp,6);
      if(u.shield>0){ g.fillStyle='rgba(230,240,255,.9)'; g.fillRect(bx,by-4,bw*Math.min(1,u.shield/u.maxHp),3); }
      if(u.side==='enemy'){ g.font='700 11px Kanit, sans-serif'; g.textAlign='center'; g.fillStyle=u.general?'#ffcf5a':'#fff'; g.strokeStyle='#000'; g.lineWidth=3; const nm=(u.general?'★ ':'')+u.name+' Lv.'+u.lvl; g.strokeText(nm,x,by-6); g.fillText(nm,x,by-6); }
      this.drawStatus(g,u,bx+bw+4,by+7);
    } else if(u.alive) this.drawStatus(g,u,x-20,y-hh);
    g.globalAlpha=1;
  }
  drawStatus(g,u,ix,iy){ g.font='12px sans-serif'; g.textAlign='left';
    if(u.stun){ g.fillText('❄️',ix,iy); ix+=14; } if(u.charm){ g.fillText('💗',ix,iy); ix+=14; } if(u.burn){ g.fillText('🔥',ix,iy); ix+=14; } if(u.taunt){ g.fillText('🛡️',ix,iy); ix+=14; } if(u.atkUp){ g.fillText('⚔️',ix,iy); } }
}

// ===== CSS cut-in (fallback / default) =====
function cutIn(u,sk,el,speed){
  const box=document.getElementById('cutin'); if(!box) return Promise.resolve();
  box.className=''; box.style.setProperty('--c',el.c); box.style.setProperty('--c2',el.c2);
  box.querySelector('.ci-art').src='assets/'+(u.d.art||u.d.spr);
  box.querySelector('.ci-name').textContent=u.name; box.querySelector('.ci-skill').textContent=sk.name;
  box.dataset.fx=sk.fx||''; void box.offsetWidth; box.className='show '+(u.side==='hero'?'':'enemy');
  return new Promise(r=>setTimeout(()=>{ box.className=''; r(); }, Math.max(1100,1600/speed)));
}
// ===== Ultimate video player (drop files in assets/ult/ + list in manifest.json) =====
function playUltVideo(src,u,sk){
  return new Promise(res=>{
    const ov=document.getElementById('ultvid'), v=ov.querySelector('video'); let done=false;
    const end=(ok)=>{ if(done) return; done=true; v.pause(); ov.classList.remove('on'); clearTimeout(to); clearTimeout(maxT); res(ok); };
    ov.querySelector('.uv-name').textContent=sk.name; ov.classList.add('on');
    v.muted=true; v.playsInline=true; v.src=src;
    const to=setTimeout(()=>{ if(v.readyState<3) end(false); }, 1800);  // slow network -> CSS cut-in
    const maxT=setTimeout(()=>end(true), 16000);
    v.onended=()=>end(true); v.onerror=()=>end(false);
    ov.querySelector('.uv-skip').onclick=()=>end(true); ov.onclick=(e)=>{ if(e.target===ov) end(true); };
    v.play().catch(()=>end(false));
  });
}
