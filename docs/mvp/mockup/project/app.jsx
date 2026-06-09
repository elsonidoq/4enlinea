/* ============================================================
   DecodeC4 — App shell, router, navigator rail
   ============================================================ */

const SCREENS = {
  home:       (p) => <HomeScreen {...p} />,
  stats:      (p) => <StatsScreen {...p} />,
  saga:       (p) => <SagaMap {...p} variant={p.sagaVariant} />,
  concept:    (p) => <ConceptScreen {...p} />,
  socratic:   (p) => <SocraticScreen {...p} />,
  clchallenge:(p) => <ChallengeBoard {...p} variant={p.fbVariant} lessonMode />,
  setpicker:  (p) => <SetPicker {...p} />,
  challenge:  (p) => <ChallengeBoard {...p} variant={p.fbVariant} />,
  summary:    (p) => <PostSetSummary {...p} />,
  difficulty: (p) => <DifficultyPicker {...p} />,
  game:       (p) => <GameBoard {...p} />,
  review:     (p) => <PostGameReview {...p} />,
  explorer:   (p) => <PositionExplorer {...p} />,
  mistakes:      (p) => <CategoryList {...p} />,
  mistakeDetail: (p) => <MistakesList {...p} category={p.selCategory} />,
  blunderDetail: (p) => <MistakeDetail {...p} />,
  pastGames:     (p) => <PastGamesList {...p} />
};

const NAV_GROUPS = [
  { label: "Home", items: [["home", "Home", "1"], ["stats", "Progress & Stats", "·"]] },
  { label: "Lessons", items: [["saga", "Saga Map", "2"], ["concept", "Lesson Concept", "3"], ["socratic", "Socratic Board", "4"], ["clchallenge", "Confirmation Challenge", "6·7"]] },
  { label: "Challenges", items: [["setpicker", "Set Picker", "5"], ["challenge", "Challenge Board + Feedback", "6·7"], ["summary", "Post-Set Summary", "9"]] },
  { label: "Sparring", items: [["difficulty", "Difficulty Picker", "10"], ["game", "Game Board", "11"], ["review", "Post-Game Review", "12"], ["explorer", "Position Explorer", "13"]] },
  { label: "Past Mistakes", items: [["mistakes", "Category List", "14"], ["mistakeDetail", "Category Detail", "15"], ["blunderDetail", "Blunder Detail", "·"]] },
  { label: "Past Games", items: [["pastGames", "Past Games List", "·"]] },
];

function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState("home");
  const [isAuthed, setIsAuthed] = useState(false);
  const [sagaVariant, setSagaVariant] = useState("A");
  const [fbVariant, setFbVariant] = useState("A");
  const [mistakesVariant, setMistakesVariant] = useState("in");
  const [gamesVariant, setGamesVariant] = useState("in");
  const [selMistake, setSelMistake] = useState(0);
  const [reviewed, setReviewedMap] = useState({ 3: true, 7: true });
  const setReviewed = (id, v) => setReviewedMap(m => ({ ...m, [id]: v }));
  const [mistakeContext, setMistakeContext] = useState("list");
  const [mistakeSource, setMistakeSource] = useState(null);
  const [selCategory, setSelCategory] = useState("Claimeven");
  const go = (s) => setScreen(s);

  const props = { go, isAuthed, sagaVariant, fbVariant, mistakesVariant, gamesVariant, selMistake, setSelMistake, reviewed, setReviewed, mistakeContext, setMistakeContext, mistakeSource, setMistakeSource, selCategory, setSelCategory };

  const sagaNames = { A: "Winding path", B: "Meadow stones", C: "Clean list" };
  const fbNames = { A: "Strip below", B: "Compact inline", C: "Docked card" };
  const mNames = { in: "Signed in", empty: "Empty", out: "Signed out" };
  const gNames  = { in: "Signed in", empty: "Empty", out: "Signed out" };

  return (
    <div className="stage">
      {/* ---- navigator rail ---- */}
      <div className="rail">
        <h1>Decode<span className="dot4">C4</span></h1>
        <div className="tagline">Interactive prototype · all 15 screens. Tap a name to jump, or navigate inside the phone.</div>

        {NAV_GROUPS.map(g => (
          <div className="rail-group" key={g.label}>
            <div className="rail-group-label">{g.label}</div>
            {g.items.map(([id, name, num]) => (
              <button key={id} className={"rail-item" + (screen === id ? " active" : "")} onClick={() => go(id)}>
                <span className="num">{num}</span>{name}
              </button>
            ))}

            {g.label === "Home" && (
              <div className="variant-box">
                <div className="vlabel">Profile state · {isAuthed ? "Signed in" : "Anonymous"}</div>
                <Seg value={isAuthed ? "in" : "out"} options={["out", "in"]}
                     onChange={v => { setIsAuthed(v === "in"); go("home"); }} />
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>Anonymous taps the profile icon to see the sign-in modal.</div>
              </div>
            )}
            {g.label === "Lessons" && (
              <div className="variant-box">
                <div className="vlabel">Saga Map style · {sagaNames[sagaVariant]}</div>
                <Seg value={sagaVariant} options={["A", "B", "C"]} onChange={(v) => { setSagaVariant(v); go("saga"); }} />
              </div>
            )}
            {g.label === "Challenges" && (
              <div className="variant-box">
                <div className="vlabel">Feedback layout · {fbNames[fbVariant]}</div>
                <Seg value={fbVariant} options={["A", "B", "C"]} onChange={(v) => { setFbVariant(v); go("challenge"); }} />
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>Play a move on the board to see the feedback layout.</div>
              </div>
            )}
            {g.label === "Past Mistakes" && (
              <div className="variant-box">
                <div className="vlabel">Category list state · {mNames[mistakesVariant]}</div>
                <Seg value={mistakesVariant} options={["in", "empty", "out"]} onChange={(v) => { setMistakesVariant(v); go("mistakes"); }} />
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>Controls the Category List screen (signed-in, empty, signed-out).</div>
              </div>
            )}
            {g.label === "Past Games" && (
              <div className="variant-box">
                <div className="vlabel">List state · {gNames[gamesVariant]}</div>
                <Seg value={gamesVariant} options={["in", "empty", "out"]} onChange={(v) => { setGamesVariant(v); go("pastGames"); }} />
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>Signed-in list, empty state, or signed-out gate.</div>
              </div>
            )}
          </div>
        ))}

        <div className="rail-foot">Discs: green / dark-gray. Red · orange · yellow reserved for evaluation only.</div>
      </div>

      {/* ---- phone ---- */}
      <div className="phone-wrap">
        <div className="phone">
          <div style={{ position: "absolute", top: 11, left: 11, right: 11, zIndex: 40 }}>
            <StatusBar />
          </div>
          {React.createElement(
            "div",
            { key: screen, style: { height: "100%" } },
            SCREENS[screen](props)
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
