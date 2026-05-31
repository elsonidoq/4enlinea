import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { FeatureCard } from '../components/FeatureCard.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';

export function HomeScreen({ go }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [authOpen, setAuthOpen] = useState(false);

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
        title="DecodeC4"
        rightIcon="user"
        onRight={handleProfile}
      />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FeatureCard
            title={t('home.lessons_title')}
            subtitle={t('home.lessons_subtitle')}
            onClick={() => go('saga')}
          />
          <FeatureCard
            title={t('home.challenges_title')}
            subtitle={t('home.challenges_subtitle')}
            onClick={() => go('setpicker')}
          />
        </div>

        <FeatureCard
          title={t('home.sparring_title')}
          subtitle={t('home.sparring_subtitle')}
          onClick={() => go('difficulty')}
          wide
        />

        <CoachDialog messages={[{ text: t('coach.home.welcome.0'), mood: 'happy' }]} />

        <button
          onClick={() => go('stats')}
          style={{
            background: 'transparent',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 'var(--radius)',
            padding: '13px 20px',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--ink)',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {t('home.stats_button')}
        </button>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
