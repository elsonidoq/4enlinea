import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { stashReturnTo } from '../lib/postLoginReturn.js';
import { setOfferShownMarker } from '../lib/onboardingOfferMarker.js';
import { createOnboardingSkipHandler } from '../lib/onboardingSkip.js';

// Epic 8 — Onboarding Experience, US3 (T032/T033/T038/T039).
//
// Optional, always-dismissible "import your real games" offer shown to every user regardless of
// whether they've indicated they play elsewhere online (FR-007). Reached from TWO entry paths:
//   1. Game-end (GameScreen.jsx saveGame(), T034) — the onboarding sparring game's natural end
//      (win/loss/draw/resign/abandon).
//   2. Home-fallback (HomeScreen.jsx, T036) — a user who engaged (onboarding_status === 'seen')
//      but left before the game's natural end, surfaced once on their next Home visit.
// Both paths land HERE. This screen OWNS the one-time `onboarding_offer_shown_v1` localStorage
// marker write (data-model.md "Storage location 1") — it is the SINGLE site in the app that
// writes it, on its own mount, regardless of which path got it here. HomeScreen's fallback check
// only ever READS the marker (see src/lib/onboardingOfferMarker.js) — this is what makes the
// cross-path guard hold: whichever path reaches this screen first sets the marker, so the offer
// never shows twice for the same onboarding pass.
//
// Registered in screenRegistry.jsx only (NOT urlMapping.js/SESSION_ONLY_SCREENS) — reached only
// via go()/goReplace(), matching the existing game/summary session-only-screen pattern
// (research.md R4).
//
// Accepting routes into the EXISTING authenticated Papergames import entry point (Settings'
// "Papergames Import" section, spec 038) — this feature does not rebuild that flow's mechanics.
// If the user isn't currently signed in, it composes with the existing sign-in flow via the same
// stashReturnTo()+AuthModal pattern HomeScreen already uses for its gated "Past games" card.
export function OnboardingImportOfferScreen({ go }) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const [authOpen, setAuthOpen] = useState(false);

  // Epic 8 — Onboarding Experience, US4 (T041/FR-009): skip control, unconditional on this
  // screen (every path that reaches it is already an onboarding pass). Differs from
  // handleDecline below by ADDITIONALLY writing onboarding_status: 'skipped' — decline leaves
  // 'seen' standing (correct, since seen already stands), skip explicitly opts out.
  const onboardingSkipHandlerRef = useRef(null);
  if (onboardingSkipHandlerRef.current === null) {
    onboardingSkipHandlerRef.current = createOnboardingSkipHandler({
      updateProfile: (patch) => store.updateProfile(patch),
      track,
      go,
    });
  }

  // Single mount-site write (T032): regardless of which path reached this screen, write the
  // marker + fire onboarding_finished exactly once. Guarded by a ref (not just the effect's
  // empty deps array) so React 18 StrictMode's dev-only double-invoke of mount effects can't
  // double-fire the marker write or the analytics event.
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setOfferShownMarker();
    track('onboarding_finished', {});
  }, []);

  function handleAccept() {
    track('onboarding_import_offer_accepted', {});
    if (session) {
      go('settings');
    } else {
      stashReturnTo('settings');
      setAuthOpen(true);
    }
  }

  function handleDecline() {
    track('onboarding_import_offer_declined', {});
    go('home');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar onLogoClick={() => go('home')} />

      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
        <div style={{
          background: 'var(--card)', borderRadius: 'var(--radius)', padding: '24px 20px',
          boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, margin: '0 auto',
            display: 'grid', placeItems: 'center', background: 'rgba(13,138,122,0.12)', color: '#0d8a7a',
          }}>
            <Icon name="clock" size={28} color="#0d8a7a" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: '4px 0 0', color: 'var(--ink)' }}>
            {t('onboarding.importOffer.title')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
            {t('onboarding.importOffer.subtitle')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={handleAccept} style={{ width: '100%' }}>
              {t('onboarding.importOffer.accept')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleDecline} style={{ width: '100%' }}>
              {t('onboarding.importOffer.decline')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onboardingSkipHandlerRef.current()} style={{ width: '100%', color: 'var(--ink-faint)' }}>
              {t('onboarding.skip')}
            </button>
          </div>
        </div>

        <CoachDialog messages={[{ text: t('onboarding.importOffer.coach'), mood: 'happy' }]} />
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} reason={t('onboarding.importOffer.signInReason')} />}
    </div>
  );
}
