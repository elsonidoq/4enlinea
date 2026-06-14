import { useState, useEffect } from 'react';
import { Board } from '../Board.jsx';
import { buildBoard } from '../../lib/board.js';

function authHeaders() {
  const sb = localStorage.getItem('supabase.auth.token');
  if (!sb) return {};
  try {
    const parsed = JSON.parse(sb);
    const token = parsed?.currentSession?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Modal that lists available puzzles from the selected category.
 *
 * Props:
 *   category: string           — puzzle category slug
 *   existingPuzzles: Array     — already-curated puzzles (to disable "Add")
 *   onAdd(puzzleData): void    — called when a puzzle is added
 *   onClose: () => void
 */
export default function PuzzlePickerModal({ category, existingPuzzles, onAdd, onClose }) {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    setError('');
    fetch(`/api/admin/puzzles?category=${encodeURIComponent(category)}`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Fetch failed'); });
        return r.json();
      })
      .then(data => setPuzzles(data.puzzles || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [category]);

  const alreadyAdded = new Set();
  if (existingPuzzles) {
    for (const p of existingPuzzles) {
      if (p.puzzleId) alreadyAdded.add(p.puzzleId);
      if (p.moveString) alreadyAdded.add(`ms:${p.moveString}`);
    }
  }

  function isAlreadyAdded(puzzle) {
    return alreadyAdded.has(puzzle.id) || alreadyAdded.has(`ms:${puzzle.move_string}`);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'grid', placeItems: 'center', zIndex: 999,
    }}>
      <div style={{
        background: '#1e1e1e', borderRadius: 12, padding: 24,
        maxWidth: 560, width: '90vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', color: '#fff',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Pick puzzles — {category}</h2>
          <button onClick={onClose} style={{
            padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            background: '#333', color: '#fff', border: 'none', fontSize: 16,
          }}>✕</button>
        </div>

        {/* Body */}
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading puzzles…</div>
        )}
        {error && (
          <div style={{ padding: 24, textAlign: 'center', color: '#f87171' }}>{error}</div>
        )}
        {!loading && !error && puzzles.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
            No puzzles found for this category.
          </div>
        )}
        {!loading && !error && puzzles.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {puzzles.map(puzzle => {
              const added = isAlreadyAdded(puzzle);
              const { board } = buildBoard(puzzle.move_string || '');
              return (
                <div key={puzzle.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: added ? '#1a2e1a' : '#2a2a2a',
                  borderRadius: 8, padding: '10px 12px',
                  border: added ? '1px solid #228245' : '1px solid #333',
                  opacity: added ? 0.6 : 1,
                }}>
                  {/* Mini board */}
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <Board board={board} canPlay={false} compact />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {puzzle.goal_prompt || puzzle.goal_predicate_type || category}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {puzzle.move_string} · col {puzzle.correct_col}
                    </div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ID: {puzzle.id}
                    </div>
                  </div>
                  {/* Add button */}
                  <button
                    onClick={() => onAdd(puzzle)}
                    disabled={added}
                    style={{
                      padding: '6px 14px', borderRadius: 6, cursor: added ? 'not-allowed' : 'pointer',
                      background: added ? '#333' : '#166534', color: '#fff', fontWeight: 700,
                      border: 'none', fontSize: 13, whiteSpace: 'nowrap',
                    }}
                  >
                    {added ? 'Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
