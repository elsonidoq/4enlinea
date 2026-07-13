import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Icon } from '../components/Icon.jsx';
import { track } from '../lib/track.js';
import { ONBOARDING_GAME_PARAMS } from '../lib/onboardingRouting.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';

// Onboarding mission screen — shown once, before the first-run sparring game (anonymous
// first-run only). The coach is the messenger; three pillars mirror the app's three modes
// (learn -> practice -> review real games); a single CTA hands off to the coached game.
// Visual source of truth: docs/mvp/mockup/project/screens_onboarding.jsx (MissionScreen).
// Session-only screen: reached only via the App.jsx auto-route (go('onboardingMission')) or
// Navigator; NOT registered in urlMapping.js — matches the onboardingImportOffer pattern.

const MISSION_PILLARS = [
  { icon: 'grad',   tint: '#e3eefc',            ink: '#3b6fc4', titleKey: 'onboarding.mission.pillars.learn.title',    lineKey: 'onboarding.mission.pillars.learn.line' },
  { icon: 'swords', tint: '#e9e1fb',            ink: '#7a5bd0', titleKey: 'onboarding.mission.pillars.practice.title', lineKey: 'onboarding.mission.pillars.practice.line' },
  { icon: 'flag',   tint: 'var(--eval-mid-bg)', ink: '#b9760a', titleKey: 'onboarding.mission.pillars.mistakes.title', lineKey: 'onboarding.mission.pillars.mistakes.line' },
];

function PillarRow({ icon, tint, ink, title, line }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      background: 'var(--card)', borderRadius: 'var(--radius-sm)',
      padding: '14px 15px', boxShadow: 'var(--shadow-sm)', border: '1px solid #f0ebe1',
    }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: tint, color: ink }}>
        <Icon name={icon} size={24} color={ink} />
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16.5, color: 'var(--ink)', lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', lineHeight: 1.38, marginTop: 3 }}>{line}</span>
      </span>
    </div>
  );
}

export function OnboardingMissionScreen({ go }) {
  const { t } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);
  const { speakCoachMessage } = useCoachSpeech();

  // Fire the onboarding-start event once on mount. Guarded by a ref (not just empty deps) so
  // React 18 StrictMode's dev-only double-invoke of mount effects cannot double-fire it — same
  // pattern as OnboardingImportOfferScreen's marker/analytics write.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('onboarding_started', {});
    speakCoachMessage('coach.onboardingMission.greeting');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    track('onboarding_sparring_started', {});
    go('game', ONBOARDING_GAME_PARAMS);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        onLogoClick={() => go('home')}
        rightIcon="user"
        onRight={() => setAuthOpen(true)}
      />

      <div style={{ padding: '4px 22px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ margin: '0 -6px 4px' }}>
          <CoachDialog
            size={58}
            messages={[{
              lead: t('onboarding.mission.coachLead'),
              text: t('onboarding.mission.coachText'),
              mood: 'happy',
            }]}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14 }}>
          {MISSION_PILLARS.map((p) => (
            <PillarRow
              key={p.icon}
              icon={p.icon}
              tint={p.tint}
              ink={p.ink}
              title={t(p.titleKey)}
              line={t(p.lineKey)}
            />
          ))}
        </div>
      </div>

      <Toolbar>
        <button className="btn btn-primary" onClick={handleStart}>
          {t('onboarding.mission.cta')} <Icon name="play" size={16} color="#fff" />
        </button>
      </Toolbar>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
