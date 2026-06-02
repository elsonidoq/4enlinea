import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { BadgeRow } from '../components/BadgeRow.jsx';
import { RecommendCoach } from '../components/RecommendCoach.jsx';
import { ExplainMoveButton } from '../components/ExplainMoveButton.jsx';
import { ClassifyAllPanel } from '../components/ClassifyAllPanel.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { useDebugMode } from '../context/DebugContext.jsx';
import { track } from '../lib/track.js';
import { checkWin } from '../lib/board.js';
import { sampleColumnFromScores, DIFFICULTY_TEMPERATURES } from '../lib/aiDifficulty.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const ROWS = 6;
const COLS = 7;

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Med', hard: 'Hard', perfect: 'Perf' };
const DIFFICULTIES = ['easy', 'medium', 'hard', 'perfect'];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
}

function getColHeights(board) {
  return Array.from({ length: COLS }, (_, c) => {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][c] !== 'empty') return r + 1;
    return 0;
  });
}

function placePiece(board, col, color) {
  const next = board.map(r => [...r]);
  const heights = getColHeights(next);
  if (heights[col] >= ROWS) return null;
  next[heights[col]][col] = color;
  return next;
}

function buildMovesString(history) {
  return history.join('');
}

function rebuildBoard(history) {
  let b = emptyBoard();
  for (let i = 0; i < history.length; i++) {
    b = placePiece(b, history[i], i % 2 === 0 ? 'red' : 'yellow');
  }
  return b;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { session } = useStore();
  const { debugMode } = useDebugMode();
  const [board, setBoard] = useState(emptyBoard());
  const [moveHistory, setMoveHistory] = useState([]);
  const [turn, setTurn] = useState('red');
  const [gameOver, setGameOver] = useState(null);
  const [difficulty, setDifficulty] = useState('perfect');
  const [commitFirst, setCommitFirst] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [postReveal, setPostReveal] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [recommendBadges, setRecommendBadges] = useState(null);

  useEffect(() => {
    track('session_start', { mode: 'sparring' });
  }, []);

  useEffect(() => {
    if (turn === 'yellow' && !gameOver) {
      makeAiMove();
    }
  }, [turn, gameOver]);

  const moveString = buildMovesString(moveHistory);
  // human: board right after human's last move (odd-length slice)
  const humanMovestring = buildMovesString(
    moveHistory.slice(0, moveHistory.length % 2 === 1 ? moveHistory.length : Math.max(0, moveHistory.length - 1))
  );
  // ai: board right after AI's last move (even-length slice, empty until AI has moved once)
  const aiMovestring = moveHistory.length < 2 ? '' : buildMovesString(
    moveHistory.slice(0, moveHistory.length % 2 === 0 ? moveHistory.length : moveHistory.length - 1)
  );

  // Pre-move movestring and column for the human's most recent move (for "Why?" button).
  // humanMovestring always ends with the human's last move digit when non-empty.
  const lastHumanMovestring = useMemo(
    () => humanMovestring.length > 0 ? humanMovestring.slice(0, -1) : null,
    [humanMovestring]
  );
  const lastHumanCol = useMemo(
    () => humanMovestring.length > 0 ? parseInt(humanMovestring[humanMovestring.length - 1], 10) : null,
    [humanMovestring]
  );

  async function getAiColumn(moves) {
    // TODO(tech-debt): depth-limited solver (-d N -nb) was explored as a difficulty mechanism
    // but produces all-zero scores in early-game positions because forced outcomes require 32-38
    // plies from move 2, which exceeds any practically fast depth. Softmax sampling over perfect
    // scores is used instead.
    const res = await fetch(`${API}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves }),
    });
    const { scores } = await res.json();
    return sampleColumnFromScores(scores, DIFFICULTY_TEMPERATURES[difficulty]);
  }

  async function makeAiMove() {
    setAiThinking(true);
    try {
      const moves = buildMovesString(moveHistory);
      const [col] = await Promise.all([
        getAiColumn(moves),
        new Promise(r => setTimeout(r, 800)),
      ]);
      applyMove(col, 'yellow');
    } catch {
      // solver error
    } finally {
      setAiThinking(false);
    }
  }

  function applyMove(col, color) {
    const heights = getColHeights(board);
    if (heights[col] >= ROWS) return;
    const row = heights[col];
    const nextBoard = placePiece(board, col, color);
    if (!nextBoard) return;
    const nextHistory = [...moveHistory, col];
    setBoard(nextBoard);
    setMoveHistory(nextHistory);

    if (checkWin(nextBoard, row, col, color)) {
      setGameOver(color === 'red' ? 'human' : 'ai');
      setTurn(null);
      return;
    }
    if (nextHistory.length >= ROWS * COLS) {
      setGameOver('draw');
      setTurn(null);
      return;
    }
    setTurn(color === 'red' ? 'yellow' : 'red');
  }

  async function handleColumnClick(col) {
    if (turn !== 'red' || gameOver || aiThinking) return;
    commitMove(col);
  }

  async function commitMove(col) {
    const movesBeforeCommit = buildMovesString(moveHistory);
    setPendingMove(null);
    setRecommendBadges(null);
    applyMove(col, 'red');

    if (commitFirst) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (session) headers.Authorization = `Bearer ${session.access_token}`;
        const [explainRes, scoresRes] = await Promise.all([
          fetch(`${API}/api/explain-move`, {
            method: 'POST', headers,
            body: JSON.stringify({ moves: movesBeforeCommit, candidateCol: col }),
          }),
          fetch(`${API}/api/scores`, {
            method: 'POST', headers,
            body: JSON.stringify({ moves: movesBeforeCommit }),
          }),
        ]);
        const explainData = await explainRes.json();
        const scoresData = await scoresRes.json();

        if (explainData.oneLiner) {
          const scores = scoresData.scores ?? [];
          const heights = getColHeights(board);
          const validScores = scores.map((s, i) => heights[i] < ROWS ? s : -Infinity);
          const bestScore = Math.max(...validScores);
          const bestCol = validScores.indexOf(bestScore);
          const playedScore = scores[col] ?? 0;

          setPostReveal({
            moves: movesBeforeCommit,
            col,
            oneLiner: explainData.oneLiner,
            playedScore,
            bestCol,
            bestScore,
          });
          track('deep_reveal_viewed', { context: 'sparring' });
        }
      } catch { /* silent */ }
    }
  }

  function resetGame() {
    setBoard(emptyBoard());
    setMoveHistory([]);
    setTurn('red');
    setGameOver(null);
    setPendingMove(null);
    setPostReveal(null);
    setRecommendBadges(null);
    track('session_start', { mode: 'sparring' });
  }

  function handleUndo() {
    // Always land on even-length history so it's red's (user's) turn.
    // Game can end on odd length (user wins) or even length (AI wins/draw).
    const undoCount = moveHistory.length % 2 === 0 ? 2 : 1;
    const newHistory = moveHistory.slice(0, -undoCount);
    setMoveHistory(newHistory);
    setBoard(rebuildBoard(newHistory));
    setTurn('red');
    setGameOver(null);
    setPostReveal(null);
    setRecommendBadges(null);
  }

  const moveCount = moveHistory.length;
  const statusColor = gameOver === 'human' ? 'var(--green)'
    : gameOver === 'ai' ? 'var(--red)'
    : aiThinking ? 'var(--text-muted)'
    : 'var(--text-sub)';

  const statusMsg = gameOver === 'human' ? t('sparring.youWon')
    : gameOver === 'ai' ? t('sparring.aiWon')
    : gameOver === 'draw' ? t('sparring.draw')
    : aiThinking ? t('sparring.aiThinking')
    : t('sparring.yourTurn');

  return (
    <div style={page}>
      {/* Top bar */}
      <div style={topBar}>
        <div style={diffSelector}>
          {DIFFICULTIES.map(d => (
            <div
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                ...diffOpt,
                background: difficulty === d ? 'var(--surface-3)' : 'transparent',
                color: difficulty === d ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              {DIFFICULTY_LABELS[d]}
            </div>
          ))}
        </div>
        <div style={moveCounter}>Move {moveCount}</div>
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || aiThinking}
          style={{
            ...btnUndo,
            opacity: moveHistory.length === 0 || aiThinking ? 0.35 : 1,
            cursor: moveHistory.length === 0 || aiThinking ? 'default' : 'pointer',
          }}
        >
          ↩ Undo
        </button>
      </div>

      {/* Status */}
      <div style={{ padding: '6px 20px 10px', fontSize: 13, fontWeight: 600, color: statusColor }}>
        {statusMsg}
      </div>

      {/* Board */}
      <div style={{ padding: '0 16px' }}>
        <BadgeRow colRankings={recommendBadges} />
        <Board
          board={board}
          onColumnClick={handleColumnClick}
          canPlay={turn === 'red' && !gameOver && !aiThinking}
        />
      </div>

      {/* Debug panel */}
      {debugMode && !gameOver && <ClassifyAllPanel humanMovestring={humanMovestring} aiMovestring={aiMovestring} />}

      {/* Commit-first toggle */}
      <div style={toggleRow}>
        <div style={toggleItem}>
          <div
            onClick={() => setCommitFirst(v => !v)}
            style={{
              ...toggleSw,
              background: commitFirst ? 'var(--green)' : 'var(--border)',
            }}
          >
            <div style={{ ...toggleKnob, left: commitFirst ? 18 : 2 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {t('sparring.commitFirst')} <span style={{ color: 'var(--yellow)', fontSize: 11 }}>✦</span>
          </span>
        </div>
      </div>

      {/* Recommend + Why coach */}
      <div style={{ marginTop: 10 }}>
        <RecommendCoach
          moves={moveString}
          gameOver={gameOver !== null}
          aiThinking={aiThinking}
          onBadgesChange={setRecommendBadges}
        />
      </div>

      {/* Post-reveal */}
      {postReveal && (
        <div style={revealCard}>
          <div style={revealHandle} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Move Analysis
          </div>

          {postReveal.bestScore !== undefined && (
            postReveal.playedScore === postReveal.bestScore ? (
              <div style={{ ...scoreRow, borderLeftColor: 'var(--green)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 4 }}>
                  ✓ Best move played
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>Col {postReveal.col + 1}</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                    {postReveal.playedScore > 0 ? '+' : ''}{postReveal.playedScore}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ ...scoreCard, borderLeftColor: 'var(--text-muted)', flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Your move</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>Col {postReveal.col + 1}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: postReveal.playedScore >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {postReveal.playedScore > 0 ? '+' : ''}{postReveal.playedScore}
                  </div>
                </div>
                <div style={{ ...scoreCard, borderLeftColor: 'var(--yellow)', flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--yellow)', marginBottom: 4 }}>Best move</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>Col {postReveal.bestCol + 1}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: postReveal.bestScore >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {postReveal.bestScore > 0 ? '+' : ''}{postReveal.bestScore}
                  </div>
                </div>
              </div>
            )
          )}

          <div style={explBox}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: 5 }}>
              Post-move insight
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
              {postReveal.oneLiner}
            </div>
          </div>
          <ExplainMoveButton key={`${postReveal.moves}-${postReveal.col}`} moves={postReveal.moves} col={postReveal.col} />
        </div>
      )}

      {/* Game over */}
      {gameOver && (
        <div style={{ padding: '12px 16px' }}>
          <button onClick={resetGame} style={btnPrimary}>
            {t('sparring.newGame')}
          </button>
        </div>
      )}
    </div>
  );
}

const page = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  minHeight: '100%',
  paddingBottom: 12,
};

const topBar = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px 6px',
  gap: 10,
};

const diffSelector = {
  display: 'flex',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  overflow: 'hidden',
  flex: 1,
};

const diffOpt = {
  flex: 1,
  textAlign: 'center',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  padding: '7px 4px',
  cursor: 'pointer',
  transition: 'all .12s',
  fontFamily: 'inherit',
};

const moveCounter = {
  fontSize: 12,
  color: 'var(--text-sub)',
  fontFamily: "'Courier New', monospace",
  flexShrink: 0,
};

const toggleRow = {
  display: 'flex',
  alignItems: 'center',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  marginTop: 10,
};

const toggleItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 20px',
};

const toggleSw = {
  width: 36,
  height: 20,
  borderRadius: 10,
  position: 'relative',
  flexShrink: 0,
  cursor: 'pointer',
  transition: 'background .15s',
};

const toggleKnob = {
  width: 16,
  height: 16,
  background: '#fff',
  borderRadius: '50%',
  position: 'absolute',
  top: 2,
  transition: 'left .15s',
};

const explBox = {
  marginBottom: 12,
  padding: '12px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--text-muted)',
};

const scoreRow = {
  marginBottom: 10,
  padding: '10px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--green)',
};

const scoreCard = {
  padding: '10px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--border)',
};

const revealCard = {
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  borderRadius: '20px 20px 0 0',
  padding: '16px 20px 20px',
  marginTop: 10,
};

const revealHandle = {
  width: 36,
  height: 4,
  background: 'var(--border)',
  borderRadius: 2,
  margin: '0 auto 14px',
};

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: 'none',
  background: 'var(--red)',
  color: '#fff',
  fontFamily: 'inherit',
};

const btnUndo = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '7px 14px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'inherit',
};

const btnSecondary = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'inherit',
};
