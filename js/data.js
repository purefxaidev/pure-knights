// PURE Knights — game data (heroes, generals, monsters, stages, quests)
'use strict';
const ELEM = {
  fire:{n:'ไฟ',c:'#ff7a2f',c2:'#ffd36b'}, water:{n:'น้ำแข็ง',c:'#5fd0ff',c2:'#e4fbff'},
  wood:{n:'ไม้',c:'#4dff9a',c2:'#d6ffe6'}, light:{n:'แสง',c:'#ffe36b',c2:'#fffbe0'},
  dark:{n:'มืด',c:'#b46bff',c2:'#ffb3ff'}, storm:{n:'อสุนี',c:'#7fa8ff',c2:'#ffffff'}
};
const ROLE = {tank:'แทงค์',fighter:'นักสู้',mage:'จอมเวท',archer:'มือธนู',assassin:'นักฆ่า',support:'ซัพพอร์ต',general:'ขุนพล'};
// skill kinds: hit (single), multi (n random hits), aoe (all enemies), heal (all allies), shield, lowest (lowest-hp enemy)
const HEROES = {
  tank:{name:'เกราะแก้ว',role:'tank',el:'light',rar:4,hp:1500,atk:90,def:95,spd:88,voice:'Kore',style:'มั่นใจ หนักแน่น ขี้โม้',
    spr:'spr/hero_tank.webp',art:'img/tank_art.webp',artBox:true,icon:'img/tank_icon.webp',sk:'spr/skill_tank_0.webp',ul:'spr/ult_tank.webp',
    skill:{name:'โล่สิงห์ทอง',kind:'shield',self:true,pct:0.30,taunt:2,cd:3},
    ult:{name:'ป้อมปราการราชสีห์',kind:'aoe',mult:1.3,teamShield:0.15},
    lines:{intro:'เกราะข้านี้ ไม่มีใครทะลุได้หรอก!',skill:'ไม่มีใครผ่านข้าไปได้!',ult:'ราชสีห์ทองคำ จงพิทักษ์พวกพ้อง!',win:'แข็งแกร่งขึ้นอีกแล้ว ใครจะมาท้า?'},
    mp3:{intro:'tank_1',skill:'tank_2',win:'tank_3'}},
  fighter:{name:'พยัคฆ์',role:'fighter',el:'fire',rar:4,hp:1150,atk:140,def:60,spd:104,voice:'Sadachbia',style:'เลือดร้อน ห้าวหาญ',
    spr:'spr/hero_fighter.webp',art:'img/fighter_art.webp',artBox:true,icon:'img/fighter_icon.webp',sk:'spr/skill_fighter_0.webp',ul:'spr/ult_fighter.webp',
    skill:{name:'กรงเล็บพยัคฆ์',kind:'hit',mult:2.2,cd:2},
    ult:{name:'พยัคฆ์คำรามพันกรงเล็บ',kind:'multi',hits:5,mult:0.95},
    lines:{intro:'มาสิ! ข้ายังไม่ทันอุ่นเครื่องเลย!',skill:'คำรามหน่อย แล้วฟันให้สุด!',ult:'พยัคฆ์คำราม! ฉีกให้เป็นชิ้น!',win:'เลือดเดือดขึ้นอีกขั้น ไปล่าต่อเลย!'},
    mp3:{intro:'fighter_1',skill:'fighter_2',win:'fighter_3'}},
  mage:{name:'จันทรา',role:'mage',el:'water',rar:5,hp:980,atk:165,def:50,spd:96,voice:'Gacrux',style:'เยือกเย็น พูดช้า สุขุม',
    spr:'spr/hero_mage.webp',art:'img/mage_art.webp',artBox:true,icon:'img/mage_icon.webp',sk:'spr/skill_mage_0.webp',ul:'spr/ult_mage.webp',
    skill:{name:'หอกน้ำแข็ง',kind:'hit',mult:1.9,stun:0.5,cd:3},
    ult:{name:'จันทราเยือกแข็ง',kind:'aoe',mult:1.9,stun:0.35},
    lines:{intro:'อารมณ์ไม่มีประโยชน์... มีแต่ผลลัพธ์เท่านั้น',skill:'จงเยือกแข็ง!',ult:'แสงจันทร์... จงแช่แข็งทุกสรรพสิ่ง',win:'พลังจันทร์เพิ่มขึ้นแล้ว... ตามที่คำนวณไว้'},
    mp3:{intro:'mage_1',skill:'mage_2',win:'mage_3'}},
  marksman:{name:'สายฟ้า',role:'archer',el:'storm',rar:4,hp:1000,atk:150,def:55,spd:110,voice:'Leda',style:'ขี้เล่น มั่นใจ',
    spr:'spr/hero_marksman.webp',art:'img/marksman_art.webp',artBox:true,icon:'img/marksman_icon.webp',sk:'spr/skill_marksman_0.webp',ul:'spr/ult_marksman.webp',
    skill:{name:'ศรสายฟ้า',kind:'hit',mult:2.5,cd:2},
    ult:{name:'ฝนศรพันดาว',kind:'aoe',mult:1.6},
    lines:{intro:'หลับตาเล็งก็ยังโดนนะ ง่ายไปหรือเปล่า?',skill:'สายฟ้า ไปซะ!',ult:'ฝนศรพันดาว! หลบให้ได้สิ!',win:'แม่นขึ้นอีกแล้ว จะตามให้ทันมั้ย?'},
    mp3:{intro:'marksman_1',skill:'marksman_2',win:'marksman_3'}},
  assassin:{name:'คมเงา',role:'assassin',el:'dark',rar:5,hp:1020,atk:175,def:52,spd:118,voice:'Enceladus',style:'เงียบขรึม เสียงต่ำ',
    spr:'spr/hero_assassin.webp',art:'img/assassin_art.webp',artBox:true,icon:'img/assassin_icon.webp',sk:'spr/skill_assassin_0.webp',ul:'spr/ult_assassin.webp',
    skill:{name:'เงาสังหาร',kind:'lowest',mult:2.8,cd:3},
    ult:{name:'ราตรีไร้เงา',kind:'lowest',mult:4.6,crit:true},
    lines:{intro:'เมื่อเงาเคลื่อนที่... ก็สายเกินไปแล้ว',skill:'จบแล้ว',ult:'ราตรีไร้เงา... ไม่มีทางหนี',win:'เงาลึกขึ้น... เหยื่อไม่มีทางหนี'},
    mp3:{intro:'assassin_1',skill:'assassin_2',win:'assassin_3'}},
  support:{name:'ไหมทอง',role:'support',el:'light',rar:4,hp:1100,atk:110,def:70,spd:100,voice:'Sulafat',style:'ใจดีแต่ปากจัด',
    spr:'spr/hero_support.webp',art:'img/support_art.webp',artBox:true,icon:'img/support_icon.webp',sk:'spr/skill_support_0.webp',ul:'spr/ult_support.webp',
    skill:{name:'ไหมทองเยียวยา',kind:'heal',mult:1.4,cd:3},
    ult:{name:'พรแห่งไหมทอง',kind:'heal',mult:2.6,revive:true,atkUp:2},
    lines:{intro:'อย่าบุ่มบ่ามสิ! ข้าจะปกป้องเอง ถอยมาเลย!',skill:'อดทนไว้ ข้ารักษาให้!',ult:'ไหมทองคุ้มครอง! ลุกขึ้นสิ!',win:'ยิ่งแข็งแกร่ง ยิ่งดูแลพวกเธอได้ดีกว่าเดิม'},
    mp3:{intro:'support_1',ult:'support_2',win:'support_3'}},
  flame:{name:'อัคนี',role:'fighter',el:'fire',rar:5,hp:1250,atk:168,def:68,spd:102,voice:'Fenrir',style:'องอาจ ดุดัน',
    spr:'spr/hero_flame.webp',art:'img/flame_art.webp',icon:'img/flame_icon.webp',
    skill:{name:'หอกเพลิงทลาย',kind:'hit',mult:2.1,burn:3,cd:2},
    ult:{name:'อัคคีมหาประลัย',kind:'aoe',mult:2.2,burn:3},
    lines:{intro:'เปลวเพลิงแห่งข้า จะเผาผลาญทุกความชั่วร้าย!',skill:'หอกเพลิง ทะลวง!',ult:'อัคคีมหาประลัย! มอดไหม้ไปซะ!',win:'ไฟในใจข้า ยังไม่มีวันมอด'}},
  thunder:{name:'วายุอสุนี',role:'archer',el:'storm',rar:4,hp:980,atk:152,def:54,spd:116,voice:'Aoede',style:'สดใส ฉับไว',
    spr:'spr/hero_thunder.webp',art:'img/thunder_art.webp',icon:'img/thunder_icon.webp',
    skill:{name:'ศรอสุนีบาต',kind:'multi',hits:3,mult:0.95,cd:2},
    ult:{name:'พายุอสุนีพันสาย',kind:'aoe',mult:1.8,stun:0.25},
    lines:{intro:'ลมพายุอยู่ข้างข้าเสมอ!',skill:'อสุนีบาต!',ult:'สายฟ้าพันสาย จงฟาดลงมา!',win:'เร็วกว่าสายฟ้า ก็คือข้าเอง!'}},
  dragon:{name:'นาคราช',role:'fighter',el:'wood',rar:5,hp:1400,atk:158,def:80,spd:95,voice:'Orus',style:'ทุ้มต่ำ น่าเกรงขาม',
    spr:'spr/hero_dragon.webp',art:'img/dragon_art.webp',icon:'img/dragon_icon.webp',
    skill:{name:'หอกมรกต',kind:'hit',mult:2.3,cd:2},
    ult:{name:'มังกรมรกตผงาด',kind:'aoe',mult:2.4,lifesteal:0.3},
    lines:{intro:'สายเลือดมังกร ไม่เคยก้มหัวให้ใคร',skill:'หอกมรกต แทง!',ult:'ตื่นเถิด มังกรมรกต!',win:'นี่เป็นเพียงจุดเริ่มต้น'}},
  // ===== Generals (ขุนพล) — capturable only =====
  tiger:{name:'ขุนพลพยัคฆ์กระดูก',role:'general',el:'fire',rar:5,general:true,hp:1600,atk:170,def:85,spd:98,voice:'Algenib',style:'ดุร้าย คำราม',
    spr:'spr/gen_tiger.webp',art:'img/tiger_art.webp',icon:'img/tiger_icon.webp',
    skill:{name:'ขวานผ่าศิลา',kind:'hit',mult:2.4,cd:2},
    ult:{name:'ขวานกระดูกพิฆาต',kind:'aoe',mult:2.3},
    lines:{intro:'กระดูกของศัตรู คือเกราะของข้า!',skill:'แหลกไปซะ!',ult:'ขวานกระดูกพิฆาต! โฮก!',win:'ข้ายอมรับในฝีมือเจ้า... จะสู้เคียงข้างเจ้า',capture:'เจ้า... แข็งแกร่งกว่าข้า ข้ายอมเป็นขุนพลของเจ้า'}},
  witch:{name:'ราชินีราตรี',role:'general',el:'dark',rar:5,general:true,hp:1300,atk:185,def:62,spd:108,voice:'Despina',style:'เย้ยหยัน เย็นชา',
    spr:'spr/gen_witch.webp',art:'img/witch_art.webp',icon:'img/witch_icon.webp',
    skill:{name:'ลูกแก้วทมิฬ',kind:'multi',hits:3,mult:0.9,cd:2},
    ult:{name:'คำสาปราตรีนิรันดร์',kind:'aoe',mult:2.0,burn:3},
    lines:{intro:'ราตรีนี้... เป็นของข้า',skill:'จงจมสู่ความมืด',ult:'คำสาปราตรีนิรันดร์!',win:'น่าสนใจ... ข้าจะรับใช้เจ้าก็ได้',capture:'น่าสนใจ... ข้าจะรับใช้เจ้าก็ได้'}},
  demon:{name:'จอมมารโลหิต',role:'general',el:'dark',rar:5,general:true,hp:1800,atk:195,def:90,spd:92,voice:'Alnilam',style:'ทุ้มลึก น่ากลัว',
    spr:'spr/gen_demon.webp',art:'img/demon_art.webp',icon:'img/demon_icon.webp',
    skill:{name:'ฟันโลหิต',kind:'hit',mult:2.6,cd:2},
    ult:{name:'ดาบโลหิตทมิฬ',kind:'aoe',mult:2.6},
    lines:{intro:'เลือดของพวกเจ้า... จะหล่อเลี้ยงดาบข้า',skill:'สิ้นชีพ!',ult:'ดาบโลหิตทมิฬ! จงพินาศ!',win:'ดาบของข้า... จะรับใช้เจ้าแทน',capture:'ดาบของข้า... จะรับใช้เจ้าแทน'}},
};
const SUMMON_POOL = ['tank','fighter','mage','marksman','assassin','support','flame','thunder','dragon'];
const MONS = {
  slime:{name:'สไลม์',spr:'spr/mon_slime.webp',hp:420,atk:55,def:20,spd:80,h:0.09,el:'water'},
  rabbit:{name:'กระต่ายคลั่ง',spr:'spr/mon_rabbit.webp',hp:480,atk:65,def:25,spd:105,h:0.11,el:'light'},
  wolf:{name:'หมาป่าวิญญาณ',spr:'spr/mon_wolf.webp',hp:560,atk:78,def:30,spd:112,h:0.10,el:'water'},
  mushroom:{name:'เห็ดพิษ',spr:'spr/mon_mushroom.webp',hp:600,atk:70,def:40,spd:85,h:0.11,el:'wood'},
  scorpion:{name:'แมงป่องทราย',spr:'spr/mon_scorpion.webp',hp:700,atk:88,def:50,spd:95,h:0.12,el:'fire'},
  mummy:{name:'มัมมี่',spr:'spr/mon_mummy.webp',hp:820,atk:84,def:60,spd:78,h:0.14,el:'dark'},
  yeti:{name:'เยติ',spr:'spr/mon_yeti.webp',hp:950,atk:98,def:65,spd:84,h:0.15,el:'water'},
  boss:{name:'อัศวินผลึก',spr:'spr/mon_boss.webp',hp:1500,atk:120,def:80,spd:90,h:0.2,el:'water',boss:true},
};
// 3 chapters x 5 stages; stage 5/10/15 has a capturable General
const CHAPTERS = [
  {name:'บทที่ 1 ป่าแห่งปฐมบท',mons:['slime','rabbit','wolf','mushroom'],general:'tiger'},
  {name:'บทที่ 2 หุบผาทะเลทราย',mons:['scorpion','mummy','wolf','mushroom'],general:'witch'},
  {name:'บทที่ 3 ปราสาทผลึกทมิฬ',mons:['yeti','mummy','scorpion','boss'],general:'demon'},
];
// map node positions (fractions of the map image), bottom -> top along the golden path
const MAP_NODES = [[.47,.95],[.43,.86],[.53,.78],[.40,.70],[.55,.62],[.47,.55],[.58,.48],[.44,.42],[.56,.36],[.48,.30],[.52,.24],[.46,.19],[.53,.15],[.48,.11],[.50,.06]];
function stageInfo(i){ // i = 0..14
  const ch = CHAPTERS[Math.floor(i/5)], idx = i%5, lvl = 1 + i*2;
  const waves = [];
  const pick = (k)=> ch.mons[(k + i) % ch.mons.length];
  waves.push([pick(0),pick(1),pick(0)].slice(0, 2 + (i>1)));
  waves.push([pick(1),pick(2),pick(3),pick(0)].slice(0, 3 + (i>3)));
  const last = [pick(2),pick(3)];
  if (idx===4) last.splice(1,0,'@'+ch.general); else last.push(pick(1));
  if (i>=7 && idx!==4) last.push('boss');
  waves.push(last);
  return {i, ch, idx, name:`${Math.floor(i/5)+1}-${idx+1}`, lvl, waves, general: idx===4 ? ch.general : null,
    reward:{gold:120+i*40, gems: 10+i*2, pure: +(1+i*0.25).toFixed(2), exp: 30+i*12}};
}
const QUESTS = [
  {id:'login',name:'เข้าเกมวันนี้',goal:1,pure:1,gems:20},
  {id:'win',name:'ชนะการต่อสู้ 3 ครั้ง',goal:3,pure:5,gems:30},
  {id:'ult',name:'ใช้ท่าไม้ตาย 5 ครั้ง',goal:5,pure:3,talisman:1},
  {id:'summon',name:'อัญเชิญฮีโร่ 1 ครั้ง',goal:1,pure:2,gold:500},
  {id:'upgrade',name:'อัปเกรดฮีโร่ 2 ครั้ง',goal:2,pure:2,talisman:1},
];
const DAILY_PURE_CAP = 60;
const DONATE_ADDR = '0x920deab53daf94ca2030ad5ceec2265bf5686941';
