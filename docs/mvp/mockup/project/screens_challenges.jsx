/* ============================================================
   DecodeC4 — Challenges
   Set Picker · Challenge Board + Post-Move Feedback (3 variants)
   Deep Reveal Panel · Post-Set Summary
   ============================================================ */

const CHAL_SETS = [
  { t: "Mixed — all patterns", stars: 3, n: 8 },
  { t: "Spot the Win", stars: 1, n: 8 },
  { t: "Block Before You Build", stars: 1, n: 8 },
  { t: "The Fork", stars: 2, n: 8 },
  { t: "Odd & Even Threats", stars: 2, n: 8 },
  { t: "Claimeven", stars: 2, n: 8, fresh: true },
  { t: "Z-Threats", stars: 3, n: 8, locked: true },
  { t: "The Undercut", stars: 3, n: 8, locked: true },
];

function SetPicker({ go }) {
  const [modal, setModal] = useState(false);
  return (
    <div className="screen s-chal">
      <TopBar title="Challenges" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "2px 20px 26px" }}>
        <p style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: 14.5, margin: "0 2px 14px" }}>Choose a set. No labels on the board — you still have to find the move.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {CHAL_SETS.map((s, i) => (
            <button key={s.t} className={"set-card" + (s.locked ? " locked" : "")} onClick={() => s.locked ? setModal(true) : go("challenge")}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flex: "0 0 auto", display: "grid", placeItems: "center",
                background: s.locked ? "#e6e2d9" : i === 0 ? "#fce6cf" : "#fff2e2", color: s.locked ? "var(--lock)" : "#d6892a" }}>
                {s.locked ? <Icon name="lock" size={20} color="var(--lock)" /> : <Icon name="target" size={22} color="#d6892a" />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="sc-title">{s.t}</div>
                <div className="sc-meta"><Stars n={s.stars} /> · {s.n} positions {s.fresh && <span style={{ color: "var(--disc-green)", fontWeight: 800 }}>· new</span>}</div>
              </div>
              {!s.locked && <Icon name="chevR" size={18} color="var(--ink-faint)" />}
            </button>
          ))}
        </div>
      </div>
      {modal && (
        <>
          <div className="sheet-backdrop" onClick={() => setModal(false)}></div>
          <div className="modal-card">
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fdf0d9", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="lock" size={26} color="#d6892a" />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21 }}>Pro drill set</h3>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14, margin: "8px 0 18px" }}>Advanced pattern sets unlock with Pro.</p>
            <button className="btn btn-primary" onClick={() => setModal(false)} style={{ background: "var(--eval-mid)", boxShadow: "0 6px 0 #c47f1f" }}>Upgrade to Pro</button>
            <button className="btn btn-ghost" onClick={() => setModal(false)} style={{ marginTop: 8 }}>Maybe later</button>
          </div>
        </>
      )}
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---- shared challenge position ---- */
const CH_COLS = ["d", "g", "g", "g", "", "", ""];
const CH_CORRECT = 4;
function evalOf(c) { return c === CH_CORRECT ? "good" : c === 6 ? "bad" : "mid"; }

function feedbackContent(type) {
  if (type === "good") return {
    coach: { text: "Nice! You spotted the win.", mood: "happy" },
    lead: "Optimal move.", body: "Dropping in column 5 completes four across the bottom row — an immediate win.", num: "WIN",
  };
  if (type === "bad") return {
    coach: { text: "Hmm. Yellow's going to like that.", mood: "oops" },
    lead: "Blunder.", body: "That ignores your own winning move and hands Yellow a free tempo.", num: "−4.0",
  };
  return {
    coach: { text: "Close — there was something better.", mood: "think" },
    lead: "Suboptimal.", body: "Playable, but you had a forced win on column 5 right now.", num: "+0.6",
  };
}

