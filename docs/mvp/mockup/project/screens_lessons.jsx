/* ============================================================
   DecodeC4 — Lessons: Saga Map (3 variants), Concept, Socratic
   ============================================================ */

const LESSONS = [
  { n: 1, t: "Spot the Win", s: "done" },
  { n: 2, t: "Block Before You Build", s: "done" },
  { n: 3, t: "The Fork", s: "done" },
  { n: 4, t: "Odd Rows Belong to Red", s: "done" },
  { n: 5, t: "Claimeven", s: "current" },
  { n: 6, t: "Z-Threats", s: "unlocked" },
  { n: 7, t: "Claimodd", s: "locked" },
  { n: 8, t: "The Undercut", s: "locked", pro: true },
  { n: 9, t: "The Overcut", s: "locked", pro: true },
  { n: 10, t: "The Figure-7 Trap", s: "locked", pro: true },
  { n: 11, t: "The J-Shape", s: "locked", pro: true },
];

function NodeFace({ s, n }) {
  return (
    <div className={"saga-node " + s}>
      {s === "current" && <span className="pulse-ring"></span>}
      {s === "locked" ? <Icon name="lock" size={22} color="var(--lock)" /> : n}
      {s === "done" && <span className="node-check"><Icon name="check" size={14} color="var(--disc-green)" /></span>}
    </div>
  );
}

