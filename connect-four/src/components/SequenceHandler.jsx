import { useState } from 'react';
import { Board } from './Board.jsx';
import { useStore } from '../store/ProfileStore.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';
const COLS = 7;
const ROWS = 6;

function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return { board, heights };
}

export function SequenceHandler({ puzzle, onNext }) {
  const { session } = useStore();
  const [currentPosition, setCurrentPosition] = useState(puzzle.moveString);
  const [status, setStatus] = useState('idle'); // idle | thinking | success | fail
  const [failReason, setFailReason] = useState(null);

  const { board, heights } = buildBoard(currentPosition);
  const canPlay = status === 'idle' || status === 'fail';

  async function handleColumnClick(col) {
    if (status === 'thinking' || status === 'success') return;

    setStatus('thinking');
    setFailReason(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };

    try {
      const res = await fetch(`${API}/api/puzzles/${puzzle.id}/sequence/move`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ position: currentPosition, col }),
      });
      const data = await res.json();

      if (data.outcome === 'success') {
        setCurrentPosition(prev => prev + String(col + 1));
        setStatus('success');
      } else if (data.outcome === 'continue') {
        // Append learner's move + AI's block (both 1-indexed)
        setCurrentPosition(prev => prev + String(col + 1) + String(data.aiCol + 1));
        setStatus('idle');
      } else {
        setStatus('fail');
        setFailReason(data.reason ?? 'Not a forcing move.');
      }
    } catch {
      setStatus('fail');
      setFailReason('Network error — please try again.');
    }
  }

  function handleReset() {
    setCurrentPosition(puzzle.moveString);
    setStatus('idle');
    setFailReason(null);
  }

  return (
    <div>
      <div style={{ padding: '8px 20px 10px' }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--text)' }}>
          {puzzle.goalPrompt}
        </div>
        {status === 'thinking' && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Thinking…</div>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        <Board
          board={board}
          onColumnClick={handleColumnClick}
          canPlay={canPlay}
          highlightedCells={[]}
        />
      </div>

      {status === 'fail' && failReason && (
        <div style={{
          margin: '10px 16px',
          padding: '12px 14px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--red)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 5 }}>
            Not a forcing move
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{failReason}</div>
        </div>
      )}

      {status === 'success' && (
        <div style={{
          margin: '10px 16px',
          padding: '12px 14px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--green)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 5 }}>
            Double threat created!
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
            You forced the win — the opponent cannot stop both threats.
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        {status !== 'success' && (
          <button onClick={handleReset} style={btnSecondary}>
            Reset
          </button>
        )}
        {status === 'success' && onNext && (
          <button onClick={onNext} style={btnPrimary}>
            Next puzzle →
          </button>
        )}
      </div>
    </div>
  );
}

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
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

const btnSecondary = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'inherit',
};
