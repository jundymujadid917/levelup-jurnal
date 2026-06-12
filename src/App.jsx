import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const RANK_LABELS = ["E","E","E","D","D","D","C","C","C","B","B","B","A","A","A","S","S","S","SS","SS","SSS"];
const RANK_COLORS = {E:"#64748b",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444",SS:"#f97316",SSS:"#fbbf24"};

const STAT_META = {
  STR:{label:"Strength",icon:"⚔️",color:"#ef4444",desc:"Physical power & workout intensity"},
  AGI:{label:"Agility",icon:"💨",color:"#4fc3f7",desc:"Speed, cardio & flexibility"},
  VIT:{label:"Vitality",icon:"❤️",color:"#f87171",desc:"Sleep, nutrition & recovery"},
  INT:{label:"Intelligence",icon:"📚",color:"#a78bfa",desc:"Learning & mental growth"},
  WIS:{label:"Wisdom",icon:"🌙",color:"#34d399",desc:"Spiritual & emotional depth"},
};

const SKILLS = [
  {id:"iron_will",  name:"Iron Will",       icon:"🔥",req:3, stat:"STR",desc:"Streak multiplier aktif di strength quests"},
  {id:"swift_step", name:"Swift Step",      icon:"⚡",req:5, stat:"AGI",desc:"Cardio quests +50% AGI XP"},
  {id:"iron_body",  name:"Iron Body",       icon:"🛡️",req:7, stat:"VIT",desc:"Recovery quests kurangi fatigue penalty"},
  {id:"scholar",    name:"Scholar's Mind",  icon:"🧠",req:10,stat:"INT",desc:"Reading quests chain ke bonus INT"},
  {id:"inner_peace",name:"Inner Peace",     icon:"☯️",req:10,stat:"WIS",desc:"Spiritual quests +5% semua XP"},
  {id:"berserker",  name:"Berserker Mode",  icon:"💢",req:15,stat:"STR",desc:"Combo 3 STR quests sehari = triple XP"},
  {id:"phantom",    name:"Phantom Steps",   icon:"🌫️",req:15,stat:"AGI",desc:"Unlock timed sprint challenges"},
  {id:"sovereign",  name:"Sovereign's Aura",icon:"👑",req:20,stat:null, desc:"Semua stat +10% permanent"},
];

// ─── STATIC QUESTS (dari v0 logic) ───────────────────────────────────────────

const STATIC_QUESTS = [
  {id:"sq1", text:"Push-up 3 Set sampai failure",        exp:40, stat:"STR", category:"Kalistenik", icon:"💪"},
  {id:"sq2", text:"Pull-up / Inverted Row 3 Set",        exp:50, stat:"STR", category:"Kalistenik", icon:"🏋️"},
  {id:"sq3", text:"Squat / Lunges 3 Set",                exp:40, stat:"AGI", category:"Kalistenik", icon:"🦵"},
  {id:"sq4", text:"Sholat 5 waktu tepat waktu",          exp:50, stat:"WIS", category:"Ibadah",     icon:"🤲"},
  {id:"sq5", text:"Tilawah Al-Qur'an min. 1 halaman",    exp:30, stat:"WIS", category:"Ibadah",     icon:"📖"},
  {id:"sq6", text:"Membaca buku minimal 15 menit",       exp:20, stat:"INT", category:"Habit",      icon:"📚"},
  {id:"sq7", text:"Bangun tidur sebelum jam 05.00",      exp:30, stat:"VIT", category:"Habit",      icon:"🌅"},
  {id:"sq8", text:"Minum air putih 2 liter hari ini",    exp:20, stat:"VIT", category:"Habit",      icon:"💧"},
  {id:"sq9", text:"Tidak buka medsos lebih dari 30 menit",exp:25,stat:"INT", category:"Habit",      icon:"📵"},
  {id:"sq10",text:"Tidur sebelum jam 22.00",             exp:25, stat:"VIT", category:"Habit",      icon:"🌙"},
];

const CAT_COLORS = {
  Kalistenik:"#f59e0b",
  Ibadah:"#34d399",
  Habit:"#a78bfa",
  AI:"#4fc3f7",
};

// ─── AVATAR FRAMES ────────────────────────────────────────────────────────────

const AVATAR_FRAMES = [
  {id:"frame_basic",    name:"Basic",     unlockLevel:1,  cost:0,   style:{border:"3px solid #334155",boxShadow:"none"},                               label:"⬜ Basic"},
  {id:"frame_hunter",   name:"Hunter",    unlockLevel:3,  cost:0,   style:{border:"3px solid #3b82f6",boxShadow:"0 0 12px #3b82f688"},                  label:"🔵 Hunter"},
  {id:"frame_warrior",  name:"Warrior",   unlockLevel:5,  cost:50,  style:{border:"3px solid #ef4444",boxShadow:"0 0 14px #ef444488"},                  label:"🔴 Warrior"},
  {id:"frame_mage",     name:"Mage",      unlockLevel:8,  cost:80,  style:{border:"3px solid #a855f7",boxShadow:"0 0 16px #a855f788"},                  label:"🟣 Mage"},
  {id:"frame_gold",     name:"Gold",      unlockLevel:10, cost:120, style:{border:"3px solid #f59e0b",boxShadow:"0 0 18px #f59e0b99"},                  label:"🟡 Gold"},
  {id:"frame_shadow",   name:"Shadow",    unlockLevel:15, cost:200, style:{border:"3px solid #1e293b",boxShadow:"0 0 20px #000,inset 0 0 10px #0005"}, label:"⚫ Shadow"},
  {id:"frame_sovereign",name:"Sovereign", unlockLevel:20, cost:500, style:{border:"3px solid #fbbf24",boxShadow:"0 0 24px #fbbf2499,0 0 48px #fbbf2433"},label:"✨ Sovereign"},
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

// ─── ASSESSMENT ───────────────────────────────────────────────────────────────

const ASSESSMENT_STEPS = [
  {id:"current_state",phase:"KONDISI",icon:"🔍",label:"Kondisi fisik & mentalmu hari ini?",type:"single",
   options:[{value:"Sangat segar, siap tempur penuh",emoji:"💪"},{value:"Oke, ada tenaga tapi tidak maksimal",emoji:"🙂"},{value:"Capek tapi masih bisa bergerak",emoji:"😮‍💨"},{value:"Lelah banget, butuh recovery",emoji:"😴"}]},
  {id:"habits_today",phase:"HARI INI",icon:"✅",label:"Kebiasaan baik yang sudah kamu lakukan hari ini?",type:"multi",
   options:[{value:"Olahraga / gerak fisik",emoji:"🏃"},{value:"Sholat tepat waktu",emoji:"🤲"},{value:"Tilawah Al-Qur'an",emoji:"📖"},{value:"Belajar / membaca buku",emoji:"📚"},{value:"Makan & minum sehat",emoji:"🥗"},{value:"Tidur cukup semalam",emoji:"😴"},{value:"Belum ada",emoji:"😶"}]},
  {id:"habits_build",phase:"TARGET",icon:"🎯",label:"Kebiasaan baik yang ingin kamu bangun?",type:"multi",
   options:[{value:"Olahraga rutin setiap hari",emoji:"💪"},{value:"Konsisten sholat 5 waktu",emoji:"🕌"},{value:"Tilawah minimal 1 halaman/hari",emoji:"📖"},{value:"Baca buku 20 menit/hari",emoji:"📚"},{value:"Tidur sebelum jam 22.00",emoji:"🌙"},{value:"Kurangi screen time",emoji:"📵"},{value:"Makan lebih sehat & teratur",emoji:"🥗"}]},
  {id:"habits_drop",phase:"TARGET",icon:"🚫",label:"Kebiasaan buruk yang ingin kamu buang?",type:"multi",
   options:[{value:"Begadang / tidur larut",emoji:"🌃"},{value:"Scroll medsos berlebihan",emoji:"📱"},{value:"Malas gerak / rebahan terus",emoji:"🛋️"},{value:"Skip sholat / ibadah",emoji:"😔"},{value:"Makan tidak teratur",emoji:"🍟"},{value:"Prokrastinasi / menunda",emoji:"⏰"},{value:"Emosi tidak terkontrol",emoji:"😤"}]},
  {id:"energy_level",phase:"ENERGI",icon:"⚡",label:"Level energimu saat ini?",type:"single",
   options:[{value:"10 — Full power!",emoji:"🔋"},{value:"7 — Masih semangat",emoji:"✅"},{value:"4 — Setengah tank",emoji:"🟡"},{value:"1 — Hampir habis",emoji:"🪫"}]},
  {id:"focus_area",phase:"FOKUS",icon:"🌟",label:"Area yang paling ingin kamu kembangkan?",type:"single",
   options:[{value:"STR",label:"💪 Fisik & Kekuatan",emoji:"💪"},{value:"AGI",label:"🏃 Kardio & Kelincahan",emoji:"🏃"},{value:"VIT",label:"🛌 Kesehatan & Pemulihan",emoji:"🛌"},{value:"INT",label:"📖 Ilmu & Belajar",emoji:"📖"},{value:"WIS",label:"🤲 Spiritual & Karakter",emoji:"🤲"}]},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getNextLevelExp(lvl){ return lvl * 100; }
function getRank(lvl){ return RANK_LABELS[Math.min(lvl-1, RANK_LABELS.length-1)]; }
function getRankColor(lvl){ return RANK_COLORS[getRank(lvl)]; }
function today(){ return new Date().toISOString().split("T")[0]; }

const INITIAL_STATE = {
  playerName:"", level:1, exp:0, coins:0,
  stats:{STR:10,AGI:10,VIT:10,INT:10,WIS:10},
  unlockedSkills:[],
  avatarImage:null, equippedFrame:"frame_basic", equippedBadge:"none",
  ownedFrames:["frame_basic","frame_hunter"], ownedBadges:["none","sword"],
  staticQuests: STATIC_QUESTS.map(q=>({...q,completed:false,date:today()})),
  aiQuests:[], aiQuestDate:null,
  completedHistory:[], streak:0,
  setupDone:false, assessment:null, assessmentDate:null,
};

// ─── AVATAR DISPLAY ───────────────────────────────────────────────────────────

function AvatarDisplay({avatarImage,equippedFrame,equippedBadge,size=64,animated=false,onClick,showEdit=false}){
  const frame = AVATAR_FRAMES.find(f=>f.id===equippedFrame)||AVATAR_FRAMES[0];
  const badge = AVATAR_BADGES.find(b=>b.id===equippedBadge)||AVATAR_BADGES[0];
  const radius = size*0.22;
  return(
    <div onClick={onClick} style={{position:"relative",width:size,height:size,borderRadius:radius,overflow:"visible",cursor:onClick?"pointer":"default",animation:animated?"float 3s ease-in-out infinite":undefined,flexShrink:0}}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      <div style={{width:size,height:size,borderRadius:radius,overflow:"hidden",...frame.style,background:avatarImage?"#000":"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {avatarImage?<img src={avatarImage} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<span style={{fontSize:size*0.4,opacity:0.4}}>👤</span>}
      </div>
      {badge.emoji&&<div style={{position:"absolute",bottom:-4,right:-4,background:"#0a0a0f",border:"2px solid #1a1a2e",borderRadius:"50%",width:size*0.32,height:size*0.32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.18,zIndex:2}}>{badge.emoji}</div>}
      {showEdit&&<div style={{position:"absolute",top:-4,right:-4,background:"#533483",border:"2px solid #0a0a0f",borderRadius:"50%",width:size*0.3,height:size*0.3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.14,zIndex:3}}>✏️</div>}
    </div>
  );
}

// ─── AVATAR SCREEN ────────────────────────────────────────────────────────────

function AvatarScreen({state,onUpdate,onClose}){
  const fileRef = useRef();
  const [tab,setTab] = useState("photo");
  const [previewImg,setPreviewImg] = useState(state.avatarImage);
  const [previewFrame,setPreviewFrame] = useState(state.equippedFrame);
  const [previewBadge,setPreviewBadge] = useState(state.equippedBadge);
  const [ownedFrames,setOwnedFrames] = useState(state.ownedFrames||["frame_basic","frame_hunter"]);
  const [ownedBadges,setOwnedBadges] = useState(state.ownedBadges||["none","sword"]);
  const [coins,setCoins] = useState(state.coins||0);

  function handleFile(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPreviewImg(ev.target.result);r.readAsDataURL(f);}
  function buyFrame(frame){if(coins<frame.cost||ownedFrames.includes(frame.id))return;setCoins(c=>c-frame.cost);setOwnedFrames(f=>[...f,frame.id]);setPreviewFrame(frame.id);}
  function buyBadge(badge){if(coins<badge.cost||ownedBadges.includes(badge.id))return;setCoins(c=>c-badge.cost);setOwnedBadges(b=>[...b,badge.id]);setPreviewBadge(badge.id);}
  function handleSave(){onUpdate({avatarImage:previewImg,equippedFrame:previewFrame,equippedBadge:previewBadge,ownedFrames,ownedBadges,coins});onClose();}

  const tabs=[{id:"photo",label:"📷 Foto"},{id:"frame",label:"🖼️ Frame"},{id:"badge",label:"🏅 Badge"}];
  const itemMap={frame:AVATAR_FRAMES,badge:AVATAR_BADGES};

  return(
    <div style={{...css.root,position:"fixed",inset:0,zIndex:300,overflowY:"auto"}}>
      <style>{FONTS}</style>
      <div style={{padding:"18px 20px 10px",borderBottom:"1px solid #1a1a2e",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#0a0a0f",zIndex:10}}>
        <div style={{fontSize:11,color:"#64748b",letterSpacing:3,fontFamily:"monospace"}}>CUSTOMIZE AVATAR</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:20}}>✕</button>
      </div>
      <div style={{background:"#0a0a14",borderBottom:"1px solid #1a1a2e",padding:"28px 0 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <AvatarDisplay avatarImage={previewImg} equippedFrame={previewFrame} equippedBadge={previewBadge} size={110} animated/>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:2}}>PREVIEW</div>
        <div style={{fontSize:13,color:"#fbbf24",fontFamily:"monospace"}}>🪙 {coins} koin</div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #1a1a2e",position:"sticky",top:49,background:"#0a0a0f",zIndex:9}}>
        {tabs.map(t=><button key={t.id} style={{flex:1,background:"none",border:"none",color:tab===t.id?"#4fc3f7":"#64748b",fontSize:12,padding:"11px 4px",cursor:"pointer",borderBottom:`2px solid ${tab===t.id?"#4fc3f7":"transparent"}`}} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>
      <div style={{padding:20,paddingBottom:100}}>
        {tab==="photo"&&(
          <div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>Upload foto untuk jadi avatarmu</div>
            <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed #334155",borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer",marginBottom:16,background:"#0e1117"}}>
              <div style={{fontSize:40,marginBottom:10}}>{previewImg?"🔄":"📷"}</div>
              <div style={{fontSize:13,color:"#e2e8f0",marginBottom:4}}>{previewImg?"Ganti foto":"Upload foto / gambar"}</div>
              <div style={{fontSize:11,color:"#475569"}}>JPG, PNG — max 5MB</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            {previewImg&&<div style={{display:"flex",gap:10}}>
              <div style={{flex:1,background:"#0e1117",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",aspectRatio:"1"}}><img src={previewImg} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
              <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
                <button style={{...css.btnSecondary,marginTop:0,fontSize:11,padding:"8px 12px"}} onClick={()=>fileRef.current.click()}>🔄 Ganti</button>
                <button style={{background:"transparent",border:"1px solid #ef4444",color:"#ef4444",padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"monospace"}} onClick={()=>setPreviewImg(null)}>🗑️ Hapus</button>
              </div>
            </div>}
          </div>
        )}
        {(tab==="frame"||tab==="badge")&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {(itemMap[tab]).map(item=>{
              const owned = tab==="frame"?ownedFrames.includes(item.id):ownedBadges.includes(item.id);
              const active = tab==="frame"?previewFrame===item.id:previewBadge===item.id;
              const canSee = state.level>=item.unlockLevel;
              return(
                <div key={item.id} onClick={()=>owned&&(tab==="frame"?setPreviewFrame(item.id):setPreviewBadge(item.id))}
                  style={{background:active?"#1a2a4a":"#0e1117",border:`1px solid ${active?"#4fc3f7":"#1e293b"}`,borderRadius:10,padding:"14px 12px",cursor:owned?"pointer":"default",opacity:canSee?1:0.35,textAlign:"center",transition:"all 0.15s"}}>
                  <div style={{fontSize:tab==="badge"?30:14,marginBottom:6}}>{tab==="badge"?(item.emoji||"∅"):item.label}</div>
                  {tab==="frame"&&<div style={{display:"flex",justifyContent:"center",marginBottom:6}}><div style={{width:36,height:36,borderRadius:8,overflow:"hidden",...item.style,background:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{previewImg?<img src={previewImg} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}</div></div>}
                  <div style={{fontSize:12,color:active?"#e2e8f0":"#94a3b8",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,marginBottom:4}}>{item.name||item.label}</div>
                  {active&&<div style={{fontSize:9,color:"#4fc3f7",letterSpacing:1}}>✓ AKTIF</div>}
                  {!owned&&canSee&&<button onClick={e=>{e.stopPropagation();tab==="frame"?buyFrame(item):buyBadge(item);}} style={{marginTop:6,background:"transparent",border:`1px solid ${coins>=item.cost?"#fbbf24":"#475569"}`,color:coins>=item.cost?"#fbbf24":"#475569",padding:"4px 10px",borderRadius:5,cursor:coins>=item.cost?"pointer":"not-allowed",fontSize:10,fontFamily:"monospace",width:"100%"}}>{item.cost===0?"GRATIS":`🪙 ${item.cost}`}</button>}
                  {!owned&&!canSee&&<div style={{fontSize:9,color:"#475569",marginTop:4}}>LV.{item.unlockLevel}</div>}
                  {owned&&!active&&<div style={{fontSize:9,color:"#334155",marginTop:4,letterSpacing:1}}>TAP UNTUK PAKAI</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"12px 20px 24px",background:"linear-gradient(transparent,#0a0a0f 30%)",zIndex:20}}>
        <button style={css.btnPrimary} onClick={handleSave}>💾 SIMPAN AVATAR</button>
      </div>
    </div>
  );
}

// ─── ASSESSMENT SCREEN ────────────────────────────────────────────────────────

function AssessmentScreen({existing,onSave,onSkip}){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState(()=>existing?{...existing}:{});
  const q=ASSESSMENT_STEPS[step];
  const isLast=step===ASSESSMENT_STEPS.length-1;
  const prog=(step/ASSESSMENT_STEPS.length)*100;
  const val=answers[q.id];
  const canNext=q.type==="single"?!!val:(Array.isArray(val)&&val.length>0);
  function toggleMulti(v){setAnswers(a=>{const cur=Array.isArray(a[q.id])?a[q.id]:[];return{...a,[q.id]:cur.includes(v)?cur.filter(x=>x!==v):[...cur,v]};});}
  return(
    <div style={css.root}>
      <style>{FONTS+ANIMATIONS}</style>
      <div style={{padding:"20px 20px 10px",borderBottom:"1px solid #1a1a2e"}}>
        <div style={{fontSize:10,color:"#64748b",letterSpacing:3,marginBottom:6,fontFamily:"monospace"}}>SISTEM — HUNTER ASSESSMENT</div>
        <div style={{height:3,background:"#1a1a2e",borderRadius:3}}><div style={{height:"100%",width:`${prog}%`,background:"linear-gradient(90deg,#533483,#4fc3f7)",borderRadius:3,transition:"width 0.4s ease"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:10,color:"#533483",letterSpacing:1}}>{q.phase}</span>
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
              <button key={optVal} style={{background:isSelected?"#1a2a4a":"#0e1117",border:`1px solid ${isSelected?"#4fc3f7":"#1e293b"}`,borderLeft:`3px solid ${isSelected?"#4fc3f7":"#1e293b"}`,color:isSelected?"#e2e8f0":"#94a3b8",padding:"13px 16px",borderRadius:8,cursor:"pointer",fontSize:13,textAlign:"left",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10}}
                onClick={()=>q.type==="single"?setAnswers(a=>({...a,[q.id]:optVal})):toggleMulti(optVal)}>
                <span style={{fontSize:18,minWidth:24}}>{opt.emoji}</span>
                <span>{opt.label||opt.value}</span>
                {isSelected&&<span style={{marginLeft:"auto",color:"#4fc3f7"}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{padding:"0 20px 32px",display:"flex",gap:10}}>
        {step>0?<button style={{...css.btnSecondary,flex:1}} onClick={()=>setStep(s=>s-1)}>← KEMBALI</button>:<button style={{...css.btnSecondary,flex:1}} onClick={onSkip}>LEWATI</button>}
        <button style={{...css.btnPrimary,flex:2,opacity:canNext?1:0.4,marginTop:0}} disabled={!canNext} onClick={()=>isLast?onSave(answers):setStep(s=>s+1)}>
          {isLast?"⚙️ GENERATE QUEST":"LANJUT →"}
        </button>
      </div>
    </div>
  );
}

// ─── AI QUEST GENERATION ─────────────────────────────────────────────────────

async function generateQuestsFromAI(player){
  const rank=getRank(player.level);
  const statSummary=Object.entries(player.stats).map(([k,v])=>`${k}:${v}`).join(", ");
  const a=player.assessment||{};
  const prompt=`You are the System AI in a Muslim LevelUp app (Solo Leveling-style).
Hunter: ${player.playerName||"Hunter"} | Level ${player.level} (Rank ${rank})
Stats: ${statSummary}
Kondisi: ${a.current_state||"-"}
Sudah dilakukan: ${Array.isArray(a.habits_today)?a.habits_today.join(", "):"-"}
Ingin dibangun: ${Array.isArray(a.habits_build)?a.habits_build.join(", "):"-"}
Ingin dibuang: ${Array.isArray(a.habits_drop)?a.habits_drop.join(", "):"-"}
Energi: ${a.energy_level||"-"}
Fokus: ${a.focus_area||"balanced"}

Assign 5 additional daily quests tailored to this hunter. Focus on Islamic values + personal growth.
Return ONLY a JSON array, no markdown.
Each: {"id":"ai_snake_case","text":"Quest description in Bahasa Indonesia","exp":20-60,"stat":"STR|AGI|VIT|INT|WIS","category":"Kalistenik|Ibadah|Habit","action":"Specific measurable task"}`;

  const res=await fetch("/.netlify/functions/quest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
  if(!res.ok){const e=await res.text();throw new Error("HTTP "+res.status+": "+e.slice(0,150));}
  const data=await res.json();
  if(data.error)throw new Error("API Error: "+(data.error.message||JSON.stringify(data.error)));
  const text=data.text||"[]";
  try{
    const clean=text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean).map(q=>({...q,completed:false,date:today(),isAI:true}));
  }catch(e){throw new Error("Parse error: "+e.message);}
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App(){
  const [state,setState]=useState(()=>{
    try{const s=localStorage.getItem("muslim_levelup_v1");return s?JSON.parse(s):INITIAL_STATE;}
    catch{return INITIAL_STATE;}
  });
  const [activeTab,setActiveTab]=useState("quests");
  const [loadingAI,setLoadingAI]=useState(false);
  const [notification,setNotif]=useState(null);
  const [levelUpAnim,setLvlUp]=useState(false);
  const [newLevel,setNewLevel]=useState(1);
  const [skillAnim,setSkillAnim]=useState(null);
  const [setupName,setSetupName]=useState("");
  const [showAssess,setShowAssess]=useState(false);
  const [showAvatar,setShowAvatar]=useState(false);
  const [glitch,setGlitch]=useState(false);

  useEffect(()=>{try{localStorage.setItem("muslim_levelup_v1",JSON.stringify(state));}catch{}},[state]);
  useEffect(()=>{setGlitch(true);setTimeout(()=>setGlitch(false),600);},[]);

  const showNotif=useCallback((type,msg,ms=3500)=>{setNotif({type,msg});setTimeout(()=>setNotif(null),ms);},[]);

  // ── COMPLETE QUEST (static or AI) ────────────────────────────────────────

  const completeQuest=useCallback((questId,isAI=false)=>{
    setState(prev=>{
      const list=isAI?prev.aiQuests:prev.staticQuests;
      const quest=list.find(q=>q.id===questId);
      if(!quest)return prev;

      const nextStatus=!quest.completed;
      // EXP delta (bisa plus atau minus kalau uncheck — logika dari v0)
      let expDelta=nextStatus?quest.exp:-quest.exp;
      let newExp=prev.exp+expDelta;
      let newLevel=prev.level;

      // Naik level
      while(newExp>=getNextLevelExp(newLevel)){
        newExp-=getNextLevelExp(newLevel);
        newLevel+=1;
      }
      // Turun level jika uncheck bikin minus
      while(newExp<0&&newLevel>1){
        newLevel-=1;
        newExp=getNextLevelExp(newLevel)+newExp;
      }
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

      // Auto unlock frames/badges
      const newFrames=[...(prev.ownedFrames||["frame_basic"])];
      AVATAR_FRAMES.forEach(f=>{if(f.cost===0&&newLevel>=f.unlockLevel&&!newFrames.includes(f.id))newFrames.push(f.id);});
      const newBadges=[...(prev.ownedBadges||["none"])];
      AVATAR_BADGES.forEach(b=>{if(b.cost===0&&newLevel>=b.unlockLevel&&!newBadges.includes(b.id))newBadges.push(b.id);});

      if(leveledUp){
        setNewLevel(newLevel);
        setTimeout(()=>{setLvlUp(true);setTimeout(()=>setLvlUp(false),3000);},200);
      }
      if(nextStatus)setTimeout(()=>showNotif("xp",`+${quest.exp} EXP  ·  🪙+${coins}  ·  +1 ${quest.stat}`),100);

      const updatedList=list.map(q=>q.id===questId?{...q,completed:nextStatus}:q);

      return{
        ...prev,
        exp:newExp, level:newLevel, stats:newStats,
        unlockedSkills:newSkills,
        coins:(prev.coins||0)+coins,
        ownedFrames:newFrames, ownedBadges:newBadges,
        staticQuests:isAI?prev.staticQuests:updatedList,
        aiQuests:isAI?updatedList:prev.aiQuests,
        completedHistory:nextStatus?[...(prev.completedHistory||[]),{...quest,completedAt:Date.now(),date:today()}]:prev.completedHistory,
      };
    });
  },[showNotif]);

  // ── RESET DAILY ──────────────────────────────────────────────────────────

  const handleReset=useCallback(()=>{
    if(!window.confirm("Reset semua misi untuk hari baru?\n(Level & EXP tetap aman)"))return;
    setState(s=>({
      ...s,
      staticQuests:STATIC_QUESTS.map(q=>({...q,completed:false,date:today()})),
      aiQuests:s.aiQuests.map(q=>({...q,completed:false})),
    }));
    showNotif("success","✅ Misi harian direset. Semangat hari baru!");
  },[showNotif]);

  // ── AI QUEST GENERATE ────────────────────────────────────────────────────

  const handleGenerateAI=useCallback(async()=>{
    if(!state.assessment){setShowAssess(true);return;}
    setLoadingAI(true);
    showNotif("info","⚙️ Generating quest AI personal...");
    try{
      const quests=await generateQuestsFromAI(state);
      if(!quests.length)throw new Error("No quests returned");
      setState(s=>({...s,aiQuests:quests,aiQuestDate:today()}));
      showNotif("success",`✅ ${quests.length} AI quest di-assign!`);
    }catch(e){showNotif("error","⚠️ "+e.message,6000);}
    setLoadingAI(false);
  },[state,showNotif]);

  const handleSaveAssessment=useCallback(async(answers)=>{
    setState(s=>({...s,assessment:answers,assessmentDate:today()}));
    setShowAssess(false);
    setLoadingAI(true);
    showNotif("info","⚙️ Assessment disimpan. Generating AI quest...");
    try{
      const merged={...state,assessment:answers};
      const quests=await generateQuestsFromAI(merged);
      if(!quests.length)throw new Error();
      setState(s=>({...s,assessment:answers,assessmentDate:today(),aiQuests:quests,aiQuestDate:today()}));
      showNotif("success",`✅ ${quests.length} AI quest di-assign!`);
    }catch(e){showNotif("error","⚠️ "+e.message,6000);}
    setLoadingAI(false);
  },[state,showNotif]);

  const updateAvatar=useCallback((patch)=>{setState(s=>({...s,...patch}));},[]);

  // ── SETUP ─────────────────────────────────────────────────────────────────

  if(!state.setupDone)return(
    <div style={css.root}><style>{FONTS}</style>
      <div style={css.setupWrap}>
        <div style={{fontSize:11,letterSpacing:6,color:"#4fc3f7",marginBottom:8,fontFamily:"monospace"}}>▸ SISTEM KEBANGKITAN DIRI</div>
        <div style={{fontSize:28,fontWeight:900,color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",marginBottom:2}}>MUSLIM LEVELUP</div>
        <div style={{fontSize:12,color:"#34d399",marginBottom:24,letterSpacing:2}}>v1.0 — Sistem Peningkatan Diri</div>
        <div style={{color:"#64748b",fontSize:13,marginBottom:24}}>Masukkan namamu untuk memulai</div>
        <input style={css.input} placeholder="Nama hunter..." value={setupName} onChange={e=>setSetupName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&setupName.trim()&&setState(s=>({...s,playerName:setupName.trim(),setupDone:true}))}/>
        <button style={{...css.btnPrimary,opacity:setupName.trim()?1:0.4}} disabled={!setupName.trim()}
          onClick={()=>setState(s=>({...s,playerName:setupName.trim(),setupDone:true}))}>▶ MULAI PERJALANAN</button>
        <div style={{fontSize:10,color:"#475569",marginTop:20,textAlign:"center",fontFamily:"monospace"}}>
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
  const staticDone=state.staticQuests.filter(q=>q.completed).length;
  const aiDone=state.aiQuests.filter(q=>q.completed).length;

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
            <div style={{fontSize:12,color:"#64748b",marginTop:8}}>Peningkatan Kekuatan Terdeteksi!</div>
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
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#fbbf24",fontFamily:"monospace",fontWeight:700}}>🪙 {state.coins||0}</div>
            <div style={{fontSize:10,color:"#64748b"}}>{state.exp} / {nextExp} EXP</div>
          </div>
          <button style={{background:"transparent",border:`1px solid ${hasAssessToday?"#533483":"#1e293b"}`,color:hasAssessToday?"#a78bfa":"#64748b",padding:"7px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"monospace"}}
            onClick={()=>setShowAssess(true)}>{hasAssessToday?"📋✓":"📋"}</button>
        </div>
      </div>

      {/* XP BAR */}
      <div style={{padding:"8px 20px 4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:9,color:"#64748b",letterSpacing:2}}>EXP</span>
          <span style={{fontSize:9,color:"#4fc3f7",fontFamily:"monospace"}}>{Math.floor(xpPct)}%</span>
        </div>
        <div style={css.xpTrack}><div style={{...css.xpFill,width:`${xpPct}%`}}/></div>
      </div>

      {/* NAV */}
      <div style={css.nav}>
        {["quests","stats","skills"].map(t=>(
          <button key={t} style={{...css.navBtn,...(activeTab===t?css.navActive:{})}} onClick={()=>setActiveTab(t)}>
            {t==="quests"?"⚔️ MISI":t==="stats"?"📊 STATUS":"✨ SKILL"}
          </button>
        ))}
      </div>

      {/* ── QUESTS TAB ── */}
      {activeTab==="quests"&&(
        <div style={css.tab}>

          {/* Static quests header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:"#64748b",letterSpacing:2}}>MISI HARIAN</div>
              <div style={{fontSize:11,color:"#4fc3f7",marginTop:1}}>{staticDone}/{state.staticQuests.length} selesai</div>
            </div>
            <button style={{background:"transparent",border:"1px solid #ef4444",color:"#ef4444",padding:"7px 12px",borderRadius:6,cursor:"pointer",fontSize:10,letterSpacing:1,fontFamily:"monospace"}}
              onClick={handleReset}>🔄 RESET</button>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {state.staticQuests.map(q=><StaticQuestCard key={q.id} quest={q} onToggle={()=>completeQuest(q.id,false)}/>)}
          </div>

          {/* AI quests section */}
          <div style={{borderTop:"1px solid #1a1a2e",paddingTop:16,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:"#4fc3f7",letterSpacing:2}}>MISI AI PERSONAL</div>
                {state.aiQuests.length>0&&<div style={{fontSize:11,color:"#64748b",marginTop:1}}>{aiDone}/{state.aiQuests.length} selesai</div>}
              </div>
              <button style={{...css.btnPrimary,width:"auto",padding:"7px 12px",fontSize:10,marginTop:0,opacity:loadingAI?0.5:1}}
                onClick={handleGenerateAI} disabled={loadingAI}>
                {loadingAI?"⚙️ ...":"⚙️ GET AI QUEST"}
              </button>
            </div>
            {!hasAssessToday&&(
              <div onClick={()=>setShowAssess(true)} style={{marginBottom:12,padding:"10px 14px",background:"#160f2e",border:"1px solid #533483",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>📋</span>
                <div>
                  <div style={{fontSize:11,color:"#a78bfa",letterSpacing:1,fontFamily:"monospace"}}>ASSESSMENT BELUM DIISI</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:1}}>Isi untuk quest yang lebih personal</div>
                </div>
                <span style={{color:"#533483",marginLeft:"auto"}}>→</span>
              </div>
            )}
            {state.aiQuests.length===0?(
              <div style={{...css.empty,padding:"24px 20px"}}>
                <div style={{fontSize:28,marginBottom:6}}>🤖</div>
                <div style={{color:"#64748b",fontSize:11,letterSpacing:1}}>Tekan GET AI QUEST untuk quest personal</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {state.aiQuests.map(q=><StaticQuestCard key={q.id} quest={q} onToggle={()=>completeQuest(q.id,true)} isAI/>)}
              </div>
            )}
          </div>
        </div>
      )}

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
          <div style={{marginTop:12,padding:"12px 16px",background:"#0f1620",borderRadius:8,border:"1px solid #1e293b"}}>
            <div style={{fontSize:10,color:"#64748b",letterSpacing:2,marginBottom:8}}>AKTIVITAS</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {[{val:state.completedHistory?.length||0,label:"MISI",color:"#4fc3f7"},{val:state.unlockedSkills.length,label:"SKILL",color:"#a78bfa"},{val:state.coins||0,label:"KOIN",color:"#fbbf24"},{val:state.level,label:"LEVEL",color:"#ef4444"}].map(x=>(
                <div key={x.label}>
                  <div style={{fontSize:20,fontWeight:900,color:x.color,fontFamily:"monospace"}}>{x.val}</div>
                  <div style={{fontSize:9,color:"#64748b",letterSpacing:1}}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
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
                <div key={sk.id} style={{display:"flex",alignItems:"center",padding:"14px 16px",borderRadius:10,border:`1px solid ${unlocked?(sk.stat?STAT_META[sk.stat]?.color:"#fbbf24"):"#1e293b"}`,background:unlocked?"#0f1e2f":"#0a0a0f",opacity:unlocked?1:state.level>=sk.req?0.65:0.3,transition:"all 0.2s"}}>
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

      <footer style={{textAlign:"center",padding:"20px 20px 40px",fontSize:9,color:"#334155",fontFamily:"monospace",letterSpacing:1}}>
        SISTEM INI MEMANTAU DISIPLIN DIRI ANDA. JANGAN BERBOHONG PADA SISTEM.
      </footer>
    </div>
  );
}

// ─── QUEST CARD ───────────────────────────────────────────────────────────────

function StaticQuestCard({quest,onToggle,isAI=false}){
  const catColor=CAT_COLORS[quest.category]||"#64748b";
  const statMeta=STAT_META[quest.stat]||{};
  return(
    <div onClick={onToggle}
      style={{
        background:quest.completed?"#0a120a":"#0e1117",
        border:`1px solid ${quest.completed?"#1a3a1a":"#1e293b"}`,
        borderLeft:`3px solid ${quest.completed?"#22c55e":catColor}`,
        borderRadius:10,padding:"13px 14px",
        opacity:quest.completed?0.6:1,
        cursor:"pointer",transition:"all 0.2s",
        display:"flex",alignItems:"center",gap:12,
      }}>
      {/* Checkbox */}
      <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${quest.completed?"#22c55e":"#334155"}`,background:quest.completed?"#052e16":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,color:"#22c55e",transition:"all 0.2s"}}>
        {quest.completed?"✓":""}
      </div>
      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
          <span style={{fontSize:9,color:catColor,border:`1px solid ${catColor}33`,padding:"1px 6px",borderRadius:3,letterSpacing:1,background:`${catColor}11`}}>{quest.category}</span>
          {isAI&&<span style={{fontSize:9,color:"#4fc3f7",letterSpacing:1}}>✦ AI</span>}
        </div>
        <div style={{fontSize:13,color:quest.completed?"#475569":"#e2e8f0",textDecoration:quest.completed?"line-through":"none",lineHeight:1.4}}>
          {quest.icon&&<span style={{marginRight:6}}>{quest.icon}</span>}{quest.text||quest.action}
        </div>
      </div>
      {/* EXP */}
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:700,color:quest.completed?"#334155":"#4fc3f7",fontFamily:"monospace"}}>+{quest.exp}</div>
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
  navBtn:{flex:1,background:"none",border:"none",color:"#64748b",fontSize:10,letterSpacing:1,padding:"11px 4px",cursor:"pointer",borderBottom:"2px solid transparent",transition:"all 0.2s"},
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