/* ---------- Variant A: winding path ---------- */
function SagaWinding({ onNode }) {
  const W = 330, step = 80, top = 46;
  const lanes = [78, 252];
  const pts = LESSONS.map((l, i) => ({ x: lanes[i % 2], y: top + i * step, l }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const my = (pts[i - 1].y + pts[i].y) / 2;
    d += ` C ${pts[i - 1].x} ${my} ${pts[i].x} ${my} ${pts[i].x} ${pts[i].y}`;
  }
  const H = top + LESSONS.length * step;
  return (
    <div style={{ position: "relative", width: W, height: H, margin: "0 auto" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill="none" stroke="#cfe0f4" strokeWidth="12" strokeLinecap="round" strokeDasharray="2 20" />
        <path d={d} fill="none" stroke="#b6d2f0" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {pts.map(({ x, y, l }) => {
        const labelLeft = l.n % 2 === 0;
        return (
          <div key={l.n} style={{ position: "absolute", left: x - 28, top: y - 28 }}>
            <div onClick={() => onNode(l)} style={{ cursor: "pointer" }}><NodeFace s={l.s} n={l.n} /></div>
            <div style={{ position: "absolute", top: 14, [labelLeft ? "right" : "left"]: 68, width: 150, [labelLeft ? "textAlign" : "textAlign"]: labelLeft ? "right" : "left" }}>
              <div className="saga-node-label" style={{ color: l.s === "locked" ? "var(--ink-faint)" : "var(--ink)" }}>{l.t}</div>
              {l.pro && <span style={{ fontSize: 10, fontWeight: 800, color: "#b9760a", background: "#fdf0d9", padding: "1px 7px", borderRadius: 6 }}>PRO</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Variant B: meadow stepping stones ---------- */
function SagaMeadow({ onNode }) {
  const W = 330, step = 74, top = 30;
  // gentle zigzag of 3 lanes
  const lanesX = [60, 138, 216, 138];
  const pts = LESSONS.map((l, i) => ({ x: lanesX[i % 4], y: top + i * step, l }));
  const H = top + LESSONS.length * step + 30;
  const stumpColors = {
    done: ["#2faa5a", "#258a48"], current: ["#ffd36b", "#e9b53e"],
    unlocked: ["#e9dcc0", "#cdba90"], locked: ["#d7d2c7", "#bdb7aa"],
  };
  return (
    <div style={{ position: "relative", width: W, height: H, margin: "0 auto" }}>
      {/* decorative pond */}
      <div style={{ position: "absolute", right: 6, top: 8, width: 96, height: 60, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,#bfe6f2,#8fcfe0)", boxShadow: "0 4px 10px rgba(0,0,0,.06)" }}>
        <div style={{ position: "absolute", left: 20, top: 22, width: 22, height: 14, borderRadius: "50%", background: "#5fb85f" }}></div>
        <div style={{ position: "absolute", left: 48, top: 14, width: 18, height: 11, borderRadius: "50%", background: "#7cc97c" }}></div>
      </div>
      {pts.map(({ x, y, l }) => {
        const [c1, c2] = stumpColors[l.s];
        return (
          <div key={l.n} onClick={() => onNode(l)} style={{ position: "absolute", left: x, top: y, cursor: "pointer", width: 84, transform: "rotate(-2deg)" }}>
            <div style={{ position: "relative", width: 84, height: 66 }}>
              <div style={{ position: "absolute", inset: "8px 0 0", borderRadius: 18, background: c2 }}></div>
              <div style={{ position: "absolute", inset: "0 0 8px", borderRadius: 18, background: c1, display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 4px rgba(255,255,255,0.18)" }}>
                {l.s === "locked"
                  ? <Icon name="lock" size={24} color="#fff" />
                  : <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: l.s === "unlocked" ? "#8a7c5a" : "#fff" }}>{l.n}</span>}
                {l.s === "current" && <span className="pulse-ring" style={{ borderColor: "#e9b53e" }}></span>}
                {l.s === "done" && <span className="node-check" style={{ right: 2, bottom: 14 }}><Icon name="check" size={13} color="var(--disc-green)" /></span>}
              </div>
            </div>
            <div className="saga-node-label" style={{ fontSize: 12.5, textAlign: "center", marginTop: 2, color: l.s === "locked" ? "var(--ink-faint)" : "var(--ink)", textShadow: "0 1px 0 rgba(255,255,255,.5)" }}>{l.t}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Variant C: clean list spine ---------- */
function SagaList({ onNode }) {
  return (
    <div style={{ position: "relative", padding: "4px 6px" }}>
      <div style={{ position: "absolute", left: 33, top: 28, bottom: 28, width: 4, background: "#d8e4f3", borderRadius: 2 }}></div>
      {LESSONS.map(l => (
        <div key={l.n} onClick={() => onNode(l)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, padding: "8px 0", cursor: "pointer" }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 auto",
              background: l.s === "done" ? "var(--disc-green)" : l.s === "current" ? "#fff" : l.s === "unlocked" ? "#fff" : "var(--lock-bg)",
              border: l.s === "current" ? "3px solid var(--disc-green)" : l.s === "unlocked" ? "3px dashed #c9c3b6" : "none",
              boxShadow: l.s === "locked" ? "none" : "var(--shadow-sm)",
              color: l.s === "done" ? "#fff" : l.s === "current" ? "var(--disc-green)" : "var(--ink-soft)",
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
              {l.s === "locked" ? <Icon name="lock" size={20} color="var(--lock)" /> : l.s === "done" ? <Icon name="check" size={22} color="#fff" /> : l.n}
              {l.s === "current" && <span className="pulse-ring"></span>}
            </div>
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "12px 15px", boxShadow: "var(--shadow-sm)", opacity: l.s === "locked" ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="saga-node-label" style={{ color: l.s === "locked" ? "var(--ink-faint)" : "var(--ink)" }}>{l.t}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: l.s === "done" ? "var(--eval-good)" : l.s === "current" ? "var(--disc-green)" : "var(--ink-faint)" }}>
                {l.s === "done" ? "Completed" : l.s === "current" ? "In progress" : l.s === "unlocked" ? "Unlocked" : "Locked"}
              </div>
            </div>
            {l.pro && <span style={{ fontSize: 10, fontWeight: 800, color: "#b9760a", background: "#fdf0d9", padding: "2px 8px", borderRadius: 6 }}>PRO</span>}
            {l.s !== "locked" && <Icon name="chevR" size={18} color="var(--ink-faint)" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function SagaMap({ go, variant }) {
  const [modal, setModal] = useState(false);
  const onNode = (l) => { if (l.s === "locked") setModal(true); else go("concept"); };
  return (
    <div className="screen s-lessons">
      <TopBar title="Lessons" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "2px 16px 30px" }}>
        {variant === "A" && <SagaWinding onNode={onNode} />}
        {variant === "B" && <SagaMeadow onNode={onNode} />}
        {variant === "C" && <SagaList onNode={onNode} />}
      </div>

      {modal && (
        <>
          <div className="sheet-backdrop" onClick={() => setModal(false)}></div>
          <div className="modal-card">
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fdf0d9", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="lock" size={26} color="#d6892a" />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21 }}>Unlock all lessons</h3>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14, margin: "8px 0 18px", lineHeight: 1.4 }}>
              Lessons 8–11 cover advanced traps — the Undercut, Overcut, Figure-7 and J-Shape. Go Pro to learn them all.
            </p>
            <button className="btn btn-primary" onClick={() => setModal(false)} style={{ background: "var(--eval-mid)", boxShadow: "0 6px 0 #c47f1f" }}>Upgrade to Pro</button>
            <button className="btn btn-ghost" onClick={() => setModal(false)} style={{ marginTop: 8 }}>Maybe later</button>
          </div>
        </>
      )}
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Concept screen ---------- */
function ConceptScreen({ go }) {
  // mid-game position; claimeven cells glow
  const cols = mkCols(["dg", "g", "dgd", "gdg", "dg", "d", ""]);
  const overlays = [
    { c: 2, r: 3, type: "claim" },
    { c: 4, r: 2, type: "claim" },
    { c: 1, r: 1, type: "claim" },
  ];
  return (
    <div className="screen s-lessons">
      <TopBar title="Claimeven" onBack={() => go("saga")} meta="2 / 3" />
      <div className="scroll" style={{ padding: "2px 0 20px" }}>
        <CoachDialog messages={[
          { text: "Red just played low. Watch the square directly above.", faded: true },
          { lead: "Yellow's secret:", text: "always claim the even square right above Red. Every time.", mood: "happy" },
        ]} />

        <div className="board-wrap">
          <Board cols={cols} overlays={overlays} />
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, fontWeight: 800, color: "var(--ink-soft)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: "var(--claim)", boxShadow: "0 0 0 2px rgba(245,166,35,.7) inset" }}></span>
              Even square Yellow should own
            </span>
          </div>
        </div>

        <div style={{ padding: "8px 22px 0" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "12px 15px", boxShadow: "var(--shadow-sm)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.4 }}>
            By answering above each Red disc, Yellow guarantees the even rows — and the endgame.
          </div>
        </div>
      </div>
      <Toolbar>
        <div className="tool-spacer"></div>
        <button className="btn btn-primary" onClick={() => go("socratic")} style={{ width: "auto", padding: "13px 28px" }}>Continue <Icon name="chevR" size={18} color="#fff" /></button>
      </Toolbar>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Socratic board ---------- */
function SocraticScreen({ go }) {
  const base = mkCols(["d", "g", "dg", "gd", "d", "", ""]);
  const [cols, setCols] = useState(base);
  const [drop, setDrop] = useState(null);
  const [phase, setPhase] = useState("ask"); // ask | wrong | correct
  const CORRECT = 4;

  const play = (c) => {
    if (phase === "correct") return;
    const next = cols.map(a => a.slice());
    next[c] = next[c].concat("g");
    setCols(next);
    setDrop({ c, r: next[c].length - 1 });
    setPhase(c === CORRECT ? "correct" : "wrong");
  };

  const msgs = phase === "ask"
    ? [{ lead: "Heads up:", text: "I'm going to make a mistake here. See if you can punish it.", mood: "think" }]
    : phase === "correct"
    ? [{ text: "Exactly. You saw the pairing.", mood: "happy" }]
    : [{ text: "Not quite — look for the even square. Try again.", mood: "oops" }];

  return (
    <div className="screen s-lessons">
      <TopBar title="Claimeven" onBack={() => go("concept")} />
      <div className="scroll" style={{ padding: "2px 0 16px" }}>
        <CoachDialog messages={msgs} />
        <div className="board-wrap" style={{ marginTop: 4 }}>
          <Board cols={cols} onColumn={phase === "correct" ? undefined : play} lastDrop={drop}
            overlays={phase === "correct" ? [{ c: CORRECT, r: cols[CORRECT].length - 1, type: "win" }] : []} />
        </div>
      </div>
      <Toolbar>
        <ToolButton icon="bulb" label="Hint" />
        <div className="tool-spacer"></div>
        {phase === "correct"
          ? <button className="btn btn-primary" onClick={() => go("clchallenge")} style={{ width: "auto", padding: "13px 26px" }}>Continue <Icon name="chevR" size={18} color="#fff" /></button>
          : <span style={{ fontWeight: 800, color: "var(--ink-faint)", fontSize: 13, paddingRight: 6 }}>Tap a column to play</span>}
      </Toolbar>
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { SagaMap, ConceptScreen, SocraticScreen, LESSONS });
