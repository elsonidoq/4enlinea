import { useState } from 'react';

const COLS = 7;
const ROWS = 6;

function getHeights(moveString) {
  const h = Array(COLS).fill(0);
  for (const ch of moveString) h[parseInt(ch, 10) - 1]++;
  return h;
}

function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

export function MultiMoveSequencer({ category, baseMoveString, solverScores, onSequenceComplete }) {
  const [started, setStarted] = useState(false);
  const [sequenceMoves, setSequenceMoves] = useState(''); // moves played since start
  const [humanMoves, setHumanMoves] = useState([]);
  const [aiMoves, setAiMoves] = useState([]);
  const [finished, setFinished] = useState(false);

  if (![4, 6].includes(category)) return null;

  // Sequence so far is baseMoveString + sequenceMoves
  const currentMoveString = baseMoveString + sequenceMoves;
  const heights = getHeights(currentMoveString);
  const moveCount = currentMoveString.length;
  // Even total moves played means it's player 1's turn (human is always player 1 in puzzle context)
  const isHumanTurn = sequenceMoves.length % 2 === 0;

  const winScore = immediateWinScore(moveCount);

  function handleStart() {
    setStarted(true);
    setSequenceMoves('');
    setHumanMoves([]);
    setAiMoves([]);
    setFinished(false);
  }

  function handleColumnClick(col) {
    if (!started || finished) return;
    if (heights[col] >= ROWS) return;

    const newSeq = sequenceMoves + (col + 1).toString();
    setSequenceMoves(newSeq);

    if (isHumanTurn) {
      setHumanMoves(prev => [...prev, col]);
    } else {
      setAiMoves(prev => [...prev, col]);
    }
  }

  function handleMarkEnd() {
    setFinished(true);
    onSequenceComplete({ cooperativeAiMoves: aiMoves });
  }

  function handleReset() {
    setStarted(false);
    setSequenceMoves('');
    setHumanMoves([]);
    setAiMoves([]);
    setFinished(false);
  }

  return (
    <div style={container}>
      <div style={heading}>Multi-Move Sequence</div>
      <div style={subtext}>
        {category === 4 ? 'Fork Setup' : 'Parity Control'} — define the cooperative AI response moves
      </div>

      {!started && !finished && (
        <button style={btn} onClick={handleStart}>Mark Start</button>
      )}

      {started && !finished && (
        <>
          <div style={turnIndicator}>
            {isHumanTurn ? '→ Human move' : '→ AI response'}
          </div>
          <div style={colGrid}>
            {Array.from({ length: COLS }, (_, col) => {
              const legal = heights[col] < ROWS;
              const score = solverScores?.[col] ?? 0;
              const isShortcutWin = legal && isHumanTurn && score === winScore && winScore > 0;
              const isNonCooperative = legal && !isHumanTurn && score > 0;
              return (
                <button
                  key={col}
                  onClick={() => handleColumnClick(col)}
                  disabled={!legal}
                  style={{
                    ...colBtn,
                    opacity: legal ? 1 : 0.3,
                    borderColor: isShortcutWin ? 'var(--red)' : isNonCooperative ? '#f59e0b' : 'var(--border)',
                    background: isShortcutWin ? 'rgba(239,68,68,.1)' : isNonCooperative ? 'rgba(245,158,11,.1)' : 'var(--surface)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>C{col + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: score > 0 ? 'var(--green)' : score < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {score}
                  </div>
                  {isShortcutWin && <div style={{ fontSize: 9, color: 'var(--red)' }}>⚠ win</div>}
                </button>
              );
            })}
          </div>
          <div style={seqInfo}>
            {sequenceMoves.length > 0 && (
              <span>Sequence: {sequenceMoves.split('').map((c, i) => (
                <span key={i} style={{ color: i % 2 === 0 ? 'var(--text)' : 'var(--text-muted)' }}>{c}</span>
              ))}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn} onClick={handleMarkEnd} disabled={aiMoves.length === 0}>Mark End</button>
            <button style={resetBtn} onClick={handleReset}>Reset</button>
          </div>
        </>
      )}

      {finished && (
        <div>
          <div style={{ color: 'var(--green)', fontSize: 13, marginBottom: 8 }}>
            Sequence defined — AI moves: [{aiMoves.map(c => c + 1).join(', ')}]
          </div>
          <button style={resetBtn} onClick={handleReset}>Reset</button>
        </div>
      )}
    </div>
  );
}

const container = { padding: '12px 0', borderTop: '1px solid var(--border-dim)' };
const heading = { fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 };
const subtext = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 };
const turnIndicator = { fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 };
const colGrid = { display: 'flex', gap: 4, marginBottom: 8 };
const colBtn = { flex: 1, padding: '6px 4px', borderRadius: 6, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', minWidth: 0 };
const seqInfo = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, minHeight: 16 };
const btn = { padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const resetBtn = { padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
