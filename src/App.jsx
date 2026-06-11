import { useState, useEffect, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0,100,250,450,700,1000,1400,1900,2500,3200,4000,5000,6200,7600,9200,11000,13200,15700,18500,22000];
const RANK_LABELS = ["E","E","E","D","D","D","C","C","C","B","B","B","A","A","A","S","S","S","SS","SS","SSS"];
const RANK_COLORS = {E:"#64748b",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444",SS:"#f97316",SSS:"#fbbf24"};

const STAT_META = {
  STR: { label:"Strength",     icon:"⚔️", color:"#ef4444", desc:"Physical power & workout intensity" },
  AGI: { label:"Agility",      icon:"💨", color:"#4fc3f7", desc:"Speed, cardio & flexibility" },
  VIT: { label:"Vitality",     icon:"❤️", color:"#f87171", desc:"Sleep, nutrition & recovery" },
  INT: { label:"Intelligence", icon:"📚", color:"#a78bfa", desc:"Learning & mental growth" },
  WIS: { label:"Wisdom",       icon:"🌙", color:"#34d399", desc:"Spiritual & emotional depth" },
};

const SKILLS = [
  { id:"iron_will",   name:"Iron Will",        icon:"🔥", req:3,  stat:"STR", desc:"Streak multiplier active on strength quests" },
  { id:"swift_step",  name:"Swift Step",       icon:"⚡", req:5,  stat:"AGI", desc:"Cardio quests give +50% AGI XP" },
  { id:"iron_body",   name:"Iron Body",        icon:"🛡️", req:7,  stat:"VIT", desc:"Recovery quests reduce fatigue penalty" },
  { id:"scholar",     name:"Scholar's Mind",   icon:"🧠", req:10, stat:"INT", desc:"Reading quests chain into bonus INT" },
  { id:"inner_peace", name:"Inner Peace",      icon:"☯️", req:10, stat:"WIS", desc:"Spiritual quests grant +5% all XP aura" },
  { id:"berserker",   name:"Berserker Mode",   icon:"💢", req:15, stat:"STR", desc:"Combo 3 STR quests in a day for triple XP" },
  { id:"phantom",     name:"Phantom Steps",    icon:"🌫️", req:15, stat:"AGI", desc:"Unlock timed sprint challenges" },
  { id:"sovereign",   name:"Sovereign's Aura", icon:"👑", req:20, stat:null,  desc:"All stats +10% permanently — true hunter awakened" },
];

// Assessment questions — each question feeds into quest generation
const ASSESSMENT_QUESTIONS = [
  {
    id: "current_state",
    phase: "PROFIL",
    label: "Bagaimana kondisi fisik & mentalmu saat ini?",
    hint: "Ceritakan jujur — kelelahan, motivasi, kebiasaan terakhir...",
    type: "textarea",
    icon: "🔍",
    statHint: "Ini menentukan difficulty quest harianmu",
  },
  {
    id: "habits_today",
    phase: "HARI INI",
    label: "Kebiasaan baik apa yang sudah kamu lakukan hari ini?",
    hint: "Olahraga, ibadah, makan sehat, belajar, tidur cukup...",
    type: "textarea",
    icon: "✅",
    statHint: "Kebiasaan aktif = XP bonus hari ini",
  },
  {
    id: "habits_build",
    phase: "TARGET",
    label: "Kebiasaan baik apa yang ingin kamu bangun?",
    hint: "Bisa lebih dari satu — olahraga rutin, tilawah, dsb.",
    type: "textarea",
    icon: "🎯",
    statHint: "Quest akan difokuskan ke sini",
  },
  {
    id: "habits_drop",
    phase: "TARGET",
    label: "Kebiasaan buruk apa yang ingin kamu buang?",
    hint: "Main HP berlebihan, begadang, skip sholat, malas gerak...",
    type: "textarea",
    icon: "🚫",
    statHint: "Quest penangkal akan di-assign untuk melawan ini",
  },
  {
    id: "energy_level",
    phase: "KONDISI",
    label: "Berapa energi tersisamu hari ini?",
    hint: null,
    type: "slider",
    icon: "⚡",
    statHint: "Menentukan intensitas quest malam ini",
    min: 1, max: 10,
  },
  {
    id: "focus_area",
    phase: "FOKUS",
    label: "Area mana yang paling ingin kamu kembangkan sekarang?",
    hint: null,
    type: "choice",
    icon: "🌟",
    statHint: null,
    options: [
      { value:"STR", label:"💪 Fisik & Kekuatan" },
      { value:"AGI", label:"🏃 Kardio & Kelincahan" },
      { value:"VIT", label:"🛌 Kesehatan & Pemulihan" },
      { value:"INT", label:"📖 Ilmu & Belajar" },
      { value:"WIS", label:"🤲 Spiritual & Karakter" },
    ],
  },
];

const INITIAL_STATE = {
  playerName: "",
  level: 1,
  xp: 0,
  stats: { STR:10, AGI:10, VIT:10, INT:10, WIS:10 },
  unlockedSkills: [],
  quests: [],
  completedHistory: [],
  streak: 0,
  lastQuestDate: null,
  setupDone: false,
  assessment: null,        // last saved assessment answers
  assessmentDate: null,    // date of last assessment
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length-1; i >= 0; i--)
    if (xp >= LEVEL_THRESHOLDS[i]) return i+1;
  return 1;
}
function getXPForLevel(lvl) { return LEVEL_THRESHOLDS[Math.min(lvl-1, LEVEL_THRESHOLDS.length-1)]; }
function getRank(lvl) { return RANK_LABELS[Math.min(lvl-1, RANK_LABELS.length-1)]; }
function getRankColor(lvl) { return RANK_COLORS[getRank(lvl)]; }
function today() { return new Date().toISOString().split("T")[0]; }

