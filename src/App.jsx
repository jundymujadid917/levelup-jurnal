import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch(e) { console.warn("Firebase not configured, using localStorage"); }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RANK_LABELS = ["E","E","E","D","D","D","C","C","C","B","B","B","A","A","A","S","S","S","SS","SS","SSS"];
const RANK_COLORS = {E:"#64748b",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444",SS:"#f97316",SSS:"#fbbf24"};

const STAT_META = {
  STR:{label:"Strength",icon:"⚔️",color:"#ef4444"},
  AGI:{label:"Agility",icon:"💨",color:"#4fc3f7"},
  VIT:{label:"Vitality",icon:"❤️",color:"#f87171"},
  INT:{label:"Intelligence",icon:"📚",color:"#a78bfa"},
  WIS:{label:"Wisdom",icon:"🌙",color:"#34d399"},
};

const SKILLS = [
  {id:"iron_will",  name:"Iron Will",       icon:"🔥",req:3, stat:"STR",desc:"Streak multiplier aktif di quest fisik"},
  {id:"swift_step", name:"Swift Step",      icon:"⚡",req:5, stat:"AGI",desc:"Quest kardio +50% AGI XP"},
  {id:"iron_body",  name:"Iron Body",       icon:"🛡️",req:7, stat:"VIT",desc:"Quest recovery kurangi fatigue"},
  {id:"scholar",    name:"Scholar's Mind",  icon:"🧠",req:10,stat:"INT",desc:"Quest belajar chain ke bonus INT"},
  {id:"inner_peace",name:"Inner Peace",     icon:"☯️",req:10,stat:"WIS",desc:"Quest spiritual +5% semua XP"},
  {id:"berserker",  name:"Berserker Mode",  icon:"💢",req:15,stat:"STR",desc:"Combo 3 quest fisik = triple XP"},
  {id:"phantom",    name:"Phantom Steps",   icon:"🌫️",req:15,stat:"AGI",desc:"Unlock timed sprint challenges"},
  {id:"sovereign",  name:"Sovereign's Aura",icon:"👑",req:20,stat:null, desc:"Semua stat +10% permanent"},
];

const AVATAR_FRAMES = [
  {id:"frame_basic",    name:"Basic",     unlockLevel:1,  cost:0,   style:{border:"3px solid #334155",boxShadow:"none"},label:"⬜ Basic"},
  {id:"frame_hunter",   name:"Hunter",    unlockLevel:3,  cost:0,   style:{border:"3px solid #3b82f6",boxShadow:"0 0 12px #3b82f688"},label:"🔵 Hunter"},
  {id:"frame_warrior",  name:"Warrior",   unlockLevel:5,  cost:50,  style:{border:"3px solid #ef4444",boxShadow:"0 0 14px #ef444488"},label:"🔴 Warrior"},
  {id:"frame_mage",     name:"Mage",      unlockLevel:8,  cost:80,  style:{border:"3px solid #a855f7",boxShadow:"0 0 16px #a855f788"},label:"🟣 Mage"},
  {id:"frame_gold",     name:"Gold",      unlockLevel:10, cost:120, style:{border:"3px solid #f59e0b",boxShadow:"0 0 18px #f59e0b99"},label:"🟡 Gold"},
  {id:"frame_shadow",   name:"Shadow",    unlockLevel:15, cost:200, style:{border:"3px solid #1e293b",boxShadow:"0 0 20px #000"},label:"⚫ Shadow"},
  {id:"frame_sovereign",name:"Sovereign", unlockLevel:20, cost:500, style:{border:"3px solid #fbbf24",boxShadow:"0 0 24px #fbbf2499"},label:"✨ Sovereign"},
];

const AVATAR_BADGES = [
  {id:"none",   label:"Tidak ada", emoji:"",   unlockLevel:1,  cost:0},
  {id:"sword",  label:"Pedang",    emoji:"⚔️", unlockLevel:3,  cost:0},
  {id:"fire",   label:"Api",       emoji:"🔥", unlockLevel:5,  cost:40},
  {id:"crown",  label:"Mahkota",   emoji:"👑", unlockLevel:8,  cost:80},
  {id:"bolt",   label:"Petir",     emoji:"⚡", unlockLevel:10, cost:100},
  {id:"moon",   label:"Bulan",     emoji:"🌙", unlockLevel:12, cost:150},
  {id:"star",   label:"Bintang",   emoji:"🌟", unlockLevel:15, cost:200},
  {id:"dragon", label:"Naga",      emoji:"🐉", unlockLevel:20, cost:500},
];

const CAT_META = {
  Fisik:          {color:"#ef4444", icon:"💪", stat:"STR"},
  Iman:           {color:"#34d399", icon:"🤲", stat:"WIS"},
  "Self Improvement": {color:"#a78bfa", icon:"🧠", stat:"INT"},
};

// ─── ASSESSMENT ─────────────────────────────────────────────────────────────

const ASSESSMENT_STEPS = [
  // ── FISIK ──
  {
    id:"fisik_kondisi", cat:"Fisik", phase:"FISIK", icon:"💪",
    label:"Kondisi fisik kamu hari ini?", type:"single",
    options:[
      {value:"Segar & bertenaga penuh", emoji:"🔋"},
      {value:"Oke, bisa push tapi tidak maksimal", emoji:"✅"},
      {value:"Agak pegal / kurang tidur", emoji:"😮‍💨"},
      {value:"Lelah banget, perlu istirahat", emoji:"😴"},
    ],
  },
  {
    id:"fisik_latihan", cat:"Fisik", phase:"FISIK", icon:"🏋️",
    label:"Terakhir kali kamu kalistenik kapan?", type:"single",
    options:[
      {value:"Hari ini sudah latihan", emoji:"✅"},
      {value:"Kemarin", emoji:"📅"},
      {value:"2-3 hari yang lalu", emoji:"⏰"},
      {value:"Lebih dari seminggu", emoji:"😅"},
    ],
  },
  {
    id:"fisik_target", cat:"Fisik", phase:"FISIK", icon:"🎯",
    label:"Target fisik yang ingin dicapai?", type:"multi",
    options:[
      {value:"Bisa push-up 50+ reps", emoji:"💪"},
      {value:"Bisa pull-up", emoji:"🏋️"},
      {value:"Badan lebih langsing", emoji:"🔥"},
      {value:"Stamina & daya tahan naik", emoji:"🏃"},
      {value:"Otot lebih kuat & padat", emoji:"⚡"},
    ],
  },
  // ── IMAN ──
  {
    id:"iman_sholat", cat:"Iman", phase:"IMAN", icon:"🕌",
    label:"Sholat berjamaah di masjid hari ini?", type:"single",
    options:[
      {value:"5 waktu berjamaah di masjid", emoji:"🌟"},
      {value:"3-4 waktu berjamaah", emoji:"✅"},
      {value:"1-2 waktu berjamaah", emoji:"🙂"},
      {value:"Belum sempat ke masjid", emoji:"😔"},
    ],
  },
  {
    id:"iman_tahajud", cat:"Iman", phase:"IMAN", icon:"🌙",
    label:"Tahajud & ibadah malam?", type:"single",
    options:[
      {value:"Rutin tahajud setiap malam", emoji:"⭐"},
      {value:"Kadang-kadang tahajud", emoji:"🌙"},
      {value:"Belum rutin, ingin mulai", emoji:"🎯"},
      {value:"Belum sama sekali", emoji:"😶"},
    ],
  },
  {
    id:"iman_tilawah", cat:"Iman", phase:"IMAN", icon:"📖",
    label:"Tilawah Al-Qur'an hari ini?", type:"single",
    options:[
      {value:"Sudah, lebih dari 1 halaman", emoji:"📖"},
      {value:"Sudah, 1 halaman", emoji:"✅"},
      {value:"Belum hari ini", emoji:"⏰"},
      {value:"Sudah lama tidak tilawah", emoji:"😔"},
    ],
  },
  // ── SELF IMPROVEMENT ──
  {
    id:"self_mood", cat:"Self Improvement", phase:"SELF", icon:"🧠",
    label:"Kondisi mental & produktivitasmu hari ini?", type:"single",
    options:[
      {value:"Fokus & produktif penuh", emoji:"🚀"},
      {value:"Lumayan fokus, bisa kerja", emoji:"✅"},
      {value:"Mudah distraksi & overthinking", emoji:"😵"},
      {value:"Burnout / tidak semangat", emoji:"😞"},
    ],
  },
  {
    id:"self_kebiasaan_buruk", cat:"Self Improvement", phase:"SELF", icon:"🚫",
    label:"Kebiasaan buruk yang ingin dibuang?", type:"multi",
    options:[
      {value:"Scroll medsos berlebihan", emoji:"📱"},
      {value:"Begadang & tidur larut", emoji:"🌃"},
      {value:"Prokrastinasi", emoji:"⏰"},
      {value:"Marah & emosi tidak terkontrol", emoji:"😤"},
      {value:"Makan tidak sehat", emoji:"🍟"},
      {value:"Kurang bersyukur", emoji:"😔"},
    ],
  },
  {
    id:"self_target", cat:"Self Improvement", phase:"SELF", icon:"🌟",
    label:"Yang ingin dikembangkan sekarang?", type:"multi",
    options:[
      {value:"Belajar ilmu agama lebih dalam", emoji:"📚"},
      {value:"Meningkatkan skill kerja / karir", emoji:"💼"},
      {value:"Menjaga kesehatan mental", emoji:"🧘"},
      {value:"Membangun kebiasaan positif", emoji:"✨"},
      {value:"Lebih produktif & fokus", emoji:"🎯"},
    ],
  },
];



// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getNextLevelExp(lvl){ return lvl * 100; }
function getRank(lvl){ return RANK_LABELS[Math.min(lvl-1, RANK_LABELS.length-1)]; }
function getRankColor(lvl){ return RANK_COLORS[getRank(lvl)]; }
function today(){ return new Date().toISOString().split("T")[0]; }
function formatDate(d){ const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }

const INITIAL_STATE = {
  playerName:"", level:1, exp:0, coins:0,
  stats:{STR:10,AGI:10,VIT:10,INT:10,WIS:10},
  unlockedSkills:[],
  avatarImage:null, equippedFrame:"frame_basic", equippedBadge:"none",
  ownedFrames:["frame_basic","frame_hunter"], ownedBadges:["none","sword"],
  quests:[], questDate:null,
  completedHistory:[],
  streak:0, lastStreakDate:null, bestStreak:0,
  dailyLog:{},  // { "2024-01-01": { fisik:2, iman:3, self:1, total:6, exp:120 } }
  setupDone:false, assessment:null, assessmentDate:null,
};

// ─── FIREBASE SYNC ────────────────────────────────────────────────────────────
async function saveToFirebase(userId, data) {
  if(!db || !userId) return;
  try {
    const ref = doc(db, "users", userId);
    await setDoc(ref, { ...data, avatarImage: null }, { merge: true }); // skip large base64
    // save avatar separately
    if(data.avatarImage) {
      await setDoc(doc(db, "users", userId+"_avatar"), { avatarImage: data.avatarImage }, { merge: true });
    }
  } catch(e) { console.warn("Firebase save error:", e); }
}

async function loadFromFirebase(userId) {
  if(!db || !userId) return null;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const avatarSnap = await getDoc(doc(db, "users", userId+"_avatar"));
    if(!snap.exists()) return null;
    const data = snap.data();
    if(avatarSnap.exists()) data.avatarImage = avatarSnap.data().avatarImage;
    return data;
  } catch(e) { console.warn("Firebase load error:", e); return null; }
}

