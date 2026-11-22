// PURE Knights v2 — lobby, screens, guest save, economy (PURE ledger), gacha tiers, skill upgrades, story, capture, settings
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toLocaleDateString('en-CA');
const fmt=n=>(+n).toLocaleString('th-TH',{maximumFractionDigits:2});
const SAVE_KEY='pk_save_v1', STAM_MAX=150, STAM_COST=6, STAM_REGEN_MS=120000;
let S;
const newEntry=(id)=>({lvl:1,stars:HEROES[id].rar,shards:0,sk:[1,1]});
const STARTER=['seline','lucius','seraphina','raven','veronica'];
function newSave(){ const r={}; STARTER.forEach(id=>r[id]=newEntry(id));
  return {v:3,pure:0,gems:600,gold:5000,talisman:1,books:5,cleared:0,stam:STAM_MAX,stamT:Date.now(),exp:0,roster:r,team:STARTER.slice(),
    q:{date:'',prog:{},claimed:{}},pureDay:{date:'',amt:0},hist:[],wallet:'',checkin:'',storySeen:{},stats:{wins:0,captures:0,battles:0}}; }
function migrate(o){ if(!o) return null; if(o.v===1){ o.v=2; o.books=o.books||5; o.stam=STAM_MAX; o.stamT=Date.now(); o.exp=(o.stats?.wins||0)*20; o.checkin=''; o.storySeen={};
    for(const id of Object.keys(o.roster)){ if(!HEROES[id]){ delete o.roster[id]; continue; } const e=o.roster[id]; e.sk=e.sk||[1,1]; e.stars=Math.max(e.stars,HEROES[id].rar); } o.team=o.team.filter(id=>o.roster[id]); }
  if(o.v===2){ o.v=3; STARTER.forEach(id=>{ if(!o.roster[id]) o.roster[id]=newEntry(id); });
    const old=['tank','fighter','marksman','support']; if(o.team&&o.team.length&&o.team.every(id=>old.includes(id))) o.team=STARTER.slice(); }
  return (o.v===2||o.v===3)?o:null; }
function load(){ try{ S=migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); }catch(e){ S=null; } if(!S) S=newSave(); dailyReset(); regen(); save(); }
function save(){ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); renderTop(); }
function regen(){ const now=Date.now(); if(S.stam>=STAM_MAX){ S.stamT=now; return; } const n=Math.floor((now-S.stamT)/STAM_REGEN_MS); if(n>0){ S.stam=Math.min(STAM_MAX,S.stam+n); S.stamT+=n*STAM_REGEN_MS; } }
function dailyReset(){ const d=today(); if(S.q.date!==d) S.q={date:d,prog:{},claimed:{}}; if(S.pureDay.date!==d) S.pureDay={date:d,amt:0}; if(!S.q.prog.login) questProg('login',1); }
function questProg(id,n=1){ S.q.prog[id]=(S.q.prog[id]||0)+n; }
// PURE ledger — in-game balance only (no real token). Daily cap.
function earnPure(amt,why){ const room=Math.max(0,DAILY_PURE_CAP-S.pureDay.amt); const a=+Math.min(room,amt).toFixed(2); if(a<=0) return 0;
  S.pure=+(S.pure+a).toFixed(2); S.pureDay.amt=+(S.pureDay.amt+a).toFixed(2); S.hist.unshift({t:Date.now(),amt:a,why}); S.hist=S.hist.slice(0,80); return a; }
