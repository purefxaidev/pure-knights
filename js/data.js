// PURE Knights v2 — game data (heroes, tiers, generals, bosses, stages, story, quests)
'use strict';
const ELEM = {
  fire:{n:'ไฟ',c:'#ff7a2f',c2:'#ffd36b'}, water:{n:'น้ำ',c:'#4fc3ff',c2:'#e4fbff'},
  wood:{n:'ไม้',c:'#4dff9a',c2:'#d6ffe6'}, light:{n:'แสง',c:'#ffe36b',c2:'#fffbe0'},
  dark:{n:'มืด',c:'#b46bff',c2:'#ffb3ff'}, storm:{n:'อสุนี',c:'#7fa8ff',c2:'#ffffff'}
};
// rarity tiers: rar = base stars, cap = max stars
const TIERS = {
  R:  {rar:3, cap:5, c:'#7fb4ff', n:'R',   rate:0.58},
  SR: {rar:4, cap:6, c:'#c07bff', n:'SR',  rate:0.30},
  SSR:{rar:5, cap:7, c:'#ffc94d', n:'SSR', rate:0.10},
  UR: {rar:6, cap:8, c:'#ff5fd2', n:'UR',  rate:0.02},
};
const ROLE = {tank:'แทงค์',fighter:'นักสู้',mage:'จอมเวท',archer:'มือธนู',assassin:'นักฆ่า',support:'ซัพพอร์ต',general:'ขุนพล',boss:'บอส'};
// skill kinds: hit, multi, aoe, heal, shield, lowest.  ult.fx = unique VFX id (see battle.js FX)
const H = (o)=>o;
const HEROES = {
  tank:H({name:'เกราะแก้ว',tier:'SR',role:'tank',el:'light',hp:1500,atk:90,def:95,spd:88,voice:'Kore',style:'มั่นใจ หนักแน่น ขี้โม้',
    skill:{name:'โล่สิงห์ทอง',kind:'shield',pct:0.30,taunt:2,cd:3},
    ult:{name:'ป้อมปราการราชสีห์',kind:'aoe',mult:1.3,teamShield:0.15,fx:'lion'},
    lines:{intro:'เกราะข้านี้ ไม่มีใครทะลุได้หรอก!',skill:'ไม่มีใครผ่านข้าไปได้!',ult:'ราชสีห์ทองคำ จงพิทักษ์พวกพ้อง!',win:'แข็งแกร่งขึ้นอีกแล้ว ใครจะมาท้า?'}}),
  fighter:H({name:'พยัคฆ์',tier:'R',role:'fighter',el:'fire',hp:1150,atk:140,def:60,spd:104,voice:'Sadachbia',style:'เลือดร้อน ห้าวหาญ',
    skill:{name:'กรงเล็บพยัคฆ์',kind:'hit',mult:2.2,cd:2},
    ult:{name:'พยัคฆ์คำรามพันกรงเล็บ',kind:'multi',hits:5,mult:0.95,fx:'claws'},
    lines:{intro:'มาสิ! ข้ายังไม่ทันอุ่นเครื่องเลย!',skill:'คำรามหน่อย แล้วฟันให้สุด!',ult:'พยัคฆ์คำราม! ฉีกให้เป็นชิ้น!',win:'เลือดเดือดขึ้นอีกขั้น ไปล่าต่อเลย!'}}),
  mage:H({name:'จันทรา',tier:'SSR',role:'mage',el:'water',hp:980,atk:165,def:50,spd:96,voice:'Gacrux',style:'เยือกเย็น พูดช้า สุขุม',
    skill:{name:'หอกน้ำแข็ง',kind:'hit',mult:1.9,stun:0.5,cd:3},
    ult:{name:'มังกรวารีจันทรา',kind:'aoe',mult:1.9,stun:0.35,fx:'icedragon'},
    lines:{intro:'อารมณ์ไม่มีประโยชน์... มีแต่ผลลัพธ์เท่านั้น',skill:'จงเยือกแข็ง!',ult:'มังกรวารีแห่งจันทรา... จงกลืนกินทุกสิ่ง',win:'พลังจันทร์เพิ่มขึ้นแล้ว... ตามที่คำนวณไว้'}}),
  marksman:H({name:'สายฟ้า',tier:'R',role:'archer',el:'storm',hp:1000,atk:150,def:55,spd:110,voice:'Leda',style:'ขี้เล่น มั่นใจ',
    skill:{name:'ศรสายฟ้า',kind:'hit',mult:2.5,cd:2},
    ult:{name:'ฝนศรพันดาว',kind:'aoe',mult:1.6,fx:'starrain'},
    lines:{intro:'หลับตาเล็งก็ยังโดนนะ ง่ายไปหรือเปล่า?',skill:'สายฟ้า ไปซะ!',ult:'ฝนศรพันดาว! หลบให้ได้สิ!',win:'แม่นขึ้นอีกแล้ว จะตามให้ทันมั้ย?'}}),
  assassin:H({name:'คมเงา',tier:'SSR',role:'assassin',el:'dark',hp:1020,atk:175,def:52,spd:118,voice:'Enceladus',style:'เงียบขรึม เสียงต่ำ',
    skill:{name:'เงาสังหาร',kind:'lowest',mult:2.8,cd:3},
    ult:{name:'ราตรีไร้เงา',kind:'lowest',mult:4.6,crit:true,fx:'shadow'},
    lines:{intro:'เมื่อเงาเคลื่อนที่... ก็สายเกินไปแล้ว',skill:'จบแล้ว',ult:'ราตรีไร้เงา... ไม่มีทางหนี',win:'เงาลึกขึ้น... เหยื่อไม่มีทางหนี'}}),
  support:H({name:'ไหมทอง',tier:'SR',role:'support',el:'light',hp:1100,atk:110,def:70,spd:100,voice:'Sulafat',style:'ใจดีแต่ปากจัด',
    skill:{name:'ไหมทองเยียวยา',kind:'heal',mult:1.4,cd:3},
    ult:{name:'ปทุมทองคืนชีพ',kind:'heal',mult:2.6,revive:true,atkUp:2,fx:'lotus'},
    lines:{intro:'อย่าบุ่มบ่ามสิ! ข้าจะปกป้องเอง ถอยมาเลย!',skill:'อดทนไว้ ข้ารักษาให้!',ult:'ไหมทองคุ้มครอง! ลุกขึ้นสิ!',win:'ยิ่งแข็งแกร่ง ยิ่งดูแลพวกเธอได้ดีกว่าเดิม'}}),
  flame:H({name:'อัคนี',tier:'SSR',role:'fighter',el:'fire',hp:1250,atk:168,def:68,spd:102,voice:'Fenrir',style:'องอาจ ดุดัน',
    skill:{name:'หอกเพลิงทลาย',kind:'hit',mult:2.1,burn:3,cd:2},
    ult:{name:'พายุอัคคีมหาประลัย',kind:'aoe',mult:2.2,burn:3,fx:'firestorm'},
    lines:{intro:'เปลวเพลิงแห่งข้า จะเผาผลาญทุกความชั่วร้าย!',skill:'หอกเพลิง ทะลวง!',ult:'พายุอัคคีมหาประลัย! มอดไหม้ไปซะ!',win:'ไฟในใจข้า ยังไม่มีวันมอด'}}),
  thunder:H({name:'วายุอสุนี',tier:'SR',role:'archer',el:'storm',hp:980,atk:152,def:54,spd:116,voice:'Puck',style:'สดใส ฉับไว',
    skill:{name:'ศรอสุนีบาต',kind:'multi',hits:3,mult:0.95,cd:2},
    ult:{name:'อสุนีพันสาย',kind:'aoe',mult:1.8,stun:0.25,fx:'lightning'},
    lines:{intro:'ลมพายุอยู่ข้างข้าเสมอ!',skill:'อสุนีบาต!',ult:'สายฟ้าพันสาย จงฟาดลงมา!',win:'เร็วกว่าสายฟ้า ก็คือข้าเอง!'}}),
  dragon:H({name:'นาคราช',tier:'SSR',role:'fighter',el:'wood',hp:1400,atk:158,def:80,spd:95,voice:'Orus',style:'ทุ้มต่ำ น่าเกรงขาม',
    skill:{name:'หอกมรกต',kind:'hit',mult:2.3,cd:2},
    ult:{name:'มังกรมรกตผงาด',kind:'aoe',mult:2.4,lifesteal:0.3,fx:'emerald'},
    lines:{intro:'สายเลือดมังกร ไม่เคยก้มหัวให้ใคร',skill:'หอกมรกต แทง!',ult:'ตื่นเถิด มังกรมรกต!',win:'นี่เป็นเพียงจุดเริ่มต้น'}}),
  sakura:H({name:'ซากุระ',tier:'SSR',role:'assassin',el:'wood',hp:1050,atk:170,def:58,spd:120,voice:'Aoede',style:'อ่อนหวานแต่เด็ดขาด',
    skill:{name:'ระบำกลีบซากุระ',kind:'multi',hits:4,mult:0.75,cd:2},
    ult:{name:'พายุบุปผาพันดาบ',kind:'aoe',mult:2.1,fx:'sakura'},
    lines:{intro:'กลีบซากุระร่วงหล่น... เมื่อดาบข้าเริ่มร่ายรำ',skill:'ร่ายรำเถิด กลีบบุปผา!',ult:'พายุบุปผาพันดาบ! งดงามและไร้ปรานี!',win:'ดอกไม้บานสะพรั่ง เพื่อชัยชนะของเรา'}}),
  ocean:H({name:'มหาสมุทร',tier:'SSR',role:'mage',el:'water',hp:1120,atk:150,def:66,spd:98,voice:'Achernar',style:'นุ่มนวล อ่อนโยน',
    skill:{name:'กระแสธารเยียวยา',kind:'heal',mult:1.5,cd:3},
    ult:{name:'คลื่นยักษ์มังกรวารี',kind:'aoe',mult:2.0,stun:0.2,fx:'tsunami'},
    lines:{intro:'ทะเลสงบเสมอ... จนกว่าเจ้าจะทำให้มันโกรธ',skill:'สายน้ำ จงเยียวยา',ult:'คลื่นยักษ์มังกรวารี! จงกลืนกินศัตรู!',win:'สายน้ำไหลไปข้างหน้าเสมอ'}}),
  valkyrie:H({name:'วาลคิรี',tier:'UR',role:'fighter',el:'light',hp:1450,atk:185,def:82,spd:106,voice:'Zephyr',style:'สง่างาม กล้าหาญ',
    skill:{name:'หอกแสงสวรรค์',kind:'hit',mult:2.6,cd:2},
    ult:{name:'หอกศักดิ์สิทธิ์พิพากษา',kind:'aoe',mult:2.6,atkUp:2,fx:'holyspear'},
    lines:{intro:'ในนามแห่งสวรรค์ ข้าจะนำพวกเจ้าสู่ชัยชนะ!',skill:'แสงสวรรค์ จงทะลวง!',ult:'หอกศักดิ์สิทธิ์ จงพิพากษา!',win:'ปีกแห่งแสง ยังไม่เคยพ่ายแพ้'}}),
  succubus:H({name:'ลิลิธ',tier:'UR',role:'mage',el:'dark',hp:1180,atk:190,def:60,spd:112,voice:'Pulcherrima',style:'ยั่วเย้า ขี้เล่น มีเสน่ห์',
    skill:{name:'เสน่ห์มัดใจ (Charm)',kind:'hit',mult:2.0,charm:0.6,cd:2},
    ult:{name:'พลังปีศาจ: ยั่วยวนราตรี',kind:'aoe',mult:2.4,charm:0.35,lifesteal:0.25,fx:'charm'},
    lines:{intro:'อยากเล่นกับข้าหรือ... ระวังจะถอนตัวไม่ขึ้นนะ',skill:'มองตาข้าสิ... แล้วยอมแพ้ซะ',ult:'พลังปีศาจแห่งราตรี! ตกอยู่ใต้มนตร์เสน่ห์ของข้าซะ!',win:'ฮึๆ ง่ายเกินไปแล้วล่ะ'}}),
  // ===== v3: heroes from the lobby reference =====
  seline:H({name:'เซลีน',tier:'UR',role:'fighter',el:'dark',hp:1500,atk:200,def:82,spd:108,voice:'Vindemiatrix',style:'สง่างาม เยือกเย็น เด็ดขาด',
    skill:{name:'หอกทองพิฆาต',kind:'multi',hits:3,mult:0.95,cd:2},
    ult:{name:'ราชินีนิลทอง: ห่าหอกสุริยัน',kind:'aoe',mult:2.7,lifesteal:0.15,fx:'goldspear'},
    lines:{intro:'ข้าคือราชินีแห่งนิลและทอง ใครจะขวางทางข้า?',skill:'หอกทอง จงทะลวง!',ult:'ห่าหอกสุริยัน! จงสยบต่อข้า!',win:'ชัยชนะเป็นของเรา',capture:'ข้ายอมรับใช้ผู้ที่คู่ควรเท่านั้น'}}),
  veronica:H({name:'เวโรนิก้า',tier:'UR',role:'mage',el:'water',hp:1250,atk:195,def:64,spd:112,voice:'Laomedeia',style:'นุ่มนวล อ่อนหวาน ลึกลับ',
    skill:{name:'ผลึกโลหิตจันทรา',kind:'hit',mult:2.2,stun:0.45,cd:2},
    ult:{name:'สวรรค์ผลึกแดง: พายุนิรันดร์',kind:'aoe',mult:2.6,stun:0.3,lifesteal:0.2,fx:'crystal'},
    lines:{intro:'ท่านมาแล้วหรือ... ข้ารอท่านอยู่นะ',skill:'ผลึกแห่งจันทรา จงส่องแสง',ult:'พายุผลึกสีเลือด จงโปรยปราย!',win:'ขอบคุณที่อยู่เคียงข้างข้านะ'}}),
  seraphina:H({name:'เซราฟิน่า',tier:'SSR',role:'tank',el:'light',hp:1550,atk:150,def:100,spd:100,voice:'Autonoe',style:'องอาจ สุภาพ น่าเชื่อถือ',
    skill:{name:'โล่ขาวทองพิทักษ์',kind:'shield',pct:0.32,taunt:2,cd:3},
    ult:{name:'ดาบพิพากษาแสงสวรรค์',kind:'aoe',mult:1.9,teamShield:0.14,fx:'sunblade'},
    lines:{intro:'อัศวินแห่งแสง พร้อมปกป้องทุกคน!',skill:'อยู่ข้างหลังข้า!',ult:'ดาบแห่งแสงสวรรค์ จงพิพากษา!',win:'แสงสว่างจะชนะเสมอ'}}),
  lucius:H({name:'ลูเซียส',tier:'SR',role:'fighter',el:'fire',hp:1300,atk:150,def:72,spd:106,voice:'Umbriel',style:'สุขุม เรียบเฉย แต่ร้อนแรงข้างใน',
    skill:{name:'กวัดทวนโลหิต',kind:'aoe',mult:1.1,burn:2,cd:3},
    ult:{name:'ผ้าคลุมแดงพิฆาต',kind:'multi',hits:4,mult:0.95,fx:'redcape'},
    lines:{intro:'ผ้าคลุมสีเลือดนี้ ไม่เคยแปดเปื้อนความพ่ายแพ้',skill:'ทวนข้า ไม่เคยพลาด!',ult:'ผ้าคลุมแดงพิฆาต!',win:'เรียบร้อย'}}),
  raven:H({name:'เรเวน',tier:'SSR',role:'fighter',el:'storm',hp:1380,atk:178,def:78,spd:110,voice:'Algieba',style:'เย็นชา นิ่งขรึม เสียงทุ้ม',
    skill:{name:'คมดาบอสนี',kind:'hit',mult:2.4,stun:0.3,cd:2},
    ult:{name:'มหาดาบอสุนีสีคราม',kind:'aoe',mult:2.3,stun:0.3,fx:'bluethunder'},
    lines:{intro:'ดาบข้า... พร้อมแล้ว',skill:'ฟาดลง!',ult:'มหาดาบอสุนี จงผ่าฟ้า!',win:'จบแล้ว'}}),
  // ===== Generals (ขุนพล) — capture only =====
  tiger:H({name:'ขุนพลพยัคฆ์กระดูก',tier:'UR',role:'general',general:true,el:'fire',hp:1600,atk:170,def:85,spd:98,voice:'Algenib',style:'ดุร้าย คำราม',
    skill:{name:'ขวานผ่าศิลา',kind:'hit',mult:2.4,cd:2},
    ult:{name:'ขวานกระดูกธรณีสะเทือน',kind:'aoe',mult:2.3,stun:0.2,fx:'bonequake'},
    lines:{intro:'กระดูกของศัตรู คือเกราะของข้า!',skill:'แหลกไปซะ!',ult:'ขวานกระดูก ธรณีสะเทือน! โฮก!',win:'ข้ายอมรับในฝีมือเจ้า',capture:'เจ้า... แข็งแกร่งกว่าข้า ข้ายอมเป็นขุนพลของเจ้า'}}),
  witch:H({name:'ราชินีราตรี',tier:'UR',role:'general',general:true,el:'dark',hp:1300,atk:185,def:62,spd:108,voice:'Despina',style:'เย้ยหยัน เย็นชา',
    skill:{name:'ลูกแก้วทมิฬ',kind:'multi',hits:3,mult:0.9,cd:2},
    ult:{name:'คำสาปราตรีนิรันดร์',kind:'aoe',mult:2.0,burn:3,fx:'nightcurse'},
    lines:{intro:'ราตรีนี้... เป็นของข้า',skill:'จงจมสู่ความมืด',ult:'คำสาปราตรีนิรันดร์!',win:'น่าสนใจ',capture:'น่าสนใจ... ข้าจะรับใช้เจ้าก็ได้'}}),
  demon:H({name:'จอมมารโลหิต',tier:'UR',role:'general',general:true,el:'dark',hp:1800,atk:195,def:90,spd:92,voice:'Alnilam',style:'ทุ้มลึก น่ากลัว',
    skill:{name:'ฟันโลหิต',kind:'hit',mult:2.6,cd:2},
    ult:{name:'ดาบโลหิตทมิฬ',kind:'aoe',mult:2.6,fx:'bloodblade'},
    lines:{intro:'เลือดของพวกเจ้า... จะหล่อเลี้ยงดาบข้า',skill:'สิ้นชีพ!',ult:'ดาบโลหิตทมิฬ! จงพินาศ!',win:'ดาบของข้า...',capture:'ดาบของข้า... จะรับใช้เจ้าแทน'}}),
};
for(const [id,h] of Object.entries(HEROES)){ h.id=id; h.rar=TIERS[h.tier].rar; h.cap=TIERS[h.tier].cap;
  h.spr=`spr/${h.general?'gen':'hero'}_${id}.webp`; h.art=`img/${id}_art.webp`; h.icon=`img/${id}_icon.webp`;
  if(['tank','fighter','mage','marksman','assassin','support'].includes(id)){ h.sk=`spr/skill_${id}_0.webp`; h.ul=`spr/ult_${id}.webp`; } }
