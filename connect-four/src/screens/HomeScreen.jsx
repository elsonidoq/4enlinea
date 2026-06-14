import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { FeatureCard } from '../components/FeatureCard.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Icon } from '../components/Icon.jsx';
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
        title={<>Decode<span style={{ color: 'var(--disc-green)' }}>C4</span></>}
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
          onClick={() => go('pastGames')}
        />

        <CoachDialog messages={[{ text: t('coach.home.welcome.0'), mood: 'happy' }]} />

        <button
          className="btn btn-ghost"
          onClick={() => go('stats')}
          style={{ fontSize: 15 }}
        >
          <Icon name="chart" size={18} /> {t('home.stats_button')}
        </button>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