function toast(t,ms=1800){ const e=$('#toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>e.classList.remove('on'),ms); }
function modal(html,cls=''){ const m=$('#modal'), b=m.querySelector('.modal-box'); b.innerHTML=html; b.className='modal-box '+cls; m.classList.add('on'); return b; }
function closeModal(){ $('#modal').classList.remove('on'); }
const stars=n=>'★'.repeat(n);
const accLv=()=>1+Math.floor(S.exp/100);
function renderTop(){ regen(); $('#r-pure').textContent=fmt(S.pure); $('#r-gems').textContent=fmt(S.gems); $('#r-gold').textContent=fmt(S.gold); $('#r-stam').textContent=`${S.stam}/${STAM_MAX}`;
  const ready=QUESTS.some(q=>(S.q.prog[q.id]||0)>=q.goal&&!S.q.claimed[q.id]); $('#q-dot').classList.toggle('on',ready); $('#ci-dot').classList.toggle('on',S.checkin!==today()); }
function teamPower(){ return S.team.reduce((a,id)=>a+power(id,S.roster[id].lvl,S.roster[id].stars,S.roster[id].sk),0); }
const isLand=()=>innerWidth>innerHeight*1.05;

// ---------- navigation ----------
let curScreen='home', curArg=null;
const TITLES={map:'แผนที่โลก',heroes:'ตัวละคร',hero:'ข้อมูลฮีโร่',collection:'คอลเลกชัน',summon:'อัญเชิญ',quests:'ภารกิจ',wallet:'กระเป๋า PURE',settings:'ตั้งค่า'};
function go(name,arg){
  if(curScreen==='battle'&&name!=='battle'&&window.battle){ battle.destroy(); window.battle=null; }
  $$('.screen').forEach(s=>s.classList.remove('active')); $('#'+name).classList.add('active'); curScreen=name; curArg=arg;
  document.body.classList.toggle('sub', name!=='home'); $('#topbar').style.display=name==='battle'?'none':'';
  $('#tb-title').textContent=TITLES[name]||''; $('#tb-back').dataset.go = name==='hero' ? 'heroes' : 'home';
  ({home:renderHome,map:()=>renderMap(arg),heroes:()=>renderHeroes(arg),hero:()=>renderHero(arg),collection:renderCollection,summon:renderSummon,quests:renderQuests,wallet:renderWallet,settings:renderSettings}[name]||(()=>{}))();
  $('#'+name).scrollTop=0;
}
document.addEventListener('click',e=>{ const s=e.target.closest('[data-soon]'); if(s){ Voice.sfx('tap'); return toast(`${s.dataset.soon} — เร็วๆ นี้!`); }
  const b=e.target.closest('[data-go]'); if(b){ Voice.unlock(); Voice.sfx('tap'); e.stopPropagation(); go(b.dataset.go,b.dataset.arg); } },true);
addEventListener('resize',()=>{ clearTimeout(go._r); go._r=setTimeout(()=>{ if(curScreen==='map') renderMap(); if(curScreen==='home') renderHome(); },150); });

// ---------- lobby ----------
function featured(){ return 'veronica'; }
function renderHome(){
  const lead=HEROES[S.team[0]]; $('#pl-ava').src='assets/'+lead.icon; $('#pl-lv').textContent='Lv.'+accLv(); $('#pl-pow').textContent='⚔️ '+fmt(teamPower());
  $('#md-prog').textContent=`ด่าน ${S.cleared}/15`;
  const f=HEROES[featured()]; $('#ru-art').src='assets/'+f.art; $('#ru-name').textContent=f.name;
  return; const t=S.team.slice(0,isLand()?5:3); const order=t.length>=3?[t[1],t[2],t[0]]:t; // lead in the middle, drawn last
  const pos= isLand()? [[8,74],[56,74],[30,90],[ -6,64],[70,64]] : [[2,72],[50,72],[22,88]];
  const ext = isLand()&&t.length>3 ? [t[3],t[4]].filter(Boolean) : [];
  const list=[...ext.map((id,i)=>({id,p:pos[3+i]})), ...order.map((id,i)=>({id,p:pos[i]}))];
  $('#lobby-team').innerHTML=list.map(({id,p},i)=>`<img src="assets/${HEROES[id].art}" style="left:${p[0]}%;--h:${p[1]}%;animation-delay:${-i*0.7}s;z-index:${Math.round(p[1])}">`).join('');
}
$('#ev-checkin').onclick=()=>{ if(S.checkin===today()) return toast('เช็กอินวันนี้แล้ว — พรุ่งนี้มาใหม่นะ'); S.checkin=today(); S.gems+=60; S.gold+=1000; S.books+=1; earnPure(0.5,'เช็กอินรายวัน'); save(); Voice.sfx('coin');
  modal(`<h2>📅 เช็กอินรายวัน</h2><div class="rw"><span>💎 +60</span><span>💰 +1,000</span><span>📘 +1</span><span class="p">🪙 +0.5 PURE</span></div><button class="btn gold" style="width:100%" onclick="closeModal()">รับแล้ว!</button>`); };

// ---------- map ----------
function renderMap(arg){
  const L=isLand(), wrap=$('#map-wrap'), img=$('#map-img'), nodes=L?MAP_NODES_L:MAP_NODES_P;
  img.src='assets/bg/'+(L?'mapL.webp':'bg_map.webp');
  if(L){ const w=Math.min(innerWidth, innerHeight*16/9*1.0); wrap.style.width=w+'px'; wrap.style.marginTop=Math.max(0,(innerHeight-w*9/16)/2)+'px'; } else { wrap.style.width='100%'; wrap.style.marginTop='0'; }
  const svg=$('#map-path'); svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('preserveAspectRatio','none');
  const pts=nodes.map(([x,y])=>`${x*100},${y*100}`); const done=pts.slice(0,S.cleared+1).join(' '), todo=pts.slice(S.cleared).join(' ');
  svg.innerHTML=`<polyline class="p-todo" points="${todo}" vector-effect="non-scaling-stroke"/><polyline class="p-done" points="${done}" vector-effect="non-scaling-stroke"/>`;
  const box=$('#map-nodes'); box.innerHTML='';
  nodes.forEach(([x,y],i)=>{ const st=stageInfo(i); const b=document.createElement('button');
    b.className='node'+(i>S.cleared?' locked':'')+(i<S.cleared?' cleared':'')+(i===S.cleared?' current':'')+(st.general?' gen':'')+(st.boss?' boss':'');
    b.style.left=(x*100)+'%'; b.style.top=(y*100)+'%'; b.style.animationDelay=(-i*0.3)+'s';
    if(st.general) b.innerHTML=`<img src="assets/${HEROES[st.general].icon}"><span class="lbl">${S.roster[st.general]?'✅':'⛓️'} ${st.name}</span>`;
    else if(st.boss) b.innerHTML=`<span class="lbl">☠ ${st.name}</span>`; else b.textContent=st.name;
    b.onclick=()=>{ Voice.sfx('tap'); if(i>S.cleared) return toast('🔒 ต้องผ่านด่านก่อนหน้าก่อน'); stageModal(i); };
    box.appendChild(b); });
  $('#map-title').textContent=CHAPTERS[Math.min(2,Math.floor(S.cleared/5))].name;
  if(!L){ const cur=box.children[Math.min(14,S.cleared)]; setTimeout(()=>cur&&cur.scrollIntoView({block:'center'}),50); }
  if(arg==='boss') toast('☠ ด่านบอสยักษ์: 1-3, 2-3, 3-3 · ขุนพล: 1-5, 2-5, 3-5');
}
function enemyIcon(id){ if(id.startsWith('@')) return HEROES[id.slice(1)].icon; if(id.startsWith('!')) return MONS[id.slice(1)].art||MONS[id.slice(1)].spr; return MONS[id].spr; }
function stageModal(i){ const st=stageInfo(i); const list=[...new Set(st.waves.flat())]; const r=st.reward, first=i===S.cleared;
  modal(`<h2>ด่าน ${st.name}${st.boss?' · ☠ บอส':''}${st.general?' · ⛓️ ขุนพล':''}</h2><p class="center note">${st.ch.name} · เลเวลศัตรู ${st.lvl} · 3 คลื่น · ⚡ ${STAM_COST}</p>
  <div class="enlist">${list.map(id=>`<img src="assets/${enemyIcon(id)}">`).join('')}</div>
  ${st.boss?`<div class="card" style="border-color:#ff6b6b"><b>☠ บอสยักษ์:</b> ${MONS[st.boss].name} — เลือดมหาศาล คลั่งเมื่อเลือดต่ำกว่า 50%</div>`:''}
  ${st.general?`<div class="card" style="border-color:#ff5fd2"><b>⛓️ จับขุนพล:</b> ชนะแล้วมีโอกาสจับ <b>${HEROES[st.general].name} [UR]</b> เข้าทีม! ใช้ยันต์ผนึกเพิ่มโอกาส</div>`:''}
  <div class="rw"><span class="p">🪙 +${+(r.pure*(first?2:1)).toFixed(2)} PURE</span><span>💰 +${r.gold}</span><span>💎 +${first?r.gems*2:Math.round(r.gems/2)}</span><span>📘 +${r.books}</span></div>
  <p class="center note">พลังทีม ${fmt(teamPower())}</p>
  <div class="row"><button class="btn" onclick="closeModal()">ปิด</button><button class="btn gold" id="go-fight">⚔️ เริ่มต่อสู้</button></div>`);
  $('#go-fight').onclick=()=>{ closeModal(); regen(); if(S.stam<STAM_COST) return toast('⚡ สตามิน่าไม่พอ (ฟื้น 1 ทุก 2 นาที)'); S.stam-=STAM_COST; save(); playStory(i,()=>startBattle(i)); };
}
// ---------- story ----------
function playStory(i,done){ const lines=STORY[i]; if(!lines||S.storySeen[i]) return done(); S.storySeen[i]=1; save();
  const box=$('#story'); let k=0; box.classList.add('on');
  const show=()=>{ if(k>=lines.length){ box.classList.remove('on'); box.onclick=null; return done(); }
    const d=lines[k], c=HEROES[d.w]||MONS[d.w]; const art=c?(c.art||c.spr):'img/mage_art.webp';
    box.classList.toggle('right', !!(MONS[d.w]||(c&&c.general))); const im=box.querySelector('.st-art'); im.style.display=c?'':'none'; im.src='assets/'+art; im.style.animation='none'; void im.offsetWidth; im.style.animation='';
    box.querySelector('.st-name').textContent=c?c.name:'ผู้บรรยาย'; box.querySelector('.st-text').textContent=d.t;
    Voice.clip(`story_${i}_${k}`, d.t, c||{voice:'Charon',style:'ผู้บรรยายมหากาพย์'}); k++; };
  box.onclick=(e)=>{ if(e.target.classList.contains('st-skip')){ k=lines.length; } Voice.sfx('tap'); show(); };
  show();
}

// ---------- battle ----------
const SK_BY_EL={fire:'flame',water:'ice',wood:'lotus',light:'spear',dark:'slash',storm:'orb'};
const skIcon=(d,ult)=>'assets/ui/sk_'+(ult?(d.el==='dark'?'circle':d.el==='storm'?'orb':d.ult&&d.ult.teamShield?'shield':SK_BY_EL[d.el]||'circle'):(d.skill&&d.skill.kind==='shield'?'shield':SK_BY_EL[d.el]||'orb'))+'.webp';
const sk2Icon=(d)=>{ const s=d.skill2||{}; return 'assets/ui/sk_'+(s.kind==='shield'?'shield':s.kind==='heal'?'orb':s.kind==='aoe'?'circle':'slash')+'.webp'; };
let _bt=null;
function startBattle(i){
  if(!S.team.length) return toast('จัดทีมก่อนนะ');
  go('battle'); const st=stageInfo(i);
  const team=S.team.map(id=>({id,lvl:S.roster[id].lvl,stars:S.roster[id].stars,sk:S.roster[id].sk}));
  $('#bcards').innerHTML=team.map((h,k)=>{ const d=HEROES[h.id]; return `<div class="hc" data-k="${k}" style="--tc:${TIERS[d.tier].c}"><img src="assets/${d.icon}"><span class="rdy"></span><div class="h"><i></i></div><div class="e"><i></i></div></div>`; }).join('');
  let sel=0; const atk=$('#bskills .atk'), sk=$('#bskills .sk'), sk2=$('#bskills .sk2'), ul=$('#bskills .ult');
  const ui={
    refresh(){ const b=window.battle; if(!b) return; const hs=b.heroes; if(!hs[sel]||!hs[sel].alive){ const n=hs.findIndex(u=>u.alive); if(n>=0) sel=n; }
      const u=hs[sel]; if(!u) return; const d=u.d, el=ELEM[d.el];
      $$('#bcards .hc').forEach((c,k)=>{ const h=hs[k]; c.classList.toggle('dead',!h.alive); c.classList.toggle('sel',k===sel); c.classList.toggle('cur',b.cur===h); c.classList.toggle('ur',h.alive&&h.energy>=100);
        c.querySelector('.h i').style.width=(100*h.hp/h.maxHp)+'%'; c.querySelector('.e i').style.width=h.energy+'%'; });
      const A=$('#bactive'); A.querySelector('img').src='assets/'+d.art; A.querySelector('.ba-lv').textContent='Lv.'+u.lvl; A.querySelector('.ba-nm b').textContent=d.name;
      A.querySelector('.ba-hp i').style.width=(100*u.hp/u.maxHp)+'%'; A.querySelector('.ba-hp span').textContent=`${fmt(Math.ceil(u.hp))} / ${fmt(u.maxHp)}`;
      A.querySelector('.ba-en i').style.width=u.energy+'%'; A.querySelector('.ba-en span').textContent=Math.floor(u.energy)+'%';
      [atk,sk,sk2,ul].forEach(btn=>btn.style.setProperty('--c',el.c));
      const setI=(btn,src)=>{ const im=btn.querySelector('img'); if(im.getAttribute('src')!==src) im.src=src; };
      setI(atk,'assets/ui/sk_slash.webp'); setI(sk,skIcon(d,false)); setI(sk2,sk2Icon(d)); setI(ul,skIcon(d,true));
      atk.querySelector('em').textContent='โจมตี'; sk.querySelector('em').textContent=u.skill.name; sk2.querySelector('em').textContent=u.skill2.name; ul.querySelector('em').textContent=u.ult.name;
      [atk,sk,sk2,ul].forEach(b=>b.querySelector('em').style.display='block');
      const c1=sk.querySelector('.cdv'), c2s=sk2.querySelector('.cdv'), cU=ul.querySelector('.cdv');
      c1.style.display=u.cd>0?'flex':'none'; c1.textContent=u.cd;
      c2s.style.display=u.cd2>0?'flex':'none'; c2s.textContent=u.cd2;
      cU.style.display=u.energy<100?'flex':'none'; cU.textContent=Math.floor(u.energy)+'%';
      ul.classList.toggle('ready',u.energy>=100&&u.alive);
      [['atk',atk],['skill',sk],['skill2',sk2],['ult',ul]].forEach(([ty,btn])=>{ const qi=b.queue.findIndex(q=>q.u===u&&q.type===ty); btn.classList.toggle('q',qi>=0); let q=btn.querySelector('.qn'); if(qi>=0){ if(!q){ q=document.createElement('span'); q.className='qn'; btn.appendChild(q); } q.textContent='✓'; } else if(q) q.remove(); });
      if(b.bossU){ const bu=b.bossU; $('#bossbar .bb i').style.width=(100*bu.hp/bu.maxHp)+'%'; $('#bossbar .bt').textContent=`${fmt(Math.ceil(bu.hp))} / ${fmt(bu.maxHp)}  (${Math.ceil(100*bu.hp/bu.maxHp)}%)`; } },
    turn(list){ $('#turncol').innerHTML=list.slice(0,5).map(u=>`<img class="${u.side==='hero'?'':'e'}" src="assets/${u.d.icon||u.d.art||u.d.spr}">`).join('');
      const b=window.battle; if(b&&b.cur&&b.cur.side==='hero'){ const k=b.heroes.indexOf(b.cur); if(k>=0) sel=k; } },
    wave(n,t){ $('#bwave').textContent=`บทที่ ${st.name}  ${st.ch.name.replace(/^บทที่ \d+ /,'')} · คลื่น ${n}/${t}`; },
    boss(u){ const bb=$('#bossbar'); window.battle.bossU=u; bb.classList.toggle('on',!!u); if(u){ bb.querySelector('img').src='assets/'+(u.d.icon||'ui/boss_skull.webp'); bb.querySelector('b').textContent=`${u.big?'':'★ '}${u.name}`; bb.querySelector('.bl').textContent='Lv.'+u.lvl; } }
  };
  $('#bossbar').classList.remove('on');
  const b=window.battle=new Battle({canvas:$('#bcanvas'),team,stage:st,ui,onEnd:r=>battleEnd(r)});
  $$('#bcards .hc').forEach(c=>c.onclick=()=>{ sel=+c.dataset.k; Voice.sfx('tap'); ui.refresh(); });
  const queue=(type,ok,msg)=>{ Voice.unlock(); const u=b.heroes[sel]; if(!u||!u.alive) return; if(!ok(u)) return toast(msg(u)); if(b.queue.some(q=>q.u===u&&q.type===type)) b.queue=b.queue.filter(q=>q.u!==u); else { b.queue=b.queue.filter(q=>q.u!==u); b.queue.push({u,type}); } Voice.sfx('tap'); ui.refresh(); };
  atk.onclick=()=>queue('atk',()=>true,()=>'');
  sk.onclick=()=>queue('skill',u=>u.cd===0,u=>`${u.skill.name} คูลดาวน์อีก ${u.cd} เทิร์น`);
  sk2.onclick=()=>queue('skill2',u=>u.cd2===0,u=>`${u.skill2.name} คูลดาวน์อีก ${u.cd2} เทิร์น`);
  ul.onclick=()=>{ Voice.unlock(); const u=b.heroes[sel]; if(!u||!u.alive) return; if(u.energy<100) return toast(`ท่าไม้ตาย "${u.ult.name}" ต้องการพลัง 100%`); b.queue=b.queue.filter(q=>q.u!==u); b.queue.push({u,type:'ult'}); Voice.sfx('magic'); ui.refresh(); };
  const chips=()=>{ $('#b-auto').classList.toggle('on',b.auto); $('#b-speed').textContent='x'+b.speed; $('#b-speed').classList.toggle('on',b.speed>1); };
  $('#b-auto').onclick=()=>{ b.auto=!b.auto; localStorage.setItem('pk_auto',b.auto?'1':'0'); chips(); };
  $('#b-speed').onclick=()=>{ b.speed=b.speed>=3?1:b.speed+1; localStorage.setItem('pk_speed',b.speed); chips(); };
  $('#b-menu').onclick=()=>$('#b-exit').click();
  $('#b-exit').onclick=()=>{ modal(`<h2>ออกจากการต่อสู้?</h2><p class="center note">จะไม่ได้รับรางวัล</p><div class="row"><button class="btn" onclick="closeModal()">สู้ต่อ</button><button class="btn gold" id="ex-y">ออก</button></div>`); $('#ex-y').onclick=()=>{ closeModal(); go('map'); }; };
  clearInterval(_bt); _bt=setInterval(()=>{ const bb=window.battle; if(!bb||bb.over) return; const t=Math.floor((performance.now()-bb.t0)/1000); $('#b-time').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); },500);
  chips(); setTimeout(()=>{ b.resize(); b.run(); },60);
}
function battleEnd(r){
  const st=r.stage, first=st.i===S.cleared; S.stats.battles++; questProg('ult',r.ults);
  if(!r.win){ save(); modal(`<h2>พ่ายแพ้...</h2><p class="center note">ลองอัปเลเวล อัปสกิล อัญเชิญฮีโร่ใหม่ หรือจัดทีมใหม่</p><div class="row"><button class="btn" id="e-map">แผนที่</button><button class="btn gold" id="e-retry">สู้อีกครั้ง</button></div>`);
    $('#e-map').onclick=()=>{closeModal();go('map');}; $('#e-retry').onclick=()=>{closeModal();startBattle(st.i);}; return; }
  S.stats.wins++; questProg('win',1); S.exp+=30+st.i*5;
  const rw=st.reward, gems=first?rw.gems*2:Math.round(rw.gems/2), want=+(rw.pure*(first?2:1)).toFixed(2);
  S.gold+=rw.gold; S.gems+=gems; S.books+=rw.books; const pure=earnPure(want,`ชนะด่าน ${st.name}`);
  if(first) S.cleared=Math.max(S.cleared,st.i+1); save();
  const next=()=>{ modal(`<h2>🏆 ชัยชนะ!</h2><p class="center note">ด่าน ${st.name} · ${r.time.toFixed(0)} วินาที · ท่าไม้ตาย ${r.ults} ครั้ง</p>
    <div class="rw"><span class="p" id="pure-gain">🪙 +0 PURE</span><span>💰 +${fmt(rw.gold)}</span><span>💎 +${gems}</span><span>📘 +${rw.books}</span></div>
    ${pure<want?`<p class="center note">ถึงเพดานรับ PURE วันนี้แล้ว (${DAILY_PURE_CAP}/วัน)</p>`:''}
    <div class="row"><button class="btn" id="e-map">แผนที่</button><button class="btn" id="e-retry">เล่นซ้ำ</button>${st.i+1<15&&st.i+1<=S.cleared?'<button class="btn gold" id="e-next">ด่านต่อไป</button>':''}</div>`);
    let k=0; const iv=setInterval(()=>{ k++; const e=$('#pure-gain'); if(e) e.textContent='🪙 +'+fmt(Math.min(pure,pure*k/20))+' PURE'; if(k>=20) clearInterval(iv); if(k%4===0) Voice.sfx('coin'); },40);
    $('#e-map').onclick=()=>{closeModal();go('map');}; $('#e-retry').onclick=()=>{closeModal();startBattle(st.i);}; const n=$('#e-next'); if(n) n.onclick=()=>{closeModal();stageModal(st.i+1);}; };
  if(st.general) captureFlow(st.general,next); else next();
}
// ---------- จับขุนพล ----------
function captureFlow(gid,done){
  const d=HEROES[gid], owned=!!S.roster[gid], base=0.25, withT=0.75;
  const box=modal(`<h2>⛓️ จับขุนพล!</h2><div class="cap-stage" id="cap-stage"><div class="cap-circle"></div><img class="g" src="assets/${d.art}"><img class="tal" src="assets/ui/talisman.webp"></div>
    <p class="center" style="font-family:Kanit;font-size:18px">${d.name} <span class="tierb UR">UR</span> <span style="color:#ffd36b">${stars(d.rar)}</span></p>
    <p class="center note">${owned?'มีขุนพลนี้แล้ว — จับซ้ำได้ชิ้นส่วนวิญญาณ +10 ไว้เลื่อนดาว':'ขุนพลที่พ่ายแพ้อ่อนแรงลง... ผนึกเขาเข้าร่วมทีมของคุณ!'}</p>
    <div class="row"><button class="btn" id="cap-free">ลองจับ<br><small>โอกาส ${base*100}%</small></button><button class="btn gold" id="cap-tal" ${S.talisman<1?'disabled':''}>ใช้ยันต์ผนึก<br><small>โอกาส ${withT*100}% (มี ${S.talisman})</small></button></div>
    <button class="btn" style="width:100%;margin-top:8px" id="cap-skip">ปล่อยไป</button>`,'wide');
  Voice.hero(d,'intro');
  const attempt=(useT)=>{ if(useT){ if(S.talisman<1) return; S.talisman--; } save();
    const ok=Math.random()<(useT?withT:base), stg=$('#cap-stage'); stg.classList.add('capturing'); box.querySelectorAll('button').forEach(b=>b.disabled=true); Voice.sfx('seal');
    setTimeout(()=>{ stg.classList.remove('capturing');
      if(ok){ stg.classList.add('cap-ok'); S.stats.captures++;
        if(owned) S.roster[gid].shards+=10; else { S.roster[gid]=Object.assign(newEntry(gid),{lvl:Math.max(1,stageInfo(Math.max(0,S.cleared-1)).lvl-2)}); if(S.team.length<5) S.team.push(gid); }
        save(); Voice.hero(d,'capture');
        box.insertAdjacentHTML('beforeend',`<div class="big-chance">✨ จับสำเร็จ! ${d.name} เข้าร่วมทีมแล้ว ✨</div><div class="row"><button class="btn gold" id="cap-ok">ยอดเยี่ยม!</button></div>`);
      } else box.insertAdjacentHTML('beforeend',`<div class="big-chance" style="color:#ff8a8a">ขุนพลหลุดจากผนึก! (เล่นด่านซ้ำเพื่อลองใหม่)</div><div class="row"><button class="btn gold" id="cap-ok">ตกลง</button></div>`);
      $('#cap-ok').onclick=done; },2300); };
  $('#cap-free').onclick=()=>attempt(false); $('#cap-tal').onclick=()=>attempt(true); $('#cap-skip').onclick=done;
}

// ---------- heroes ----------
function heroCard(id,extra='',locked=false){ const d=HEROES[id], r=S.roster[id]||{lvl:1,stars:d.rar}; return `<button class="hcard t-${d.tier} ${locked?'locked':''}" ${locked?'':`data-go="hero" data-arg="${id}"`} ${extra}>
  <img class="a" src="assets/${d.icon}" loading="lazy"><span class="tier">${d.tier}</span>${!locked&&S.team.includes(id)?'<span class="inteam">ในทีม</span>':''}
  ${locked?'<span class="lockt">ยังไม่ได้รับ</span>':''}<div class="cap"><div class="st">${stars(r.stars)}</div>${d.name}<br><small>${locked?(d.general?'จับในด่าน':'อัญเชิญ'):`Lv.${r.lvl} · ${ROLE[d.role]}`}</small></div></button>`; }
function renderHeroes(tab){
  $('#h-tabs').innerHTML=[['all','ทั้งหมด'],['team','จัดทีม'],['skill','สกิล']].map(([k,n])=>`<button class="tab ${((tab||'all')===k)?'on':''}" data-go="heroes" data-arg="${k}">${n}</button>`).join('');
  $('#team-slots').innerHTML=[0,1,2,3,4].map(i=>{ const id=S.team[i]; return id?`<button class="slot" data-go="hero" data-arg="${id}"><img src="assets/${HEROES[id].icon}"></button>`:'<div class="slot"></div>'; }).join('');
  const ids=Object.keys(S.roster).sort((a,b)=>power(b,S.roster[b].lvl,S.roster[b].stars,S.roster[b].sk)-power(a,S.roster[a].lvl,S.roster[a].stars,S.roster[a].sk));
  $('#roster').innerHTML=ids.map(id=>heroCard(id, tab==='skill'?`data-go="hero" data-arg="${id}|skill"`:'')).join('');
  $('#roster-count').textContent=`${ids.length}/${Object.keys(HEROES).length} · ขุนพล ${ids.filter(i=>HEROES[i].general).length}/3 · 📘 คัมภีร์สกิล ${S.books} · 🧿 ยันต์ ${S.talisman}`;
  if(tab==='skill') toast('เลือกฮีโร่เพื่ออัปเกรดสกิล');
}
function renderCollection(){ const all=Object.keys(HEROES).sort((a,b)=>HEROES[b].rar-HEROES[a].rar); $('#col-grid').innerHTML=all.map(id=>heroCard(id,'',!S.roster[id])).join('');
  $('#col-count').textContent=`สะสมแล้ว ${Object.keys(S.roster).length}/${all.length}`; }
function skillDesc(sk){ const k={hit:`โจมตีเป้าหมายเดี่ยว ${Math.round(sk.mult*100)}%`,lowest:`พุ่งสังหารศัตรูเลือดน้อยสุด ${Math.round(sk.mult*100)}%`,multi:`โจมตี ${sk.hits} ครั้ง ครั้งละ ${Math.round(sk.mult*100)}%`,aoe:`โจมตีศัตรูทั้งหมด ${Math.round(sk.mult*100)}%`,heal:`ฟื้นฟูเลือดทีม ${Math.round(sk.mult*100)}% ของ ATK`,shield:`โล่ ${Math.round(sk.pct*100)}% ของ HP + ยั่วยุ`}[sk.kind];
  const ex=[]; if(sk.burn) ex.push('ติดไฟ '+sk.burn+' เทิร์น'); if(sk.stun) ex.push('แช่แข็ง '+Math.round(sk.stun*100)+'%'); if(sk.charm) ex.push('เสน่ห์ (ศัตรูตีพวกเดียวกัน) '+Math.round(sk.charm*100)+'%'); if(sk.revive) ex.push('ชุบชีวิต'); if(sk.atkUp) ex.push('ATK ทีม +30%'); if(sk.teamShield) ex.push('โล่ทีม '+Math.round(sk.teamShield*100)+'%'); if(sk.lifesteal) ex.push('ดูดเลือด '+Math.round(sk.lifesteal*100)+'%'); if(sk.crit) ex.push('คริติคอลแน่นอน'); if(sk.cd) ex.push('คูลดาวน์ '+sk.cd);
  return k+(ex.length?' · '+ex.join(' · '):''); }
function skillDiff(a,b){ const out=[]; const pct=v=>Math.round(v*100)+'%';
  for(const k of ['mult','pct','stun','charm','lifesteal','teamShield']) if(a[k]!==undefined && a[k]!==b[k]) out.push(`${{mult:'ดาเมจ/ฮีล',pct:'โล่',stun:'แช่แข็ง',charm:'เสน่ห์',lifesteal:'ดูดเลือด',teamShield:'โล่ทีม'}[k]} ${pct(a[k])} → <b>${pct(b[k])}</b>`);
  if(a.cd!==b.cd) out.push(`คูลดาวน์ ${a.cd} → <b>${b.cd}</b>`); return out.join(' · ')||'—'; }
const lvlCost=r=>150*r.lvl, skCost=(lv,ult)=>({gold:300*lv*(ult?2:1), books:lv*(ult?2:1)});
function renderHero(arg){
  const [id,tab]=(arg||'').split('|'); const d=HEROES[id], r=S.roster[id]; if(!r) return go('heroes');
  const s=heroStats(id,r.lvl,r.stars), el=ELEM[d.el], maxLvl=r.stars*10, inTeam=S.team.includes(id), need=r.stars*10;
  const skRow=(j)=>{ const base=j?d.ult:d.skill, lv=r.sk[j], cur=skillScale(base,lv), nxt=lv<SKILL_MAX?skillScale(base,lv+1):null, c=skCost(lv,j);
    return `<div class="skill ${j?'ult':''}" style="--c:${el.c}"><div class="ic" style="background-image:url(assets/${(j?d.ul:d.sk)||d.icon})"></div><div class="bx"><b>${j?'ท่าไม้ตาย':'สกิล'}: ${base.name}</b> <span class="lv">Lv.${lv}/${SKILL_MAX}</span><p>${skillDesc(cur)}</p>
      ${j?`<p>🗣️ "${d.lines.ult}"${Voice.has(id+'_ult')?' 🔊':''}</p>`:''}${nxt?`<p class="grow">Lv.${lv+1}: ${skillDiff(cur,nxt)}</p>`:'<p class="grow">MAX</p>'}</div>
      ${nxt?`<button class="btn ${j?'gold':''}" data-skup="${j}">อัปสกิล<br><small>💰${fmt(c.gold)} · 📘${c.books}</small></button>`:''}</div>`; };
  $('#hero-detail').innerHTML=`<div class="hd"><div class="hd-art" style="--c:${el.c}"><img src="assets/${d.art}"></div><div>
  <div class="tabs"><button class="tab ${tab!=='skill'?'on':''}" data-go="hero" data-arg="${id}">ข้อมูล</button><button class="tab ${tab==='skill'?'on':''}" data-go="hero" data-arg="${id}|skill">สกิล</button></div>
  <div class="hd-name" style="--c:${el.c}">${d.name} <span class="tierb ${d.tier}">${d.tier}</span> <span style="color:#ffd36b;font-size:18px">${stars(r.stars)}</span></div>
  <div class="note">${ROLE[d.role]} · ธาตุ${el.n} · Lv.${r.lvl}/${maxLvl} · ดาวสูงสุด ${d.cap}★ · พลัง ${fmt(power(id,r.lvl,r.stars,r.sk))}${d.general?' · <b style="color:#ff8ad8">ขุนพลที่จับได้</b>':''}</div>
  ${tab==='skill'?`<p class="note">📘 คัมภีร์สกิล: <b>${S.books}</b> · 💰 ${fmt(S.gold)} — รับคัมภีร์จากด่าน (บอสให้ 3) / ภารกิจ / เช็กอิน</p>${skRow(0)}${skRow(1)}`:`
  <div class="stats"><div>HP<b>${fmt(s.hp)}</b></div><div>ATK<b>${fmt(s.atk)}</b></div><div>DEF<b>${fmt(s.def)}</b></div><div>SPD<b>${s.spd}</b></div></div>
  <div class="skill" style="--c:${el.c}"><div class="ic" style="background-image:url(assets/${d.sk||d.icon})"></div><div class="bx"><b>สกิล: ${d.skill.name}</b> <span class="lv">Lv.${r.sk[0]}</span><p>${skillDesc(skillScale(d.skill,r.sk[0]))}</p></div></div>
  <div class="skill ult" style="--c:${el.c}"><div class="ic" style="background-image:url(assets/${d.ul||d.icon})"></div><div class="bx"><b>ท่าไม้ตาย: ${d.ult.name}</b> <span class="lv">Lv.${r.sk[1]}</span><p>${skillDesc(skillScale(d.ult,r.sk[1]))}</p></div></div>
  <div class="row"><button class="btn gold" id="h-lvl" ${r.lvl>=maxLvl?'disabled':''}>อัปเลเวล<br><small>💰 ${fmt(lvlCost(r))}</small></button><button class="btn" id="h-star" ${r.shards<need||r.stars>=d.cap?'disabled':''}>เลื่อนดาว<br><small>ชิ้นส่วน ${r.shards}/${need}</small></button></div>
  <div class="row"><button class="btn" id="h-team">${inTeam?'ถอดออกจากทีม':'ใส่ในทีม'}</button><button class="btn" id="h-voice">🔊 ฟังเสียง</button><button class="btn" id="h-lead" ${S.team[0]===id||!inTeam?'disabled':''}>👑 หัวหน้า</button></div>`}
  </div></div>`;
  $$('[data-skup]').forEach(b=>b.onclick=()=>{ const j=+b.dataset.skup, lv=r.sk[j], c=skCost(lv,j); if(S.gold<c.gold) return toast('ทองไม่พอ'); if(S.books<c.books) return toast('📘 คัมภีร์สกิลไม่พอ');
    S.gold-=c.gold; S.books-=c.books; r.sk[j]++; questProg('upgrade'); save(); Voice.sfx('heal'); if(j) Voice.hero(d,'ult'); toast(`${j?d.ult.name:d.skill.name} Lv.${r.sk[j]}!`); renderHero(arg); });
  if(tab==='skill') return;
  $('#h-lvl').onclick=()=>{ const c=lvlCost(r); if(S.gold<c) return toast('ทองไม่พอ — ชนะด่านเพื่อรับทอง'); S.gold-=c; r.lvl++; questProg('upgrade'); save(); Voice.sfx('heal'); if(r.lvl%5===0) Voice.hero(d,'win'); renderHero(arg); toast(`${d.name} Lv.${r.lvl}!`); };
  $('#h-star').onclick=()=>{ if(r.shards<need) return; r.shards-=need; r.stars++; questProg('upgrade'); save(); Voice.hero(d,'win'); renderHero(arg); toast(`เลื่อนเป็น ${stars(r.stars)}!`); };
  $('#h-team').onclick=()=>{ if(inTeam){ if(S.team.length<=1) return toast('ต้องมีอย่างน้อย 1 ตัวในทีม'); S.team=S.team.filter(x=>x!==id); } else { if(S.team.length>=5) return toast('ทีมเต็ม 5 ตัวแล้ว'); S.team.push(id); } save(); renderHero(arg); };
  $('#h-voice').onclick=()=>{ Voice.unlock(); Voice.hero(d,'intro'); };
  $('#h-lead').onclick=()=>{ S.team=[id,...S.team.filter(x=>x!==id)]; save(); renderHero(arg); toast('ตั้งเป็นหัวหน้าทีมแล้ว'); };
}

// ---------- summon ----------
function renderSummon(){ $('#summon-result').classList.remove('on'); const f=HEROES[featured()];
  $('#sum-banner').innerHTML=`<img src="assets/${f.art}" style="right:-4%"><img src="assets/${HEROES[SUMMON_POOL.find(i=>HEROES[i].tier==='UR'&&i!==featured())].art}" style="right:26%;opacity:.55;height:140%;bottom:-30%">
    <div class="bt"><b>RATE UP!</b><span class="tierb UR">UR</span> ${f.name}<br><small class="note">โอกาสได้ UR ตัวนี้ ×2 (50% ของ UR)</small></div>`; }
function rollTier(){ const x=Math.random(); return x<0.02?'UR':x<0.12?'SSR':x<0.42?'SR':'R'; }
function roll(minSR){ let t=rollTier(); if(minSR&&t==='R') t='SR'; let pool=SUMMON_POOL.filter(i=>HEROES[i].tier===t); if(!pool.length) pool=SUMMON_POOL;
  if(t==='UR'&&Math.random()<0.5) return featured(); return pool[Math.floor(Math.random()*pool.length)]; }
function doSummon(n){ const cost=n===1?100:900; if(S.gems<cost) return toast('💎 เพชรไม่พอ — รับจากด่าน ภารกิจ และเช็กอิน'); S.gems-=cost; questProg('summon');
  const got=[]; for(let i=0;i<n;i++) got.push(roll(n===10&&i===9&&!got.some(g=>HEROES[g].tier!=='R')));
  const res=got.map(id=>{ const isNew=!S.roster[id]; if(isNew) S.roster[id]=newEntry(id); else S.roster[id].shards+=5; return {id,isNew}; });
  save(); Voice.sfx('magic');
  const box=$('#summon-result'); box.classList.add('on');
  box.innerHTML=`<div class="panel-h center">ผลการอัญเชิญ</div><div class="sgrid ${n===1?'one':''}">${res.map(r=>`<div class="scard ${HEROES[r.id].tier}"><div class="in"><div class="f"></div><div class="b">${heroCard(r.id,'style="pointer-events:none"')}</div></div></div>`).join('')}</div>
    <p class="center note">${res.filter(r=>!r.isNew).length?'ฮีโร่ซ้ำ → +5 ชิ้นส่วน (เลื่อนดาว)':''}</p><div class="row" style="max-width:500px;margin:10px auto"><button class="btn" id="s-close">ปิด</button><button class="btn gold" id="s-again">อัญเชิญอีก</button></div>`;
  $$('#summon-result .scard').forEach((c,i)=>setTimeout(()=>{ c.classList.add('flip'); Voice.sfx(c.classList.contains('UR')||c.classList.contains('SSR')?'ult':'coin'); },350+i*220));
  const best=res.filter(r=>r.isNew).sort((a,b)=>HEROES[b.id].rar-HEROES[a.id].rar)[0]; if(best) setTimeout(()=>Voice.hero(HEROES[best.id],'intro'),600+res.length*220);
  $('#s-close').onclick=()=>box.classList.remove('on'); $('#s-again').onclick=()=>doSummon(n);
}

// ---------- quests ----------
function renderQuests(){ dailyReset();
  $('#quest-list').innerHTML=QUESTS.map(q=>{ const p=Math.min(q.goal,S.q.prog[q.id]||0), done=p>=q.goal, cl=S.q.claimed[q.id];
    const rw=[`🪙 ${q.pure} PURE`,q.gems&&`💎 ${q.gems}`,q.gold&&`💰 ${q.gold}`,q.talisman&&`🧿 ยันต์ ${q.talisman}`,q.books&&`📘 ${q.books}`].filter(Boolean).join(' · ');
    return `<div class="q"><div class="qt"><b>${q.name}</b><br><small>${rw}</small><div class="bar"><i style="width:${100*p/q.goal}%"></i></div></div><button class="btn ${done&&!cl?'gold':''}" data-q="${q.id}" ${!done||cl?'disabled':''}>${cl?'รับแล้ว':done?'รับ':p+'/'+q.goal}</button></div>`; }).join('');
  $$('[data-q]').forEach(b=>b.onclick=()=>{ const q=QUESTS.find(x=>x.id===b.dataset.q); S.q.claimed[q.id]=1; const p=earnPure(q.pure,'ภารกิจ: '+q.name); S.gems+=q.gems||0; S.gold+=q.gold||0; S.talisman+=q.talisman||0; S.books+=q.books||0; save(); Voice.sfx('coin'); toast(`รับ +${p} PURE`); renderQuests(); });
  $('#cap-note').innerHTML=`วันนี้ได้รับ PURE แล้ว <b>${fmt(S.pureDay.amt)}/${DAILY_PURE_CAP}</b> (เพดานต่อวัน)`; }

// ---------- wallet ----------
function renderWallet(){
  $('#wallet-body').innerHTML=`<div class="cols"><div><div class="card wal-bal"><img src="assets/ui/coin_pure.webp"><div class="amt">${fmt(S.pure)}</div><div>PURE (ยอดในเกม)</div><small class="note">วันนี้ได้รับ ${fmt(S.pureDay.amt)}/${DAILY_PURE_CAP}</small></div>
  <div class="card"><b>วิธีรับ PURE</b><p class="note">• ชนะด่าน (เคลียร์ครั้งแรก x2, บอส +1)<br>• ภารกิจรายวัน · เช็กอิน<br>• ด่านยิ่งยาก ยิ่งได้มาก</p></div></div>
  <div><div class="card"><b>ที่อยู่วอลเล็ต (EVM / Base)</b><label>Wallet address (0x...)</label><input id="w-addr" placeholder="0x..." value="${S.wallet}" autocomplete="off">
    <div class="row"><button class="btn" id="w-save">บันทึกที่อยู่</button><button class="btn" id="w-connect">🔗 เชื่อมต่อวอลเล็ต</button></div>
    <div class="row"><button class="btn gold" id="w-withdraw">ถอน PURE</button></div>
    <p class="note">⚠️ ต้นแบบ: PURE เป็นแต้มในเกมที่เก็บในเครื่อง (บัญชี Guest) ยังไม่ใช่โทเคนจริงและไม่มีมูลค่าเป็นเงิน ระบบถอน/เชื่อมวอลเล็ตจะเปิดในอนาคต</p></div>
  <div class="card"><b>ประวัติรายการ</b><div class="hist">${S.hist.length?S.hist.map(h=>`<div><span>${new Date(h.t).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})} · ${h.why}</span><b style="color:#f1dcff">+${fmt(h.amt)}</b></div>`).join(''):'<p class="note">ยังไม่มีรายการ</p>'}</div></div></div></div>`;
  $('#w-save').onclick=()=>{ const v=$('#w-addr').value.trim(); if(v&&!/^0x[0-9a-fA-F]{40}$/.test(v)) return toast('รูปแบบที่อยู่ไม่ถูกต้อง (0x + 40 ตัว)'); S.wallet=v; save(); toast('บันทึกที่อยู่แล้ว'); };
  $('#w-connect').onclick=()=>modal(`<h2>เชื่อมต่อวอลเล็ต</h2><p class="center note">เร็วๆ นี้: MetaMask / Coinbase Wallet บน Base<br>เกมจะไม่ขอ private key หรือ seed phrase เด็ดขาด</p><button class="btn gold" style="width:100%" onclick="closeModal()">เข้าใจแล้ว</button>`);
  $('#w-withdraw').onclick=()=>modal(`<h2>ถอน PURE</h2><div class="rw"><span class="p">ยอด ${fmt(S.pure)} PURE</span></div><p class="center note">ระบบถอนยังไม่เปิดในเวอร์ชันต้นแบบ<br>ขั้นต่ำในอนาคต: 1,000 PURE · ปลายทาง: ${S.wallet||'(ยังไม่ได้ตั้งที่อยู่)'}</p><button class="btn gold" style="width:100%" onclick="closeModal()">ตกลง</button>`);
}

