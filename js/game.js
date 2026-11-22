// PURE Knights — screens, save, economy (PURE play-to-earn ledger), summon, upgrade, capture, settings
'use strict';
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const today = ()=> new Date().toLocaleDateString('en-CA');
const fmt = n => (+n).toLocaleString('th-TH',{maximumFractionDigits:2});
const SAVE_KEY='pk_save_v1';
let S;
function newSave(){ return {v:1, pure:0, gems:300, gold:2500, talisman:1, cleared:0,
  roster:{tank:{lvl:1,stars:4,shards:0},fighter:{lvl:1,stars:4,shards:0},support:{lvl:1,stars:4,shards:0},marksman:{lvl:1,stars:4,shards:0}},
  team:['tank','fighter','marksman','support'], q:{date:'',prog:{},claimed:{}}, pureDay:{date:'',amt:0}, hist:[], wallet:'', stats:{wins:0,captures:0,battles:0}}; }
function load(){ try{ S = JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){} if(!S||S.v!==1) S=newSave(); dailyReset(); save(); }
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); renderTop(); }
function dailyReset(){ const d=today(); if(S.q.date!==d){ S.q={date:d,prog:{},claimed:{}}; } if(S.pureDay.date!==d) S.pureDay={date:d,amt:0}; questProg('login',1); }
function questProg(id,n=1){ S.q.prog[id]=(S.q.prog[id]||0)+n; }
// PURE ledger — in-game balance only (no real token). Daily earn cap keeps it fair.
function earnPure(amt, why){ const room=Math.max(0, DAILY_PURE_CAP - S.pureDay.amt); const a=+Math.min(room, amt).toFixed(2); if(a<=0) return 0;
  S.pure=+(S.pure+a).toFixed(2); S.pureDay.amt=+(S.pureDay.amt+a).toFixed(2); S.hist.unshift({t:Date.now(),amt:a,why}); S.hist=S.hist.slice(0,60); return a; }