// ─── AI QUEST GENERATION ─────────────────────────────────────────────────────

async function generateQuestsFromAI(player){
  const rank=getRank(player.level);
  const a=player.assessment||{};

  const fisikTarget=Array.isArray(a.fisik_target)?a.fisik_target.join(", "):"-";
  const selfBuruk=Array.isArray(a.self_kebiasaan_buruk)?a.self_kebiasaan_buruk.join(", "):"-";
  const selfTarget=Array.isArray(a.self_target)?a.self_target.join(", "):"-";

  const roadmap = [
    "ROADMAP MUSLIM IDEAL — panduan difficulty quest:",
    "Level 1-3 (E): Bangun kesadaran. Contoh: 1 waktu berjamaah, 5 push-up, baca 5 menit.",
    "Level 4-6 (D): Mulai konsisten. Contoh: Subuh berjamaah, 10 push-up, baca 10 menit.",
    "Level 7-9 (C): Kebiasaan solid. Contoh: 2-3x berjamaah, 20 push-up, kurangi medsos.",
    "Level 10-12 (B): Disiplin tinggi. Contoh: 3-4x berjamaah, tahajud 3x/minggu, 30 push-up.",
    "Level 13-15 (A): Istiqomah. Contoh: 5x berjamaah, tahajud rutin, 50 push-up, kajian.",
    "Level 16-19 (S): Mujahid. Contoh: 5x berjamaah + rawatib, tahajud+witir, pull-up, hafalan.",
    "Level 20+ (SS/SSS): Muslim ideal. Contoh: seluruh sunnah harian, hafal Al-Quran, fisik prima.",
  ].join("\n");

  const statLine = Object.entries(player.stats).map(([k,v])=>k+":"+v).join(", ");

  const prompt = roadmap + "\n\n" +
    "Hunter: " + (player.playerName||"Hunter") + " | Level " + player.level + " (Rank " + rank + ")\n" +
    "Stats: " + statLine + "\n\n" +
    "ASSESSMENT HARI INI:\n" +
    "[FISIK]\n" +
    "- Kondisi: " + (a.fisik_kondisi||"-") + "\n" +
    "- Terakhir latihan: " + (a.fisik_latihan||"-") + "\n" +
    "- Target: " + fisikTarget + "\n\n" +
    "[IMAN]\n" +
    "- Sholat berjamaah: " + (a.iman_sholat||"-") + "\n" +
    "- Tahajud: " + (a.iman_tahajud||"-") + "\n" +
    "- Tilawah: " + (a.iman_tilawah||"-") + "\n\n" +
    "[SELF IMPROVEMENT]\n" +
    "- Mental: " + (a.self_mood||"-") + "\n" +
    "- Kebiasaan buruk: " + selfBuruk + "\n" +
    "- Target: " + selfTarget + "\n\n" +
    "Tugasmu: generate quest harian yang:\n" +
    "1. SCALED ke level " + player.level + " — makin tinggi level, makin berat dan spesifik\n" +
    "2. Balance antara 3 kategori: Fisik, Iman, Self Improvement\n" +
    "3. Quest IMAN wajib ada sholat berjamaah di masjid dan/atau tahajud sesuai level\n" +
    "4. Quest FISIK fokus kalistenik bodyweight (push-up, pull-up, squat, dips, dll)\n" +
    "5. Quest SELF IMPROVEMENT mencakup ilmu, produktivitas, dan/atau mental health\n" +
    "6. Jumlah quest disesuaikan kondisi energi hunter\n" +
    "7. Setiap quest SPESIFIK dan TERUKUR (ada angka atau durasi)\n\n" +
    "Return ONLY a JSON array, no markdown, no extra text.\n" +
    'Each: {"id":"unique_id","text":"Deskripsi dalam Bahasa Indonesia","exp":20-100,"stat":"STR|AGI|VIT|INT|WIS","category":"Fisik|Iman|Self Improvement","difficulty":"E|D|C|B|A|S","action":"Aksi spesifik terukur"}';

  const res=await fetch("/.netlify/functions/quest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
  if(!res.ok){const e=await res.text();throw new Error("HTTP "+res.status+": "+e.slice(0,150));}
  const data=await res.json();
  if(data.error)throw new Error("API Error: "+(data.error.message||JSON.stringify(data.error)));
  const text=data.text||"[]";
  try{
    const clean=text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean).map(q=>({...q,completed:false,date:today()}));
  }catch(e){throw new Error("Parse error: "+e.message);}
}


