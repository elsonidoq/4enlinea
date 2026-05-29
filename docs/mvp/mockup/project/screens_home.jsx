/* ============================================================
   DecodeC4 — Home (Hub) + Progress & Stats
   ============================================================ */

function HomeScreen({ go }) {
  return (
    <div className="screen s-home">
      <div className="topbar" style={{ padding: "8px 22px 6px" }}>
        <div className="tb-title" style={{ fontSize: 26, fontWeight: 800 }}>
          Decode<span style={{ color: "var(--disc-green)" }}>C4</span>
        </div>
        <div className="tb-spacer"></div>
        <button className="icon-btn" onClick={() => go("stats")} style={{ borderRadius: "50%" }}>
          <Icon name="user" size={21} />
        </button>
      </div>

      <div className="scroll" style={{ padding: "6px 22px 22px" }}>
        <p style={{ color: "var(--ink-soft)", fontWeight: 700, fontSize: 15, marginBottom: 18, marginTop: 2 }}>
          Welcome back. Learn <em style={{ color: "var(--disc-green)", fontStyle: "normal" }}>why</em> moves win.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <button className="feature-card" onClick={() => go("saga")} style={{ background: "linear-gradient(170deg,#fff,#f3f8ff)" }}>
            <div className="fc-icon" style={{ background: "#e3eefc", color: "#3b6fc4" }}><Icon name="grad" size={28} color="#3b6fc4" /></div>
            <h3>Lessons</h3>
            <p>Learn why patterns win</p>
            <span style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 800, color: "#3b6fc4", background: "#e3eefc", padding: "3px 8px", borderRadius: 8 }}>4 / 11</span>
          </button>

          <button className="feature-card" onClick={() => go("setpicker")} style={{ background: "linear-gradient(170deg,#fff,#fff3e8)" }}>
            <div className="fc-icon" style={{ background: "#fce6cf", color: "#d6892a" }}><Icon name="target" size={28} color="#d6892a" /></div>
            <h3>Challenges</h3>
            <p>Find the best move</p>
          </button>
        </div>

        <button className="feature-card" onClick={() => go("difficulty")} style={{ marginTop: 14, background: "linear-gradient(170deg,#fff,#f4f0fd)", flexDirection: "row", alignItems: "center", gap: 16 }}>
          <div className="fc-icon" style={{ background: "#e9e1fb", color: "#7a5bd0" }}><Icon name="swords" size={28} color="#7a5bd0" /></div>
          <div style={{ flex: 1 }}>
            <h3>Sparring</h3>
            <p>Play a bot that teaches as you go</p>
          </div>
          <Icon name="chevR" size={22} color="var(--ink-faint)" />
        </button>

        {/* daily coach nudge */}
        <div style={{ marginTop: 18 }}>
          <CoachDialog size={50} messages={[{ text: "Forced blocks are your weak spot today. Want a quick drill?", mood: "happy" }]} />
        </div>

        <button className="btn btn-ghost" onClick={() => go("stats")} style={{ marginTop: 14, fontSize: 15 }}>
          <Icon name="chart" size={18} /> Progress &amp; Stats
        </button>
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

function StatsScreen({ go }) {
  const pats = [
    ["Immediate win", "92%", "good"],
    ["Forced block", "58%", "mid"],
    ["The Fork", "74%", "good"],
    ["Claimeven", "41%", "bad"],
    ["Odd / Even threats", "66%", "mid"],
  ];
  return (
    <div className="screen s-home">
      <TopBar title="Progress & Stats" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "4px 22px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38, color: "var(--disc-green)" }}>71%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Avg accuracy</div>
            </div>
            <div style={{ width: 1, height: 46, background: "var(--line)" }}></div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38 }}>4</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Lessons done</div>
            </div>
            <div style={{ width: 1, height: 46, background: "var(--line)" }}></div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38 }}>23</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Day streak</div>
            </div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>Accuracy by pattern</div>
        <div style={{ background: "#fff", borderRadius: 18, padding: "4px 18px", boxShadow: "var(--shadow-sm)" }}>
          {pats.map(([name, score, t]) => (
            <div className="pat-row" key={name}>
              <span className="pat-name">{name}</span>
              <div style={{ width: 90, height: 8, background: "#efece5", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: score, height: "100%", background: t === "good" ? "var(--eval-good)" : t === "mid" ? "var(--eval-mid)" : "var(--eval-bad)" }}></div>
              </div>
              <span className="pat-score" style={{ width: 42, textAlign: "right" }}>{score}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost" onClick={() => go("mistakes")} style={{ marginTop: 14, justifyContent: "space-between", fontSize: 15 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Icon name="flag" size={18} /> Review past mistakes</span>
          <Icon name="chevR" size={18} color="var(--ink-faint)" />
        </button>

        <div style={{ marginTop: 18 }}>
          <CoachDialog size={50} messages={[{ text: "Claimeven is holding you back. Lesson 5 is unlocked — let's fix it.", mood: "think" }]} />
        </div>
        <button className="btn btn-primary" onClick={() => go("concept")} style={{ marginTop: 14 }}>Go to Claimeven lesson</button>
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

Object.assign(window, { HomeScreen, StatsScreen });
