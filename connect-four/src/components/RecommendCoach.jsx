import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';

const API = import.meta.env.VITE_API_BASE_URL || '';

// Inject expand-down keyframe once
let keyframeInjected = false;
function ensureKeyframe() {
  if (keyframeInjected) return;
  const style = document.createElement('style');
  style.textContent = '@keyframes expand-down { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }';
  document.head.appendChild(style);
  keyframeInjected = true;
}

export function RecommendCoach({ moves, gameOver, aiThinking, onBadgesChange }) {
  useEffect(() => { ensureKeyframe(); }, []);

  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(null);
  const [colRankings, setColRankings] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [flagStatus, setFlagStatus] = useState(null); // null | 'open' | 'submitting' | 'success' | 'error'
  const [flagNote, setFlagNote] = useState('');

  useEffect(() => {
    setText(null);
    setColRankings(null);
    setPrompt(null);
    setFlagStatus(null);
    onBadgesChange(null);
  }, [moves]);

  async function handleRecommend() {
    onBadgesChange(null);
    setLoading(true);
    setText(null);
    setColRankings(null);
    setPrompt(null);
    setFlagStatus(null);
    try {
      const res = await fetch(`${API}/api/recommend-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movestring: moves, rounds: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setText(data.recommendation);
      setColRankings(data.colRankings ?? null);
      setPrompt(data.prompt);
      onBadgesChange(data.colRankings ?? null);
    } catch {
      setText('Could not load recommendation.');
    } finally {
      setLoading(false);
    }
  }

  function handleFlagClick() {
    if (flagStatus === 'submitting' || flagStatus === 'success') return;
    setFlagNote('');
    setFlagStatus('open');
  }

  async function submitFlag() {
    setFlagStatus('submitting');
    try {
      const body = {
        movestring: moves,
        llm_prompt: prompt,
        llm_response: text,
        feature: 'recommend_next_move',
        human_note: flagNote || undefined,
      };
      await fetch(`${API}/api/llm-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setFlagStatus('success');
    } catch {
      setFlagStatus('error');
    }
  }

  const recommendDisabled = gameOver || loading || aiThinking;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={handleRecommend}
          disabled={recommendDisabled}
          style={{
            padding: '9px 16px',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            borderRadius: 24,
            color: recommendDisabled ? 'var(--text-muted)' : 'var(--text-sub)',
            fontSize: 12,
            fontWeight: 600,
            cursor: recommendDisabled ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'inherit',
            opacity: recommendDisabled ? 0.5 : 1,
          }}
        >
          {loading ? '…' : '✦ Recommend'}
        </button>
      </div>

      {text && (
        <div style={{
          marginTop: 10,
          border: '1px solid rgba(13,148,136,.25)',
          borderLeft: '3px solid var(--teal)',
          background: 'rgba(13,148,136,.07)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 14px',
          animation: 'expand-down 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              🧠 Coach
            </span>
            <button
              onClick={handleFlagClick}
              disabled={flagStatus === 'submitting' || flagStatus === 'success' || flagStatus === 'open'}
              style={{
                fontSize: 10,
                color: flagStatus === 'success' ? 'var(--green)' : flagStatus === 'error' ? 'var(--red)' : 'var(--text-muted)',
                background: 'transparent',
                border: '1px solid var(--border-dim)',
                borderRadius: 5,
                padding: '3px 7px',
                cursor: (flagStatus === 'submitting' || flagStatus === 'success' || flagStatus === 'open') ? 'default' : 'pointer',
                fontWeight: 500,
                fontFamily: 'inherit',
              }}
            >
              {flagStatus === 'success' ? '✓ Flagged' : flagStatus === 'error' ? '✗ Error' : '🚩 Flag'}
            </button>
          </div>

          {flagStatus === 'open' && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                autoFocus
                placeholder="What's wrong with this response? (optional)"
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: 12,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-sub)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setFlagStatus(null)}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid var(--border-dim)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitFlag}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid rgba(13,148,136,.4)', background: 'rgba(13,148,136,.1)',
                    color: 'var(--teal)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {colRankings && colRankings.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {colRankings.map(r => (
                <span
                  key={r.col}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    background: 'rgba(34,197,94,.12)',
                    color: 'var(--green)',
                    border: '1px solid rgba(34,197,94,.3)',
                  }}
                >
                  ★ Col {r.col + 1}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sub)' }}>
            <Markdown>{text}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
