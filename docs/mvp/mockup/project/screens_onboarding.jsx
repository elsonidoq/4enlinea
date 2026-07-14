/* ============================================================
   DecodeC4 — First-run Onboarding
   Drop-in sparring (Easy) → coach aha → dismissible import offer.
   The import offer surfaces at GAME-END (natural stopping point);
   if the user leaves early it resurfaces once on Home.
   Skippable throughout. Re-accessible from Settings.
   Reuses Board / CoachDialog / AuthModal / primitives.
   ============================================================ */

/* Early-game position, green (player) to move. green=g, gray=d. */
const OB_START = ["", "d", "gd", "dg", "g", "", ""];

/* Played-out finished position — green has connected four across a high row,
   board nearly full, so it reads as "after the game" above the offer card. */
const OB_FINISHED = ["dgdgd", "gdgddg", "dgdgg", "gdgdg", "dgdgg", "gdgdg", "dgdg"];
const OB_FIN_WIN = [{ c: 2, r: 4 }, { c: 3, r: 4 }, { c: 4, r: 4 }, { c: 5, r: 4 }];

const OB_INTRO_MSG = { text: "Welcome in — no setup, just play. It's your move: drop a green disc anywhere.", mood: "happy" };
const OB_AHA_MSG   = { lead: "Nice one.", text: "That quietly builds a threat down the right — see how the board just opened up for you?", mood: "happy" };
const OB_END_MSG   = { lead: "Good game.", text: "You closed that out cleanly. Here's one thing worth trying next.", mood: "happy" };

/* --- win / full detection for the onboarding game --- */
function findWin(cols, v) {
  const at = (c, r) => (cols[c] && cols[c][r]) || null;
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 6; r++) {
      if (at(c, r) !== v) continue;
      for (const [dc, dr] of dirs) {
        const cells = [{ c, r }];
        for (let k = 1; k < 4; k++) {
          if (at(c + dc * k, r + dr * k) === v) cells.push({ c: c + dc * k, r: r + dr * k });
          else break;
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}
const isFull = (cols) => cols.every(col => col.length >= 6);

/* Small low-emphasis Skip control shown throughout onboarding. */
function SkipButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
        color: "var(--ink-faint)", padding: "6px 4px",
      }}
    >Skip</button>
  );
}

/* First-move nudge pill above the board. */
function MoveNudge() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "center",
      background: "rgba(255,255,255,0.72)", borderRadius: 999, padding: "7px 14px 7px 15px",
      boxShadow: "var(--shadow-sm)", marginBottom: 12, backdropFilter: "blur(2px)",
    }}>
      <span className="disc green" style={{ width: 15, height: 15, position: "relative", flex: "0 0 auto" }}></span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
        Your move — drop a green disc
      </span>
      <span style={{ display: "grid", placeItems: "center", animation: "obBob 1.4s ease-in-out infinite" }}>
        <Icon name="chevD" size={16} color="var(--disc-green)" />
      </span>
    </div>
  );
}

/* Post-aha import offer — everyone sees it. Two layout variants. */
function ImportOffer({ variant, onAccept, onDismiss }) {
  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: "#e9e1fb", color: "#7a5bd0", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
          <Icon name="swords" size={24} color="#7a5bd0" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>Play online?</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.35, marginTop: 2 }}>
            Bring your real games in and I'll coach those too.
          </div>
        </div>
      </div>
      <button className="btn btn-primary" onClick={onAccept}>Import my games</button>
      <button className="btn btn-ghost" onClick={onDismiss} style={{ marginTop: 8 }}>Not now</button>
    </>
  );

  if (variant === "sheet") {
    return (
      <>
        <div className="sheet-backdrop" onClick={onDismiss}></div>
        <div className="sheet" style={{ paddingTop: 8 }}>
          <div className="grab"></div>
          {body}
        </div>
      </>
    );
  }
  /* card variant — floats above the board, dismiss by tapping the dimmed board */
  return (
    <>
      <div className="sheet-backdrop" style={{ background: "rgba(30,26,20,0.20)" }} onClick={onDismiss}></div>
      <div style={{
        position: "absolute", left: 16, right: 16, bottom: 26, zIndex: 51,
        background: "#fff", borderRadius: 24, padding: "18px 18px 16px",
        boxShadow: "0 18px 46px rgba(0,0,0,0.26)",
        animation: "popIn .28s cubic-bezier(.2,.9,.3,1.2)",
      }}>
        {body}
      </div>
    </>
  );
}

