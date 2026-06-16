import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SplitReveal } from './SplitReveal.jsx';
import { AnnotatedExplanation } from './AnnotatedExplanation.jsx';
import { AuthModal } from './AuthModal.jsx';
import { UpgradeModal } from './UpgradeModal.jsx';
import { Icon } from './Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Shared deep-reveal split-pane component.
 * Owns fetch, loading, error, flag, and auth/upgrade gate state.
 *
 * Props:
 *   isOpen           - boolean
 *   onClose          - () => void
 *   boardContent     - ReactNode (top pane)
 *   moveString       - string (position to explain)
 *   col              - number (column played)
 *   feature          - string (for /api/llm-feedback, default 'explain-move-llm')
 *   onReveal         - optional (data) => void called when data loads
 *   onZhCellsChange  - optional (cells) => void for board zone highlights
 *   userMajorThreats - optional Array<{c, r}>
 *   headerContent    - optional ReactNode rendered above explanation text
 *   timeoutContent   - optional ReactNode rendered in timeout state
 *   closeLabel       - optional string
 */
export function DeepRevealPane({
  isOpen,
  onClose,
  boardContent,
  moveString,
  col,
  feature = 'explain-move-llm',
  onReveal,
  onZhCellsChange,
  userMajorThreats = [],
  headerContent,
  timeoutContent,
  closeLabel,
}) {
  const { t } = useTranslation();
  const { session } = useStore();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setTimedOut(false);
      setFlagged(false);
      setFlagOpen(false);
      setFlagNote('');
      return;
    }

    if (!session?.access_token) {
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    setData(null);
    setTimedOut(false);
    setFlagged(false);
    setFlagOpen(false);
    setFlagNote('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, 6000);

    fetch(`${API}/api/explain-move-llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ movestring: moveString, col }),
    })
      .then(res => {
        clearTimeout(timeoutId);
        if (res.status === 401) { setLoading(false); setAuthOpen(true); return null; }
        if (res.status === 429) { setLoading(false); setUpgradeOpen(true); return null; }
        return res.json();
      })
      .then(d => {
        if (!d) return;
        setData(d);
        setLoading(false);
        onReveal?.(d);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        clearTimeout(timeoutId);
        setLoading(false);
        setTimedOut(true);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onZhCellsChange?.([]);
    onClose?.();
  }

  async function handleFlag(note = '') {
    if (flagged) return;
    setFlagged(true);
    setFlagOpen(false);
    fetch(`${API}/api/llm-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movestring: moveString,
        col,
        llm_prompt: data?.prompt ?? '',
        llm_response: data?.explanation ?? '',
        human_note: note,
        feature,
      }),
    }).catch(() => {});
  }

  const revealContent = (
    <>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid #e2ddd2', borderTopColor: 'var(--disc-green)',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('deepReveal.loading', 'Reading the position…')}
          </p>
        </div>
      )}

      {!loading && timedOut && (
        <div style={{ padding: '8px 0' }}>
          {timeoutContent}
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('deepReveal.unavailable', 'Detailed explanation unavailable.')}
          </p>
        </div>
      )}

      {!loading && !timedOut && data && (
        <div>
          {headerContent}

          <div style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
            <AnnotatedExplanation
              text={data.explanation}
              userMajorThreats={userMajorThreats}
              onHighlightsChange={onZhCellsChange}
            />
          </div>

          <div style={{ marginTop: 6 }}>
            {flagged ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                }}>
                  <Icon name="check" size={15} color="var(--eval-good,#16a34a)" />
                  {t('deepReveal.flagged', 'Thanks — flagged')}
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
                    border: '1px solid var(--line)', borderRadius: 8,
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
                    onClick={() => handleFlag(flagNote.trim())}
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
                  {t('deepReveal.flag', 'Flag this explanation')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <SplitReveal
        isOpen={isOpen}
        onClose={handleClose}
        closeLabel={closeLabel ?? t('common.collapse', 'Collapse')}
        boardContent={boardContent}
        revealContent={revealContent}
      />
      {authOpen && (
        <AuthModal
          onClose={() => { setAuthOpen(false); onClose?.(); }}
          reason="deep_reveal"
        />
      )}
      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => { setUpgradeOpen(false); onClose?.(); }}
          onNotify={() => { setUpgradeOpen(false); onClose?.(); }}
        />
      )}
    </>
  );
}