const SUMMON_POOL = Object.keys(HEROES).filter(k=>!HEROES[k].general);
const MONS = {
  slime:{name:'สไลม์',spr:'spr/mon_slime.webp',hp:420,atk:55,def:20,spd:80,h:0.55,el:'water'},
  rabbit:{name:'กระต่ายคลั่ง',spr:'spr/mon_rabbit.webp',hp:480,atk:65,def:25,spd:105,h:0.65,el:'light'},
  wolf:{name:'หมาป่าวิญญาณ',spr:'spr/mon_wolf.webp',hp:560,atk:78,def:30,spd:112,h:0.6,el:'water'},
  mushroom:{name:'เห็ดพิษ',spr:'spr/mon_mushroom.webp',hp:600,atk:70,def:40,spd:85,h:0.65,el:'wood'},
  scorpion:{name:'แมงป่องทราย',spr:'spr/mon_scorpion.webp',hp:700,atk:88,def:50,spd:95,h:0.7,el:'fire'},
  mummy:{name:'มัมมี่',spr:'spr/mon_mummy.webp',hp:820,atk:84,def:60,spd:78,h:0.85,el:'dark'},
  yeti:{name:'เยติ',spr:'spr/mon_yeti.webp',hp:950,atk:98,def:65,spd:84,h:0.9,el:'water'},
  boss:{name:'อัศวินผลึก',spr:'spr/mon_boss.webp',art:'spr/mon_boss.webp',hp:1500,atk:120,def:80,spd:90,h:1.1,el:'water',boss:true},
  // ===== Big monster bosses =====
  treant:{name:'ราชันพฤกษาโบราณ',spr:'spr/boss_treant.webp',art:'img/treant_art.webp',hp:5200,atk:150,def:90,spd:70,h:1.75,el:'wood',boss:true,big:true,voice:'Iapetus',style:'ทุ้มลึก โบราณ',
    ult:{name:'รากพฤกษาพิโรธ',kind:'aoe',mult:1.7,stun:0.25,fx:'roots'}, lines:{intro:'ผู้บุกรุกป่าศักดิ์สิทธิ์... จงกลายเป็นปุ๋ย!',ult:'รากพฤกษาพิโรธ!'}},
  firedragon:{name:'มังกรเพลิงอเวจี',spr:'spr/boss_firedragon.webp',art:'img/firedragon_art.webp',hp:6400,atk:175,def:95,spd:88,h:1.8,el:'fire',boss:true,big:true,voice:'Rasalgethi',style:'คำรามกึกก้อง',
    ult:{name:'ลมหายใจอเวจี',kind:'aoe',mult:1.9,burn:3,fx:'firebreath'}, lines:{intro:'มนุษย์ตัวจ้อย... เปลวไฟของข้าจะเผาเจ้าเป็นเถ้า!',ult:'ลมหายใจแห่งอเวจี!'}},
  nightdragon:{name:'มังกรรัตติกาล วาเลอร์ธ',spr:'spr/boss_nightdragon.webp',art:'img/nightdragon_art.webp',icon:'img/nightdragon_icon.webp',faceL:true,hp:9200,atk:200,def:115,spd:94,h:2.3,el:'dark',boss:true,big:true,voice:'Schedar',style:'ทุ้มต่ำ กึกก้อง น่าสะพรึง',
    ult:{name:'ลมหายใจรัตติกาล',kind:'aoe',mult:2.1,stun:0.25,fx:'nightbreath'}, lines:{intro:'ราตรีอันเป็นนิรันดร์... จงจมลงในเงามืดของข้า!',ult:'ลมหายใจรัตติกาล!'}},
  crystalking:{name:'จักรพรรดิผลึกทมิฬ',spr:'spr/mon_boss.webp',art:'spr/mon_boss.webp',hp:7600,atk:190,def:110,spd:92,h:1.6,el:'water',boss:true,big:true,voice:'Schedar',style:'เย็นชา สูงส่ง',
    ult:{name:'มังกรผลึกนิรันดร์',kind:'aoe',mult:2.0,stun:0.3,fx:'icedragon'}, lines:{intro:'ปราสาทแห่งนี้ ไม่มีผู้ใดออกไปได้!',ult:'มังกรผลึกนิรันดร์!'}},
};
for(const [id,m] of Object.entries(MONS)) m.id=id;
const CHAPTERS = [
  {name:'บทที่ 1 ป่าแห่งปฐมบท',mons:['slime','rabbit','wolf','mushroom'],boss:'treant',general:'tiger',bg:'bg/bgL_forest.webp'},
  {name:'บทที่ 2 หุบผาทะเลทราย',mons:['scorpion','mummy','wolf','mushroom'],boss:'firedragon',general:'witch',bg:'bg/bgL_desert.webp'},
  {name:'บทที่ 3 ปราสาทผลึกทมิฬ',mons:['yeti','mummy','scorpion','boss'],boss:'nightdragon',general:'demon',bg:'bg/bgL_ruins.webp'},
];
// map nodes: landscape world map (x,y fractions) and portrait map
const MAP_NODES_L = [[.07,.78],[.13,.70],[.19,.65],[.25,.60],[.31,.55],[.37,.50],[.43,.51],[.49,.57],[.54,.60],[.60,.57],[.66,.54],[.72,.50],[.77,.44],[.82,.36],[.87,.27]];
const MAP_NODES_P = [[.47,.95],[.43,.86],[.53,.78],[.40,.70],[.55,.62],[.47,.55],[.58,.48],[.44,.42],[.56,.36],[.48,.30],[.52,.24],[.46,.19],[.53,.15],[.48,.11],[.50,.06]];
function stageInfo(i){ // 0..14 ; idx 2 = monster boss, idx 4 = general
  const ch = CHAPTERS[Math.floor(i/5)], idx = i%5, lvl = 1 + i*2;
  const pick = (k)=> ch.mons[(k + i) % ch.mons.length];
  const waves = [[pick(0),pick(1),pick(0)].slice(0, 2 + (i>1)), [pick(1),pick(2),pick(3),pick(0)].slice(0, 3 + (i>3))];
  let last;
  if(idx===2) last=['!'+ch.boss];
  else if(idx===4) last=[pick(2),'@'+ch.general,pick(3)];
  else { last=[pick(2),pick(3),pick(1)]; if(i>=7) last.push('boss'); }
  waves.push(last);
  return {i, ch, idx, name:`${Math.floor(i/5)+1}-${idx+1}`, lvl, waves, general: idx===4 ? ch.general : null, boss: idx===2 ? ch.boss : null,
    reward:{gold:120+i*40+(idx===2?300:0), gems: 10+i*2, pure: +(1+i*0.25+(idx===2?1:0)).toFixed(2), books: idx===2?3:idx===4?2:1}};
}
// story dialogue shown before some stages (speaker id or 'narrator')
const STORY = {
  0:[{w:'narrator',t:'ณ ดินแดนเพียว พลังแห่งคริสตัลกำลังถูกกลืนกินโดยความมืด'},{w:'tank',t:'ทุกคน ตั้งแถว! ป่าแห่งปฐมบทอยู่ข้างหน้าแล้ว'},{w:'support',t:'อย่าบุกเดี่ยวนะ ข้าจะคอยรักษาให้เอง'}],
  2:[{w:'treant',t:'ผู้บุกรุกป่าศักดิ์สิทธิ์... จงกลายเป็นปุ๋ย!'},{w:'fighter',t:'ต้นไม้ยักษ์พูดได้? งั้นข้าจะโค่นเจ้าเอง!'}],
  4:[{w:'tiger',t:'ข้าคือขุนพลพยัคฆ์กระดูก ผู้เฝ้าประตูป่า ใครผ่านต้องตาย!'},{w:'marksman',t:'ถ้าชนะเขาได้ เราอาจจับเขามาเป็นพวกได้นะ!'}],
  5:[{w:'narrator',t:'เหล่าขุนพลมุ่งหน้าสู่หุบผาทะเลทราย ที่ซึ่งเปลวไฟไม่เคยมอดดับ'},{w:'mage',t:'ความร้อนที่นี่ผิดธรรมชาติ... มีบางสิ่งซ่อนอยู่'}],
  7:[{w:'firedragon',t:'มนุษย์ตัวจ้อย... เปลวไฟของข้าจะเผาเจ้าเป็นเถ้า!'},{w:'flame',t:'ไฟของเจ้าเทียบไฟในใจข้าไม่ได้หรอก!'}],
  9:[{w:'witch',t:'ราตรีนี้เป็นของข้า... พวกเจ้าจะหลับใหลไปตลอดกาล'},{w:'assassin',t:'ความมืด... คือบ้านของข้า'}],
  10:[{w:'narrator',t:'ปราสาทผลึกทมิฬตระหง่านอยู่เบื้องหน้า ที่นั่นจอมมารรอคอยอยู่'},{w:'valkyrie',t:'ในนามแห่งสวรรค์ เราจะยุติความมืดนี้!'}],
  12:[{w:'nightdragon',t:'ราตรีอันเป็นนิรันดร์... จงจมลงในเงามืดของข้า!'},{w:'succubus',t:'ฮึๆ ท่านจักรพรรดิดูเครียดจังนะ ให้ข้าช่วยผ่อนคลายไหม'}],
  14:[{w:'demon',t:'เลือดของพวกเจ้า จะหล่อเลี้ยงดาบข้า!'},{w:'tank',t:'นี่คือการต่อสู้ครั้งสุดท้าย ทุกคน สู้สุดใจ!'}],
};
const QUESTS = [
  {id:'login',name:'เข้าเกมวันนี้',goal:1,pure:1,gems:20},
  {id:'win',name:'ชนะการต่อสู้ 3 ครั้ง',goal:3,pure:5,gems:30,books:2},
  {id:'ult',name:'ใช้ท่าไม้ตาย 5 ครั้ง',goal:5,pure:3,talisman:1},
  {id:'summon',name:'อัญเชิญฮีโร่ 1 ครั้ง',goal:1,pure:2,gold:500},
  {id:'upgrade',name:'อัปเกรดฮีโร่/สกิล 2 ครั้ง',goal:2,pure:2,talisman:1},
];
const SKILL_MAX = 10;
const DAILY_PURE_CAP = 60;
const DONATE_ADDR = '0x920deab53daf94ca2030ad5ceec2265bf5686941';
// voice clip key helpers
const VKEY = (id,kind)=>`${id}_${kind}`;
