import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SplitReveal } from './SplitReveal.jsx';
import { AnnotatedExplanation } from './AnnotatedExplanation.jsx';
import { AuthModal } from './AuthModal.jsx';
import { UpgradeModal } from './UpgradeModal.jsx';
import { Icon } from './Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { useCoachSpeech, speakDeepReveal, stopSpeech } from '../lib/useCoachSpeech.js';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';
import { subscribeCheckoutReturn } from '../lib/checkoutReturnFlow.js';
import { DEEP_REVEAL_SOFT_MS, DEEP_REVEAL_HARD_MS } from '../lib/deepRevealTimeout.js';
import { canRevealAnon, markRevealedAnon } from '../lib/anonDeepReveal.js';
import { langHeaders } from '../lib/apiLang.js';
import { describeQuota } from '../lib/deepRevealQuota.js';
import i18n from '../i18n/index.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Shared deep-reveal split-pane component.
 * Owns fetch, loading, error, flag, and auth/upgrade gate state.
 *
 * When speechEnabled is true, adds a TTS phase: after the LLM explanation arrives,
 * a TTS audio stream is fetched and the text is revealed at the moment audio
 * is ready to play (canplay event) so the coach "speaks" the explanation.
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
  navigate,
  noSpeech = false,
}) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const { speechEnabled } = useCoachSpeech();
  const handleUpgrade = useUpgradeCheckout();

  const [loading, setLoading] = useState(false);
  const [loadingTts, setLoadingTts] = useState(false);
  const [data, setData] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [slow, setSlow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUiState, setUpgradeUiState] = useState('idle');
  const [flagged, setFlagged] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  // Deep-reveal quota counter (Decision 1): count comes from a plain profile
  // refetch after each successful, non-cached reveal — never from the
  // /api/explain-move-llm response body itself (that would make the server's
  // D4 normalization dead code for this display).
  const [profile, setProfile] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quotaResetsAt, setQuotaResetsAt] = useState(null);

  async function refreshProfile() {
    try {
      const p = await store.getProfile();
      setProfile(p);
    } catch (_) {
      // Ignore — counter just won't render this time.
    }
  }

  // See SettingsScreen.jsx's identical subscription for the full rationale:
  // UpgradeModal's controlled uiState/onUiStateChange props had no caller, so
  // a real payment left the modal stuck on 'loading'. Reuses refreshProfile
  // (already called after every successful reveal) so profile.tier/quota
  // reflect Pro immediately, and clears quotaExceeded so the paywall banner
  // (line ~289) disappears. Scope note: this does NOT retry the deep-reveal
  // fetch that originally 429'd — the user still needs to reopen this pane to
  // see the actual reveal content, matching the existing anonRevealed/401
  // gates' behavior of requiring a fresh open rather than auto-retrying.
  useEffect(() => {
    let dismissTimer;
    const unsubscribe = subscribeCheckoutReturn((state) => {
      if (state === 'activated') {
        refreshProfile();
        setQuotaExceeded(false);
        setUpgradeUiState('success');
        dismissTimer = setTimeout(() => {
          setUpgradeOpen(false);
          setUpgradeUiState('idle');
        }, 1500);
      } else if (state === 'failed') {
        setUpgradeUiState('timeout');
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(dismissTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track TTS Audio element for cleanup
  const ttsAudioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setTimedOut(false);
      setSlow(false);
      setFlagged(false);
      setFlagOpen(false);
      setFlagNote('');
      setLoadingTts(false);
      setQuotaExceeded(false);
      setQuotaResetsAt(null);
      stopSpeech();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = '';
        ttsAudioRef.current = null;
      }
      return;
    }

    // Anonymous onboarding user: allow ONE free deep reveal (or re-opening that
    // same one). A second, different reveal opens the sign-up gate instead of
    // fetching. The server permits the anon call (rate-capped); this is the UX gate.
    if (!session?.user) {
      if (!canRevealAnon(`${moveString}:${col}`)) {
        setAuthOpen(true);
        return;
      }
    }

    // Stop any ongoing coach speech — deep-reveal replaces the evaluation context
    stopSpeech();

    setLoading(true);
    setLoadingTts(false);
    setData(null);
    setTimedOut(false);
    setFlagged(false);
    setFlagOpen(false);
    setFlagNote('');
    setQuotaExceeded(false);
    setQuotaResetsAt(null);
    refreshProfile();

    const controller = new AbortController();
    setSlow(false);
    const softId = setTimeout(() => setSlow(true), DEEP_REVEAL_SOFT_MS);
    const hardId = setTimeout(() => {
      controller.abort();
      setLoading(false);
      setLoadingTts(false);
      setTimedOut(true);
    }, DEEP_REVEAL_HARD_MS);

    fetch(`${API}/api/explain-move-llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...langHeaders() },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ movestring: moveString, col }),
    })
      .then(res => {
        clearTimeout(softId); clearTimeout(hardId);
        if (res.status === 401) { setLoading(false); setAuthOpen(true); return null; }
        if (res.status === 429) {
          setLoading(false);
          setQuotaExceeded(true);
          setUpgradeOpen(true);
          return res.json()
            .then(body => { setQuotaResetsAt(body?.resetsAt ?? null); return null; })
            .catch(() => null);
        }
        return res.json();
      })
      .then(async d => {
        if (!d) return;
        if (d && !session?.user) markRevealedAnon(`${moveString}:${col}`);
        setData(d);
        // Decision 1: refetch the profile after a successful reveal so the
        // counter reflects the server's authoritative post-decrement count.
        // A cache hit (d.cached) returns before the quota peek and does NOT
        // decrement — refetching still shows the correct, unchanged count.
        refreshProfile();

        // Phase 2: fetch TTS audio if speech is enabled
        if (speechEnabled && !noSpeech) {
          setLoadingTts(true);
          const ttsUrl = `${API}/api/user/tts/deep-reveal?moveString=${encodeURIComponent(moveString)}&col=${col}&lang=${encodeURIComponent(i18n.language || 'en')}`;
          const audio = new Audio(ttsUrl);
          ttsAudioRef.current = audio;

          let ttsOk = false;
          await new Promise((resolve) => {
            const ttsTimeout = setTimeout(() => resolve(), 5000);
            const onCanPlay = () => { ttsOk = true; clearTimeout(ttsTimeout); resolve(); };
            const onError = () => { clearTimeout(ttsTimeout); resolve(); };
            audio.addEventListener('canplay', onCanPlay, { once: true });
            audio.addEventListener('error', onError, { once: true });
          });

          if (ttsOk) {
            stopSpeech(); // Kill any ongoing coach message so deep-reveal TTS plays immediately
            speakDeepReveal(audio);
          } else {
            // TTS failed — clean up the audio element
            audio.src = '';
            ttsAudioRef.current = null;
          }
          setLoadingTts(false);
        }

        setLoading(false);
        onReveal?.(d);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        clearTimeout(softId); clearTimeout(hardId);
        setLoading(false);
        setLoadingTts(false);
        setTimedOut(true);
      });

    return () => {
      clearTimeout(softId); clearTimeout(hardId);
      controller.abort();
      stopSpeech();
      setSlow(false);
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = '';
        ttsAudioRef.current = null;
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onZhCellsChange?.([]);
    stopSpeech();
    if (ttsAudioRef.current) {
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
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

  const quota = describeQuota({
    signedIn: !!session?.user,
    tier: profile?.tier,
    count: profile?.deep_reveal_count,
    resetAt: profile?.deep_reveal_reset_at,
    limit: profile?.deep_reveal_limit,
  });

  const revealContent = (
    <>
      {(loading || loadingTts) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid #e2ddd2', borderTopColor: 'var(--disc-green)',
            animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
            {loadingTts
              ? t('deepReveal.preparingAudio', 'Preparing audio…')
              : loading && slow && !timedOut
                ? t('deepReveal.stillThinking', 'Still thinking… detailed explanations can take a few seconds on the first look.')
                : t('deepReveal.loading', 'Reading the position…')}
          </p>
        </div>
      )}

      {!loading && !loadingTts && timedOut && (
        <div style={{ padding: '8px 0' }}>
          {timeoutContent}
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('deepReveal.unavailable', 'Detailed explanation unavailable.')}
          </p>
        </div>
      )}

      {!loading && !loadingTts && !timedOut && !data && quotaExceeded && (
        <div style={{ padding: '8px 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('deepReveal.quotaUpgradeCta')}
          </p>
          {quotaResetsAt && (
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>
              {t('deepReveal.quotaResetsAt', { date: new Date(quotaResetsAt).toLocaleDateString(i18n.language) })}
            </p>
          )}
        </div>
      )}

      {!loading && !loadingTts && !timedOut && data && (
        <div>
          {headerContent}

          <div style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
            <AnnotatedExplanation
              text={data.explanation}
              termsMap={data.terms ?? {}}
              userMajorThreats={userMajorThreats}
              onHighlightsChange={onZhCellsChange}
              navigate={navigate}
            />
          </div>

          {quota.show && (
            <div style={{ margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>
                {t('deepReveal.quotaRemaining', { count: quota.remaining, limit: profile?.deep_reveal_limit ?? 20 })}
              </p>
              <button
                onClick={() => setUpgradeOpen(true)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                  color: 'var(--accent)', textDecoration: 'underline',
                }}
              >
                {t('deepReveal.quotaUpgradeCta')}
              </button>
            </div>
          )}

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
          reason={t('auth.deepRevealGate')}
        />
      )}
      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => { setUpgradeOpen(false); setUpgradeUiState('idle'); onClose?.(); }}
          onUpgrade={handleUpgrade}
          uiState={upgradeUiState}
          onUiStateChange={setUpgradeUiState}
        />
      )}
    </>
  );
}
