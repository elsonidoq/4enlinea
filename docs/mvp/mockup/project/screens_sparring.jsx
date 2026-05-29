/* ============================================================
   DecodeC4 — Sparring
   Difficulty Picker · Game Board · Post-Game Review · Position Explorer
   ============================================================ */

function DifficultyPicker({ go }) {
  const [diff, setDiff] = useState("Medium");
  const [side, setSide] = useState("green");
  const diffs = [
    ["Easy", "Makes frequent mistakes you can punish"],
    ["Medium", "Plays solid, slips occasionally"],
    ["Hard", "Rarely misses a tactic"],
    ["Perfect", "Solver-perfect. Good luck."],
  ];
  return (
    <div className="screen s-spar">
      <TopBar title="Sparring" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "2px 22px 24px" }}>
        <div className="section-title">Choose difficulty</div>
        {diffs.map(([d, sub]) => (
          <div key={d} className={"radio-row" + (diff === d ? " sel" : "")} onClick={() => setDiff(d)}>
            <span className="radio-dot"></span>
            <div style={{ flex: 1 }}>
              <div className="radio-label">{d} {d === "Medium" && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--disc-green)", background: "var(--eval-good-bg)", padding: "2px 8px", borderRadius: 6, marginLeft: 4 }}>DEFAULT</span>}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>{sub}</div>
            </div>
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 14 }}>Play as</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[["green", "Green", "var(--disc-green)"], ["gray", "Gray", "var(--disc-gray)"]].map(([k, lbl, col]) => (
            <button key={k} onClick={() => setSide(k)} style={{
              flex: 1, border: side === k ? "2.5px solid var(--ink)" : "2.5px solid transparent",
              background: "#fff", borderRadius: 16, padding: "14px 0", cursor: "pointer", boxShadow: "var(--shadow-sm)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <span className={"disc " + k} style={{ width: 38, height: 38, position: "relative" }}></span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{lbl}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)" }}>{k === "green" ? "moves first" : "moves second"}</span>
            </button>
          ))}
        </div>
      </div>
      <Toolbar>
        <button className="btn btn-primary" onClick={() => go("game")}>Start game <Icon name="play" size={16} color="#fff" /></button>
      </Toolbar>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Game Board ---------- */
const SPAR_START = ["gd", "dg", "gdg", "dgd", "g", "d", ""];
const COACH_LINES = [
  { text: "Your turn. Think carefully.", mood: "happy" },
  { text: "Oops. Did I just give you something?", mood: "oops" },
  { text: "Nice move. You saw it.", mood: "happy" },
  { text: "Interesting. Let's see.", mood: "think" },
  { text: "Hmm. I'll take that.", mood: "think" },
];

