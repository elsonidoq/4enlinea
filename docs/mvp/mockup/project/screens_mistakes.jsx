/* ============================================================
   DecodeC4 — Past Mistakes
   CategoryList (Level 1) · MistakesList w/ category prop (Level 2)
   MistakeDetail / blunder detail (Level 3)
   ============================================================ */

const MISTAKES = [
  /* ── Claimeven ─────────────────────────────────────────── */
  {
    id: 0, pattern: "Claimeven", date: "May 24", move: 7, total: 22, severity: 2,
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
    id: 6, pattern: "Claimeven", date: "Jun 5", move: 6, total: 20, severity: 2,
    cols: ["g", "dg", "gd", "dgd", "d", "", ""],
    playedCell: { c: 3, r: 2 }, threat: [{ c: 4, r: 0 }, { c: 0, r: 1 }],
    coachCol: 4,
    reveal: {
      cols: ["g", "dg", "gd", "dgd", "dg", "", ""],
      overlays: [{ c: 4, r: 1, type: "tg" }, { c: 0, r: 1, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Claimeven" }, { cls: "good", label: "✓ Better · column 5" }],
      explanation: "Column 5 claims the even square and neutralises Yellow's rising diagonal. The claimeven principle: even squares above opponent discs control the endgame.",
      bestLine: ["Col 5", "Col 3", "Col 2"],
    },
  },
  {
    id: 7, pattern: "Claimeven", date: "May 18", move: 5, total: 16, severity: 1,
    cols: ["g", "d", "gd", "dg", "g", "", ""],
    playedCell: { c: 1, r: 0 }, threat: [{ c: 3, r: 1 }],
    coachCol: 3,
    reveal: {
      cols: ["g", "d", "gd", "dgg", "g", "", ""],
      overlays: [{ c: 3, r: 2, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Claimeven" }, { cls: "good", label: "✓ Better · column 4" }],
      explanation: "The even square on column 4 was key. Claiming it stops Yellow's diagonal and maintains your parity advantage into the endgame.",
      bestLine: ["Col 4", "Col 2", "Col 6"],
    },
  },
  /* ── Forced block ───────────────────────────────────────── */
  {
    id: 1, pattern: "Forced block", date: "May 24", move: 14, total: 22, severity: 3,
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
    id: 4, pattern: "Forced block", date: "Jun 3", move: 9, total: 18, severity: 2,
    cols: ["gd", "dgd", "gg", "dg", "d", "", ""],
    playedCell: { c: 5, r: 0 }, threat: [{ c: 2, r: 1 }],
    coachCol: 2,
    reveal: {
      cols: ["gd", "dgd", "ggg", "dg", "d", "", ""],
      overlays: [{ c: 2, r: 2, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Forced block" }, { cls: "good", label: "✓ Better · column 3" }],
      explanation: "Yellow's double threat in column 3 needed a block immediately. Playing column 3 closes both lines and swings the initiative back your way.",
      bestLine: ["Col 3", "Col 6", "Col 4"],
    },
  },
  {
    id: 5, pattern: "Forced block", date: "May 30", move: 12, total: 20, severity: 1,
    cols: ["dg", "g", "dgg", "d", "gd", "", ""],
    playedCell: { c: 6, r: 0 }, threat: [{ c: 2, r: 2 }],
    coachCol: 2,
    reveal: {
      cols: ["dg", "g", "dggg", "d", "gd", "", ""],
      overlays: [{ c: 2, r: 3, type: "tg" }],
      tags: [{ cls: "pat", label: "Pattern · Forced block" }, { cls: "good", label: "✓ Better · column 3" }],
      explanation: "Yellow's diagonal from column 3 was one move from completion. The block at column 3 defuses it and keeps your positional advantage.",
      bestLine: ["Col 3", "Col 7", "Col 1"],
    },
  },
  /* ── The Fork ───────────────────────────────────────────── */
  {
    id: 2, pattern: "The Fork", date: "May 19", move: 11, total: 19, severity: 1,
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
  /* ── Odd threat ─────────────────────────────────────────── */
  {
    id: 3, pattern: "Odd threat", date: "May 12", move: 9, total: 24, severity: 1,
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

/* ---------- Severity chip ------------------------------------------ */
function SeverityMeter({ level }) {
  const labels = { 1: "Minor", 2: "Moderate", 3: "Critical" };
  const cls = level >= 3 ? "bad" : level === 2 ? "mid" : "good";
  const heights = [7, 10, 13];
  return (
    <span className={"tag " + cls} style={{ gap: 6 }} title={"Severity · " + labels[level]}>
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 13 }}>
        {heights.map((h, i) => (
          <span key={i} style={{ width: 3.5, height: h, borderRadius: 1.5, background: "currentColor", opacity: i < level ? 1 : 0.28 }}></span>
        ))}
      </span>
      {labels[level]}
    </span>
  );
}

/* ---------- Level 1 — Category List ---------------------------------- */
function CategoryList({ go, mistakesVariant, reviewed, setSelCategory }) {

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

  /* Build per-category data */
  const catMap = {};
  MISTAKES.forEach(m => {
    if (!catMap[m.pattern]) catMap[m.pattern] = [];
    catMap[m.pattern].push(m);
  });

  const cats = Object.entries(catMap).map(([pattern, items]) => {
    const unreviewed = items.filter(m => !reviewed[m.id]);
    const maxSev = unreviewed.length > 0 ? Math.max(...unreviewed.map(m => m.severity)) : 0;
    const thumb = ([...(unreviewed.length > 0 ? unreviewed : items)]).sort((a, b) => b.severity - a.severity)[0];
    return { pattern, items, unreviewed, maxSev, thumb };
  });

  /* Most-critical unreviewed first; all-reviewed categories at bottom */
  cats.sort((a, b) => {
    if (a.maxSev === 0 && b.maxSev === 0) return 0;
    if (a.maxSev === 0) return 1;
    if (b.maxSev === 0) return -1;
    return b.maxSev - a.maxSev;
  });

  const totalUnreviewed = MISTAKES.filter(m => !reviewed[m.id]).length;

  return (
    <div className="screen s-spar">
      <TopBar title="Past Mistakes" onBack={() => go("stats")}
        meta={totalUnreviewed > 0 ? totalUnreviewed + " to review" : undefined} />
      <div className="scroll" style={{ padding: "4px 20px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {cats.map(({ pattern, items, unreviewed, maxSev, thumb }) => {
            const allDone = maxSev === 0;
            return (
              <button key={pattern} className="cat-row" onClick={() => {
                setSelCategory(pattern);
                go("mistakeDetail");
              }}>
                <div className="cat-thumb">
                  <Board cols={mkCols(thumb.cols)} overlays={[{ ...thumb.playedCell, type: "tr" }]} compact />
                </div>
                <div className="cat-row-body">
                  <span className="cat-row-name">{pattern}</span>
                  {allDone
                    ? <span className="cat-reviewed-badge"><Icon name="check" size={11} color="#1c8a4a" /> done</span>
                    : <span className="cat-new-badge">{unreviewed.length} new</span>}
                </div>
                <span className="cat-row-count">{items.length}</span>
                <Icon name="chevR" size={18} color="var(--ink-faint)" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Level 2 — Category Detail (filtered blunder list) -------- */
function MistakesList({ go, reviewed, setSelMistake, setMistakeContext, category = null }) {
  const [filter, setFilter] = useState("Unreviewed");
  useEffect(() => { setFilter("Unreviewed"); }, [category]);

  const base = category ? MISTAKES.filter(m => m.pattern === category) : MISTAKES;
  const list = base
    .filter(m => filter === "Reviewed" ? !!reviewed[m.id] : !reviewed[m.id])
    .sort((a, b) => b.severity - a.severity);

  const catTotal = base.length;

  return (
    <div className="screen s-spar">
      <TopBar
        title={category || "Past Mistakes"}
        onBack={() => go(category ? "mistakes" : "stats")}
        meta={category ? catTotal + " blunder" + (catTotal !== 1 ? "s" : "") : undefined}
      />
      <div className="scroll" style={{ padding: "0 20px 24px" }}>
        <div className="filter-tabs">
          {["Unreviewed", "Reviewed"].map(t => (
            <button key={t} className={filter === t ? "on" : ""} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="muted center" style={{ fontWeight: 700, fontSize: 14, padding: "30px 10px" }}>
            {filter === "Reviewed"
              ? "None reviewed yet — tap a blunder to study it."
              : "All caught up in this category!"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {list.map(m => {
              const isR = !!reviewed[m.id];
              return (
                <button key={m.id} className="blunder-card" onClick={() => {
                  setMistakeContext("list");
                  setSelMistake(m.id);
                  go("blunderDetail");
                }}>
                  <div className="blunder-thumb">
                    <Board cols={mkCols(m.cols)} overlays={[{ ...m.playedCell, type: "tr" }]} compact />
                  </div>
                  <div className="blunder-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="tag pat">{m.pattern}</span>
                      <SeverityMeter level={m.severity} />
                    </div>
                    <div className="bc-meta">
                      <span className="bc-date">Move {m.move} · {m.date}</span>
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

/* ---------- Level 3 — Blunder Detail --------------------------------- */
function MistakeDetail({ go, selMistake, setSelMistake, reviewed, setReviewed, mistakeContext = "list", mistakeSource = null }) {
  const m = MISTAKES[selMistake] || MISTAKES[0];
  const [reveal, setReveal] = useState(false);
  const isR = !!reviewed[m.id];

  /* back: from a game → review screen; from category detail → mistakeDetail */
  const handleBack = () => mistakeContext === "game" ? go("review") : go("mistakeDetail");

  const metaNode = mistakeSource ? (
    <button className="meta-game-link" onClick={() => go("review")}>
      Move {m.move} / {m.total} · {mistakeSource.date} ›
    </button>
  ) : ("Move " + m.move + " / " + m.total);

  const overlays = [
    { ...m.playedCell, type: "tr" },
    ...m.threat.map(t => ({ ...t, type: "td" })),
  ];

  const prev = () => { setReveal(false); setSelMistake((selMistake - 1 + MISTAKES.length) % MISTAKES.length); };
  const next = () => { setReveal(false); setSelMistake((selMistake + 1) % MISTAKES.length); };

  return (
    <div className="screen s-spar">
      <TopBar title="Mistake" onBack={handleBack} meta={metaNode} />
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

Object.assign(window, { CategoryList, MistakesList, MistakeDetail, MISTAKES });
