import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { SetCard } from '../components/SetCard.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function SetPickerScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const handleUpgrade = useUpgradeCheckout();
  const isAuthenticated = !!session;
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetches = [
          fetch(`${API}/api/puzzles/counts`),
        ];
        if (isAuthenticated) {
          fetches.push(
            fetch(`${API}/api/user/challenge-progress`, {
              credentials: 'include',
              headers: { Authorization: `Bearer ${session.access_token}` },
            }),
          );
        }

        const results = await Promise.all(fetches);

        const countsData = await results[0].json();
        const allSets = countsData.sets || [];
        const allCounts = countsData.counts || {};
        // FR-002: hide sets where count === 0
        setSets(allSets.filter(s => (allCounts[s.slug] ?? 0) > 0));
        setCounts(allCounts);

        if (isAuthenticated && results[1]) {
          try {
            const progressData = await results[1].json();
            setProgressData(progressData);
          } catch (err) {
            console.error('Failed to fetch challenge progress', err);
            setProgressData(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch puzzle counts', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated, session?.access_token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('setpicker.title')}
        onBack={() => go('home')}
        onLogoClick={() => go('home')}
      />

      <div style={{ padding: '2px 18px 26px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <p style={{ fontWeight: 700, color: 'var(--ink-soft)', fontSize: 14.5, margin: '0 2px 2px', lineHeight: 1.4 }}>
          {t('setpicker.subtitle')}
        </p>
        {loading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-soft)',
            fontSize: 15,
            fontFamily: 'var(--font-body)',
          }}>
            {t('loading', 'Loading…')}
          </div>
        ) : (
          sets.map(set => (
            <SetCard
              key={set.slug}
              title={t(set.displayNameKey) ?? set.slug}
              stars={set.stars}
              positionCount={counts[set.slug] ?? 0}
              locked={!set.free}
              isAuthenticated={isAuthenticated}
              progress={progressData?.progress?.[set.slug]}
              onClick={
                set.free
                  ? () => go('challenge', { category: set.slug })
                  : () => setUpgradeOpen(true)
              }
            />
          ))
        )}
      </div>

      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => setUpgradeOpen(false)}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  );
}
