import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { track } from '../lib/track.js';
import { CATEGORY_ORDER, CATEGORY_NAMES, PAID_CATEGORIES } from '../lib/categories.js';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';
import { subscribeCheckoutReturn, resetCheckoutReturnState } from '../lib/checkoutReturnFlow.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';
import { getEntitlement } from '../lib/entitlement.js';
import { savePendingSetResults, readAndClearPendingSetResults } from '../lib/pendingSetResults.js';

export function PostSetSummaryScreen({ go, results: resultsProp = [], category: categoryProp }) {
  const { t } = useTranslation();
  const { speakCoachMessage } = useCoachSpeech();
  // /summary is a SESSION_ONLY screen (its `results` prop can't survive a cold
  // boot/reload), so return the user to Challenges instead — the same place
  // this screen's back/ghost buttons go — whenever the sessionStorage restore
  // below (T060) doesn't apply.
  const startUpgradeCheckout = useUpgradeCheckout('/setpicker');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUiState, setUpgradeUiState] = useState('idle');
  const [isFreeUser, setIsFreeUser] = useState(true);

  // T059/T060 (spec 053 US5, FR-029/FR-030, OI-25): restore results persisted by
  // savePendingSetResults() (T058) before a purchase, so returning from checkout — including
  // after a genuine app restart — shows the same set the player just finished instead of
  // dropping them elsewhere. CHOSEN CARRIER: plain self-validating sessionStorage (freshness
  // timestamp), no dependency on checkoutReturnFlow.js or the checkout returnPath — see
  // src/lib/pendingSetResults.js's header comment for the full investigation record of why the
  // returnPath/nonce carrier was rejected (nothing in this app ever navigates to a Paddle return
  // URL, so it would never be read). Missing/invalid/expired entry -> `restored` stays null and
  // this screen falls through unchanged to its normal in-memory `resultsProp`/`categoryProp`
  // (which is empty/undefined on a real cold boot, matching the existing '/setpicker' fallback,
  // FR-031).
  // Lazy useState initializer (not a useEffect) so the read+clear happens synchronously at
  // mount, before first paint — same established pattern as this file's `perfectKey` below.
  // A useEffect here would call setState synchronously inside the effect body purely to store
  // a value already available at first render, which is exactly what the react-hooks
  // set-state-in-effect lint rule flags.
  const [restored] = useState(() => readAndClearPendingSetResults());
  const results = restored?.results ?? resultsProp;
  const category = restored?.category ?? categoryProp;

  function handleUpgrade(plan) {
    // T058: persist before opening the Paddle overlay so a purchase started from here can be
    // restored on return, cold boot included.
    savePendingSetResults({ results, category });
    return startUpgradeCheckout(plan);
  }

  // See SettingsScreen.jsx's identical subscription for the full rationale:
  // UpgradeModal's controlled uiState/onUiStateChange props had no caller, so
  // a real payment left the modal stuck on 'loading' and this screen's
  // isFreeUser (fetched once above) never refreshed. The modal itself now
  // owns auto-dismissing (with its slide-away animation) once 'success'
  // renders.
  useEffect(() => {
    return subscribeCheckoutReturn((state) => {
      if (state === 'activated') {
        setIsFreeUser(false);
        setUpgradeUiState('success');
        resetCheckoutReturnState();
      } else if (state === 'failed') {
        setUpgradeUiState('timeout');
        resetCheckoutReturnState();
      }
    });
  }, []);

  // Compute derived stats
  const total = results.length;
  const optimalCount = results.filter(r => r.quality === 'optimal').length;
  const blunderCount = results.filter(r => r.quality === 'blunder').length;
  const accuracy = total > 0 ? Math.round((optimalCount / total) * 100) : 0;

  // byPattern: { [slug]: { optimal, total } }
  const byPattern = {};
  for (const r of results) {
    const slug = r.category ?? category;
    if (!byPattern[slug]) byPattern[slug] = { optimal: 0, total: 0 };
    byPattern[slug].total++;
    if (r.quality === 'optimal') byPattern[slug].optimal++;
  }
  const patternSlugs = Object.keys(byPattern);

  // Recommended lesson: lowest accuracy pattern, tie-break by earliest CATEGORY_ORDER index
  const recommendedSlug = patternSlugs
    .filter(s => byPattern[s].total > 0)
    .sort((a, b) => {
      const accA = byPattern[a].optimal / byPattern[a].total;
      const accB = byPattern[b].optimal / byPattern[b].total;
      if (accA !== accB) return accA - accB;
      return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
    })[0] ?? null;

  const isPerfect = accuracy === 100;
  const isProLesson = recommendedSlug != null && PAID_CATEGORIES.has(recommendedSlug);

  // Async: check if user is free tier via the single client-side entitlement
  // helper (spec 053 US2/T023) — not a cached profile.tier read. See
  // docs/architecture/frontend-conventions.md "Reading the user's tier".
  // getEntitlement() never rejects (fail-open, FR-013), so no catch needed.
  useEffect(() => {
    let cancelled = false;
    getEntitlement().then(({ entitled }) => {
      if (cancelled) return;
      setIsFreeUser(!entitled);
    });
    return () => { cancelled = true; };
  }, []);

  // Fire analytics on mount
  useEffect(() => {
    track('set_completed', { category, accuracy, optimalCount, blunderCount, byPattern });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCTA() {
    if (isPerfect) {
      go('setpicker');
    } else if (isProLesson && isFreeUser) {
      setUpgradeOpen(true);
    } else {
      go('saga', { highlightSlug: recommendedSlug });
    }
  }

  const lessonName = CATEGORY_NAMES[recommendedSlug] ?? recommendedSlug ?? '';
  const ctaLabel = isPerfect
    ? t('summary.cta_back', 'Back to Challenges')
    : t('summary.cta_lesson', 'Go to {{lessonName}} lesson', { lessonName });

  // Coach message. The perfect-set key is frozen on first render (useState initializer) so the
  // rendered text and the spoken clip below are the same line — a bare Math.random() in the render
  // body re-rolls on every re-render and could not be matched by a play call.
  const [perfectKey] = useState(() => `coach.spoken.summary.perfect.${Math.floor(Math.random() * 2)}`);
  const coachText = isPerfect
    ? t(perfectKey, 'Perfect set.')
    : t('summary.coach_recommend', 'Work on {{pattern}} next.', { pattern: lessonName });

  // `coach.spoken.summary.perfect.*` declares intent to be voiced but had no play site (see
  // docs/architecture/coach-audio-conventions.md). StrictMode-guarded, mirroring HomeScreen.
  const spokeRef = useRef(false);
  useEffect(() => {
    if (!isPerfect || spokeRef.current) return;
    spokeRef.current = true;
    speakCoachMessage(perfectKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPerfect]);

  return (
    <div style={{
      // unit-only change: this screen has no bottom-pinned Toolbar (its CTA
      // lives inside the existing scroll region below), so a pinned-root +
      // scroller treatment isn't needed here — the old fixed-viewport unit is
      // simply swapped for the dynamic one. Characterized 2026-08-04 at
      // 390x664: naturalContentH 628 fits; at 360x600 the content scrolls
      // (page-level) to reach the trailing "Back to Challenges" button, same
      // as before this change.
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: 'var(--bg-chal)',
    }}>
      <TopBar onBack={() => go('setpicker')} onLogoClick={() => go('home')} />

      <div style={{ padding: '0 22px 24px', flex: 1, overflowY: 'auto' }}>
        {/* Hero — always shows green check + "Set complete!" */}
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--eval-good-bg, #dcfce7)',
            display: 'grid', placeItems: 'center',
            margin: '0 auto 10px',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--eval-good, #16a34a)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26,
            color: 'var(--ink)',
          }}>
            {t('summary.hero', 'Set complete!')}
          </h2>
        </div>

        {/* Accuracy card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: 20,
          boxShadow: 'var(--shadow-sm)', marginTop: 16,
        }}>
          {/* Counts + percentage */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>
              {t('summary.count', '{{optimalCount}} / {{total}} optimal', { optimalCount, total })}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--disc-green)' }}>
              {accuracy}%
            </span>
          </div>
          <ProgressBar value={optimalCount} max={total} />

          {/* BY PATTERN breakdown */}
          {patternSlugs.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--line)', margin: '16px 0 4px' }} />
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
                letterSpacing: '1.2px', color: 'var(--ink-soft)', margin: '8px 0 4px',
                textTransform: 'uppercase',
              }}>
                {t('summary.by_pattern', 'BY PATTERN')}
              </div>
              {patternSlugs.map(slug => {
                const { optimal: o, total: tot } = byPattern[slug];
                const acc = tot > 0 ? o / tot : 0;
                const dotColor = acc >= 0.8 ? 'var(--eval-good, #16a34a)' : acc >= 0.5 ? 'var(--eval-mid, #ca8a04)' : 'var(--eval-bad, #dc2626)';
                return (
                  <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                      {t(`challengeSet.${slug}.displayName`, CATEGORY_NAMES[slug] ?? slug)}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: dotColor }}>
                      {o} / {tot}
                    </span>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: dotColor, flexShrink: 0,
                    }} />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Coach recommendation */}
        <div style={{ marginTop: 16 }}>
          <CoachDialog
            size={50}
            messages={[{ text: coachText, mood: isPerfect ? 'happy' : 'think' }]}
          />
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleCTA}
          style={{
            marginTop: 14, width: '100%', padding: '14px 22px',
            borderRadius: 16, border: 'none',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            cursor: 'pointer',
            background: 'var(--disc-green)', color: '#fff',
            boxShadow: '0 6px 0 #228245',
          }}
        >
          {ctaLabel}
        </button>

        {/* Ghost "Back to Challenges" — always present (even on perfect sets, below the primary) */}
        {!isPerfect && (
          <button
            onClick={() => go('setpicker')}
            style={{
              marginTop: 9, width: '100%', padding: '12px 22px',
              borderRadius: 16, border: '1.5px solid var(--line)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', background: 'transparent', color: 'var(--ink)',
            }}
          >
            {t('summary.cta_back', 'Back to Challenges')}
          </button>
        )}
      </div>

      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => { setUpgradeOpen(false); setUpgradeUiState('idle'); }}
          onUpgrade={handleUpgrade}
          uiState={upgradeUiState}
          onUiStateChange={setUpgradeUiState}
        />
      )}
    </div>
  );
}