/* Lightweight skip confirmation. */
function SkipConfirm({ onKeep, onExit }) {
  return (
    <>
      <div className="sheet-backdrop" style={{ background: "rgba(30,26,20,0.22)" }} onClick={onKeep}></div>
      <div style={{
        position: "absolute", left: 20, right: 20, bottom: 30, zIndex: 51,
        background: "#fff", borderRadius: 22, padding: "20px 20px 16px",
        boxShadow: "0 18px 46px rgba(0,0,0,0.26)",
        animation: "popIn .26s cubic-bezier(.2,.9,.3,1.2)",
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>Skip the intro?</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.4, margin: "6px 0 16px" }}>
          No problem — you can replay it anytime from Settings.
        </div>
        <button className="btn btn-dark" onClick={onExit}>Skip to Home</button>
        <button className="btn btn-ghost" onClick={onKeep} style={{ marginTop: 8 }}>Keep playing</button>
      </div>
    </>
  );
}

/* ============================================================
   Mission screen — shown once, before the first sparring game.
   Coach is the messenger; three pillars mirror the app's three
   modes (learn → practice → review real games); one CTA into play.
   ============================================================ */

const MISSION_PILLARS = [
  {
    icon: "grad",
    tint: "#e3eefc", ink: "#3b6fc4",
    title: "Learn the tactics",
    line: "The winning patterns behind every game — and why they work.",
  },
  {
    icon: "swords",
    tint: "#e9e1fb", ink: "#7a5bd0",
    title: "Practice against a bot that teaches",
    line: "Play me at your level and get the reasoning behind every move.",
  },
  {
    icon: "flag",
    tint: "var(--eval-mid-bg)", ink: "#b9760a",
    title: "Understand your mistakes",
    line: "Turn blunders into lessons — even your real games from Papergames.",
  },
];

function PillarRow({ icon, tint, ink, title, line }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      background: "var(--card)", borderRadius: "var(--radius-sm)",
      padding: "14px 15px", boxShadow: "var(--shadow-sm)", border: "1px solid #f0ebe1",
    }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, flex: "0 0 auto", display: "grid", placeItems: "center", background: tint, color: ink }}>
        <Icon name={icon} size={24} color={ink} />
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16.5, color: "var(--ink)", lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.38, marginTop: 3 }}>{line}</span>
      </span>
    </div>
  );
}

function MissionScreen({ go }) {
  const [showAuth, setShowAuth] = useState(false);
  return (
    <div className="screen s-home">
      {/* top bar — matches Home: app logo + profile/settings affordance */}
      <div className="topbar" style={{ padding: "8px 22px 6px" }}>
        <div className="tb-title" style={{ fontSize: 26, fontWeight: 800 }}>
          Decode<span style={{ color: "var(--disc-green)" }}>C4</span>
        </div>
        <div className="tb-spacer"></div>
        <button className="icon-btn" onClick={() => setShowAuth(true)} style={{ borderRadius: "50%" }}>
          <Icon name="user" size={21} />
        </button>
      </div>

      <div className="scroll" style={{ padding: "4px 22px 16px", display: "flex", flexDirection: "column" }}>
        {/* coach greeting — same speech-bubble treatment as the coached game */}
        <div style={{ margin: "0 -6px 4px" }}>
          <CoachDialog size={58} messages={[{
            lead: "Hi, I'm your coach.",
            text: "Here's how we'll make you dangerous at Connect Four.",
            mood: "happy",
          }]} />
        </div>

        {/* three pillars — mirror learn → practice → review */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 14 }}>
          {MISSION_PILLARS.map(p => <PillarRow key={p.title} {...p} />)}
        </div>
      </div>

      {/* single primary CTA into the coached practice game */}
      <Toolbar>
        <button className="btn btn-primary" onClick={() => go("obGame")}>
          Start sparring <Icon name="play" size={16} color="#fff" />
        </button>
      </Toolbar>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div className="home-indicator"></div>
    </div>
  );
}

