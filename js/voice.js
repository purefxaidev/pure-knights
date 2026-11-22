// Voice: Gemini TTS (player's own free-tier key, stored in localStorage) -> baked mp3 -> browser SpeechSynthesis th-TH
'use strict';
const Voice = (() => {
  let ctx = null; const cache = new Map(); let busy = Promise.resolve(); let lastErr = ''; let pending = 0;
  const cfg = () => ({ key: localStorage.getItem('pk_gemini_key') || '', model: localStorage.getItem('pk_tts_model') || 'gemini-2.5-flash-preview-tts',
    on: localStorage.getItem('pk_voice') !== 'off', narr: localStorage.getItem('pk_narr') !== 'off', vol: +(localStorage.getItem('pk_vol') || 0.9) });
  function ac(){ if(!ctx){ const C = window.AudioContext||window.webkitAudioContext; if(C) ctx = new C(); } if(ctx && ctx.state==='suspended') ctx.resume(); return ctx; }
  function pcmToBuffer(b64, rate=24000){
    const bin = atob(b64), n = bin.length>>1, a = ac(), buf = a.createBuffer(1, n, rate), ch = buf.getChannelData(0);
    for(let i=0;i<n;i++){ let v = bin.charCodeAt(2*i) | (bin.charCodeAt(2*i+1)<<8); if(v>=32768) v-=65536; ch[i]=v/32768; }
    return buf;
  }
  async function gemini(text, voiceName, style){
    const {key, model} = cfg(); const ck = voiceName+'|'+text;
    if(cache.has(ck)) return cache.get(ck);
    const prompt = style ? `พูดเป็นภาษาไทยด้วยน้ำเสียง${style} แบบตัวละครในเกม: ${text}` : text;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseModalities:['AUDIO'],
        speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName: voiceName||'Kore'}}}}})});
    if(!r.ok){ const t = await r.text(); throw new Error('Gemini '+r.status+': '+t.slice(0,160)); }
    const j = await r.json(); const part = j?.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
    if(!part) throw new Error('Gemini: no audio');
    const rate = +(/rate=(\d+)/.exec(part.inlineData.mimeType||'')||[0,24000])[1];
    const buf = pcmToBuffer(part.inlineData.data, rate); cache.set(ck, buf); return buf;
  }
  function playBuf(buf){ return new Promise(res=>{ const a=ac(); const s=a.createBufferSource(); const g=a.createGain(); g.gain.value=cfg().vol; s.buffer=buf; s.connect(g).connect(a.destination); s.onended=res; s.start(); }); }
  function playMp3(name){ return new Promise(res=>{ const au = new Audio('assets/audio/'+name+'.mp3'); au.volume=cfg().vol; au.onended=res; au.onerror=res; au.play().catch(res); }); }
  function speakTH(text, pitch=1, rate=1.05){ return new Promise(res=>{ if(!('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(text); u.lang='th-TH'; u.pitch=pitch; u.rate=rate; u.volume=cfg().vol;
    const v = speechSynthesis.getVoices().find(v=>/th/i.test(v.lang)); if(v) u.voice=v;
    u.onend=res; u.onerror=res; speechSynthesis.cancel(); speechSynthesis.speak(u); setTimeout(res, 6000); }); }
  // say(text, {voice, style, mp3, pitch}) — never throws, never blocks gameplay longer than the clip
  function say(text, o={}){
    const c = cfg(); if(!c.on || !text) return Promise.resolve();
    const job = async () => {
      try {
        if(c.key){ const b = await gemini(text, o.voice, o.style); return await playBuf(b); }
      } catch(e){ lastErr = String(e.message||e); console.warn('[voice]', lastErr); }
      if(o.mp3) return playMp3(o.mp3);
      return speakTH(text, o.pitch||1);
    };
    if(pending>=2 && !o.prio) return Promise.resolve();
    pending++; const done=()=>{pending--;};
    busy = busy.then(job, job).then(done, done); return busy;
  }
  function hero(def, kind){ return say(def.lines[kind], {voice:def.voice, style:def.style, mp3: def.mp3 && def.mp3[kind], prio: kind==='ult'||kind==='capture'||kind==='intro', pitch: def.role==='general'?0.7:1}); }
  function narrate(text){ if(!cfg().narr) return Promise.resolve(); return say(text, {voice:'Charon', style:'ผู้บรรยายมหากาพย์ ตื่นเต้น เร้าใจ', pitch:0.9}); }
  // short synthesized SFX
  function sfx(type){ const a = ac(); if(!a) return; const t=a.currentTime, g=a.createGain(), v=cfg().vol*0.35; g.connect(a.destination);
    const o=a.createOscillator();
    const P = {hit:['square',220,60,.12], slash:['sawtooth',900,120,.15], magic:['sine',520,1400,.35], heal:['sine',660,990,.4], coin:['triangle',1200,1800,.18], ult:['sawtooth',120,900,.6], boom:['square',90,30,.4], tap:['triangle',700,500,.05], seal:['sine',300,1200,.8]}[type]||['sine',440,440,.1];
    o.type=P[0]; o.frequency.setValueAtTime(P[1],t); o.frequency.exponentialRampToValueAtTime(Math.max(20,P[2]),t+P[3]);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+P[3]); o.connect(g); o.start(t); o.stop(t+P[3]+.02);
    if(type==='boom'||type==='hit'||type==='ult'){ const n=a.createBufferSource(), b=a.createBuffer(1,a.sampleRate*.25,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length); n.buffer=b; const g2=a.createGain(); g2.gain.value=v*.6; n.connect(g2).connect(a.destination); n.start(t); }
  }
  async function test(){ lastErr=''; const c=cfg(); if(!c.key) { await speakTH('ทดสอบเสียงภาษาไทย ยังไม่ได้ใส่คีย์ Gemini ใช้เสียงของเบราว์เซอร์แทน'); return 'browser'; }
    try { const b = await gemini('ยินดีต้อนรับสู่ เพียว ไนท์ส ขุนพลแห่งตำนาน!', 'Kore', 'ร่าเริง'); await playBuf(b); return 'gemini'; } catch(e){ lastErr=String(e.message||e); return 'error'; } }
  return {say, hero, narrate, sfx, test, unlock:ac, get lastErr(){return lastErr;}};
})();