/* the three feedback layout variants */
function FeedbackBlock({ variant, type, onLearn, onNext }) {
  const f = feedbackContent(type);
  const tagClass = type === "good" ? "good" : type === "bad" ? "bad" : "mid";
  const sym = type === "good" ? "✓" : type === "bad" ? "✕" : "?";

  if (variant === "B") {
    // alongside-board compact: eval lives inside coach bubble, slim strip
    return (
      <div style={{ padding: "0 18px" }}>
        <div className="feed-strip" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={"col-badge " + type} style={{ position: "static", width: 34, height: 34, border: "none" }}>{sym}</span>
          <div style={{ flex: 1 }}>
            <div className="fs-title">{f.lead}</div>
            <p style={{ marginTop: 2 }}>{f.body}</p>
          </div>
          <span className={"tag " + tagClass} style={{ fontFamily: "var(--font-display)" }}>{f.num}</span>
        </div>
        <button className="learn-more" onClick={onLearn}>Learn more <Icon name="chevD" size={16} color="var(--disc-green)" /></button>
      </div>
    );
  }
  if (variant === "C") {
    // docked bottom card consolidating coach + tier1
    return (
      <div style={{ padding: "0 16px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "14px 16px", boxShadow: "var(--shadow)", border: "1px solid #f0ebe1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <CoachAvatar size={42} mood={f.coach.mood} />
            <div className="bubble" style={{ flex: 1, animation: "none", boxShadow: "none", background: "#f6f4ee", borderBottomLeftRadius: 16 }}>{f.coach.text}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={"tag " + tagClass}>{sym} {f.lead}</span>
            <span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{f.num}</span>
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.36, marginTop: 7 }}>{f.body}</p>
          <button className="learn-more" onClick={onLearn} style={{ marginTop: 8 }}>Learn more <Icon name="chevD" size={16} color="var(--disc-green)" /></button>
        </div>
      </div>
    );
  }
  // variant A (default): tier-1 strip below board
  return (
    <div style={{ padding: "0 18px" }}>
      <div className="feed-strip">
        <div className="fs-head">
          <span className={"tag " + tagClass}>{sym} {f.lead}</span>
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginLeft: "auto" }}>{f.num}</span>
        </div>
        <p>{f.body}</p>
        <button className="learn-more" onClick={onLearn}>Learn more <Icon name="chevD" size={16} color="var(--disc-green)" /></button>
      </div>
    </div>
  );
}