// ─── ASSESSMENT SCREEN ────────────────────────────────────────────────────────
function AssessmentScreen({existing,onSave,onSkip}){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState(()=>existing?{...existing}:{});
  const q=ASSESSMENT_STEPS[step];
  const isLast=step===ASSESSMENT_STEPS.length-1;
  const prog=((step)/ASSESSMENT_STEPS.length)*100;
  const val=answers[q.id];
  const canNext=q.type==="single"?!!val:(Array.isArray(val)&&val.length>0);

  const catColors={Fisik:"#ef4444",Iman:"#34d399","Self Improvement":"#a78bfa"};
  const catColor=catColors[q.cat]||"#4fc3f7";

  function toggleMulti(v){setAnswers(a=>{const cur=Array.isArray(a[q.id])?a[q.id]:[];return{...a,[q.id]:cur.includes(v)?cur.filter(x=>x!==v):[...cur,v]};});}

  return(
    <div style={css.root}>
      <style>{FONTS+ANIMATIONS}</style>
      <div style={{padding:"20px 20px 10px",borderBottom:"1px solid #1a1a2e"}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:6,fontFamily:"monospace"}}>ASSESSMENT HARIAN</div>
        <div style={{height:3,background:"#1a1a2e",borderRadius:3}}><div style={{height:"100%",width:`${prog}%`,background:`linear-gradient(90deg,${catColor}88,${catColor})`,borderRadius:3,transition:"width 0.4s ease"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:10,color:catColor,letterSpacing:1,fontWeight:700}}>{q.cat.toUpperCase()}</span>
          <span style={{fontSize:10,color:"#64748b"}}>{step+1}/{ASSESSMENT_STEPS.length}</span>
        </div>
      </div>
      <div style={{padding:"24px 20px",overflowY:"auto"}}>
        <div style={{fontSize:28,marginBottom:10}}>{q.icon}</div>
        <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",lineHeight:1.4,marginBottom:4}}>{q.label}</div>
        {q.type==="multi"&&<div style={{fontSize:11,color:"#64748b",marginBottom:16}}>Pilih semua yang sesuai</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:q.type==="multi"?0:16}}>
          {q.options.map(opt=>{
            const optVal=opt.value;
            const isSelected=q.type==="single"?val===optVal:(Array.isArray(val)&&val.includes(optVal));
            return(
              <button key={optVal}
                style={{background:isSelected?`${catColor}22`:"#0e1117",border:`1px solid ${isSelected?catColor:"#1e293b"}`,borderLeft:`3px solid ${isSelected?catColor:"#1e293b"}`,color:isSelected?"#e2e8f0":"#94a3b8",padding:"13px 16px",borderRadius:8,cursor:"pointer",fontSize:13,textAlign:"left",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10}}
                onClick={()=>q.type==="single"?setAnswers(a=>({...a,[q.id]:optVal})):toggleMulti(optVal)}>
                <span style={{fontSize:18,minWidth:24}}>{opt.emoji}</span>
                <span>{opt.label||opt.value}</span>
                {isSelected&&<span style={{marginLeft:"auto",color:catColor}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{padding:"0 20px 32px",display:"flex",gap:10}}>
        {step>0?<button style={{...css.btnSecondary,flex:1}} onClick={()=>setStep(s=>s-1)}>← KEMBALI</button>:<button style={{...css.btnSecondary,flex:1}} onClick={onSkip}>LEWATI</button>}
        <button style={{...css.btnPrimary,flex:2,opacity:canNext?1:0.4,marginTop:0,borderColor:catColor,color:catColor}} disabled={!canNext}
          onClick={()=>isLast?onSave(answers):setStep(s=>s+1)}>
          {isLast?"⚙️ GENERATE QUEST":"LANJUT →"}
        </button>
      </div>
    </div>
  );
}

// ─── PROGRESS PANEL ─────────────────────────────────────────────────────────

function ProgressPanel({state}){
  const log = state.dailyLog || {};
  const allDates = Object.keys(log).sort();
  const recentDates = allDates.slice(-14).reverse();

  // Last 30 days calendar
  const calDays = [];
  for(let i=29; i>=0; i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split("T")[0];
    calDays.push({ date:ds, data:log[ds]||null });
  }

  // Total per category (all time)
  const totalByCat = { Fisik:0, Iman:0, "Self Improvement":0 };
  allDates.forEach(date => {
    const day = log[date];
    if(day?.categories){
      Object.entries(day.categories).forEach(([cat,val]) => {
        if(totalByCat[cat] !== undefined) totalByCat[cat] += val;
      });
    }
  });
  const maxCat = Math.max(...Object.values(totalByCat), 1);

  // Weekly EXP (last 7 days)
  const weekDays = [];
  for(let i=6; i>=0; i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split("T")[0];
    const dayData = log[ds];
    weekDays.push({
      label: ["Min","Sen","Sel","Rab","Kam","Jum","Sab"][d.getDay()],
      exp: dayData?.exp || 0,
      total: dayData?.total || 0,
      isToday: i === 0,
    });
  }
  const maxExp = Math.max(...weekDays.map(d=>d.exp), 1);

  // Total EXP all time
  const totalExpAllTime = allDates.reduce((sum,d) => sum + (log[d]?.exp||0), 0);
  const activeDays = allDates.length;

  return(
    <div style={{...css.tab, paddingBottom:60}}>

      {/* ── RINGKASAN UMUM ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          {val:state.streak||0,     label:"Streak 🔥",  color:"#f97316"},
          {val:state.bestStreak||0, label:"Rekor 🏆",   color:"#fbbf24"},
          {val:activeDays,          label:"Hari Aktif",  color:"#4fc3f7"},
        ].map(x=>(
          <div key={x.label} style={{background:"#0e1117",border:"1px solid #1e293b",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:900,color:x.color,fontFamily:"monospace",lineHeight:1}}>{x.val}</div>
            <div style={{fontSize:9,color:"#64748b",marginTop:4,letterSpacing:0.5}}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* ── KALENDER STREAK 30 HARI ── */}
      <div style={{background:"#0e1117",border:"1px solid #1e293b",borderRadius:12,padding:"16px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:10}}>AKTIVITAS 30 HARI TERAKHIR</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {calDays.map(d=>{
            const intensity = d.data
              ? d.data.total >= 5 ? "#16a34a"
              : d.data.total >= 3 ? "#15803d"
              : d.data.total >= 1 ? "#166534"
              : "#0f2818"
              : "#1a1a2e";
            const isToday = d.date === new Date().toISOString().split("T")[0];
            return(
              <div key={d.date}
                title={d.date + (d.data ? " — "+d.data.total+" quest, +"+d.data.exp+" XP" : " — tidak aktif")}
                style={{
                  width:22, height:22, borderRadius:4,
                  background:intensity,
                  border:`1px solid ${isToday?"#4fc3f7":d.data?"#16a34a33":"#1e293b"}`,
                  boxShadow:isToday?"0 0 0 1px #4fc3f7":undefined,
                  cursor:"default", transition:"all 0.2s",
                }}
              />
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
          <span style={{fontSize:9,color:"#475569"}}>Kurang aktif</span>
          {["#0f2818","#166534","#15803d","#16a34a"].map(c=>(
            <div key={c} style={{width:12,height:12,borderRadius:2,background:c}}/>
          ))}
          <span style={{fontSize:9,color:"#475569"}}>Aktif banget</span>
        </div>
      </div>

      {/* ── GRAFIK XP MINGGUAN ── */}
      <div style={{background:"#0e1117",border:"1px solid #1e293b",borderRadius:12,padding:"16px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:2}}>XP MINGGU INI</div>
          <div style={{fontSize:11,color:"#4fc3f7",fontFamily:"monospace"}}>Total: {totalExpAllTime} XP</div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
          {weekDays.map((d,i)=>{
            const h = maxExp > 0 ? Math.max(4, (d.exp/maxExp)*72) : 4;
            return(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:8,color:d.exp>0?"#4fc3f7":"#334155",fontFamily:"monospace"}}>{d.exp>0?d.exp:""}</div>
                <div style={{
                  width:"100%", height:h,
                  background:d.isToday
                    ? "linear-gradient(180deg,#4fc3f7,#1e40af)"
                    : d.exp>0 ? "linear-gradient(180deg,#334155,#1e293b)" : "#0f172a",
                  borderRadius:"4px 4px 2px 2px",
                  border:d.isToday?"1px solid #4fc3f788":undefined,
                  transition:"height 0.5s ease",
                }}/>
                <div style={{fontSize:8,color:d.isToday?"#4fc3f7":"#475569"}}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PROGRESS PER KATEGORI ── */}
      <div style={{background:"#0e1117",border:"1px solid #1e293b",borderRadius:12,padding:"16px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:12}}>TOTAL QUEST PER KATEGORI</div>
        {Object.entries(CAT_META).map(([cat,m])=>{
          const total = totalByCat[cat] || 0;
          const pct = (total/maxCat)*100;
          return(
            <div key={cat} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:13,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif"}}>{m.icon} {cat}</span>
                <span style={{fontSize:13,fontWeight:700,color:m.color,fontFamily:"monospace"}}>{total} quest</span>
              </div>
              <div style={{...css.xpTrack,height:7}}>
                <div style={{...css.xpFill,width:`${pct}%`,background:m.color}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── RIWAYAT HARIAN ── */}
      <div style={{background:"#0e1117",border:"1px solid #1e293b",borderRadius:12,padding:"16px"}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:12}}>RIWAYAT HARIAN</div>
        {recentDates.length===0?(
          <div style={{textAlign:"center",padding:"24px",color:"#475569",fontSize:12}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div>
            Belum ada riwayat — selesaikan quest pertamamu!
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {recentDates.map(date=>{
              const d = log[date];
              const isToday = date === new Date().toISOString().split("T")[0];
              return(
                <div key={date} style={{padding:"12px",background:"#0a0a0f",borderRadius:8,border:`1px solid ${isToday?"#1e3a5f":"#1e293b"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:isToday?"#4fc3f7":"#64748b",fontFamily:"monospace",fontWeight:700}}>
                        {isToday?"Hari ini":formatDate(date)}
                      </span>
                      {isToday&&<span style={{fontSize:9,color:"#4fc3f7",border:"1px solid #4fc3f733",padding:"1px 5px",borderRadius:3}}>TODAY</span>}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#4fc3f7",fontFamily:"monospace"}}>+{d.exp||0} XP</span>
                      <span style={{fontSize:10,color:"#475569"}}>{d.total||0} quest</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {Object.entries(CAT_META).map(([cat,m])=>{
                      const count = d.categories?.[cat] || 0;
                      return(
                        <div key={cat} style={{flex:1,background:`${m.color}11`,border:`1px solid ${m.color}33`,borderRadius:6,padding:"5px",textAlign:"center",opacity:count>0?1:0.3}}>
                          <div style={{fontSize:14}}>{m.icon}</div>
                          <div style={{fontSize:10,fontWeight:700,color:m.color,fontFamily:"monospace"}}>{count}</div>
                          <div style={{fontSize:8,color:"#475569",marginTop:1}}>{cat==="Self Improvement"?"Self":cat}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [state,setState]=useState(()=>{
    try{const s=localStorage.getItem("muslim_levelup_v2");return s?JSON.parse(s):INITIAL_STATE;}
    catch{return INITIAL_STATE;}
  });
  const [activeTab,setActiveTab]=useState("quests");
  const [loadingAI,setLoadingAI]=useState(false);
  const [loadingFirebase,setLoadingFirebase]=useState(false);
  const [notification,setNotif]=useState(null);
  const [levelUpAnim,setLvlUp]=useState(false);
  const [newLevel,setNewLevel]=useState(1);
  const [skillAnim,setSkillAnim]=useState(null);
  const [setupName,setSetupName]=useState("");
  const [showAssess,setShowAssess]=useState(false);
  const [showAvatar,setShowAvatar]=useState(false);
  const [glitch,setGlitch]=useState(false);

  // userId — simple hash dari nama untuk Firebase key
  const userId = state.playerName ? state.playerName.toLowerCase().replace(/\s+/g,"_")+"_"+state.playerName.length : null;

  // Save to localStorage + Firebase on state change
  useEffect(()=>{
    try{localStorage.setItem("muslim_levelup_v2",JSON.stringify(state));}catch{}
    if(state.setupDone && userId){
      saveToFirebase(userId, state);
    }
  },[state, userId]);

  useEffect(()=>{setGlitch(true);setTimeout(()=>setGlitch(false),600);},[]);

  const showNotif=useCallback((type,msg,ms=3500)=>{setNotif({type,msg});setTimeout(()=>setNotif(null),ms);},[]);

  // ── COMPLETE QUEST ────────────────────────────────────────────────────────
  const completeQuest=useCallback((questId)=>{
    setState(prev=>{
      const quest=prev.quests.find(q=>q.id===questId);
      if(!quest)return prev;
      const nextStatus=!quest.completed;

      let expDelta=nextStatus?quest.exp:-quest.exp;
      let newExp=prev.exp+expDelta;
      let newLevel=prev.level;

      while(newExp>=getNextLevelExp(newLevel)){newExp-=getNextLevelExp(newLevel);newLevel+=1;}
      while(newExp<0&&newLevel>1){newLevel-=1;newExp=getNextLevelExp(newLevel)+newExp;}
      if(newExp<0)newExp=0;

      const leveledUp=newLevel>prev.level;
      const coins=nextStatus?Math.floor(quest.exp/5):0;
      const newStats={...prev.stats};
      if(nextStatus&&quest.stat)newStats[quest.stat]=(newStats[quest.stat]||10)+1;

      const newSkills=[...prev.unlockedSkills];
      SKILLS.forEach(sk=>{
        if(!newSkills.includes(sk.id)&&newLevel>=sk.req){
          newSkills.push(sk.id);
          setTimeout(()=>{setSkillAnim(sk);setTimeout(()=>setSkillAnim(null),3200);},600);
        }
      });

      const newFrames=[...(prev.ownedFrames||["frame_basic"])];
      AVATAR_FRAMES.forEach(f=>{if(f.cost===0&&newLevel>=f.unlockLevel&&!newFrames.includes(f.id))newFrames.push(f.id);});
      const newBadges=[...(prev.ownedBadges||["none"])];
      AVATAR_BADGES.forEach(b=>{if(b.cost===0&&newLevel>=b.unlockLevel&&!newBadges.includes(b.id))newBadges.push(b.id);});

      if(leveledUp){setNewLevel(newLevel);setTimeout(()=>{setLvlUp(true);setTimeout(()=>setLvlUp(false),3000);},200);}
      if(nextStatus)setTimeout(()=>showNotif("xp",`+${quest.exp} EXP  ·  🪙+${coins}  ·  ${quest.category}`),100);

      // Streak
      let newStreak=prev.streak||0;
      let newBestStreak=prev.bestStreak||0;
      let newLastStreakDate=prev.lastStreakDate;
      if(nextStatus){
        const todayStr=today();
        const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
        const yStr=yesterday.toISOString().split("T")[0];
        if(prev.lastStreakDate===todayStr){}
        else if(prev.lastStreakDate===yStr){newStreak=(prev.streak||0)+1;newLastStreakDate=todayStr;}
        else{newStreak=1;newLastStreakDate=todayStr;}
        newBestStreak=Math.max(newBestStreak,newStreak);
      }

      // Daily log
      const todayStr=today();
      const prevLog=prev.dailyLog||{};
      const todayLog=prevLog[todayStr]||{total:0,exp:0,categories:{Fisik:0,Iman:0,"Self Improvement":0}};
      const newDailyLog={...prevLog};
      if(nextStatus){
        newDailyLog[todayStr]={
          ...todayLog,
          total:(todayLog.total||0)+1,
          exp:(todayLog.exp||0)+quest.exp,
          categories:{
            ...todayLog.categories,
            [quest.category]:((todayLog.categories||{})[quest.category]||0)+1,
          },
        };
      }

      return{
        ...prev,
        quests:prev.quests.map(q=>q.id===questId?{...q,completed:nextStatus}:q),
        exp:newExp,level:newLevel,stats:newStats,
        unlockedSkills:newSkills,coins:(prev.coins||0)+coins,
        ownedFrames:newFrames,ownedBadges:newBadges,
        streak:newStreak,lastStreakDate:newLastStreakDate,bestStreak:newBestStreak,
        dailyLog:newDailyLog,
        completedHistory:nextStatus?[...(prev.completedHistory||[]),{...quest,completedAt:Date.now(),date:todayStr}]:prev.completedHistory,
      };
    });
  },[showNotif]);

  // ── GENERATE QUESTS ───────────────────────────────────────────────────────
  const handleSaveAssessment=useCallback(async(answers)=>{
    setState(s=>({...s,assessment:answers,assessmentDate:today()}));
    setShowAssess(false);setLoadingAI(true);
    showNotif("info","⚙️ Generating quest personal...");
    try{
      const merged={...state,assessment:answers};
      const quests=await generateQuestsFromAI(merged);
      if(!quests.length)throw new Error("No quests");
      setState(s=>({...s,assessment:answers,assessmentDate:today(),quests,questDate:today()}));
      showNotif("success",`✅ ${quests.length} quest di-assign!`);
    }catch(e){showNotif("error","⚠️ "+e.message,6000);}
    setLoadingAI(false);
  },[state,showNotif]);

  const handleGenerateQuests=useCallback(async()=>{
    if(!state.assessment){setShowAssess(true);return;}
    setLoadingAI(true);showNotif("info","⚙️ Generating quest...");
    try{
      const quests=await generateQuestsFromAI(state);
      if(!quests.length)throw new Error("No quests");
      setState(s=>({...s,quests,questDate:today()}));
      showNotif("success",`✅ ${quests.length} quest di-assign!`);
    }catch(e){showNotif("error","⚠️ "+e.message,6000);}
    setLoadingAI(false);
  },[state,showNotif]);

  const updateAvatar=useCallback((patch)=>{setState(s=>({...s,...patch}));},[]);

  // ── SETUP WITH FIREBASE LOAD ──────────────────────────────────────────────
  if(!state.setupDone)return(
    <div style={css.root}><style>{FONTS}</style>
      <div style={css.setupWrap}>
        <div style={{fontSize:11,letterSpacing:6,color:"#34d399",marginBottom:8,fontFamily:"monospace"}}>▸ SISTEM KEBANGKITAN DIRI</div>
        <div style={{fontSize:28,fontWeight:900,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",marginBottom:2}}>MUSLIM LEVELUP</div>
        <div style={{fontSize:12,color:"#34d399",marginBottom:28,letterSpacing:2}}>v2.0</div>
        <input style={css.input} placeholder="Nama hunter..." value={setupName} onChange={e=>setSetupName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&setupName.trim()){const name=setupName.trim();const uid=name.toLowerCase().replace(/\s+/g,"_")+"_"+name.length;setLoadingFirebase(true);loadFromFirebase(uid).then(saved=>{if(saved&&saved.setupDone){setState({...INITIAL_STATE,...saved,playerName:name});}else{setState(s=>({...s,playerName:name,setupDone:true}));}setLoadingFirebase(false);});}}}/>
        <button style={{...css.btnPrimary,opacity:setupName.trim()?1:0.4,borderColor:"#34d399",color:"#34d399"}}
          disabled={!setupName.trim()||loadingFirebase}
          onClick={async()=>{
            const name=setupName.trim();
            const uid=name.toLowerCase().replace(/\s+/g,"_")+"_"+name.length;
            setLoadingFirebase(true);
            showNotif("info","⚙️ Memuat data...");
            const saved=await loadFromFirebase(uid);
            if(saved&&saved.setupDone){
              setState({...INITIAL_STATE,...saved,playerName:name});
              showNotif("success","✅ Data berhasil dimuat dari cloud!");
            } else {
              setState(s=>({...s,playerName:name,setupDone:true}));
            }
            setLoadingFirebase(false);
          }}>
          {loadingFirebase?"⏳ MEMUAT...":"▶ MULAI PERJALANAN"}
        </button>
        <div style={{fontSize:10,color:"#475569",marginTop:20,textAlign:"center",fontFamily:"monospace",lineHeight:1.8}}>
          "Sistem ini memantau disiplin diri Anda.<br/>Jangan berbohong pada sistem."
        </div>
      </div>
    </div>
  );

  if(showAssess)return <AssessmentScreen existing={state.assessment} onSave={handleSaveAssessment} onSkip={()=>setShowAssess(false)}/>;
  if(showAvatar)return <AvatarScreen state={state} onUpdate={updateAvatar} onClose={()=>setShowAvatar(false)}/>;

  // ── MAIN ──────────────────────────────────────────────────────────────────
  const rank=getRank(state.level);
  const rankColor=getRankColor(state.level);
  const nextExp=getNextLevelExp(state.level);
  const xpPct=Math.min(100,(state.exp/nextExp)*100);
  const hasAssessToday=state.assessmentDate===today();
  const doneToday=state.quests.filter(q=>q.completed).length;

  // Group quests by category
  const questsByCat={};
  state.quests.forEach(q=>{
    if(!questsByCat[q.category])questsByCat[q.category]=[];
    questsByCat[q.category].push(q);
  });

  return(
    <div style={{...css.root,filter:glitch?"brightness(1.3) contrast(1.1)":"none",transition:"filter 0.1s"}}>
      <style>{FONTS+ANIMATIONS}</style>

      {notification&&<div style={{...css.notif,background:notification.type==="error"?"#2d0f0f":notification.type==="xp"?"#0f1a30":"#0f2a1a"}}>{notification.msg}</div>}

      {levelUpAnim&&(
        <div style={css.overlay}>
          <div style={css.levelBox}>
            <div style={{fontSize:10,letterSpacing:8,color:"#4fc3f7",marginBottom:8}}>SISTEM MENDETEKSI</div>
            <div style={{fontSize:40,fontWeight:900,color:"#fbbf24",fontFamily:"'Rajdhani',sans-serif",lineHeight:1}}>LEVEL UP!</div>
            <div style={{fontSize:64,fontWeight:900,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",lineHeight:1}}>LVL {newLevel}</div>
            <div style={{fontSize:12,color:"#34d399",marginTop:8}}>Rank: {getRank(newLevel)}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Kekuatan hunter meningkat!</div>
            <button style={{...css.btnPrimary,marginTop:16,fontSize:11,padding:"8px 20px",width:"auto"}} onClick={()=>{setLvlUp(false);setShowAvatar(true);}}>✏️ Customize Avatar</button>
          </div>
        </div>
      )}
      {skillAnim&&(
        <div style={css.skillBanner}>
          <span style={{fontSize:10,letterSpacing:4,color:"#a78bfa"}}>SKILL UNLOCKED</span>
          <span style={{fontSize:22}}>{skillAnim.icon} {skillAnim.name}</span>
          <span style={{fontSize:11,color:"#64748b"}}>{skillAnim.desc}</span>
        </div>
      )}

      {/* HEADER */}
      <div style={css.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <AvatarDisplay avatarImage={state.avatarImage} equippedFrame={state.equippedFrame} equippedBadge={state.equippedBadge} size={52} showEdit onClick={()=>setShowAvatar(true)}/>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>{state.playerName}</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{fontSize:10,color:rankColor,border:`1px solid ${rankColor}`,padding:"0 5px",borderRadius:3,letterSpacing:1,fontFamily:"monospace"}}>{rank}</div>
              <div style={{fontSize:10,color:"#64748b",letterSpacing:1}}>LV.{state.level}</div>
              <div style={{fontSize:10,color:"#f97316",letterSpacing:1}}>🔥{state.streak||0}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#fbbf24",fontFamily:"monospace",fontWeight:700}}>🪙 {state.coins||0}</div>
            <div style={{fontSize:10,color:"#64748b"}}>{state.exp}/{nextExp} EXP</div>
          </div>
          <button style={{background:"transparent",border:`1px solid ${hasAssessToday?"#34d399":"#1e293b"}`,color:hasAssessToday?"#34d399":"#64748b",padding:"7px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"monospace"}}
            onClick={()=>setShowAssess(true)}>{hasAssessToday?"📋✓":"📋"}</button>
        </div>
      </div>

      {/* XP BAR */}
      <div style={{padding:"8px 20px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:9,color:"#64748b",letterSpacing:2}}>EXP</span>
          <span style={{fontSize:9,color:"#4fc3f7",fontFamily:"monospace"}}>{Math.floor(xpPct)}%</span>
        </div>
        <div style={css.xpTrack}><div style={{...css.xpFill,width:`${xpPct}%`}}/></div>
      </div>

      {/* NAV */}
      <div style={css.nav}>
        {["quests","progress","stats","skills"].map(t=>(
          <button key={t} style={{...css.navBtn,...(activeTab===t?css.navActive:{})}} onClick={()=>setActiveTab(t)}>
            {t==="quests"?"⚔️":t==="progress"?"📈":t==="stats"?"📊":"✨"}
          </button>
        ))}
      </div>

      {/* ── QUESTS TAB ── */}
      {activeTab==="quests"&&(
        <div style={css.tab}>
          {!hasAssessToday&&(
            <div onClick={()=>setShowAssess(true)} style={{marginBottom:16,padding:"12px 14px",background:"#0a1a14",border:"1px solid #34d399",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>📋</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#34d399",letterSpacing:1,fontFamily:"monospace"}}>ASSESSMENT BELUM DIISI</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:2}}>Isi dulu untuk quest yang personal & tepat sasaran</div>
              </div>
              <span style={{color:"#34d399"}}>→</span>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:"#64748b",letterSpacing:2}}>QUEST HARIAN</div>
              {state.quests.length>0&&<div style={{fontSize:11,color:"#4fc3f7",marginTop:1}}>{doneToday}/{state.quests.length} selesai</div>}
            </div>
            <button style={{...css.btnPrimary,width:"auto",padding:"8px 14px",fontSize:10,marginTop:0,opacity:loadingAI?0.5:1,borderColor:"#34d399",color:"#34d399"}}
              onClick={handleGenerateQuests} disabled={loadingAI}>
              {loadingAI?"⚙️ ...":"⚙️ GET QUEST"}
            </button>
          </div>

          {state.quests.length===0?(
            <div style={css.empty}>
              <div style={{fontSize:36,marginBottom:8}}>🌑</div>
              <div style={{color:"#64748b",fontSize:12,letterSpacing:1}}>TIDAK ADA QUEST</div>
              <div style={{color:"#475569",fontSize:11,marginTop:4}}>Isi assessment lalu tekan GET QUEST</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {Object.entries(questsByCat).map(([cat,quests])=>{
                const m=CAT_META[cat]||{color:"#64748b",icon:"⚡"};
                const catDone=quests.filter(q=>q.completed).length;
                return(
                  <div key={cat}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:14}}>{m.icon}</span>
                      <span style={{fontSize:11,color:m.color,fontWeight:700,letterSpacing:1}}>{cat.toUpperCase()}</span>
                      <span style={{fontSize:10,color:"#475569",marginLeft:"auto"}}>{catDone}/{quests.length}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {quests.map(q=><QuestCard key={q.id} quest={q} onToggle={()=>completeQuest(q.id)} catColor={m.color}/>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS TAB ── */}
      {activeTab==="progress"&&<ProgressPanel state={state}/>}

      {/* ── STATS TAB ── */}
      {activeTab==="stats"&&(
        <div style={css.tab}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16,cursor:"pointer"}} onClick={()=>setShowAvatar(true)}>
            <div style={{background:"#0a0a14",border:"1px solid #1e293b",borderRadius:16,padding:"20px 48px",textAlign:"center"}}>
              <AvatarDisplay avatarImage={state.avatarImage} equippedFrame={state.equippedFrame} equippedBadge={state.equippedBadge} size={100} animated/>
              <div style={{fontSize:10,color:"#533483",letterSpacing:2,marginTop:10}}>✏️ TAP UNTUK CUSTOMIZE</div>
            </div>
          </div>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:12}}>HUNTER STATUS</div>
          {Object.entries(STAT_META).map(([k,m])=>{
            const v=state.stats[k]||10;
            const pct=Math.min(100,((v-10)/90)*100);
            return(
              <div key={k} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>{m.icon} {m.label}</span>
                  <span style={{fontSize:14,fontWeight:700,color:m.color,fontFamily:"monospace"}}>{v}</span>
                </div>
                <div style={{...css.xpTrack,height:5}}><div style={{...css.xpFill,width:`${pct}%`,background:m.color}}/></div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {activeTab==="skills"&&(
        <div style={css.tab}>
          <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:16}}>SKILL TREE</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SKILLS.map(sk=>{
              const unlocked=state.unlockedSkills.includes(sk.id);
              return(
                <div key={sk.id} style={{display:"flex",alignItems:"center",padding:"14px 16px",borderRadius:10,border:`1px solid ${unlocked?(sk.stat?STAT_META[sk.stat]?.color:"#fbbf24"):"#1e293b"}`,background:unlocked?"#0f1e2f":"#0a0a0f",opacity:unlocked?1:state.level>=sk.req?0.65:0.3}}>
                  <div style={{fontSize:26,marginRight:14}}>{sk.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:700,color:unlocked?"#e2e8f0":"#475569",fontFamily:"'Rajdhani',sans-serif"}}>{sk.name}</span>
                      <span style={{fontSize:9,color:unlocked?"#4fc3f7":"#475569",letterSpacing:1}}>{unlocked?"✓ UNLOCKED":`LV.${sk.req}`}</span>
                    </div>
                    <div style={{fontSize:11,color:"#64748b"}}>{sk.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <footer style={{textAlign:"center",padding:"16px 20px 40px",fontSize:9,color:"#334155",fontFamily:"monospace",letterSpacing:1}}>
        SISTEM INI MEMANTAU DISIPLIN DIRI ANDA. JANGAN BERBOHONG PADA SISTEM.
      </footer>
    </div>
  );
}

// ─── QUEST CARD ───────────────────────────────────────────────────────────────
function QuestCard({quest,onToggle,catColor}){
  const diffColor={E:"#64748b",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444"};
  return(
    <div onClick={onToggle} style={{background:quest.completed?"#0a120a":"#0e1117",border:`1px solid ${quest.completed?"#1a3a1a":"#1e293b"}`,borderLeft:`3px solid ${quest.completed?"#22c55e":catColor}`,borderRadius:10,padding:"12px 14px",opacity:quest.completed?0.6:1,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${quest.completed?"#22c55e":"#334155"}`,background:quest.completed?"#052e16":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:"#22c55e"}}>
        {quest.completed?"✓":""}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:6,marginBottom:3}}>
          {quest.difficulty&&<span style={{fontSize:9,color:diffColor[quest.difficulty]||"#64748b",border:`1px solid ${diffColor[quest.difficulty]||"#64748b"}33`,padding:"1px 5px",borderRadius:3,letterSpacing:1}}>{quest.difficulty}</span>}
        </div>
        <div style={{fontSize:13,color:quest.completed?"#475569":"#e2e8f0",textDecoration:quest.completed?"line-through":"none",lineHeight:1.4}}>{quest.text}</div>
        {quest.action&&<div style={{fontSize:10,color:"#64748b",marginTop:2}}>{quest.action}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:700,color:quest.completed?"#334155":catColor,fontFamily:"monospace"}}>+{quest.exp}</div>
        <div style={{fontSize:9,color:"#64748b"}}>EXP</div>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css={
  root:{minHeight:"100vh",background:"#0a0a0f",color:"#e2e8f0",fontFamily:"'Inter',sans-serif",maxWidth:480,margin:"0 auto",position:"relative"},
  setupWrap:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"},
  header:{padding:"14px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #1a1a2e"},
  xpTrack:{height:4,background:"#1a1a2e",borderRadius:4,overflow:"hidden"},
  xpFill:{height:"100%",background:"linear-gradient(90deg,#1e40af,#4fc3f7)",borderRadius:4,transition:"width 0.5s ease"},
  nav:{display:"flex",borderBottom:"1px solid #1a1a2e",padding:"0 16px",marginTop:8},
  navBtn:{flex:1,background:"none",border:"none",color:"#64748b",fontSize:16,padding:"10px 4px",cursor:"pointer",borderBottom:"2px solid transparent",transition:"all 0.2s"},
  navActive:{color:"#4fc3f7",borderBottom:"2px solid #4fc3f7"},
  tab:{padding:20,paddingBottom:48},
  empty:{textAlign:"center",padding:"40px 20px",border:"1px dashed #1e293b",borderRadius:12},
  btnPrimary:{background:"transparent",border:"1px solid #4fc3f7",color:"#4fc3f7",padding:"12px 20px",borderRadius:8,cursor:"pointer",fontSize:12,letterSpacing:2,fontFamily:"monospace",transition:"all 0.2s",width:"100%",marginTop:12},
  btnSecondary:{background:"transparent",border:"1px solid #334155",color:"#64748b",padding:"12px 20px",borderRadius:8,cursor:"pointer",fontSize:12,letterSpacing:2,fontFamily:"monospace",transition:"all 0.2s",width:"100%"},
  input:{background:"#1a1a2e",border:"1px solid #1e293b",color:"#e2e8f0",padding:"13px 16px",borderRadius:8,fontSize:14,width:"100%",outline:"none",fontFamily:"'Inter',sans-serif",boxSizing:"border-box",marginBottom:4},
  notif:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:100,padding:"10px 20px",borderRadius:8,border:"1px solid #1e3a5f",color:"#93c5fd",maxWidth:380,width:"90%",textAlign:"center",animation:"slideDown 0.3s ease",fontFamily:"monospace",fontSize:12},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s ease"},
  levelBox:{textAlign:"center",padding:40,border:"1px solid #fbbf24",borderRadius:16,background:"#0a0a0f",animation:"scaleIn 0.3s ease",display:"flex",flexDirection:"column",alignItems:"center"},
  skillBanner:{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",zIndex:150,background:"#160f2e",border:"1px solid #533483",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"16px 28px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:3,animation:"slideDown 0.4s ease",minWidth:260},
};
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap');`;
const ANIMATIONS=`
  @keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
`;
