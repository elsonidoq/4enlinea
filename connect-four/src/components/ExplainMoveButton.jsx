import { useState } from 'react';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * "See why" button for the post-move reveal section in commit-first sparring mode.
 *
 * Calls POST /api/explain-move-llm with the pre-move movestring and the column
 * played, then displays a grounded LLM explanation of why that specific move
 * was strong or weak. Includes a flag button so users can report bad responses.
 *
 * Props:
 *   moves  — movestring BEFORE the player's move was committed (0-indexed digits)
 *   col    — 0-indexed column the player played
 */
export function ExplainMoveButton({ moves, col }) {
  const { t } = useTranslation();
  const [loading, setLoading]         = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [prompt, setPrompt]           = useState(null);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagNote, setFlagNote]       = useState('');
  const [flagStatus, setFlagStatus]   = useState(null); // null | 'submitting' | 'success' | 'error'

  async function handleExplain() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/explain-move-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: moves, col, rounds: 1 }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        setPrompt(data.prompt);
        track('explain_move_viewed', { movesLength: moves.length, col });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleFlag() {
    setFlagStatus('submitting');
    try {
      const res = await fetch(`${API}/api/llm-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movestring: moves,
          llm_prompt: prompt,
          llm_response: explanation,
          human_note: flagNote,
          feature: 'explain_move_llm',
        }),
      });
      if (!res.ok) throw new Error('failed');
      setFlagStatus('success');
      setTimeout(() => {
        setShowFlagForm(false);
        setFlagNote('');
        setFlagStatus(null);
      }, 2000);
    } catch {
      setFlagStatus('error');
    }
  }

  if (explanation) {
    return (
      <div style={revealBox}>
        <div style={revealLabel}>Move explanation</div>
        <div style={revealText}><Markdown>{explanation}</Markdown></div>

        {!showFlagForm && flagStatus !== 'success' && (
          <button
            onClick={() => setShowFlagForm(true)}
            style={flagBtn}
            title="Flag this response as inaccurate"
          >
            🚩 Flag
          </button>
        )}

        {showFlagForm && flagStatus !== 'success' && (
          <div style={flagForm}>
            <textarea
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              placeholder="What was wrong with this response?"
              style={flagTextarea}
              rows={3}
            />
            <div style={flagActions}>
              <button
                onClick={handleFlag}
                disabled={flagStatus === 'submitting' || flagNote.trim() === ''}
                style={flagSubmitBtn}
              >
                {flagStatus === 'submitting' ? '…' : 'Submit'}
              </button>
              <button
                onClick={() => { setShowFlagForm(false); setFlagNote(''); setFlagStatus(null); }}
                style={flagCancelBtn}
              >
                Cancel
              </button>
            </div>
            {flagStatus === 'error' && (
              <div style={flagError}>Something went wrong — please try again.</div>
            )}
          </div>
        )}

        {flagStatus === 'success' && (
          <div style={flagSuccess}>✓ Thanks for the feedback</div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleExplain}
      disabled={loading}
      style={loading ? { ...btn, opacity: 0.6 } : btn}
    >
      {loading ? '…' : `✦ ${t('puzzle.seeWhy')}`}
    </button>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const btn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'inherit',
  marginTop: 8,
};

const revealBox = {
  padding: '12px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--teal)',
  marginTop: 8,
};

const revealLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--teal)',
  marginBottom: 5,
};

const revealText = {
  margin: '0 0 10px',
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--text)',
};

const flagBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 11,
  cursor: 'pointer',
  padding: '2px 0',
  fontFamily: 'inherit',
};

const flagForm = {
  marginTop: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const flagTextarea = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'inherit',
  resize: 'vertical',
};

const flagActions = {
  display: 'flex',
  gap: 6,
};

const flagSubmitBtn = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const flagCancelBtn = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const flagError = {
  fontSize: 11,
  color: 'var(--red)',
  marginTop: 2,
};

const flagSuccess = {
  fontSize: 11,
  color: 'var(--green)',
  marginTop: 4,
};