function GameBoard({ go }) {
  const [cols, setCols] = useState(mkCols(SPAR_START));
  const [drop, setDrop] = useState(null);
  const [move, setMove] = useState(14);
  const [msgs, setMsgs] = useState([
    { text: "I'm not sure about that last move…", faded: true, mood: "think" },
    { text: "Your turn.", mood: "happy" },
  ]);
  const [hint, setHint] = useState(false);
  const busy = useRef(false);

  const aiPlay = (board) => {
    const open = board.map((c, i) => i).filter(i => board[i].length < 6);
    const choice = open.sort((a, b) => board[a].length - board[b].length)[Math.floor(Math.random() * Math.min(3, open.length))];
    const next = board.map(a => a.slice());
    next[choice] = next[choice].concat("d");
    setCols(next);
    setDrop({ c: choice, r: next[choice].length - 1 });
    const line = COACH_LINES[Math.floor(Math.random() * COACH_LINES.length)];
    setMsgs(m => [{ ...m[m.length - 1], faded: true }, line]);
    setMove(v => v + 1);
    busy.current = false;
  };

  const play = (c) => {
    if (busy.current) return;
    busy.current = true;
    setHint(false);
    const next = cols.map(a => a.slice());
    next[c] = next[c].concat("g");
    setCols(next);
    setDrop({ c, r: next[c].length - 1 });
    setMsgs(m => [{ ...m[m.length - 1], faded: true }, { text: "Nice move.", mood: "happy" }]);
    setMove(v => v + 1);
    setTimeout(() => aiPlay(next), 720);
  };

  const heat = [42, 58, 30, 71, 95, 50, 22]; // column scores
  const heatColor = (v) => v >= 75 ? "var(--eval-good)" : v >= 45 ? "var(--eval-mid)" : "var(--eval-bad)";

  return (
    <div className="screen s-spar">
      <TopBar title="Game" onBack={() => go("difficulty")} meta={"Move " + move} rightIcon="gear" onRight={() => {}} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <CoachDialog fixed messages={msgs} size={46} />

        <div className="board-wrap" style={{ paddingTop: 8 }}>
          {hint && (
            <div style={{ width: "100%", marginBottom: 8 }}>
              <div className="heat-row">
                {heat.map((v, i) => <div key={i} className="heat" style={{ background: heatColor(v) }}>{v}</div>)}
              </div>
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", marginTop: 5 }}>Column scores — higher is better. Tap a column to play.</div>
            </div>
          )}
          <Board cols={cols} onColumn={play} lastDrop={drop} />
        </div>
        <div></div>
      </div>
      <Toolbar>
        <ToolButton icon="bulb" label="Hint" onClick={() => setHint(h => !h)} color={hint ? "var(--disc-green)" : undefined} />
        <div className="tool-spacer"></div>
        <ToolButton icon="flag" label="Resign" onClick={() => go("review")} />
      </Toolbar>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Post-Game Review ---------- */
const TIMELINE = "g g g m g g bad g g g g m g bad g g g g m g g g".split(" ").map(q => q === "bad" ? "bad" : q);
function PostGameReview({ go }) {
  const final = mkCols(["gdgd", "dgdg", "gdgdg", "dgdgd", "gdg", "dgd", "gd"]);
  const [sel, setSel] = useState(null);
  const labelOf = (q) => q === "g" ? "" : q === "m" ? "?" : "✕";
  const cls = (q) => q === "g" ? "good" : q === "m" ? "mid" : "bad";
  return (
    <div className="screen s-spar">
      <TopBar title="Game Review" onBack={() => go("home")} right2="search" onRight2={() => {}} rightIcon="gear" onRight={() => {}} />
      <div className="scroll" style={{ padding: "0 0 24px" }}>
        <CoachDialog messages={[{ text: "Good game. One parity mistake decided it.", mood: "happy" }]} />

        <div className="board-wrap"><Board cols={final} compact /></div>

        <div style={{ padding: "6px 22px 0" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "15px 18px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>Accuracy</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "var(--disc-green)" }}>82%</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span className="quality-chip"><span className="qdot" style={{ background: "var(--eval-good)" }}></span> Optimal 17</span>
              <span className="quality-chip"><span className="qdot" style={{ background: "var(--eval-mid)" }}></span> Suboptimal 3</span>
              <span className="quality-chip"><span className="qdot" style={{ background: "var(--eval-bad)" }}></span> Blunder 2</span>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 16 }}>Move timeline <span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>— tap a flag to review</span></div>
          <div className="timeline">
            {TIMELINE.map((q, i) => (
              <div key={i} className={"tl-node " + cls(q) + (sel === i ? " sel" : "")}
                onClick={() => { if (q !== "g") { setSel(i); go("explorer"); } }}
                style={{ cursor: q === "g" ? "default" : "pointer" }}>
                {q === "g" ? i + 1 : labelOf(q)}
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>Move 8 and move 14 were the blunders.</p>
        </div>
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Position Explorer ---------- */
function PositionExplorer({ go }) {
  const base = mkCols(["gd", "dg", "gd", "g", "d", "", ""]);
  const [cols, setCols] = useState(base);
  const [drop, setDrop] = useState(null);
  const [tried, setTried] = useState(false);
  const busy = useRef(false);

  // mistake state overlays: red on the played column (col 3 top), gray opponent threat
  const mistakeOv = [
    { c: 3, r: 0, type: "tr" },
    { c: 5, r: 0, type: "td" }, { c: 5, r: 1, type: "td" },
  ];

  const play = (c) => {
    if (busy.current || tried) return;
    busy.current = true;
    const next = cols.map(a => a.slice());
    next[c] = next[c].concat("g");
    setCols(next); setDrop({ c, r: next[c].length - 1 }); setTried(true);
    setTimeout(() => {
      const n2 = next.map(a => a.slice());
      n2[1] = n2[1].concat("d");
      setCols(n2); setDrop({ c: 1, r: n2[1].length - 1 });
    }, 700);
  };

  const msgs = tried
    ? [{ text: "Better — that takes the odd square away from me.", mood: "happy" }]
    : [{ lead: "You played column 4.", text: "Yellow now has an odd threat you can't stop. Try a different column.", mood: "think" }];

  return (
    <div className="screen s-spar">
      <TopBar title="Review" onBack={() => go("review")} meta="Move 7 / 22" />
      <div className="scroll" style={{ padding: "0 0 16px" }}>
        <CoachDialog messages={msgs} size={50} />

        <div className="board-wrap" style={{ paddingTop: 4 }}>
          <Board cols={cols} overlays={tried ? [] : mistakeOv} onColumn={tried ? undefined : play} lastDrop={drop} />
          {!tried && (
            <div style={{ display: "flex", gap: 16, marginTop: 11, fontSize: 11.5, fontWeight: 800, color: "var(--ink-soft)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 13, height: 13, borderRadius: 4, background: "rgba(232,84,62,.4)", boxShadow: "0 0 0 2px rgba(232,84,62,.6) inset" }}></span> your move</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 13, height: 13, borderRadius: 4, background: "var(--threat-gray)", boxShadow: "0 0 0 2px rgba(60,66,80,.5) inset" }}></span> opponent threat</span>
            </div>
          )}
        </div>

        <div style={{ padding: "4px 22px 0", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: tried ? "var(--disc-green)" : "var(--ink-soft)" }}>
            {tried ? "Keep exploring, or take it into a full game." : "Try a different move — tap any column."}
          </p>
        </div>
      </div>
      <Toolbar>
        <ToolButton icon="chevL" label="Prev" />
        <button className="btn btn-primary" onClick={() => go("game")} style={{ flex: 1, fontSize: 14.5 }}>Start new game from here</button>
        <ToolButton icon="chevR" label="Next" />
      </Toolbar>
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { DifficultyPicker, GameBoard, PostGameReview, PositionExplorer });