/*
  OnboardingFlow — one interactive screen driving the whole first run.
  startAt: "welcome" | "play" | "aha" | "import" | "skip"  (rail deep-links)
  obWelcome: "on" | "off"   obOffer: "card" | "sheet"
*/
function OnboardingFlow({ go, startAt = "play", obWelcome = "off", obOffer = "card" }) {
  const initial = startAt === "play" && obWelcome === "on" ? "welcome" : startAt;
  const [phase, setPhase] = useState(initial);      // welcome | play | aha | import | skip
  const [showAuth, setShowAuth] = useState(false);
  const busy = useRef(false);
  const ahaSeen = useRef(startAt === "aha" || startAt === "import");

  // aha deep-link: a single move already played. import deep-link: a finished game.
  const isImport = startAt === "import";
  const ahaBoard = mkCols(["", "d", "gd", "dg", "gg", "", ""]); // green dropped on col 4
  const [cols, setCols] = useState(() =>
    isImport ? mkCols(OB_FINISHED) : startAt === "aha" ? ahaBoard : mkCols(OB_START));
  const [drop, setDrop] = useState(startAt === "aha" ? { c: 4, r: 1 } : null);
  const [winCells, setWinCells] = useState(isImport ? OB_FIN_WIN : []);

  const preAha = [OB_INTRO_MSG];
  const ahaMsgs = [{ ...OB_INTRO_MSG, faded: true }, OB_AHA_MSG];
  const endMsgs = [{ ...OB_AHA_MSG, faded: true }, OB_END_MSG];
  const msgs = phase === "import" ? endMsgs
    : (phase === "welcome" || phase === "play") ? preAha : ahaMsgs;

  const endGame = (win) => {
    setWinCells(win || []);
    setPhase("import");   // game over → import offer over the played-out board
  };

  // weak Easy AI: prefers the shallowest columns, plays no defense
  const aiPlay = (board) => {
    const open = board.map((c, i) => i).filter(i => board[i].length < 6);
    if (!open.length) { endGame(null); return; }
    const choice = open.sort((a, b) => board[a].length - board[b].length)[Math.floor(Math.random() * Math.min(3, open.length))];
    const next = board.map(a => a.slice());
    next[choice] = next[choice].concat("d");
    setCols(next);
    setDrop({ c: choice, r: next[choice].length - 1 });
    if (isFull(next)) { setTimeout(() => endGame(null), 450); return; }
    busy.current = false;
  };

  const play = (c) => {
    if (busy.current || (phase !== "play" && phase !== "aha")) return;
    busy.current = true;
    const next = cols.map(a => a.slice());
    next[c] = next[c].concat("g");
    setCols(next);
    setDrop({ c, r: next[c].length - 1 });
    // the aha: coach reacts to the user's own first move, immediately
    if (!ahaSeen.current) { ahaSeen.current = true; setPhase("aha"); }
    const win = findWin(next, "g");
    if (win) { setTimeout(() => endGame(win), 700); return; }        // game-end → offer
    if (isFull(next)) { setTimeout(() => endGame(null), 450); return; }
    setTimeout(() => aiPlay(next), 650);                             // opponent replies
  };

  const overlays = winCells.map(cell => ({ c: cell.c, r: cell.r, type: "win" }));

  const dismissOffer = () => go("home");
  const acceptOffer = () => setShowAuth(true);

  /* ---- Welcome micro-state (single line, no carousel) ---- */
  if (phase === "welcome") {
    return (
      <div className="screen s-spar">
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 18px 0" }}>
          <SkipButton onClick={() => go("home")} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 34px", textAlign: "center", gap: 4 }}>
          <div style={{ animation: "popIn .4s cubic-bezier(.2,.9,.3,1.2)", marginBottom: 6 }}>
            <CoachAvatar size={78} mood="happy" />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 23, color: "var(--ink)", lineHeight: 1.25 }}>
            I'm your coach.
          </div>
          <p style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.45, marginTop: 4 }}>
            Let's just play — I'll jump in the moment I see something worth pointing out.
          </p>
        </div>
        <Toolbar>
          <button className="btn btn-primary" onClick={() => setPhase("play")}>
            Start playing <Icon name="play" size={16} color="#fff" />
          </button>
        </Toolbar>
        <div className="home-indicator"></div>
      </div>
    );
  }

  /* ---- Board states: play / aha / import / skip ---- */
  return (
    <div className="screen s-spar">
      {/* first-run header: welcome mark + persistent skip, no difficulty/settings clutter */}
      <div className="topbar" style={{ padding: "6px 20px 4px" }}>
        <div className="tb-title" style={{ fontSize: 18 }}>Welcome</div>
        <div className="tb-meta" style={{ fontSize: 13, color: "var(--ink-faint)", fontWeight: 700 }}>Sparring · Easy</div>
        <div className="tb-spacer"></div>
        <SkipButton onClick={() => setPhase("skip")} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <CoachDialog fixed messages={msgs} size={46} />

        <div className="board-wrap" style={{ paddingTop: 6 }}>
          {phase === "play" && <MoveNudge />}
          <Board cols={cols} overlays={overlays} onColumn={(phase === "play" || phase === "aha") ? play : undefined} lastDrop={drop} />
        </div>
        <div></div>
      </div>

      {phase === "import" && (
        <ImportOffer variant={obOffer} onAccept={acceptOffer} onDismiss={dismissOffer} />
      )}
      {phase === "skip" && (
        <SkipConfirm onKeep={() => setPhase("play")} onExit={() => go("home")} />
      )}
      {showAuth && <AuthModal onClose={() => { setShowAuth(false); go("home"); }} />}

      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Settings (modification: Replay intro entry point) ---------- */
function SettingsScreen({ go }) {
  const Row = ({ icon, label, sub, onClick, accent }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left",
        background: "#fff", border: "1px solid #f0ebe1", borderRadius: "var(--radius-sm)",
        padding: "14px 15px", boxShadow: "var(--shadow-sm)", cursor: onClick ? "pointer" : "default",
        marginBottom: 10,
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 12, flex: "0 0 auto", display: "grid", placeItems: "center", background: accent ? "var(--eval-good-bg)" : "rgba(0,0,0,0.05)", color: accent ? "#1c8a4a" : "var(--ink-soft)" }}>
        <Icon name={icon} size={20} color={accent ? "var(--disc-green)" : "var(--ink-soft)"} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</span>}
      </span>
      {onClick && <Icon name="chevR" size={18} color="var(--ink-faint)" />}
    </button>
  );

  return (
    <div className="screen s-home">
      <TopBar title="Settings" onBack={() => go("home")} />
      <div className="scroll" style={{ padding: "4px 22px 24px" }}>
        <div className="section-title" style={{ paddingLeft: 2 }}>Getting started</div>
        <Row icon="play" label="Replay intro" sub="Show the onboarding again" accent onClick={() => go("obGame")} />

        <div className="section-title" style={{ marginTop: 14, paddingLeft: 2 }}>General</div>
        <Row icon="user" label="Account" sub="Not signed in" onClick={() => {}} />
        <Row icon="chart" label="Progress & stats" onClick={() => go("stats")} />
      </div>
      <div className="home-indicator"></div>
    </div>
  );
}

/* ---------- Home-fallback offer ----------
   If the user left onboarding early (after the coach aha, before game-end),
   the import offer resurfaces once the next time they land on Home.
   Reuses the exact same offer component, now presented over Home. */
function HomeOffer({ go, obOffer = "card" }) {
  const [showAuth, setShowAuth] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  return (
    <>
      <HomeScreen go={go} isAuthed={false} />
      {!dismissed && !showAuth && (
        <ImportOffer
          variant={obOffer}
          onAccept={() => setShowAuth(true)}
          onDismiss={() => setDismissed(true)}
        />
      )}
      {showAuth && <AuthModal onClose={() => { setShowAuth(false); setDismissed(true); }} />}
    </>
  );
}

Object.assign(window, { OnboardingFlow, SettingsScreen, HomeOffer, MissionScreen });