function ChallengeBoard({ go, variant, lessonMode }) {
  const base = mkCols(CH_COLS);
  const [cols, setCols] = useState(base);
  const [drop, setDrop] = useState(null);
  const [played, setPlayed] = useState(null); // {col, type}
  const [reveal, setReveal] = useState(false);

  const play = (c) => {
    if (played) return;
    const next = cols.map(a => a.slice());
    next[c] = next[c].concat("g");
    setCols(next);
    setDrop({ c, r: next[c].length - 1 });
    setPlayed({ col: c, type: evalOf(c) });
  };
  const undo = () => { setCols(base.map(a => a.slice())); setPlayed(null); setDrop(null); };

  const winOv = played && played.type === "good"
    ? [{ c: 1, r: 0, type: "win" }, { c: 2, r: 0, type: "win" }, { c: 3, r: 0, type: "win" }, { c: 4, r: 0, type: "win" }]
    : [];

  const f = played ? feedbackContent(played.type) : null;
  const promptMsgs = played
    ? [{ ...f.coach, evalNum: variant === "B" ? f.num : undefined }]
    : [{ text: "You can win right now. Find it.", mood: "happy" }];

  return (
    <div className="screen s-chal">
      <TopBar title={lessonMode ? "Claimeven — Practice" : undefined}
        onBack={() => go(lessonMode ? "saga" : "setpicker")}
        meta={lessonMode ? null : null}
        rightIcon="gear" onRight={() => {}} />

      <div className="scroll" style={{ padding: "0 0 14px" }}>
        {/* variant C shows coach only in pre-play; played feedback docks at bottom */}
        {(!played || variant !== "C") && <CoachDialog messages={promptMsgs} />}

        <div style={{ padding: "0 22px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-soft)", flex: "0 0 auto" }}>3 / 8</span>
            <div style={{ flex: 1 }}><ProgressBar pct={37} /></div>
          </div>
        </div>

        <div className="board-wrap" style={{ paddingTop: 2 }}>
          <Board cols={cols} onColumn={played ? undefined : play} lastDrop={drop}
            overlays={winOv}
            badge={played ? { col: played.col, type: played.type, label: played.type === "good" ? "✓" : played.type === "bad" ? "✕" : "?" } : null} />
        </div>

        {played && <div style={{ marginTop: 6 }}><FeedbackBlock variant={variant} type={played.type} onLearn={() => setReveal(true)} /></div>}
      </div>

      <Toolbar>
        {!played ? (
          <>
            <ToolButton icon="bulb" label="Hint" />
            <div className="tool-spacer"></div>
            <ToolButton icon="undo" label="Undo" onClick={undo} />
          </>
        ) : (
          <>
            <ToolButton icon="undo" label="Retry" onClick={undo} />
            <div className="tool-spacer"></div>
            <button className="btn btn-primary" onClick={() => go(lessonMode ? "saga" : "summary")} style={{ width: "auto", padding: "13px 30px" }}>
              Next <Icon name="chevR" size={18} color="#fff" />
            </button>
          </>
        )}
      </Toolbar>

      {reveal && <DeepReveal onClose={() => setReveal(false)} type={played.type} />}
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Deep Reveal Panel (Tier 2) ----------
   Reusable bottom sheet. Pass `data` to retarget it at any
   position (e.g. a Past Mistake); omit for the default
   challenge-board reveal. */
const DEEP_DEFAULT = {
  cols: CH_COLS,
  overlays: [
    { c: 1, r: 0, type: "tg" }, { c: 2, r: 0, type: "tg" }, { c: 3, r: 0, type: "tg" }, { c: 4, r: 0, type: "tg" },
  ],
  tags: [{ cls: "pat", label: "Pattern · Double Threat" }, { cls: "good", label: "✓ Optimal · column 5" }],
  explanation: "Playing column 5 completes four on the bottom row immediately. Even if it were blocked, the same drop builds a second threat on the rising diagonal — Yellow could only answer one.",
};

function DeepReveal({ onClose, data }) {
  const d = data || DEEP_DEFAULT;
  const [loading, setLoading] = useState(true);
  const [flagged, setFlagged] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1100); return () => clearTimeout(t); }, []);
  const cols = mkCols(d.cols);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <button className="collapse-row" onClick={onClose}><Icon name="chevD" size={16} /> Collapse</button>

        {loading ? (
          <div style={{ padding: "50px 0", textAlign: "center" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: 14, color: "var(--ink-soft)", fontWeight: 700 }}>Reading the position…</p>
          </div>
        ) : (
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              {d.tags.map((t, i) => <span key={i} className={"tag " + t.cls}>{t.label}</span>)}
            </div>
            <div className="board-wrap" style={{ padding: "10px 0" }}>
              <Board cols={cols} overlays={d.overlays} compact />
            </div>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.45 }}>
              {d.explanation}
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              {flagged ? (
                <span className="flag-link done"><Icon name="check" size={15} color="var(--eval-good)" /> Thanks — flagged</span>
              ) : (
                <button className="flag-link" onClick={() => setFlagged(true)}><Icon name="flag" size={15} /> Flag this explanation</button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Post-Set Summary ---------- */
function PostSetSummary({ go }) {
  const rows = [
    ["Immediate win", "5 / 5", "good"],
    ["The Fork", "2 / 3", "mid"],
    ["Forced block", "1 / 3", "bad"],
  ];
  return (
    <div className="screen s-chal">
      <TopBar onBack={() => go("setpicker")} />
      <div className="scroll" style={{ padding: "0 22px 24px" }}>
        <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--eval-good-bg)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
            <Icon name="check" size={40} color="var(--eval-good)" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26 }}>Set complete!</h2>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "var(--shadow)", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>6 / 8 optimal</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: "var(--disc-green)" }}>75%</span>
          </div>
          <ProgressBar pct={75} />
          <div style={{ height: 1, background: "var(--line)", margin: "16px 0 4px" }}></div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--ink-soft)", margin: "6px 0" }}>BY PATTERN</div>
          {rows.map(([n, sc, t]) => (
            <div className="pat-row" key={n}>
              <span className="pat-name">{n}</span>
              <span className="pat-score" style={{ color: t === "good" ? "var(--eval-good)" : t === "mid" ? "var(--eval-mid)" : "var(--eval-bad)" }}>{sc}</span>
              <span className={"qdot"} style={{ background: t === "good" ? "var(--eval-good)" : t === "mid" ? "var(--eval-mid)" : "var(--eval-bad)" }}></span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <CoachDialog size={50} messages={[{ text: "Forced blocks are your weak spot. Try that lesson next.", mood: "think" }]} />
        </div>

        <button className="btn btn-primary" onClick={() => go("concept")} style={{ marginTop: 14 }}>Go to Forced Block lesson</button>
        <button className="btn btn-ghost" onClick={() => go("setpicker")} style={{ marginTop: 9 }}>Back to Challenges</button>
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { SetPicker, ChallengeBoard, DeepReveal, PostSetSummary });
