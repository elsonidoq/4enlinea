import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { FeatureCard } from '../components/FeatureCard.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { LegalFooter } from '../components/LegalFooter.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { stashReturnTo } from '../lib/postLoginReturn.js';
import { isOfferShownMarkerSet, shouldShowHomeFallbackOffer } from '../lib/onboardingOfferMarker.js';

export function HomeScreen({ go }) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const [authOpen, setAuthOpen] = useState(false);

  // Epic 8 — Onboarding Experience, US3 (T036, FR-007 Scenario 5, research.md R5).
  // READ-ONLY fallback check: a user who engaged (onboarding_status === 'seen') but left before
  // the onboarding game's natural end never got routed to the import offer via GameScreen's
  // saveGame() (T034). This effect surfaces it once, on the next Home visit, by reading the
  // localStorage marker — it must NEVER write the marker itself; OnboardingImportOfferScreen's
  // own mount (T032) owns that single write site, which both this path and the game-end path
  // funnel through (this is what makes the cross-path guard hold — see onboardingOfferMarker.js).
  const fallbackCheckedRef = useRef(false);
  useEffect(() => {
    if (fallbackCheckedRef.current) return;
    fallbackCheckedRef.current = true;
    (async () => {
      let profile;
      try {
        profile = await store.getProfile();
      } catch {
        return;
      }
      if (shouldShowHomeFallbackOffer({
        onboardingStatus: profile?.onboarding_status,
        offerShown: isOfferShownMarkerSet(),
      })) {
        go('onboardingImportOffer');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProfile() {
    if (session) {
      go('stats');
    } else {
      setAuthOpen(true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        onLogoClick={() => go('home')}
        right2="gear"
        // Epic 8 — Onboarding Experience, US4 (T043/FR-010, SC-004): navigate to Settings
        // regardless of auth state — SettingsScreen already renders a graceful unauthenticated
        // view, and "Replay intro" must be reachable from Home in <=2 nav actions for anonymous
        // users too (onboarding's auto-route is anonymous-only, so skipped users are frequently
        // anonymous). Previously this gated anonymous taps behind AuthModal, which made Settings
        // (and therefore Replay intro) unreachable without signing in first.
        onRight2={() => go('settings')}
        rightIcon="user"
        onRight={handleProfile}
      />

      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <p style={{ fontWeight: 700, color: 'var(--ink-soft)', fontSize: 15, margin: '0 2px 4px', lineHeight: 1.4 }}>
          {t('home.tagline_prefix')}
          <span style={{ color: 'var(--disc-green)' }}>{t('home.tagline_why')}</span>
          {t('home.tagline_suffix')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FeatureCard
            title={t('home.lessons_title')}
            subtitle={t('home.lessons_subtitle')}
            background="linear-gradient(170deg,#fff,#f3f8ff)"
            icon={<Icon name="grad" size={28} color="#3b6fc4" />}
            iconBg="#e3eefc"
            iconColor="#3b6fc4"
            onClick={() => go('saga')}
          />
          <FeatureCard
            title={t('home.challenges_title')}
            subtitle={t('home.challenges_subtitle')}
            background="linear-gradient(170deg,#fff,#fff3e8)"
            icon={<Icon name="target" size={28} color="#d6892a" />}
            iconBg="#fce6cf"
            iconColor="#d6892a"
            onClick={() => go('setpicker')}
          />
        </div>

        <FeatureCard
          title={t('home.sparring_title')}
          subtitle={t('home.sparring_subtitle')}
          background="linear-gradient(170deg,#fff,#f4f0fd)"
          icon={<Icon name="swords" size={28} color="#7a5bd0" />}
          iconBg="#e9e1fb"
          iconColor="#7a5bd0"
          onClick={() => go('difficulty')}
          wide
        />

        <FeatureCard
          icon={<Icon name="clock" size={28} color="#0d8a7a" />}
          iconBg="rgba(13,138,122,0.12)"
          iconColor="#0d8a7a"
          background="var(--card)"
          title={t('home.past_games.title')}
          subtitle={t('home.past_games.subtitle')}
          wide
          onClick={() => {
            if (session) {
              go('pastGames');
            } else {
              stashReturnTo('pastGames');
              setAuthOpen(true);
            }
          }}
        />

        {/* Home's welcome line is deliberately UNVOICED (2026-08-04) — hence `coach.ui.*`, not
            `coach.spoken.*`. See docs/architecture/coach-audio-conventions.md. */}
        <CoachDialog messages={[{ text: t('coach.ui.homeWelcome'), mood: 'happy' }]} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() => go('stats')}
            style={{ fontSize: 15 }}
          >
            <Icon name="chart" size={18} /> {t('home.stats_button')}
          </button>
        </div>
      </div>

      <LegalFooter go={go} />

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
