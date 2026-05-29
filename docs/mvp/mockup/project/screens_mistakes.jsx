/* ============================================================
   DecodeC4 — Past Mistakes
   List (signed-in / empty / signed-out variants) · Detail
   Reaches the shared DeepReveal bottom sheet from screens_challenges.jsx
   ============================================================ */

/* Captured blunders. Each carries the frozen mistake position +
   the data the Deep Reveal sheet needs for the better move. */
const MISTAKES = [
  {
    id: 0, pattern: "Claimeven", date: "May 24", move: 7, total: 22,
    cols: ["gd", "dg", "gd", "ggd", "d", "", ""],
    playedCell: { c: 3, r: 2 }, threat: [{ c: 5, r: 0 }, { c: 5, r: 1 }],
    coachCol: 4,
    reveal: {
      cols: ["gd", "dg", "gd", "gd", "g", "", ""],
      overlays: [{ c: 4, r: 0, type: "tg" }, { c: 2, r: 2, type: "tg" }, { c: 1, r: 1, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Claimeven" }, { cls: "good", label: "✓ Better · column 5" }],
      explanation: "Answering on column 5 claims the even square directly above Yellow's disc. That single response neutralises the odd threat you handed over and keeps the rising diagonal yours.",
      bestLine: ["Col 5", "Col 3", "Col 2"],
    },
  },
  {
    id: 1, pattern: "Forced block", date: "May 24", move: 14, total: 22,
    cols: ["dgd", "gd", "ggg", "d", "dg", "", ""],
    playedCell: { c: 0, r: 2 }, threat: [{ c: 3, r: 0 }],
    coachCol: 1,
    reveal: {
      cols: ["dgd", "gdg", "ggg", "d", "dg", "", ""],
      overlays: [{ c: 1, r: 2, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Forced block" }, { cls: "good", label: "✓ Better · column 2" }],
      explanation: "Yellow was one move from four-in-a-row across the third row. Column 2 is the only square that breaks it — everything else loses on the spot.",
      bestLine: ["Col 2", "Col 4", "Col 6"],
    },
  },
  {
    id: 2, pattern: "The Fork", date: "May 19", move: 11, total: 19,
    cols: ["g", "dgd", "gd", "dg", "d", "g", ""],
    playedCell: { c: 5, r: 0 }, threat: [{ c: 2, r: 2 }, { c: 4, r: 1 }],
    coachCol: 3,
    reveal: {
      cols: ["g", "dgd", "gd", "dgg", "d", "g", ""],
      overlays: [{ c: 2, r: 2, type: "tg" }, { c: 4, r: 1, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · The Fork" }, { cls: "good", label: "✓ Better · column 4" }],
      explanation: "Column 4 builds two threats at once — one across, one on the diagonal. Yellow can only block one, so the next move wins outright.",
      bestLine: ["Col 4", "Col 3", "Col 7"],
    },
  },
  {
    id: 3, pattern: "Odd threat", date: "May 12", move: 9, total: 24,
    cols: ["d", "gd", "dgg", "gd", "dg", "d", ""],
    playedCell: { c: 4, r: 1 }, threat: [{ c: 0, r: 1 }],
    coachCol: 0,
    reveal: {
      cols: ["dg", "gd", "dgg", "gd", "dg", "d", ""],
      overlays: [{ c: 0, r: 1, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Odd threat" }, { cls: "good", label: "✓ Better · column 1" }],
      explanation: "As the first player you want the odd rows. Column 1 takes the odd square in the corner file — the exact threat that decides the endgame in your favour.",
      bestLine: ["Col 1", "Col 6", "Col 3"],
    },
  },
];

/* ---------- Past Mistakes — list ---------- */
function MistakesList({ go, mistakesVariant, reviewed, setSelMistake }) {
  const [filter, setFilter] = useState("All");

  /* signed-out gate */
  if (mistakesVariant === "out") {
    return (
      <div className="screen s-spar">
        <TopBar title="Past Mistakes" onBack={() => go("stats")} />
        <div className="scroll" style={{ padding: "0 22px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#e9e1fb", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon name="user" size={32} color="#7a5bd0" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 23 }}>Sign up to save your mistakes</h2>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14, margin: "10px 22px 22px", lineHeight: 1.45 }}>
              Create a free account and DecodeC4 will remember every blunder so you can review them with the Coach later.
            </p>
            <button className="btn btn-primary" onClick={() => go("stats")} style={{ background: "#7a5bd0", boxShadow: "0 6px 0 #5e43ad" }}>Create free account</button>
            <button className="btn btn-ghost" onClick={() => go("stats")} style={{ marginTop: 9 }}>Maybe later</button>
          </div>
        </div>
        <div className="home-indicator"></div>
      </div>
    );
  }

  /* empty state */
  if (mistakesVariant === "empty") {
    return (
      <div className="screen s-spar">
        <TopBar title="Past Mistakes" onBack={() => go("stats")} />
        <div className="scroll" style={{ padding: "0 22px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <CoachAvatar size={88} mood="happy" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>No mistakes captured yet</h2>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14.5, margin: "10px 26px 22px", lineHeight: 1.45 }}>
              Play a game and review it afterwards — I'll collect the tricky moments here so we can study them together.
            </p>
            <button className="btn btn-primary" onClick={() => go("difficulty")}>Play a game <Icon name="play" size={16} color="#fff" /></button>
          </div>
        </div>
        <div className="home-indicator"></div>
      </div>
    );
  }

  /* signed-in list */
  const list = MISTAKES.filter(m => {
    const r = !!reviewed[m.id];
    if (filter === "Reviewed") return r;
    if (filter === "Unreviewed") return !r;
    return true;
  });

  return (
    <div className="screen s-spar">
      <TopBar title="Past Mistakes" onBack={() => go("stats")} />
      <div className="scroll" style={{ padding: "0 20px 24px" }}>
        <div className="filter-tabs">
          {["All", "Unreviewed", "Reviewed"].map(t => (
            <button key={t} className={filter === t ? "on" : ""} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="muted center" style={{ fontWeight: 700, fontSize: 14, padding: "30px 10px" }}>
            Nothing here — switch tabs to see your other moves.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {list.map(m => {
              const isR = !!reviewed[m.id];
              return (
                <button key={m.id} className="blunder-card" onClick={() => { setSelMistake(m.id); go("mistakeDetail"); }}>
                  <div className="blunder-thumb">
                    <Board cols={mkCols(m.cols)} overlays={[{ ...m.playedCell, type: "tr" }]} compact />
                  </div>
                  <div className="blunder-body">
                    <span className="tag pat">{m.pattern}</span>
                    <div className="bc-meta">
                      <span className="bc-date">{m.date}</span>
                      {isR && <span className="reviewed-chip"><Icon name="check" size={12} color="#1c8a4a" /> Reviewed</span>}
                    </div>
                  </div>
                  <Icon name="chevR" size={18} color="var(--ink-faint)" />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Past Mistakes — detail ---------- */
function MistakeDetail({ go, selMistake, setSelMistake, reviewed, setReviewed }) {
  const m = MISTAKES[selMistake] || MISTAKES[0];
  const [reveal, setReveal] = useState(false);
  const isR = !!reviewed[m.id];

  const overlays = [
    { ...m.playedCell, type: "tr" },
    ...m.threat.map(t => ({ ...t, type: "td" })),
  ];

  const prev = () => { setReveal(false); setSelMistake((selMistake - 1 + MISTAKES.length) % MISTAKES.length); };
  const next = () => { setReveal(false); setSelMistake((selMistake + 1) % MISTAKES.length); };

  return (
    <div className="screen s-spar">
      <TopBar title="Mistake" onBack={() => go("mistakes")} meta={"Move " + m.move + " / " + m.total} />
      <div className="scroll" style={{ padding: "0 0 16px" }}>
        <CoachDialog size={50} messages={[{ lead: "You played column " + (m.playedCell.c + 1) + " here.", text: "Let me show you what worked better.", mood: "think" }]} />

        <div className="board-wrap" style={{ paddingTop: 4 }}>
          <Board cols={mkCols(m.cols)} overlays={overlays} />
          <div style={{ display: "flex", gap: 16, marginTop: 11, fontSize: 11.5, fontWeight: 800, color: "var(--ink-soft)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 13, height: 13, borderRadius: 4, background: "rgba(232,84,62,.4)", boxShadow: "0 0 0 2px rgba(232,84,62,.6) inset" }}></span> your move</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 13, height: 13, borderRadius: 4, background: "var(--threat-gray)", boxShadow: "0 0 0 2px rgba(60,66,80,.5) inset" }}></span> opponent threat</span>
          </div>
        </div>

        <div style={{ padding: "8px 22px 0" }}>
          <span className="tag pat">{m.pattern}</span>
        </div>

        <div style={{ padding: "12px 22px 0" }}>
          <button className="btn btn-primary" onClick={() => setReveal(true)}>
            <Icon name="bulb" size={18} color="#fff" /> What should I have played?
          </button>
          <button className={"btn " + (isR ? "btn-ghost" : "btn-dark")} onClick={() => setReviewed(m.id, true)} style={{ marginTop: 10 }}>
            {isR ? <><Icon name="check" size={17} /> Marked as reviewed</> : "Mark as reviewed"}
          </button>
        </div>
      </div>

      <Toolbar>
        <ToolButton icon="chevL" label="Prev" onClick={prev} />
        <div className="tool-spacer"></div>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--ink-faint)" }}>{selMistake + 1} of {MISTAKES.length}</span>
        <div className="tool-spacer"></div>
        <ToolButton icon="chevR" label="Next" onClick={next} />
      </Toolbar>

      {reveal && <DeepReveal onClose={() => setReveal(false)} data={m.reveal} />}
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { MistakesList, MistakeDetail, MISTAKES });