// ---------- settings ----------
function renderSettings(){
  const key=localStorage.getItem('pk_gemini_key')||'';
  $('#settings-body').innerHTML=`<div class="cols"><div class="card"><b>🎙️ เสียงพากย์ไทย (Google Gemini)</b>
    <p class="note">ตัวละครมีเสียงพากย์ Gemini ที่อัดไว้แล้วในเกม (ไม่ต้องใส่คีย์) — ถ้าใส่ API key ของคุณเอง (ฟรี จาก <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>) บทพูดที่ยังไม่มีไฟล์เสียงจะพากย์สดด้วย Gemini TTS คีย์เก็บใน localStorage ของเครื่องนี้เท่านั้น ส่งตรงไปที่ Google เท่านั้น ไม่มีคีย์ = ใช้เสียงไทยของเบราว์เซอร์</p>
    <label>Gemini API key</label><input id="s-key" type="password" placeholder="AIza..." value="${key.replace(/"/g,'')}" autocomplete="off">
    <label>โมเดล TTS</label><input id="s-model" value="${localStorage.getItem('pk_tts_model')||'gemini-2.5-flash-preview-tts'}">
    <div class="row"><button class="btn gold" id="s-save">บันทึก</button><button class="btn" id="s-test">🔊 ทดสอบ</button><button class="btn" id="s-clear">ลบคีย์</button></div><p class="note" id="s-msg"></p>
    <div class="switch"><span>เสียงพากย์</span><input type="checkbox" id="s-voice" ${localStorage.getItem('pk_voice')!=='off'?'checked':''}></div>
    <div class="switch"><span>ผู้บรรยาย</span><input type="checkbox" id="s-narr" ${localStorage.getItem('pk_narr')!=='off'?'checked':''}></div>
    <div class="switch"><span>วิดีโอท่าไม้ตาย</span><select id="s-uv"><option value="first">ครั้งแรกต่อการต่อสู้</option><option value="always">ทุกครั้ง</option><option value="off">ปิด (ใช้คัตอิน)</option></select></div>
    <label>ระดับเสียง</label><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${localStorage.getItem('pk_vol')||0.9}"></div>
  <div><div class="card"><b>📲 ติดตั้งเป็นแอป</b><p class="note">Android (Chrome): ⋮ → "ติดตั้งแอป" · iPhone (Safari): แชร์ → "เพิ่มไปยังหน้าจอโฮม" · เล่นได้ทั้งแนวนอนและแนวตั้ง</p><button class="btn" id="s-install" style="display:none;width:100%">ติดตั้ง PURE Knights</button></div>
  <div class="card"><b>💖 สนับสนุนผู้พัฒนา (PureFxAi)</b><p class="note">รับบริจาค USDT (ERC20)</p><div class="addr">${DONATE_ADDR}</div><button class="btn" id="s-copy" style="width:100%;margin-top:8px">คัดลอกที่อยู่</button></div>
  <div class="card"><b>บัญชี Guest</b><p class="note">เซฟอยู่ในเครื่องนี้ · Lv.${accLv()} · ชนะ ${S.stats.wins} · ต่อสู้ ${S.stats.battles} · จับขุนพล ${S.stats.captures}<br>PURE Knights v0.2 (Prototype) · by PureFxAi</p><button class="btn" id="s-reset" style="width:100%">ลบเซฟและเริ่มใหม่</button></div></div></div>`;
  $('#s-uv').value=localStorage.getItem('pk_ultvid')||'first'; $('#s-uv').onchange=e=>localStorage.setItem('pk_ultvid',e.target.value);
  $('#s-save').onclick=()=>{ const v=$('#s-key').value.trim(); if(v) localStorage.setItem('pk_gemini_key',v); localStorage.setItem('pk_tts_model',$('#s-model').value.trim()||'gemini-2.5-flash-preview-tts'); $('#s-msg').textContent='บันทึกแล้ว ✓'; };
  $('#s-clear').onclick=()=>{ localStorage.removeItem('pk_gemini_key'); $('#s-key').value=''; $('#s-msg').textContent='ลบคีย์แล้ว'; };
  $('#s-test').onclick=async()=>{ Voice.unlock(); $('#s-msg').textContent='กำลังทดสอบ...'; const r=await Voice.test(); $('#s-msg').textContent=r==='gemini'?'✓ Gemini TTS ทำงาน':r==='browser'?'ใช้เสียงเบราว์เซอร์ (ยังไม่ใส่คีย์)':'✗ เรียก Gemini ไม่สำเร็จ: '+Voice.lastErr; };
  $('#s-voice').onchange=e=>localStorage.setItem('pk_voice',e.target.checked?'on':'off');
  $('#s-narr').onchange=e=>localStorage.setItem('pk_narr',e.target.checked?'on':'off');
  $('#s-vol').oninput=e=>localStorage.setItem('pk_vol',e.target.value);
  $('#s-copy').onclick=()=>{ navigator.clipboard?.writeText(DONATE_ADDR).then(()=>toast('คัดลอกแล้ว'),()=>toast(DONATE_ADDR)); };
  $('#s-reset').onclick=()=>{ modal(`<h2>ลบเซฟ?</h2><p class="center note">ฮีโร่และ PURE ทั้งหมดในเครื่องนี้จะหายไป</p><div class="row"><button class="btn" onclick="closeModal()">ยกเลิก</button><button class="btn gold" id="rs-y">ลบ</button></div>`); $('#rs-y').onclick=()=>{ localStorage.removeItem(SAVE_KEY); closeModal(); load(); go('home'); }; };
  if(window._bip){ const b=$('#s-install'); b.style.display=''; b.onclick=()=>window._bip.prompt(); }
}

// ---------- boot ----------
addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); window._bip=e; });
$('#sum1').onclick=()=>doSummon(1); $('#sum10').onclick=()=>doSummon(10);
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal'&&!$('#cap-stage')) closeModal(); });
setInterval(()=>{ if(curScreen!=='battle') renderTop(); },30000);
load();
preload(Object.values(HEROES).flatMap(h=>[h.spr,h.icon]).concat(Object.values(MONS).map(m=>m.spr),CHAPTERS.map(c=>c.bg)));
go('home');
if('serviceWorker' in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
window.PK={get S(){return S;},go,startBattle,save,stageModal};
