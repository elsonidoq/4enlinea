/* ============================================================
   DecodeC4 — Past Games
   List (signed-in / empty / signed-out variants) · game cards
   ============================================================ */

const PAST_GAMES = [
  {
    id: "g1", outcome: "won", date: "Jun 7",
    source: "ai", difficulty: "Medium", accuracy: 82,
    blunderCount: 2,
    cols: ["gdgd", "dgdg", "gdgdg", "dgdgd", "gdg", "dgd", "gd"],
  },
  {
    id: "g2", outcome: "lost", date: "Jun 5",
    source: "ai", difficulty: "Hard", accuracy: 61,
    blunderCount: 3,
    cols: ["gdd", "dgd", "gdg", "dg", "dgd", "g", ""],
  },
  {
    id: "g3", outcome: "won", date: "Jun 3",
    source: "papergames", opponentName: "Alex K.",
    blunderCount: 0,
    cols: ["gdg", "dgd", "gd", "dg", "g", "d", ""],
  },
  {
    id: "g4", outcome: "lost", date: "May 28",
    source: "ai", difficulty: "Easy", accuracy: 74,
    blunderCount: 1,
    cols: ["gd", "dg", "gd", "dg", "gd", "", ""],
  },
  {
    id: "g5", outcome: "won", date: "May 22",
    source: "papergames", opponentName: "Sam T.",
    blunderCount: 2,
    cols: ["gdgd", "dg", "gd", "dg", "gdg", "d", ""],
  },
];

function pgInitials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const PG_DIFF_STYLES = {
  Easy:    { bg: "var(--eval-good-bg)", fg: "#1c8a4a" },
  Medium:  { bg: "var(--eval-mid-bg)",  fg: "#b9760a" },
  Hard:    { bg: "var(--eval-bad-bg)",  fg: "#c23a26" },
  Perfect: { bg: "#2b2a28",             fg: "#fff"    },
};

function GameCard({ g, go }) {
  const ds = g.source === "ai" ? (PG_DIFF_STYLES[g.difficulty] || {}) : null;
  return (
    <button className="game-card" onClick={() => go("review")}>
      <div className="blunder-thumb" style={{ width: 80 }}>
        <Board cols={mkCols(g.cols)} compact />
      </div>
      <div className="gc-body">
        {/* Row 1: outcome + date */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <span className={"outcome-chip " + g.outcome}>{g.outcome === "won" ? "Won" : "Lost"}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-faint)" }}>{g.date}</span>
        </div>
        {/* Row 2: source info */}
        {g.source === "ai" && ds ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{
              background: ds.bg, color: ds.fg,
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11.5,
              padding: "2px 8px", borderRadius: 999,
            }}>{g.difficulty}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>{g.accuracy}% accuracy</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <span className="opponent-av">{pgInitials(g.opponentName)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)" }}>{g.opponentName}</span>
          </div>
        )}
        {/* Row 3: blunders */}
        <div>
          {g.blunderCount > 0 ? (
            <span className="gc-blunder-chip">
              <Icon name="flag" size={11} color="#b9760a" />
              {g.blunderCount} {g.blunderCount === 1 ? "blunder" : "blunders"}
            </span>
          ) : (
            <span className="gc-no-blunder-chip">no blunders</span>
          )}
        </div>
      </div>
      <Icon name="chevR" size={18} color="var(--ink-faint)" />
    </button>
  );
}

function PastGamesList({ go, gamesVariant = "in" }) {
  const [filter, setFilter] = useState("All");

  /* signed-out gate */
  if (gamesVariant === "out") {
    return (
      <div className="screen s-spar">
        <TopBar title="Past Games" onBack={() => go("home")} />
        <div className="scroll" style={{ padding: "0 22px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#e3eefc", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon name="user" size={32} color="#3b6fc4" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 23 }}>Sign up to see your games</h2>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14, margin: "10px 22px 22px", lineHeight: 1.45 }}>
              Create a free account and DecodeC4 will save every game so you can review them with the Coach later.
            </p>
            <button className="btn btn-primary" onClick={() => go("home")} style={{ background: "#3b6fc4", boxShadow: "0 6px 0 #2a56a0" }}>Create free account</button>
            <button className="btn btn-ghost" onClick={() => go("home")} style={{ marginTop: 9 }}>Maybe later</button>
          </div>
        </div>
        <div className="home-indicator"></div>
      </div>
    );
  }

  /* empty state */
  if (gamesVariant === "empty") {
    return (
      <div className="screen s-spar">
        <TopBar title="Past Games" onBack={() => go("home")} />
        <div className="scroll" style={{ padding: "0 22px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <CoachAvatar size={88} mood="happy" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>No games yet</h2>
            <p style={{ color: "var(--ink-soft)", fontWeight: 600, fontSize: 14.5, margin: "10px 26px 22px", lineHeight: 1.45 }}>
              Play your first game and I'll keep it here so you can always look back and learn from it.
            </p>
            <button className="btn btn-primary" onClick={() => go("difficulty")}>Play a game <Icon name="play" size={16} color="#fff" /></button>
          </div>
        </div>
        <div className="home-indicator"></div>
      </div>
    );
  }

  /* populated list */
  const list = PAST_GAMES.filter(g => {
    if (filter === "Won")     return g.outcome === "won";
    if (filter === "Lost")    return g.outcome === "lost";
    if (filter === "Blunder") return g.blunderCount > 0;
    return true;
  });

  return (
    <div className="screen s-spar">
      <TopBar title="Past Games" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "0 20px 24px" }}>
        <div className="filter-tabs">
          {["All", "Won", "Lost", "Blunder"].map(t => (
            <button key={t} className={filter === t ? "on" : ""} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="muted center" style={{ fontWeight: 700, fontSize: 14, padding: "30px 10px" }}>
            Nothing here — switch tabs to see your other games.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {list.map(g => <GameCard key={g.id} g={g} go={go} />)}
          </div>
        )}
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { PastGamesList, PAST_GAMES });
