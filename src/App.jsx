import { useState, useEffect, useRef } from "react";

const C = {
  cream: "#FAF3EA", apricot: "#F5EBE0", terra: "#C8845A",
  brown: "#3C2415", mid: "#8B5E3C", light: "#DEC9B0", pale: "#FDF8F2",
};

const HL = {
  yellow: { bg: "#FFF3A3", label: "✨ 좋은 문장" },
  pink:   { bg: "#FFB3C6", label: "✏️ 고칠 문장" },
  blue:   { bg: "#B3D9FF", label: "💡 아이디어" },
  green:  { bg: "#B3FFD9", label: "✅ 완성" },
};

const splitSentences = t =>
  (t.match(/[^.!?。！？\n]+[.!?。！？\n]?/g) || []).map(s => s.trim()).filter(Boolean);

const getWordFreq = t => {
  const words = t.replace(/[^가-힣a-zA-Z0-9]/g, " ").split(/\s+/).filter(w => w.length >= 2);
  const freq = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));
  return Object.entries(freq).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]).slice(0, 20);
};

const Btn = ({ active, children, onClick, style = {} }) => (
  <button onClick={onClick} style={{
    padding: "4px 11px", borderRadius: 5, border: "none", cursor: "pointer",
    fontSize: 13, background: active ? C.terra : C.light,
    color: active ? "#fff" : C.brown, fontWeight: active ? 600 : 400,
    transition: "background 0.15s", ...style,
  }}>{children}</button>
);

