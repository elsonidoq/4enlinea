import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { AuthModal } from './AuthModal.jsx';
import { UpgradeModal } from './UpgradeModal.jsx';
import { Icon } from './Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function DeepRevealButton({
  moves,
  candidateCol,
  highlightCol,        // column to highlight after load; defaults to candidateCol
  onReveal,
  onHighlightMove,
  trackingContext,
  buttonLabel,
  feature = 'explain-move-llm',
}) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [deepReveal, setDeepReveal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');

  async function handleClick() {
    if (!session) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/explain-move-llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ movestring: moves, col: candidateCol }),
      });

      if (res.status === 403) { setShowAuth(true); return; }
      if (res.status === 429) {
        setShowPaywall(true);
        track('paywall_viewed', { trigger: 'quota_exceeded' });
        return;
      }
      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      if (data.explanation) {
        setDeepReveal(data);
        onReveal?.({ ...data, cached: data.cached ?? false });
        onHighlightMove?.(highlightCol ?? candidateCol); // auto-highlight the recommended column
        track('deep_reveal_viewed', {
          candidateCol,
          ...(trackingContext ? { context: trackingContext } : {}),
          cached: data.cached ?? false,
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleFlag() {
    if (flagged) return;
    setFlagged(true);
    setFlagOpen(false);
    try {
      const res = await fetch(`${API}/api/llm-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movestring: moves,
          col: candidateCol,
          llm_prompt: '',
          llm_response: deepReveal?.explanation || '',
          human_note: flagNote.trim(),
          feature,
        }),
      });
      if (!res.ok) {
        setFlagged(false); // revert on failure so user can retry
      }
    } catch {
      setFlagged(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 0', gap: 10,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2.5px solid #e2ddd2', borderTopColor: 'var(--disc-green, #2e9e57)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>
          {t('deepReveal.loading', 'Reading the position…')}
        </span>
      </div>
    );
  }

  if (deepReveal) {
    return (
      <div style={revealBox}>
        {/* Explanation with markdown */}
        <div style={{
          margin: '0 0 12px',
          fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6,
          color: 'var(--ink)',
        }}>
          <ReactMarkdown>{deepReveal.explanation}</ReactMarkdown>
        </div>

        {/* Best line chips */}
        {deepReveal.bestLine && deepReveal.bestLine.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
              letterSpacing: '1.2px', color: 'var(--ink-soft)', marginBottom: 7,
            }}>
              BEST LINE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {deepReveal.bestLine.map((col, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => {
                      const m = typeof col === 'string' && col.match(/^Col (\d+)$/);
                      onHighlightMove?.(m ? parseInt(m[1]) - 1 : col);
                    }}
                    style={{
                      background: 'var(--tag-bg, #f3f0ea)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      border: '1.5px solid transparent',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                      color: 'var(--ink)',
                      cursor: onHighlightMove ? 'pointer' : 'default',
                    }}
                  >
                    {col}
                  </button>
                  {i < deepReveal.bestLine.length - 1 && (
                    <Icon name="chevR" size={14} color="var(--ink-soft)" />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Flag section */}
        <div style={{ marginTop: 6 }}>
          {flagged ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
              }}>
                <Icon name="check" size={15} color="var(--eval-good,#16a34a)" />
                {t('sparring.explanationFlagged')}
              </span>
            </div>
          ) : flagOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                autoFocus
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                placeholder={t('deepReveal.flagNotePlaceholder', "What's wrong with this explanation? (optional)")}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  border: '1px solid var(--border-dim)', borderRadius: 8,
                  padding: '6px 8px', colorScheme: 'light',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setFlagOpen(false); setFlagNote(''); }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                  }}
                >
                  {t('deepReveal.flagCancel', 'Cancel')}
                </button>
                <button
                  onClick={handleFlag}
                  style={{
                    background: 'var(--eval-bad)', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 13, color: '#fff',
                    borderRadius: 6, padding: '4px 12px',
                  }}
                >
                  {t('deepReveal.flagSend', 'Send')}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setFlagOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                }}
              >
                <Icon name="flag" size={15} />
                {t('sparring.flagExplanation')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading} style={loading ? { ...btn, opacity: 0.6 } : btn}>
        {buttonLabel || t('puzzle.seeWhy')}
      </button>
      {showAuth && <AuthModal
        onClose={() => setShowAuth(false)}
        reason={t('auth.deepRevealGate')}
      />}
      {showPaywall && <UpgradeModal onDismiss={() => setShowPaywall(false)} onNotify={() => {}} />}
    </>
  );
}

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
  border: 'none',
  background: 'var(--disc-green, #2e9e57)',
  color: '#fff',
  fontFamily: 'inherit',
  marginTop: 8,
};

const revealBox = {
  padding: '14px 16px',
  background: '#fff',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border-dim, #e2ddd2)',
  borderLeft: '3px solid var(--teal)',
  marginTop: 8,
  colorScheme: 'light',
};