// ─── API: GENERATE QUESTS ─────────────────────────────────────────────────────

async function generateQuestsFromAI(player) {
  const rank = getRank(player.level);
  const statSummary = Object.entries(player.stats).map(([k,v])=>`${k}:${v}`).join(", ");
  const a = player.assessment || {};

  const assessmentContext = a.current_state
    ? `
HUNTER SELF-REPORT (dari assessment hari ini):
- Kondisi fisik & mental: "${a.current_state}"
- Kebiasaan baik hari ini: "${a.habits_today || '-'}"
- Kebiasaan yang ingin dibangun: "${a.habits_build || '-'}"
- Kebiasaan buruk yang ingin dibuang: "${a.habits_drop || '-'}"
- Level energi sekarang: ${a.energy_level || 5}/10
- Fokus utama: ${a.focus_area || 'balanced'}
`
    : "(Belum ada assessment — buat quest balanced)";

  const prompt = `You are the System AI in a Solo Leveling-style reality, speaking in a calm but authoritative tone.

A hunter named ${player.playerName || "Hunter"} is at Level ${player.level} (Rank ${rank}).
Stats: ${statSummary}
Unlocked skills: ${player.unlockedSkills.join(", ") || "none"}
${assessmentContext}

Based on this hunter's self-report, assign exactly 5 daily quests that are:
1. Directly tied to their stated goals (habits to build / bad habits to counter)
2. Scaled to their energy level (low energy = lighter quests)
3. Varied across stat types, but weighted toward their focus area
4. Specific and measurable — include a concrete action

Return ONLY a JSON array, no markdown, no preamble, no extra text.
Each object:
{
  "id": "unique_snake_case_id",
  "title": "Epic quest title in Bahasa Indonesia or English (short, punchy)",
  "description": "1 sentence — why this quest matters for their growth",
  "category": "workout|ibadah|learning|recovery|challenge",
  "stat": "STR|AGI|VIT|INT|WIS",
  "xpReward": 20-80,
  "statReward": 1-5,
  "difficulty": "E|D|C|B|A",
  "action": "Specific measurable task e.g. '20 push-up', 'Baca 10 halaman', 'Sholat Dhuha 2 rakaat'"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role:"user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b=>b.type==="text")?.text || "[]";
  try {
    const clean = text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean).map(q=>({ ...q, completed:false, date:today() }));
  } catch { return []; }
}

// ─── ASSESSMENT COMPONENT ─────────────────────────────────────────────────────

function AssessmentScreen({ playerName, existing, onSave, onSkip }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => {
    if (existing) return { ...existing };
    return { energy_level: 5 };
  });

  const q = ASSESSMENT_QUESTIONS[step];
  const isLast = step === ASSESSMENT_QUESTIONS.length - 1;
  const progress = ((step) / ASSESSMENT_QUESTIONS.length) * 100;

  function handleNext() {
    if (isLast) { onSave(answers); return; }
    setStep(s => s + 1);
  }
  function handleBack() { if (step > 0) setStep(s => s - 1); }

  const canProceed = q.type === "textarea"
    ? (answers[q.id] || "").trim().length > 0
    : q.type === "choice"
    ? !!answers[q.id]
    : true;

  return (
    <div style={css.root}>
      <style>{FONTS + ANIMATIONS}</style>
      <div style={{ padding:"20px 20px 8px", borderBottom:"1px solid #1a1a2e" }}>
        <div style={{ fontSize:10, color:"#64748b", letterSpacing:3, marginBottom:6 }}>
          SYSTEM — HUNTER ASSESSMENT
        </div>
        <div style={{ height:3, background:"#1a1a2e", borderRadius:3 }}>
          <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#533483,#4fc3f7)", borderRadius:3, transition:"width 0.4s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"#533483", letterSpacing:1 }}>{q.phase}</span>
          <span style={{ fontSize:10, color:"#64748b" }}>{step+1}/{ASSESSMENT_QUESTIONS.length}</span>
        </div>
      </div>

      <div style={{ padding:"28px 20px", flex:1 }}>
        {/* Question icon + label */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>{q.icon}</div>
          <div style={{ fontSize:17, fontWeight:700, color:"#e2e8f0", fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4, letterSpacing:0.5, marginBottom:6 }}>
            {q.label}
          </div>
          {q.statHint && (
            <div style={{ fontSize:11, color:"#533483", letterSpacing:1, fontFamily:"monospace" }}>
              ▸ {q.statHint}
            </div>
          )}
        </div>

        {/* INPUT: textarea */}
        {q.type === "textarea" && (
          <textarea
            style={{ ...css.input, minHeight:100, resize:"vertical", lineHeight:1.6 }}
            placeholder={q.hint}
            value={answers[q.id] || ""}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            autoFocus
          />
        )}

        {/* INPUT: slider */}
        {q.type === "slider" && (
          <div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div style={{ fontSize:52, fontWeight:900, color:"#4fc3f7", fontFamily:"monospace", lineHeight:1 }}>
                {answers[q.id] || 5}
              </div>
              <div style={{ fontSize:20, color:"#64748b", alignSelf:"flex-end", marginBottom:4 }}>/10</div>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={answers[q.id] || 5}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: Number(e.target.value) }))}
              style={{ width:"100%", accentColor:"#4fc3f7", cursor:"pointer" }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:10, color:"#64748b" }}>Hampir habis</span>
              <span style={{ fontSize:10, color:"#64748b" }}>Penuh energi</span>
            </div>
          </div>
        )}

        {/* INPUT: choice */}
        {q.type === "choice" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {q.options.map(opt => (
              <button
                key={opt.value}
                style={{
                  background: answers[q.id] === opt.value ? "#1a2a4a" : "#0e1117",
                  border: `1px solid ${answers[q.id] === opt.value ? "#4fc3f7" : "#1e293b"}`,
                  borderLeft: `3px solid ${answers[q.id] === opt.value ? "#4fc3f7" : "#1e293b"}`,
                  color: answers[q.id] === opt.value ? "#e2e8f0" : "#64748b",
                  padding:"13px 16px",
                  borderRadius:8,
                  cursor:"pointer",
                  fontSize:14,
                  textAlign:"left",
                  fontFamily:"'Rajdhani',sans-serif",
                  letterSpacing:0.5,
                  transition:"all 0.15s",
                }}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* NAV BUTTONS */}
      <div style={{ padding:"0 20px 32px", display:"flex", gap:10 }}>
        {step > 0 && (
          <button style={{ ...css.btnSecondary, flex:1 }} onClick={handleBack}>
            ← KEMBALI
          </button>
        )}
        {step === 0 && onSkip && (
          <button style={{ ...css.btnSecondary, flex:1 }} onClick={onSkip}>
            LEWATI
          </button>
        )}
        <button
          style={{ ...css.btnPrimary, flex:2, opacity: canProceed ? 1 : 0.4 }}
          disabled={!canProceed}
          onClick={handleNext}
        >
          {isLast ? "⚙️ SIMPAN & GENERATE QUEST" : "LANJUT →"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem("levelup_journal_v3");
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    } catch { return INITIAL_STATE; }
  });

  const [activeTab, setActiveTab]       = useState("quests");
  const [loadingQuests, setLoading]     = useState(false);
  const [notification, setNotif]        = useState(null);
  const [levelUpAnim, setLevelUpAnim]   = useState(false);
  const [skillAnim, setSkillAnim]       = useState(null);
  const [setupName, setSetupName]       = useState("");
  const [showAssessment, setShowAssess] = useState(false);
  const [glitch, setGlitch]             = useState(false);

  useEffect(() => {
    try { localStorage.setItem("levelup_journal_v3", JSON.stringify(state)); }
    catch {}
  }, [state]);

  useEffect(() => { setGlitch(true); setTimeout(()=>setGlitch(false),600); }, []);

  const showNotif = useCallback((type, msg, ms=3500) => {
    setNotif({ type, msg });
    setTimeout(()=>setNotif(null), ms);
  }, []);

  // ── SAVE ASSESSMENT & AUTO-GENERATE ──────────────────────────────────────

  const handleSaveAssessment = useCallback(async (answers) => {
    setState(s => ({ ...s, assessment: answers, assessmentDate: today() }));
    setShowAssess(false);
    setLoading(true);
    showNotif("info","⚙️ SYSTEM: Assessment disimpan. Generating quest...");
    try {
      const merged = { ...state, assessment: answers };
      const quests = await generateQuestsFromAI(merged);
      if (!quests.length) throw new Error();
      setState(s => ({ ...s, assessment: answers, assessmentDate: today(), quests, lastQuestDate: today() }));
      showNotif("success",`✅ ${quests.length} quest baru berhasil di-assign.`);
    } catch {
      showNotif("error","⚠️ SYSTEM ERROR: Quest generation gagal. Cek koneksi.");
    }
    setLoading(false);
  }, [state, showNotif]);

  // ── GENERATE WITHOUT ASSESSMENT ───────────────────────────────────────────

  const handleGenerateQuests = useCallback(async () => {
    if (!state.assessment) { setShowAssess(true); return; }
    setLoading(true);
    showNotif("info","⚙️ SYSTEM: Analyzing hunter profile...");
    try {
      const quests = await generateQuestsFromAI(state);
      if (!quests.length) throw new Error();
      setState(s => ({ ...s, quests, lastQuestDate: today() }));
      showNotif("success",`✅ ${quests.length} quest di-assign.`);
    } catch {
      showNotif("error","⚠️ SYSTEM ERROR: Gagal. Cek koneksi.");
    }
    setLoading(false);
  }, [state, showNotif]);

  // ── COMPLETE QUEST ─────────────────────────────────────────────────────────

  const completeQuest = useCallback((questId) => {
    setState(prev => {
      const quest = prev.quests.find(q=>q.id===questId);
      if (!quest||quest.completed) return prev;

      const streakBonus = prev.streak >= 3 ? 1.2 : 1;
      const gained = Math.round(quest.xpReward * streakBonus);
      const newXP = prev.xp + gained;
      const newLvl = getLevelFromXP(newXP);
      const leveledUp = newLvl > prev.level;

      const newStats = { ...prev.stats };
      newStats[quest.stat] = (newStats[quest.stat]||10) + quest.statReward;

      const newSkills = [...prev.unlockedSkills];
      SKILLS.forEach(sk => {
        if (!newSkills.includes(sk.id) && newLvl >= sk.req) {
          newSkills.push(sk.id);
          setTimeout(() => { setSkillAnim(sk); setTimeout(()=>setSkillAnim(null),3200); }, 600);
        }
      });

      if (leveledUp) setTimeout(()=>{ setLevelUpAnim(true); setTimeout(()=>setLevelUpAnim(false),2600); }, 200);
      setTimeout(()=>showNotif("xp",`+${gained} XP  ·  +${quest.statReward} ${quest.stat}${streakBonus>1?"  🔥 Streak!":""}`), 100);

      return {
        ...prev,
        quests: prev.quests.map(q=>q.id===questId?{...q,completed:true}:q),
        xp: newXP, level: newLvl, stats: newStats, unlockedSkills: newSkills,
        completedHistory: [...(prev.completedHistory||[]), {...quest, completedAt:Date.now(), date:today()}],
      };
    });
  }, [showNotif]);

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────

  if (!state.setupDone) {
    return (
      <div style={css.root}>
        <style>{FONTS}</style>
        <div style={css.setupWrap}>
          <div style={{ fontSize:11, letterSpacing:6, color:"#4fc3f7", marginBottom:8, fontFamily:"monospace" }}>▸ SYSTEM INITIALIZATION</div>
          <div style={{ fontSize:30, fontWeight:900, color:"#e2e8f0", fontFamily:"'Rajdhani',sans-serif", marginBottom:4 }}>ARISE, HUNTER</div>
          <div style={{ color:"#64748b", fontSize:13, marginBottom:32 }}>Masukkan namamu untuk memulai</div>
          <input style={css.input} placeholder="Nama hunter..." value={setupName}
            onChange={e=>setSetupName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&setupName.trim()&&setState(s=>({...s,playerName:setupName.trim(),setupDone:true}))} />
          <button style={{ ...css.btnPrimary, opacity:setupName.trim()?1:0.4 }}
            disabled={!setupName.trim()}
            onClick={()=>setState(s=>({...s,playerName:setupName.trim(),setupDone:true}))}>
            ▶ BEGIN AWAKENING
          </button>
        </div>
      </div>
    );
  }

  // ── ASSESSMENT SCREEN ─────────────────────────────────────────────────────

  if (showAssessment) {
    return (
      <AssessmentScreen
        playerName={state.playerName}
        existing={state.assessment}
        onSave={handleSaveAssessment}
        onSkip={() => setShowAssess(false)}
      />
    );
  }

  // ── MAIN SCREEN ───────────────────────────────────────────────────────────

  const rank = getRank(state.level);
  const rankColor = getRankColor(state.level);
  const xpCur = state.xp - getXPForLevel(state.level);
  const xpNxt = getXPForLevel(state.level+1) - getXPForLevel(state.level);
  const xpPct = Math.min(100, (xpCur/xpNxt)*100);
  const todayQuests = state.quests.filter(q=>q.date===today());
  const doneToday = todayQuests.filter(q=>q.completed).length;
  const hasAssessToday = state.assessmentDate === today();

  return (
    <div style={{ ...css.root, filter:glitch?"brightness(1.3) contrast(1.1)":"none", transition:"filter 0.1s" }}>
      <style>{FONTS+ANIMATIONS}</style>

      {/* NOTIF */}
      {notification && (
        <div style={{ ...css.notif, background: notification.type==="error"?"#2d0f0f":notification.type==="xp"?"#0f1a30":"#0f2a1a" }}>
          {notification.msg}
        </div>
      )}

      {/* LEVEL UP */}
      {levelUpAnim && (
        <div style={css.overlay}>
          <div style={css.levelBox}>
            <div style={{ fontSize:10, letterSpacing:8, color:"#4fc3f7", marginBottom:8 }}>SYSTEM ALERT</div>
            <div style={{ fontSize:40, fontWeight:900, color:"#fbbf24", fontFamily:"'Rajdhani',sans-serif", lineHeight:1 }}>LEVEL UP</div>
            <div style={{ fontSize:56, fontWeight:900, color:"#e2e8f0", fontFamily:"'Rajdhani',sans-serif" }}>{state.level}</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>You have grown stronger.</div>
          </div>
        </div>
      )}

      {/* SKILL UNLOCK */}
      {skillAnim && (
        <div style={css.skillBanner}>
          <span style={{ fontSize:10, letterSpacing:4, color:"#a78bfa" }}>SKILL UNLOCKED</span>
          <span style={{ fontSize:22 }}>{skillAnim.icon} {skillAnim.name}</span>
          <span style={{ fontSize:11, color:"#64748b" }}>{skillAnim.desc}</span>
        </div>
      )}

      {/* HEADER */}
      <div style={css.header}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ ...css.rankBadge, borderColor:rankColor, color:rankColor }}>{rank}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>{state.playerName}</div>
            <div style={{ fontSize:10, color:"#64748b", letterSpacing:2 }}>LV.{state.level} HUNTER</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Assessment button */}
          <button
            style={{ background:"transparent", border:`1px solid ${hasAssessToday?"#533483":"#1e293b"}`, color:hasAssessToday?"#a78bfa":"#64748b", padding:"6px 10px", borderRadius:6, cursor:"pointer", fontSize:10, letterSpacing:1, fontFamily:"monospace" }}
            onClick={()=>setShowAssess(true)}
            title="Daily Assessment"
          >
            {hasAssessToday?"📋✓":"📋"}
          </button>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#64748b", letterSpacing:2 }}>XP</div>
            <div style={{ fontSize:17, fontWeight:900, color:"#4fc3f7", fontFamily:"monospace" }}>{state.xp.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* XP BAR */}
      <div style={{ padding:"8px 20px 4px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:9, color:"#64748b", letterSpacing:2 }}>EXP</span>
          <span style={{ fontSize:9, color:"#4fc3f7", fontFamily:"monospace" }}>{xpCur} / {xpNxt}</span>
        </div>
        <div style={css.xpTrack}>
          <div style={{ ...css.xpFill, width:`${xpPct}%` }} />
        </div>
      </div>

      {/* ASSESSMENT BANNER — if no assessment today */}
      {!hasAssessToday && (
        <div
          onClick={()=>setShowAssess(true)}
          style={{ margin:"10px 20px 0", padding:"10px 14px", background:"#160f2e", border:"1px solid #533483", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>📋</span>
          <div>
            <div style={{ fontSize:12, color:"#a78bfa", letterSpacing:1, fontFamily:"monospace" }}>ASSESSMENT BELUM DIISI</div>
            <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>Isi assessment untuk quest yang lebih personal hari ini</div>
          </div>
          <span style={{ color:"#533483", marginLeft:"auto" }}>→</span>
        </div>
      )}

      {/* NAV */}
      <div style={css.nav}>
        {["quests","stats","skills"].map(tab=>(
          <button key={tab} style={{ ...css.navBtn, ...(activeTab===tab?css.navActive:{}) }} onClick={()=>setActiveTab(tab)}>
            {tab==="quests"?"⚔️ QUESTS":tab==="stats"?"📊 STATS":"✨ SKILLS"}
          </button>
        ))}
      </div>

      {/* ── QUESTS TAB ── */}
      {activeTab==="quests" && (
        <div style={css.tab}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2 }}>DAILY QUESTS</div>
              {todayQuests.length>0 && <div style={{ fontSize:11, color:"#4fc3f7", marginTop:2 }}>{doneToday}/{todayQuests.length} completed</div>}
            </div>
            <button style={{ ...css.btnPrimary, width:"auto", padding:"8px 14px", fontSize:10, marginTop:0, opacity:loadingQuests?0.5:1 }}
              onClick={handleGenerateQuests} disabled={loadingQuests}>
              {loadingQuests?"⚙️ ...":"⚙️ GET QUESTS"}
            </button>
          </div>

          {todayQuests.length===0 ? (
            <div style={css.empty}>
              <div style={{ fontSize:36, marginBottom:8 }}>🌑</div>
              <div style={{ color:"#64748b", fontSize:12, letterSpacing:1 }}>NO QUESTS ASSIGNED</div>
              <div style={{ color:"#475569", fontSize:11, marginTop:4 }}>
                {state.assessment?"Tekan GET QUESTS":"Isi assessment dulu untuk quest personal"}
              </div>
              {!state.assessment && (
                <button style={{ ...css.btnPrimary, marginTop:16, fontSize:11 }} onClick={()=>setShowAssess(true)}>
                  📋 ISI ASSESSMENT
                </button>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {todayQuests.map(q=>(
                <QuestCard key={q.id} quest={q} onComplete={completeQuest} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab==="stats" && (
        <div style={css.tab}>
          <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:16 }}>HUNTER STATUS</div>
          {Object.entries(STAT_META).map(([k,m])=>{
            const v = state.stats[k]||10;
            const pct = Math.min(100,((v-10)/90)*100);
            return (
              <div key={k} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, color:"#e2e8f0", fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>{m.icon} {m.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:m.color, fontFamily:"monospace" }}>{v}</span>
                </div>
                <div style={{ ...css.xpTrack, height:6 }}>
                  <div style={{ ...css.xpFill, width:`${pct}%`, background:m.color }} />
                </div>
                <div style={{ fontSize:10, color:"#475569", marginTop:3 }}>{m.desc}</div>
              </div>
            );
          })}

          {/* Assessment summary */}
          {state.assessment && (
            <div style={{ marginTop:8, padding:"14px 16px", background:"#0f1118", border:"1px solid #1e293b", borderRadius:10 }}>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:10 }}>LAST ASSESSMENT</div>
              {[
                { key:"habits_build", label:"🎯 Dibangun", color:"#34d399" },
                { key:"habits_drop",  label:"🚫 Dibuang",  color:"#ef4444" },
                { key:"focus_area",   label:"🌟 Fokus",    color:"#4fc3f7" },
              ].map(f => state.assessment[f.key] && (
                <div key={f.key} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, color:f.color, letterSpacing:1, marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>{state.assessment[f.key]}</div>
                </div>
              ))}
              <button style={{ ...css.btnSecondary, marginTop:8, fontSize:10, padding:"8px 12px" }} onClick={()=>setShowAssess(true)}>
                📋 Update Assessment
              </button>
            </div>
          )}

          <div style={{ marginTop:12, padding:"12px 16px", background:"#0f1620", borderRadius:8, border:"1px solid #1e293b" }}>
            <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:8 }}>ACTIVITY</div>
            <div style={{ display:"flex", gap:16 }}>
              {[
                { val:state.completedHistory?.length||0, label:"QUESTS", color:"#4fc3f7" },
                { val:state.unlockedSkills.length, label:"SKILLS", color:"#a78bfa" },
                { val:state.level, label:"LEVEL", color:"#fbbf24" },
              ].map(x=>(
                <div key={x.label}>
                  <div style={{ fontSize:22, fontWeight:900, color:x.color, fontFamily:"monospace" }}>{x.val}</div>
                  <div style={{ fontSize:9, color:"#64748b", letterSpacing:1 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {activeTab==="skills" && (
        <div style={css.tab}>
          <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, marginBottom:16 }}>SKILL TREE</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {SKILLS.map(sk=>{
              const unlocked = state.unlockedSkills.includes(sk.id);
              return (
                <div key={sk.id} style={{
                  display:"flex", alignItems:"center", padding:"14px 16px", borderRadius:10,
                  border:`1px solid ${unlocked?(sk.stat?STAT_META[sk.stat]?.color:"#fbbf24"):"#1e293b"}`,
                  background:unlocked?"#0f1e2f":"#0a0a0f",
                  opacity:unlocked?1:state.level>=sk.req?0.65:0.3,
                  transition:"all 0.2s",
                }}>
                  <div style={{ fontSize:26, marginRight:14 }}>{sk.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:unlocked?"#e2e8f0":"#475569", fontFamily:"'Rajdhani',sans-serif" }}>{sk.name}</span>
                      <span style={{ fontSize:9, color:unlocked?"#4fc3f7":"#475569", letterSpacing:1 }}>
                        {unlocked?"✓ UNLOCKED":`LV.${sk.req}`}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{sk.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUEST CARD ───────────────────────────────────────────────────────────────

function QuestCard({ quest, onComplete }) {
  const diffColor = { E:"#64748b",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b" };
  const m = STAT_META[quest.stat] || {};
  return (
    <div style={{
      background:quest.completed?"#0a120a":"#0e1117",
      border:`1px solid ${quest.completed?"#1a3a1a":"#1e293b"}`,
      borderLeft:`3px solid ${quest.completed?"#22c55e":(m.color||"#4fc3f7")}`,
      borderRadius:10, padding:"14px 16px",
      opacity:quest.completed?0.55:1, transition:"all 0.2s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:9, color:diffColor[quest.difficulty]||"#64748b", border:`1px solid ${diffColor[quest.difficulty]||"#64748b"}`, padding:"1px 6px", borderRadius:3, letterSpacing:1 }}>
              {quest.difficulty}
            </span>
            <span style={{ fontSize:9, color:m.color||"#4fc3f7", letterSpacing:1 }}>{m.icon} {quest.stat}</span>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:quest.completed?"#475569":"#e2e8f0", fontFamily:"'Rajdhani',sans-serif", lineHeight:1.3, letterSpacing:0.5 }}>
            {quest.title}
          </div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{quest.action}</div>
        </div>
        <div style={{ textAlign:"right", marginLeft:12, minWidth:48 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#4fc3f7", fontFamily:"monospace" }}>+{quest.xpReward}</div>
          <div style={{ fontSize:9, color:"#64748b", letterSpacing:1 }}>XP</div>
        </div>
      </div>
      {!quest.completed
        ? <button style={{ background:"transparent", border:`1px solid ${m.color||"#4fc3f7"}`, color:m.color||"#4fc3f7", padding:"6px 14px", borderRadius:5, cursor:"pointer", fontSize:10, letterSpacing:2, fontFamily:"monospace", marginTop:8 }}
            onClick={()=>onComplete(quest.id)}>▶ COMPLETE</button>
        : <div style={{ fontSize:10, color:"#22c55e", letterSpacing:2, marginTop:4 }}>✓ QUEST COMPLETED</div>
      }
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const css = {
  root:      { minHeight:"100vh", background:"#0a0a0f", color:"#e2e8f0", fontFamily:"'Inter',sans-serif", maxWidth:480, margin:"0 auto", position:"relative" },
  setupWrap: { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" },
  header:    { padding:"18px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #1a1a2e" },
  rankBadge: { width:42, height:42, borderRadius:8, border:"2px solid", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900, fontFamily:"'Rajdhani',sans-serif", background:"#0a0a0f" },
  xpTrack:   { height:4, background:"#1a1a2e", borderRadius:4, overflow:"hidden" },
  xpFill:    { height:"100%", background:"linear-gradient(90deg,#1e40af,#4fc3f7)", borderRadius:4, transition:"width 0.5s ease" },
  nav:       { display:"flex", borderBottom:"1px solid #1a1a2e", padding:"0 16px", marginTop:10 },
  navBtn:    { flex:1, background:"none", border:"none", color:"#64748b", fontSize:10, letterSpacing:1, padding:"11px 4px", cursor:"pointer", borderBottom:"2px solid transparent", transition:"all 0.2s" },
  navActive: { color:"#4fc3f7", borderBottom:"2px solid #4fc3f7" },
  tab:       { padding:20, paddingBottom:48 },
  empty:     { textAlign:"center", padding:"40px 20px", border:"1px dashed #1e293b", borderRadius:12 },
  btnPrimary:   { background:"transparent", border:"1px solid #4fc3f7", color:"#4fc3f7", padding:"12px 20px", borderRadius:8, cursor:"pointer", fontSize:12, letterSpacing:2, fontFamily:"monospace", transition:"all 0.2s", width:"100%", marginTop:12 },
  btnSecondary: { background:"transparent", border:"1px solid #334155", color:"#64748b", padding:"12px 20px", borderRadius:8, cursor:"pointer", fontSize:12, letterSpacing:2, fontFamily:"monospace", transition:"all 0.2s", width:"100%", marginTop:0 },
  input:     { background:"#1a1a2e", border:"1px solid #1e293b", color:"#e2e8f0", padding:"13px 16px", borderRadius:8, fontSize:14, width:"100%", outline:"none", fontFamily:"'Inter',sans-serif", boxSizing:"border-box", marginBottom:4 },
  notif:     { position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:100, padding:"10px 20px", borderRadius:8, border:"1px solid #1e3a5f", color:"#93c5fd", maxWidth:380, width:"90%", textAlign:"center", animation:"slideDown 0.3s ease", fontFamily:"monospace", fontSize:12 },
  overlay:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.2s ease" },
  levelBox:  { textAlign:"center", padding:40, border:"1px solid #fbbf24", borderRadius:16, background:"#0a0a0f", animation:"scaleIn 0.3s ease", display:"flex", flexDirection:"column", alignItems:"center" },
  skillBanner: { position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", zIndex:150, background:"#160f2e", border:"1px solid #533483", borderTop:"none", borderRadius:"0 0 12px 12px", padding:"16px 28px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:3, animation:"slideDown 0.4s ease", minWidth:260 },
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap');`;
const ANIMATIONS = `
  @keyframes slideDown { from{transform:translateX(-50%) translateY(-20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes scaleIn   { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
`;