export default function App() {
  const [content, setContent]   = useState("");
  const [warmup, setWarmup]     = useState("");
  const [mode, setMode]         = useState("draft");
  const [view, setView]         = useState("write");
  const [focus, setFocus]       = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [info, setInfo]         = useState({ title: "", subtitle: "", author: "햇살", date: new Date().toISOString().slice(0,10) });
  const [goal, setGoal]         = useState(1000);
  const [snaps, setSnaps]       = useState([]);
  const [highlights, setHl]     = useState({});
  const [hlColor, setHlColor]   = useState("yellow");
  const [panel, setPanel]       = useState(null);
  const [previewSnap, setPrev]  = useState(null);
  const [mdModal, setMdModal]   = useState(false);
  const [timer, setTimer]       = useState({ total: 25*60, remaining: 25*60, running: false, done: false });
  const taRef    = useRef(null);
  const timerRef = useRef(null);

  // 타이머
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!timer.running) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t.remaining <= 1) {
          clearInterval(timerRef.current); timerRef.current = null;
          return { ...t, remaining: 0, running: false, done: true };
        }
        return { ...t, remaining: t.remaining - 1 };
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timer.running]);

  // 새로고침 경고
  useEffect(() => {
    const handler = e => { if (content.length > 0) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [content]);

  const charCount   = content.length;
  const charNoSpace = content.replace(/\s/g, "").length;
  const pages       = Math.max(1, Math.ceil(charNoSpace / 200));
  const progress    = Math.min(100, (charNoSpace / goal) * 100);

  const timerStr = () => {
    const m = Math.floor(timer.remaining / 60).toString().padStart(2, "0");
    const s = (timer.remaining % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleKeyDown = e => {
    if (mode === "draft" && (e.key === "Backspace" || e.key === "Delete")) e.preventDefault();
  };

  const getMd = () => {
    const fm = `---\ntitle: "${info.title}"\nsubtitle: "${info.subtitle}"\nauthor: "${info.author}"\ndate: ${info.date}\n---\n\n`;
    const wu = warmup ? `> *오늘의 문장: ${warmup}*\n\n---\n\n` : "";
    return fm + wu + content;
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  const exportMd = () => setMdModal(true);

  const openFile = () => {
    const inp = Object.assign(document.createElement("input"), { type: "file", accept: ".md,.txt" });
    inp.onchange = ev => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        let txt = e.target.result;
        const fm = txt.match(/^---\n([\s\S]*?)\n---\n\n?/);
        if (fm) {
          const get = k => { const m = fm[1].match(new RegExp(k + ': "?([^"\\n]*)"?')); return m ? m[1] : ""; };
          setInfo({ title: get("title"), subtitle: get("subtitle"), author: get("author") || "햇살", date: get("date") || new Date().toISOString().slice(0,10) });
          txt = txt.slice(fm[0].length);
        }
        const wu = txt.match(/^> \*오늘의 문장: (.*)\*\n\n---\n\n/);
        if (wu) { setWarmup(wu[1]); txt = txt.slice(wu[0].length); }
        setContent(txt);
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const newDoc = () => {
    if (content.length > 10 && !window.confirm("현재 글이 사라져요. 새 글을 시작할까요?")) return;
    setContent(""); setWarmup(""); setHl({});
    setInfo({ title: "", subtitle: "", author: "햇살", date: new Date().toISOString().slice(0,10) });
  };

  const saveSnap = () => {
    const now = new Date();
    setSnaps(s => [...s, {
      id: Date.now(),
      time: now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      chars: content.length, content,
    }]);
  };

  const sentences = splitSentences(content);
  const wordFreq  = getWordFreq(content);
  const togglePanel = p => setPanel(prev => prev === p ? null : p);

  const inputStyle = (w) => ({
    padding: "3px 8px", border: `1px solid ${C.light}`, borderRadius: 4,
    background: C.cream, color: C.brown, fontSize: 13, fontFamily: "inherit",
    width: w || undefined,
  });

  return (
    <div style={{ height: "100vh", background: C.cream, color: C.brown, fontFamily: "Georgia, 'Noto Serif KR', serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      {!focus && (
        <div style={{ padding: "9px 14px", borderBottom: `1px solid ${C.light}`, background: C.apricot, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.terra, marginRight: 2 }}>🛶 포근한 글쓰기</span>
          <Btn active={mode === "draft"}    onClick={() => setMode("draft")}>초고 ✍️</Btn>
          <Btn active={mode === "revision"} onClick={() => setMode("revision")}>퇴고 ✏️</Btn>
          <div style={{ width: 1, height: 16, background: C.light }} />
          <Btn active={view === "write"}     onClick={() => setView("write")}>쓰기</Btn>
          <Btn active={view === "sentences"} onClick={() => setView("sentences")}>문장</Btn>
          <Btn active={view === "words"}     onClick={() => setView("words")}>단어</Btn>
          <div style={{ flex: 1 }} />
          <span style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.light}`, fontSize: 11, color: C.mid, background: C.cream, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>포근나루 × Claude</span>
          <span onClick={() => togglePanel("timer")} style={{ fontSize: 13, fontWeight: 700, color: timer.done ? "#c0392b" : timer.running ? C.terra : C.mid, cursor: "pointer", background: C.cream, padding: "3px 9px", borderRadius: 5 }}>
            ⏱ {timerStr()}
          </span>
          <Btn active={panel === "snapshots"} onClick={() => togglePanel("snapshots")}>📸 버전</Btn>
          <Btn active={false} onClick={saveSnap}>저장</Btn>
          <Btn active={false} onClick={exportMd}>↓ .md</Btn>
          <Btn active={false} onClick={openFile}>📂 열기</Btn>
          <Btn active={false} onClick={newDoc}>🗋 새 글</Btn>
          <Btn active={false} onClick={() => setFocus(true)}>집중 🔲</Btn>
          <Btn active={showInfo} onClick={() => setShowInfo(v => !v)}>⚙️</Btn>
        </div>
      )}

      {/* ── Info panel ── */}
      {!focus && showInfo && (
        <div style={{ padding: "9px 14px", background: C.pale, borderBottom: `1px solid ${C.light}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          {[["제목", "title", 150], ["부제", "subtitle", 110], ["작가명", "author", 70]].map(([lbl, k, w]) => (
            <label key={k} style={{ fontSize: 13, color: C.mid, display: "flex", alignItems: "center", gap: 5 }}>
              {lbl} <input value={info[k]} onChange={e => setInfo(i => ({ ...i, [k]: e.target.value }))} style={inputStyle(w)} />
            </label>
          ))}
          <label style={{ fontSize: 13, color: C.mid, display: "flex", alignItems: "center", gap: 5 }}>
            날짜 <input type="date" value={info.date} onChange={e => setInfo(i => ({ ...i, date: e.target.value }))} style={inputStyle()} />
          </label>
          <label style={{ fontSize: 13, color: C.mid, display: "flex", alignItems: "center", gap: 5 }}>
            목표 <input type="number" min={100} step={100} value={goal} onChange={e => setGoal(Number(e.target.value))} style={inputStyle(65)} />자
          </label>
        </div>
      )}

      {/* ── 새로고침 경고 배너 ── */}
      {!focus && (
        <div style={{ padding: "6px 18px", background: "#FFF8EE", borderBottom: `1px solid #F5D9A8`, flexShrink: 0, fontSize: 12, color: "#8B6914" }}>
          ⚠️ 새로고침하면 작성 중인 글이 사라져요 — 중간중간 <strong>↓ .md 저장</strong> 또는 <strong>📸 버전 저장</strong>을 해두세요.
        </div>
      )}

      {/* ── Warmup ── */}
      {!focus && (
        <div style={{ padding: "6px 18px", background: C.pale, borderBottom: `1px solid ${C.light}`, flexShrink: 0 }}>
          <input value={warmup} onChange={e => setWarmup(e.target.value)}
            placeholder="✨ 오늘의 문장 — 글 쓰기 전 워밍업 한 줄을 적어보세요"
            style={{ width: "100%", border: "none", background: "transparent", color: C.mid, fontSize: 13, fontStyle: "italic", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "write" && (
            <textarea ref={taRef} value={content} onChange={e => setContent(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={mode === "draft" ? "초고 모드 — 백스페이스 없이 앞으로만 써나가세요. ✍️" : "퇴고 모드 — 자유롭게 수정하세요. ✏️"}
              style={{
                display: "block", width: "100%", height: "100%", minHeight: 300,
                padding: focus ? "56px 18%" : "28px 36px",
                border: "none", outline: "none",
                background: mode === "draft" ? "#FEFCF7" : C.cream,
                color: C.brown, fontSize: 16, lineHeight: 2.3,
                fontFamily: "inherit", resize: "none", boxSizing: "border-box",
              }} />
          )}

          {view === "sentences" && (
            <div style={{ padding: "22px 28px" }}>
              <div style={{ marginBottom: 14, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.mid }}>형광펜:</span>
                {Object.entries(HL).map(([k, v]) => (
                  <button key={k} onClick={() => setHlColor(k)} style={{ padding: "4px 11px", borderRadius: 20, border: `2px solid ${hlColor === k ? C.terra : "transparent"}`, background: v.bg, cursor: "pointer", fontSize: 12, color: C.brown }}>{v.label}</button>
                ))}
                <button onClick={() => setHl({})} style={{ padding: "4px 10px", borderRadius: 20, border: "none", background: C.light, cursor: "pointer", fontSize: 12, color: C.mid }}>초기화</button>
              </div>
              {sentences.length === 0
                ? <p style={{ color: C.mid, fontStyle: "italic", fontSize: 14 }}>쓰기 탭에서 글을 작성하면 문장별로 확인할 수 있어요.</p>
                : sentences.map((s, i) => (
                  <div key={i} onClick={() => setHl(h => { const n = { ...h }; n[i] === hlColor ? delete n[i] : (n[i] = hlColor); return n; })}
                    style={{ padding: "8px 13px", marginBottom: 5, borderRadius: 7, background: highlights[i] ? HL[highlights[i]]?.bg : "transparent", cursor: "pointer", fontSize: 15, lineHeight: 2, color: C.brown, borderLeft: `3px solid ${highlights[i] ? HL[highlights[i]]?.bg : "transparent"}`, transition: "background 0.12s" }}>
                    <span style={{ fontSize: 11, color: C.light, marginRight: 8 }}>{i + 1}</span>{s}
                  </div>
                ))
              }
            </div>
          )}

          {view === "words" && (
            <div style={{ padding: "22px 28px" }}>
              <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 600, color: C.terra }}>반복 단어 분석</div>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 18 }}>같은 단어가 2회 이상 등장하면 표시됩니다.</p>
              {wordFreq.length === 0
                ? <p style={{ color: C.mid, fontStyle: "italic", fontSize: 14 }}>아직 분석할 내용이 없어요.</p>
                : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
                      {wordFreq.map(([w, c]) => (
                        <span key={w} style={{ padding: "6px 14px", borderRadius: 20, background: c >= 5 ? "#FFB3B3" : c >= 3 ? "#FFE0A3" : C.apricot, color: C.brown, fontSize: 14, fontWeight: c >= 5 ? 700 : 400 }}>
                          {w} <span style={{ color: C.terra, fontWeight: 700 }}>×{c}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ padding: "3px 10px", borderRadius: 10, background: "#FFB3B3", color: C.brown }}>5회↑ 주의</span>
                      <span style={{ padding: "3px 10px", borderRadius: 10, background: "#FFE0A3", color: C.brown }}>3~4회 체크</span>
                      <span style={{ padding: "3px 10px", borderRadius: 10, background: C.apricot, color: C.brown }}>2회</span>
                    </div>
                  </>
                )
              }
            </div>
          )}
        </div>

        {/* ── Snapshots panel ── */}
        {panel === "snapshots" && (
          <div style={{ width: 240, borderLeft: `1px solid ${C.light}`, padding: 12, background: C.apricot, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.terra }}>📸 버전 스냅샷</span>
              <button onClick={() => setPanel(null)} style={{ border: "none", background: "none", cursor: "pointer", color: C.mid, fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
            <Btn active={false} onClick={saveSnap} style={{ width: "100%", padding: "7px" }}>지금 저장</Btn>
            {snaps.length === 0
              ? <p style={{ fontSize: 13, color: C.mid, fontStyle: "italic" }}>저장된 버전이 없어요.</p>
              : [...snaps].reverse().map(snap => (
                <div key={snap.id} style={{ padding: 10, background: C.cream, borderRadius: 7, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: C.brown, marginBottom: 2 }}>{snap.time}</div>
                  <div style={{ color: C.mid, fontSize: 12, marginBottom: 7 }}>{snap.chars}자 · {snap.content.slice(0, 18)}{snap.content.length > 18 ? "…" : ""}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setPrev(snap)} style={{ flex: 1, padding: "3px 0", border: `1px solid ${C.light}`, borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 12, color: C.mid }}>미리보기</button>
                    <button onClick={() => setContent(snap.content)} style={{ flex: 1, padding: "3px 0", border: `1px solid ${C.terra}`, borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 12, color: C.terra }}>복원</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── Timer panel ── */}
        {panel === "timer" && (
          <div style={{ width: 200, borderLeft: `1px solid ${C.light}`, padding: 14, background: C.apricot, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.terra }}>⏱ 몽롱쓰기</span>
              <button onClick={() => setPanel(null)} style={{ border: "none", background: "none", cursor: "pointer", color: C.mid, fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ textAlign: "center", fontSize: 42, fontWeight: 700, color: timer.done ? "#c0392b" : C.brown, letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
              {timerStr()}
            </div>
            {timer.done && <div style={{ textAlign: "center", color: "#c0392b", fontSize: 13 }}>🎉 집중 시간 완료!</div>}
            <label style={{ fontSize: 13, color: C.mid, display: "flex", alignItems: "center", gap: 7 }}>
              설정
              <input type="number" min={1} max={120} value={Math.round(timer.total / 60)}
                onChange={e => {
                  const m = Math.max(1, Number(e.target.value));
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  setTimer({ total: m*60, remaining: m*60, running: false, done: false });
                }}
                style={{ width: 48, padding: "3px 6px", border: `1px solid ${C.light}`, borderRadius: 4, background: C.cream, color: C.brown, fontSize: 13 }} />
              분
            </label>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke={C.light} strokeWidth="5" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={C.terra} strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - timer.remaining / timer.total)}`}
                  strokeLinecap="round" transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset 0.9s linear" }} />
              </svg>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <Btn active={timer.running}
                onClick={() => setTimer(t => ({ ...t, running: !t.running, done: false }))}
                style={{ flex: 1, padding: "7px" }}>
                {timer.running ? "⏸ 일시정지" : "▶ 시작"}
              </Btn>
              <Btn active={false}
                onClick={() => {
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  setTimer(t => ({ ...t, remaining: t.total, running: false, done: false }));
                }}
                style={{ flex: 1, padding: "7px" }}>
                초기화
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!focus && (
        <div style={{ padding: "6px 14px", borderTop: `1px solid ${C.light}`, background: C.apricot, display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: C.mid, flexShrink: 0, flexWrap: "wrap" }}>
          <span>총 <strong style={{ color: C.brown }}>{charCount}</strong>자</span>
          <span>공백제외 <strong style={{ color: C.brown }}>{charNoSpace}</strong>자</span>
          <span>원고지 <strong style={{ color: C.brown }}>{pages}</strong>매</span>
          <div style={{ flex: 1, minWidth: 60, height: 5, background: C.light, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: progress >= 100 ? "#5DB87A" : C.terra, borderRadius: 3, transition: "width 0.4s" }} />
          </div>
          <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>
            {charNoSpace >= goal ? "✅ 목표 달성!" : `목표까지 ${goal - charNoSpace}자`}
          </span>
          <span style={{ fontSize: 11, color: C.mid, opacity: 0.6, whiteSpace: "nowrap" }}>🔒 내 컴퓨터에만 저장</span>
          <span style={{ padding: "2px 9px", borderRadius: 9, background: mode === "draft" ? "#FFE0A3" : "#B3FFD9", color: C.brown, fontWeight: 600, fontSize: 11 }}>
            {mode === "draft" ? "초고" : "퇴고"}
          </span>
        </div>
      )}

      {/* ── Focus mode exit ── */}
      {focus && (
        <button onClick={() => setFocus(false)} style={{ position: "fixed", top: 12, right: 14, padding: "5px 12px", borderRadius: 6, border: "none", background: "rgba(200,132,90,0.22)", color: C.terra, cursor: "pointer", fontSize: 13 }}>
          집중 해제
        </button>
      )}

      {/* ── .md modal ── */}
      {mdModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(60,36,21,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setMdModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: 12, padding: "20px 24px", width: "min(600px, 92vw)", maxHeight: "75vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: C.terra, fontSize: 14 }}>↓ 마크다운 내보내기</span>
              <button onClick={() => setMdModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: C.mid, fontSize: 18 }}>✕</button>
            </div>
            <textarea readOnly value={getMd()}
              style={{ width: "100%", height: 260, padding: "10px 12px", border: `1px solid ${C.light}`, borderRadius: 8, background: C.pale, color: C.brown, fontSize: 13, fontFamily: "monospace", lineHeight: 1.7, resize: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => copyToClipboard(getMd())}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", background: C.terra, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                📋 클립보드에 복사
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([getMd()], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${info.date.replace(/-/g,"").slice(2)} 몽롱쓰기.md`;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a); URL.revokeObjectURL(url);
                }}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: `1px solid ${C.light}`, background: C.apricot, color: C.brown, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                ↓ 파일 다운로드
              </button>
            </div>
            <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>옵시디언에서는 복사 후 새 노트에 붙여넣기 하시면 돼요.</p>
          </div>
        </div>
      )}

      {/* ── Snapshot preview ── */}
      {previewSnap && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(60,36,21,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setPrev(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.cream, borderRadius: 10, padding: "20px 24px", width: "min(580px, 90vw)", maxHeight: "70vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: C.terra, fontSize: 14 }}>📸 {previewSnap.time} · {previewSnap.chars}자</span>
              <button onClick={() => setPrev(null)} style={{ border: "none", background: "none", cursor: "pointer", color: C.mid, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
            <pre style={{ fontFamily: "inherit", fontSize: 14, lineHeight: 2.1, color: C.brown, whiteSpace: "pre-wrap", margin: 0 }}>{previewSnap.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
