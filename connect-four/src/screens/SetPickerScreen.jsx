import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { SetCard } from '../components/SetCard.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function SetPickerScreen({ go, goBack }) {
  const { t } = useTranslation();
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API}/api/puzzles/counts`);
        const data = await res.json();
        const allSets = data.sets || [];
        const allCounts = data.counts || {};
        // FR-002: hide sets where count === 0
        setSets(allSets.filter(s => (allCounts[s.slug] ?? 0) > 0));
        setCounts(allCounts);
      } catch (err) {
        console.error('Failed to fetch puzzle counts', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('setpicker.title')}
        onBack={() => go('home')}
      />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
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
              title={set.displayName ?? set.slug}
              stars={set.stars}
              positionCount={counts[set.slug] ?? 0}
              locked={!set.free}
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
          onNotify={() => setUpgradeOpen(false)}
        />
      )}
    </div>
  );
}