function toast(t,ms=1800){ const e=$('#toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>e.classList.remove('on'),ms); }
function modal(html, cls=''){ const m=$('#modal'); m.querySelector('.modal-box').innerHTML=html; m.querySelector('.modal-box').className='modal-box '+cls; m.classList.add('on'); return m.querySelector('.modal-box'); }
function closeModal(){ $('#modal').classList.remove('on'); }
const stars = n => '★'.repeat(n);
function renderTop(){ $('#r-pure b').textContent=fmt(S.pure); $('#r-gems').textContent=fmt(S.gems); $('#r-gold').textContent=fmt(S.gold); $('#r-tal').textContent=S.talisman;
  const ready = QUESTS.some(q=>(S.q.prog[q.id]||0)>=q.goal && !S.q.claimed[q.id]); $('#q-dot').classList.toggle('on', ready); }
function teamPower(){ return S.team.reduce((a,id)=>a+power(id,S.roster[id].lvl,S.roster[id].stars),0); }

// ---------- navigation ----------
let curScreen='home';
function go(name, arg){
  if(curScreen==='battle' && name!=='battle' && window.battle){ battle.destroy(); window.battle=null; }
  $$('.screen').forEach(s=>s.classList.remove('active')); $('#'+name).classList.add('active'); curScreen=name;
  $$('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.go===name));
  const inBattle = name==='battle'; $('#nav').style.display=inBattle?'none':''; $('#topbar').style.display=inBattle?'none':'';
  ({home:renderHome,map:renderMap,heroes:renderHeroes,hero:()=>renderHero(arg),summon:renderSummon,quests:renderQuests,wallet:renderWallet,settings:renderSettings}[name]||(()=>{}))();
  $('#'+name).scrollTop = name==='map' ? 99999 : 0;
}
document.addEventListener('click', e=>{ const b=e.target.closest('[data-go]'); if(b){ Voice.unlock(); Voice.sfx('tap'); go(b.dataset.go, b.dataset.arg); } }, true);

// ---------- home ----------
function renderHome(){ const lead=HEROES[S.team[0]]; $('#home-leader').src='assets/'+lead.art; $('#home-leader').classList.toggle('boxed',!!lead.artBox);
  $('#home-power').textContent='⚔️ พลังทีม '+fmt(teamPower()); $('#home-progress').textContent='🗺️ ด่านที่ผ่าน '+S.cleared+'/15'; }

// ---------- map ----------
function renderMap(){
  const box=$('#map-nodes'); box.innerHTML='';
  MAP_NODES.forEach(([x,y],i)=>{ const st=stageInfo(i); const b=document.createElement('button');
    b.className='node'+(i>S.cleared?' locked':'')+(i<S.cleared?' cleared':'')+(i===S.cleared?' current':'')+(st.general?' gen':'');
    b.style.left=(x*100)+'%'; b.style.top=(y*100)+'%';
    if(st.general){ b.style.backgroundImage=`url(assets/${HEROES[st.general].icon})`; b.innerHTML=`<span>${S.roster[st.general]?'✅':'⛓️'} ${HEROES[st.general].name}</span>`; } else b.textContent=st.name;
    b.onclick=()=>{ Voice.sfx('tap'); if(i>S.cleared) return toast('🔒 ต้องผ่านด่านก่อนหน้าก่อน'); stageModal(i); };
    box.appendChild(b); });
  const ch=CHAPTERS[Math.min(2,Math.floor(S.cleared/5))]; $('#map-title').textContent=ch.name;
}
function stageModal(i){ const st=stageInfo(i); const list=[...new Set(st.waves.flat())];
  const r=st.reward, first=i===S.cleared;
  modal(`<h2>ด่าน ${st.name}</h2><p class="center note">${st.ch.name} · เลเวลศัตรู ${st.lvl} · 3 คลื่น</p>
  <div class="enlist">${list.map(id=>`<img src="assets/${id.startsWith('@')?HEROES[id.slice(1)].icon:MONS[id].spr}">`).join('')}</div>
  ${st.general?`<div class="card" style="border-color:#ff6b6b"><b>⛓️ จับขุนพล:</b> ชนะแล้วมีโอกาสจับ <b>${HEROES[st.general].name}</b> เข้าทีม! ใช้ยันต์ผนึก 🧿 เพื่อเพิ่มโอกาส</div>`:''}
  <div class="rw"><span class="p">🪙 +${r.pure*(first?2:1)} PURE</span><span>💰 +${r.gold}</span><span>💎 +${first?r.gems*2:Math.round(r.gems/2)}</span>${first?'<span>🎁 เคลียร์ครั้งแรก x2</span>':''}</div>
  <p class="center note">พลังทีม ${fmt(teamPower())}</p>
  <div class="row"><button class="btn" onclick="closeModal()">ปิด</button><button class="btn gold" id="go-fight">⚔️ เริ่มต่อสู้</button></div>`);
  $('#go-fight').onclick=()=>{ closeModal(); startBattle(i); };
}

// ---------- battle ----------
function startBattle(i){
  if(!S.team.length) return toast('จัดทีมก่อนนะ');
  go('battle'); const st=stageInfo(i);
  const panel=$('#bpanel'); panel.innerHTML='';
  const team=S.team.map(id=>({id,lvl:S.roster[id].lvl,stars:S.roster[id].stars}));
  team.forEach((h,k)=>{ const d=HEROES[h.id]; const c=document.createElement('div'); c.className='bc'; c.dataset.k=k;
    c.innerHTML=`<img class="face" src="assets/${d.icon}"><div class="hp"><i></i></div><div class="en"><i></i></div>
      <div class="sks"><button class="sb sk ${d.sk?'':'noimg'}" style="${d.sk?`background-image:url(assets/${d.sk})`:''}">${d.sk?'':'⚔️'}<span class="cdv"></span></button><button class="sb ult ${d.ul?'':'noimg'}" style="${d.ul?`background-image:url(assets/${d.ul})`:`background-image:url(assets/${d.icon})`}"><span class="cdv"></span></button></div>`;
    panel.appendChild(c); });
  const ui={
    refresh(){ if(!window.battle) return; const b=window.battle; $$('#bpanel .bc').forEach((c,k)=>{ const u=b.heroes[k]; if(!u) return;
      c.classList.toggle('dead',!u.alive); c.classList.toggle('cur', b.cur===u);
      c.querySelector('.hp i').style.width=(100*u.hp/u.maxHp)+'%'; c.querySelector('.en i').style.width=u.energy+'%';
      const sk=c.querySelector('.sk'), ul=c.querySelector('.ult');
      sk.querySelector('.cdv').textContent=u.cd>0?u.cd:''; sk.querySelector('.cdv').style.display=u.cd>0?'flex':'none';
      ul.classList.toggle('ready',u.energy>=100&&u.alive); ul.querySelector('.cdv').style.display=u.energy>=100?'none':'flex'; ul.querySelector('.cdv').textContent=u.energy>=100?'':Math.floor(u.energy)+'%';
      [sk,ul].forEach((btn,j)=>{ const qi=b.queue.findIndex(q=>q.u===u&&q.type===(j?'ult':'skill')); let q=btn.querySelector('.qn'); if(qi>=0){ if(!q){q=document.createElement('span');q.className='qn';btn.appendChild(q);} q.textContent=qi+1; } else if(q) q.remove(); }); }); },
    turn(list){ $('#turnbar').innerHTML=list.map(u=>`<img class="${u.side==='hero'?'':'e'}" src="assets/${u.d.icon||u.d.spr}">`).join(''); },
    wave(n,t){ $('#bwave').textContent=`ด่าน ${st.name} · คลื่น ${n}/${t}`; }
  };
  const b = window.battle = new Battle({canvas:$('#bcanvas'), team, stage:st, ui, onEnd:r=>battleEnd(r)});
  $$('#bpanel .bc').forEach((c,k)=>{ const u=b.heroes[k];
    c.querySelector('.sk').onclick=()=>{ Voice.unlock(); if(!u.alive) return; if(u.cd>0) return toast(`${u.d.skill.name} คูลดาวน์อีก ${u.cd} เทิร์น`); if(b.queue.some(q=>q.u===u)) { b.queue=b.queue.filter(q=>q.u!==u); } else b.queue.push({u,type:'skill'}); Voice.sfx('tap'); ui.refresh(); };
    c.querySelector('.ult').onclick=()=>{ Voice.unlock(); if(!u.alive) return; if(u.energy<100) return toast(`ท่าไม้ตาย "${u.d.ult.name}" ต้องการพลัง 100%`); b.queue=b.queue.filter(q=>q.u!==u); b.queue.push({u,type:'ult'}); Voice.sfx('magic'); ui.refresh(); }; });
  const setChips=()=>{ $('#b-auto').classList.toggle('on',b.auto); $('#b-speed').textContent='x'+b.speed; };
  $('#b-auto').onclick=()=>{ b.auto=!b.auto; localStorage.setItem('pk_auto',b.auto?'1':'0'); setChips(); };
  $('#b-speed').onclick=()=>{ b.speed=b.speed>=3?1:b.speed+1; localStorage.setItem('pk_speed',b.speed); setChips(); };
  $('#b-exit').onclick=()=>{ modal(`<h2>ออกจากการต่อสู้?</h2><p class="center note">จะไม่ได้รับรางวัล</p><div class="row"><button class="btn" onclick="closeModal()">สู้ต่อ</button><button class="btn gold" id="ex-y">ออก</button></div>`); $('#ex-y').onclick=()=>{ closeModal(); go('map'); }; };
  setChips(); setTimeout(()=>{ b.resize(); b.run(); }, 60);
}
function battleEnd(r){
  const st=r.stage, first = st.i===S.cleared; S.stats.battles++;
  questProg('ult', r.ults);
  if(!r.win){ save(); modal(`<h2>พ่ายแพ้...</h2><p class="center note">ลองอัปเลเวลฮีโร่ อัญเชิญฮีโร่ใหม่ หรือจัดทีมใหม่แล้วกลับมาสู้อีกครั้ง</p><div class="row"><button class="btn" id="e-map">แผนที่</button><button class="btn gold" id="e-retry">สู้อีกครั้ง</button></div>`);
    $('#e-map').onclick=()=>{closeModal();go('map');}; $('#e-retry').onclick=()=>{closeModal();startBattle(st.i);}; return; }
  S.stats.wins++; questProg('win',1);
  const rw=st.reward, gems=first?rw.gems*2:Math.round(rw.gems/2), pureWant=rw.pure*(first?2:1);
  S.gold+=rw.gold; S.gems+=gems; const pure=earnPure(pureWant, `ชนะด่าน ${st.name}`);
  // hero exp → auto level every few wins (simple): each win gives +1 lvl chance to lowest hero
  if(first) S.cleared=Math.max(S.cleared, st.i+1);
  save();
  const capped = pure < pureWant;
  const next = ()=>{ modal(`<h2>🏆 ชัยชนะ!</h2><p class="center note">ด่าน ${st.name} · ${r.time.toFixed(0)} วินาที · ท่าไม้ตาย ${r.ults} ครั้ง</p>
    <div class="rw"><span class="p" id="pure-gain">🪙 +0 PURE</span><span>💰 +${fmt(rw.gold)}</span><span>💎 +${gems}</span></div>
    ${capped?`<p class="center note">ถึงเพดานรับ PURE วันนี้แล้ว (${DAILY_PURE_CAP}/วัน)</p>`:''}
    <div class="row"><button class="btn" id="e-map">แผนที่</button><button class="btn" id="e-retry">เล่นซ้ำ</button>${st.i+1<15&&st.i+1<=S.cleared?'<button class="btn gold" id="e-next">ด่านต่อไป</button>':''}</div>`);
    let k=0; const tgt=pure; const iv=setInterval(()=>{ k++; const v=Math.min(tgt, tgt*k/20); const e=$('#pure-gain'); if(e) e.textContent='🪙 +'+fmt(v)+' PURE'; if(k>=20){ clearInterval(iv);} if(k%4===0) Voice.sfx('coin'); },40);
    $('#e-map').onclick=()=>{closeModal();go('map');}; $('#e-retry').onclick=()=>{closeModal();startBattle(st.i);}; const n=$('#e-next'); if(n) n.onclick=()=>{closeModal();startBattle(st.i+1);}; };
  if(st.general) captureFlow(st.general, next); else next();
}
// ---------- จับขุนพล (General capture) ----------
function captureFlow(gid, done){
  const d=HEROES[gid], owned=!!S.roster[gid];
  const base=0.25, withT=0.75;
  const box=modal(`<h2>⛓️ จับขุนพล!</h2><div class="cap-stage" id="cap-stage"><div class="cap-circle"></div><img class="g" src="assets/${d.art}"></div>
    <p class="center" style="font-family:Kanit;font-size:18px">${d.name} <span class="st" style="color:#ffd36b">${stars(d.rar)}</span></p>
    <p class="center note">${owned?'คุณมีขุนพลนี้แล้ว — จับซ้ำจะได้ชิ้นส่วนวิญญาณ (+10 shards) ไว้เลื่อนดาว':'ขุนพลที่พ่ายแพ้อ่อนแรงลง... ผนึกเขาเข้าร่วมทีมของคุณ!'}</p>
    <div class="row"><button class="btn" id="cap-free">ลองจับ<br><small>โอกาส ${base*100}%</small></button><button class="btn gold" id="cap-tal" ${S.talisman<1?'disabled':''}>ใช้ยันต์ผนึก 🧿<br><small>โอกาส ${withT*100}% (มี ${S.talisman})</small></button></div>
    <button class="btn" style="width:100%;margin-top:8px" id="cap-skip">ปล่อยไป</button>`);
  Voice.hero(d,'intro');
  const attempt=(useT)=>{ if(useT){ if(S.talisman<1) return; S.talisman--; } save();
    const ok=Math.random()<(useT?withT:base); const stg=$('#cap-stage'); stg.classList.add('capturing'); box.querySelectorAll('button').forEach(b=>b.disabled=true); Voice.sfx('seal');
    setTimeout(()=>{ stg.classList.remove('capturing');
      if(ok){ stg.classList.add('cap-ok'); S.stats.captures++;
        if(owned) S.roster[gid].shards+=10; else { S.roster[gid]={lvl:Math.max(1,stageInfo(S.cleared-1).lvl-2),stars:d.rar,shards:0}; if(S.team.length<5) S.team.push(gid); }
        save(); Voice.say(d.lines.capture||d.lines.win,{voice:d.voice,style:d.style,prio:true,pitch:.7});
        box.insertAdjacentHTML('beforeend',`<div class="big-chance">✨ จับสำเร็จ! ${d.name} เข้าร่วมทีมแล้ว ✨</div><div class="row"><button class="btn gold" id="cap-ok">ยอดเยี่ยม!</button></div>`);
        $('#cap-ok').onclick=done;
      } else { box.insertAdjacentHTML('beforeend',`<div class="big-chance" style="color:#ff8a8a">ขุนพลหลุดจากผนึก! (เล่นด่านนี้ซ้ำเพื่อลองใหม่)</div><div class="row"><button class="btn gold" id="cap-ok">ตกลง</button></div>`); $('#cap-ok').onclick=done; }
    }, 2300); };
  $('#cap-free').onclick=()=>attempt(false); $('#cap-tal').onclick=()=>attempt(true); $('#cap-skip').onclick=done;
}

// ---------- heroes ----------
function heroCard(id, extra=''){ const d=HEROES[id], r=S.roster[id]||{lvl:1,stars:d.rar}; return `<button class="hcard ${d.general?'gen':d.rar>=5?'r5':''}" data-go="hero" data-arg="${id}" ${extra}>
  <img src="assets/${d.icon}" loading="lazy"><span class="el" style="color:${ELEM[d.el].c}">${ELEM[d.el].n}</span>${S.team.includes(id)?'<span class="inteam">ในทีม</span>':''}
  <div class="cap"><div class="st">${stars(r.stars)}</div>${d.name}<br><small>Lv.${r.lvl} · ${ROLE[d.role]}</small></div></button>`; }
function renderHeroes(){
  $('#team-slots').innerHTML=[0,1,2,3,4].map(i=>{ const id=S.team[i]; return id?`<button class="slot" data-go="hero" data-arg="${id}"><img src="assets/${HEROES[id].icon}"></button>`:'<div class="slot"></div>'; }).join('');
  const ids=Object.keys(S.roster).sort((a,b)=>power(b,S.roster[b].lvl,S.roster[b].stars)-power(a,S.roster[a].lvl,S.roster[a].stars));
  $('#roster').innerHTML=ids.map(id=>heroCard(id)).join('');
  $('#roster-count').textContent=`${ids.length}/${Object.keys(HEROES).length} · ขุนพลที่จับได้ ${ids.filter(i=>HEROES[i].general).length}/3`;
}
function skillDesc(sk){ const k={hit:`โจมตีเป้าหมายเดี่ยว ${Math.round(sk.mult*100)}%`,lowest:`พุ่งสังหารศัตรูที่เลือดน้อยที่สุด ${Math.round((sk.mult||0)*100)}%`,multi:`ยิง ${sk.hits} ครั้ง ครั้งละ ${Math.round(sk.mult*100)}%`,aoe:`โจมตีศัตรูทั้งหมด ${Math.round(sk.mult*100)}%`,heal:`ฟื้นฟูเลือดทีม ${Math.round(sk.mult*100)}% ของพลังโจมตี`,shield:`สร้างโล่ ${Math.round(sk.pct*100)}% ของเลือด และยั่วยุศัตรู`}[sk.kind];
  const ex=[]; if(sk.burn) ex.push('ติดไฟ '+sk.burn+' เทิร์น'); if(sk.stun) ex.push('มีโอกาสแช่แข็ง '+Math.round(sk.stun*100)+'%'); if(sk.revive) ex.push('ชุบชีวิตเพื่อน'); if(sk.atkUp) ex.push('เพิ่มพลังโจมตี 30%'); if(sk.teamShield) ex.push('โล่ทั้งทีม'); if(sk.lifesteal) ex.push('ดูดเลือด'); if(sk.crit) ex.push('คริติคอลแน่นอน'); if(sk.cd) ex.push('คูลดาวน์ '+sk.cd);
  return k+(ex.length?' · '+ex.join(' · '):''); }
function lvlCost(r){ return 150*r.lvl; }
function renderHero(id){
  const d=HEROES[id], r=S.roster[id]; if(!r) return go('heroes'); const s=heroStats(id,r.lvl,r.stars), el=ELEM[d.el], maxLvl=r.stars*10, inTeam=S.team.includes(id);
  const need=r.stars*10;
  $('#hero-detail').innerHTML=`<button class="back" data-go="heroes">← กลับ</button>
  <div class="hd-art" style="--c:${el.c}"><img src="assets/${d.art}" class="${d.artBox?'boxed':''}"></div>
  <div class="hd-name" style="--c:${el.c}">${d.name} <span style="color:#ffd36b;font-size:18px">${stars(r.stars)}</span></div>
  <div class="note">${ROLE[d.role]} · ธาตุ${el.n} · Lv.${r.lvl}/${maxLvl} · พลัง ${fmt(power(id,r.lvl,r.stars))}${d.general?' · <b style="color:#ff8a8a">ขุนพลที่จับได้</b>':''}</div>
  <div class="stats"><div>HP<b>${fmt(s.hp)}</b></div><div>ATK<b>${fmt(s.atk)}</b></div><div>DEF<b>${fmt(s.def)}</b></div><div>SPD<b>${s.spd}</b></div></div>
  <div class="skill" style="--c:${el.c}"><div class="ic" style="${d.sk?`background-image:url(assets/${d.sk})`:''}">${d.sk?'':'⚔️'}</div><div><b>สกิล: ${d.skill.name}</b><p>${skillDesc(d.skill)}</p></div></div>
  <div class="skill ult" style="--c:${el.c}"><div class="ic" style="background-image:url(assets/${d.ul||d.icon})"></div><div><b>ท่าไม้ตาย: ${d.ult.name}</b><p>${skillDesc(d.ult)}</p><p>🗣️ "${d.lines.ult}"</p></div></div>
  <div class="row"><button class="btn gold" id="h-lvl" ${r.lvl>=maxLvl?'disabled':''}>อัปเลเวล<br><small>💰 ${fmt(lvlCost(r))}</small></button><button class="btn" id="h-star" ${r.shards<need||r.stars>=7?'disabled':''}>เลื่อนดาว<br><small>ชิ้นส่วน ${r.shards}/${need}</small></button></div>
  <div class="row"><button class="btn" id="h-team">${inTeam?'ถอดออกจากทีม':'ใส่ในทีม'}</button><button class="btn" id="h-voice">🔊 ฟังเสียง</button><button class="btn" id="h-lead" ${S.team[0]===id||!inTeam?'disabled':''}>👑 หัวหน้า</button></div>`;
  $('#h-lvl').onclick=()=>{ const c=lvlCost(r); if(S.gold<c) return toast('ทองไม่พอ — ชนะด่านเพื่อรับทอง'); S.gold-=c; r.lvl++; questProg('upgrade'); save(); Voice.sfx('heal'); if(r.lvl%5===0) Voice.hero(d,'win'); renderHero(id); toast(`${d.name} Lv.${r.lvl}!`); };
  $('#h-star').onclick=()=>{ if(r.shards<need) return; r.shards-=need; r.stars++; questProg('upgrade'); save(); Voice.hero(d,'win'); renderHero(id); toast(`เลื่อนเป็น ${stars(r.stars)}!`); };
  $('#h-team').onclick=()=>{ if(inTeam){ if(S.team.length<=1) return toast('ต้องมีอย่างน้อย 1 ตัวในทีม'); S.team=S.team.filter(x=>x!==id); } else { if(S.team.length>=5) return toast('ทีมเต็ม 5 ตัวแล้ว'); S.team.push(id); } save(); renderHero(id); };
  $('#h-voice').onclick=()=>{ Voice.unlock(); Voice.hero(d,'intro'); };
  $('#h-lead').onclick=()=>{ S.team=[id,...S.team.filter(x=>x!==id)]; save(); renderHero(id); toast('ตั้งเป็นหัวหน้าทีมแล้ว'); };
}

// ---------- summon ----------
function renderSummon(){ $('#summon-result').classList.remove('on'); }
function roll(){ const x=Math.random(); const pool=SUMMON_POOL; const five=pool.filter(i=>HEROES[i].rar===5), four=pool.filter(i=>HEROES[i].rar===4);
  return x<0.06 ? five[Math.floor(Math.random()*five.length)] : four[Math.floor(Math.random()*four.length)] ; }
function doSummon(n){ const cost=n===1?100:900; if(S.gems<cost) return toast('เพชรไม่พอ — รับเพชรจากด่านและภารกิจรายวัน'); S.gems-=cost; questProg('summon');
  const got=[]; for(let i=0;i<n;i++){ let id=roll(); if(n===10 && i===9 && !got.some(g=>HEROES[g].rar===5) && Math.random()<0.25) id=SUMMON_POOL.filter(i=>HEROES[i].rar===5)[Math.floor(Math.random()*4)]||id; got.push(id); }
  const res=got.map(id=>{ const isNew=!S.roster[id]; if(isNew) S.roster[id]={lvl:1,stars:HEROES[id].rar,shards:0}; else S.roster[id].shards+=5; return {id,isNew}; });
  save(); Voice.sfx('magic');
  const box=$('#summon-result'); box.classList.add('on');
  box.innerHTML=`<div class="panel-h center">ผลการอัญเชิญ</div><div class="sgrid ${n===1?'one':''}">${res.map(r=>`<div class="scard ${HEROES[r.id].rar>=5?'r5':''}"><div class="in"><div class="f">✦</div><div class="b">${heroCard(r.id,'style="pointer-events:none"')}</div></div></div>`).join('')}</div>
    <p class="center note">${res.filter(r=>!r.isNew).length?'ฮีโร่ซ้ำ → +5 ชิ้นส่วน (ใช้เลื่อนดาว)':''}</p><div class="row"><button class="btn" id="s-close">ปิด</button><button class="btn gold" id="s-again">อัญเชิญอีก</button></div>`;
  $$('#summon-result .scard').forEach((c,i)=>setTimeout(()=>{ c.classList.add('flip'); Voice.sfx(c.classList.contains('r5')?'ult':'coin'); },350+i*220));
  const best=res.find(r=>r.isNew && HEROES[r.id].rar===5) || res.find(r=>r.isNew); if(best) setTimeout(()=>Voice.hero(HEROES[best.id],'intro'), 600+res.length*220);
  $('#s-close').onclick=()=>box.classList.remove('on'); $('#s-again').onclick=()=>doSummon(n);
}

// ---------- quests ----------
function renderQuests(){ dailyReset();
  $('#quest-list').innerHTML=QUESTS.map(q=>{ const p=Math.min(q.goal,S.q.prog[q.id]||0), done=p>=q.goal, cl=S.q.claimed[q.id];
    const rw=[`🪙 ${q.pure} PURE`, q.gems&&`💎 ${q.gems}`, q.gold&&`💰 ${q.gold}`, q.talisman&&`🧿 ยันต์ ${q.talisman}`].filter(Boolean).join(' · ');
    return `<div class="q"><div class="qt"><b>${q.name}</b><br><small>${rw}</small><div class="bar"><i style="width:${100*p/q.goal}%"></i></div></div><button class="btn ${done&&!cl?'gold':''}" data-q="${q.id}" ${!done||cl?'disabled':''}>${cl?'รับแล้ว':done?'รับ':p+'/'+q.goal}</button></div>`; }).join('');
  $$('[data-q]').forEach(b=>b.onclick=()=>{ const q=QUESTS.find(x=>x.id===b.dataset.q); S.q.claimed[q.id]=1; const p=earnPure(q.pure,'ภารกิจ: '+q.name); S.gems+=q.gems||0; S.gold+=q.gold||0; S.talisman+=q.talisman||0; save(); Voice.sfx('coin'); toast(`รับ +${p} PURE`); renderQuests(); });
  $('#cap-note').innerHTML=`วันนี้ได้รับ PURE แล้ว <b>${fmt(S.pureDay.amt)}/${DAILY_PURE_CAP}</b> (เพดานต่อวัน)`; }

// ---------- wallet ----------
function renderWallet(){
  $('#wallet-body').innerHTML=`<div class="panel-h">กระเป๋า PURE</div>
  <div class="card wal-bal"><img src="assets/spr/item_crystal.webp"><div class="amt">${fmt(S.pure)}</div><div>PURE (ยอดในเกม)</div><small class="note">วันนี้ได้รับ ${fmt(S.pureDay.amt)}/${DAILY_PURE_CAP}</small></div>
  <div class="card"><b>วิธีรับ PURE</b><p class="note">• ชนะด่านในโหมดผจญภัย (เคลียร์ครั้งแรกได้ x2)<br>• ทำภารกิจรายวัน<br>• ด่านยิ่งยาก ยิ่งได้มาก</p></div>
  <div class="card"><b>ที่อยู่วอลเล็ตสำหรับถอน (EVM / Base)</b><label>Wallet address (0x...)</label><input id="w-addr" placeholder="0x..." value="${S.wallet}" inputmode="text" autocomplete="off">
    <div class="row"><button class="btn" id="w-save">บันทึกที่อยู่</button><button class="btn" id="w-connect">🔗 เชื่อมต่อวอลเล็ต</button></div>
    <div class="row"><button class="btn gold" id="w-withdraw">ถอน PURE</button></div>
    <p class="note">⚠️ ต้นแบบ (Prototype): PURE ตอนนี้เป็นแต้มในเกมที่เก็บในเครื่องของคุณเท่านั้น ยังไม่มีโทเคนจริงและยังไม่มีมูลค่าเป็นเงิน ระบบถอน/เชื่อมวอลเล็ตจะเปิดในอนาคต</p></div>
  <div class="card"><b>ประวัติรายการ</b><div class="hist">${S.hist.length?S.hist.map(h=>`<div><span>${new Date(h.t).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})} · ${h.why}</span><b style="color:#bff6ff">+${fmt(h.amt)}</b></div>`).join(''):'<p class="note">ยังไม่มีรายการ — ไปชนะด่านแรกกันเลย!</p>'}</div></div>`;
  $('#w-save').onclick=()=>{ const v=$('#w-addr').value.trim(); if(v && !/^0x[0-9a-fA-F]{40}$/.test(v)) return toast('รูปแบบที่อยู่ไม่ถูกต้อง (0x + 40 ตัว)'); S.wallet=v; save(); toast('บันทึกที่อยู่แล้ว'); };
  $('#w-connect').onclick=()=>modal(`<h2>เชื่อมต่อวอลเล็ต</h2><p class="center note">เร็วๆ นี้: รองรับ MetaMask / Coinbase Wallet บนเครือข่าย Base<br>ตอนนี้ยังไม่มีการเชื่อมต่อจริง และเกมจะไม่ขอ private key หรือ seed phrase ของคุณเด็ดขาด</p><button class="btn gold" style="width:100%" onclick="closeModal()">เข้าใจแล้ว</button>`);
  $('#w-withdraw').onclick=()=>modal(`<h2>ถอน PURE</h2><div class="rw"><span class="p">ยอด ${fmt(S.pure)} PURE</span></div><p class="center note">ระบบถอนยังไม่เปิดในเวอร์ชันต้นแบบ<br>ขั้นต่ำในอนาคต: 1,000 PURE · ปลายทาง: ${S.wallet||'(ยังไม่ได้ตั้งที่อยู่)'}<br><br>PURE ในเกมยังไม่ใช่โทเคนจริง</p><button class="btn gold" style="width:100%" onclick="closeModal()">ตกลง</button>`);
}

// ---------- settings ----------
function renderSettings(){
  const key=localStorage.getItem('pk_gemini_key')||'';
  $('#settings-body').innerHTML=`<div class="panel-h">ตั้งค่า</div>
  <div class="card"><b>🎙️ เสียงพากย์ไทย (Google Gemini)</b>
    <p class="note">ใส่ API key ของคุณเอง (ฟรี) จาก <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> เพื่อให้ฮีโร่พูดด้วยเสียง Gemini TTS ภาษาไทย คีย์จะถูกเก็บใน localStorage ของเครื่องนี้เท่านั้น และส่งตรงไปที่ Google เท่านั้น ถ้าไม่ใส่คีย์ เกมจะใช้เสียงที่อัดไว้แล้ว + เสียงภาษาไทยของเบราว์เซอร์แทน</p>
    <label>Gemini API key</label><input id="s-key" type="password" placeholder="AIza..." value="${key.replace(/"/g,'')}" autocomplete="off">
    <label>โมเดล TTS</label><input id="s-model" value="${localStorage.getItem('pk_tts_model')||'gemini-2.5-flash-preview-tts'}">
    <div class="row"><button class="btn gold" id="s-save">บันทึก</button><button class="btn" id="s-test">🔊 ทดสอบเสียง</button><button class="btn" id="s-clear">ลบคีย์</button></div><p class="note" id="s-msg"></p>
    <div class="switch"><span>เสียงพากย์ฮีโร่</span><input type="checkbox" id="s-voice" ${localStorage.getItem('pk_voice')!=='off'?'checked':''}></div>
    <div class="switch"><span>ผู้บรรยายการต่อสู้</span><input type="checkbox" id="s-narr" ${localStorage.getItem('pk_narr')!=='off'?'checked':''}></div>
    <label>ระดับเสียง</label><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${localStorage.getItem('pk_vol')||0.9}">
  </div>
  <div class="card"><b>📲 ติดตั้งเป็นแอป</b><p class="note">Android (Chrome): เมนู ⋮ → "ติดตั้งแอป/เพิ่มลงหน้าจอหลัก" · iPhone (Safari): ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม"</p><button class="btn" id="s-install" style="display:none;width:100%">ติดตั้ง PURE Knights</button></div>
  <div class="card"><b>💖 สนับสนุนผู้พัฒนา (PureFxAi)</b><p class="note">รับบริจาค USDT (ERC20)</p><div class="addr">${DONATE_ADDR}</div><button class="btn" id="s-copy" style="width:100%;margin-top:8px">คัดลอกที่อยู่</button></div>
  <div class="card"><b>ข้อมูลเกม</b><p class="note">ชนะ ${S.stats.wins} · ต่อสู้ ${S.stats.battles} · จับขุนพล ${S.stats.captures}<br>PURE Knights v0.1 (Prototype) · by PureFxAi</p><button class="btn" id="s-reset" style="width:100%">ลบเซฟและเริ่มใหม่</button></div>`;
  $('#s-save').onclick=()=>{ const v=$('#s-key').value.trim(); if(v) localStorage.setItem('pk_gemini_key',v); localStorage.setItem('pk_tts_model',$('#s-model').value.trim()||'gemini-2.5-flash-preview-tts'); $('#s-msg').textContent='บันทึกแล้ว ✓'; };
  $('#s-clear').onclick=()=>{ localStorage.removeItem('pk_gemini_key'); $('#s-key').value=''; $('#s-msg').textContent='ลบคีย์แล้ว — ใช้เสียงเบราว์เซอร์'; };
  $('#s-test').onclick=async()=>{ Voice.unlock(); $('#s-msg').textContent='กำลังทดสอบ...'; const r=await Voice.test(); $('#s-msg').textContent= r==='gemini'?'✓ Gemini TTS ทำงานแล้ว':r==='browser'?'ใช้เสียงเบราว์เซอร์ (ยังไม่ใส่คีย์)':'✗ เรียก Gemini ไม่สำเร็จ: '+Voice.lastErr; };
  $('#s-voice').onchange=e=>localStorage.setItem('pk_voice',e.target.checked?'on':'off');
  $('#s-narr').onchange=e=>localStorage.setItem('pk_narr',e.target.checked?'on':'off');
  $('#s-vol').oninput=e=>localStorage.setItem('pk_vol',e.target.value);
  $('#s-copy').onclick=()=>{ navigator.clipboard?.writeText(DONATE_ADDR).then(()=>toast('คัดลอกแล้ว'),()=>toast(DONATE_ADDR)); };
  $('#s-reset').onclick=()=>modal(`<h2>ลบเซฟ?</h2><p class="center note">ฮีโร่และ PURE ทั้งหมดในเครื่องนี้จะหายไป</p><div class="row"><button class="btn" onclick="closeModal()">ยกเลิก</button><button class="btn gold" id="rs-y">ลบ</button></div>`) && ($('#rs-y').onclick=()=>{ localStorage.removeItem(SAVE_KEY); closeModal(); load(); go('home'); });
  if(window._bip){ const b=$('#s-install'); b.style.display=''; b.onclick=()=>{ window._bip.prompt(); }; }
}

// ---------- boot ----------
addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); window._bip=e; });
$('#sum1').onclick=()=>doSummon(1); $('#sum10').onclick=()=>doSummon(10);
$('#modal').addEventListener('click', e=>{ if(e.target.id==='modal' && !$('#cap-stage')) closeModal(); });
load();
preload(Object.values(HEROES).flatMap(h=>[h.spr,h.icon]).concat(Object.values(MONS).map(m=>m.spr),['bg/bg_battle.webp']));
go('home');
if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
window.PK = {get S(){return S;}, go, startBattle, save};
