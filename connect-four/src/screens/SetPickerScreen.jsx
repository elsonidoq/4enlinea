import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { SetCard } from '../components/SetCard.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';
import { subscribeCheckoutReturn, resetCheckoutReturnState } from '../lib/checkoutReturnFlow.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// Anonymous progress is derived entirely from the LOCAL store — anon puzzle
// attempts are written to IndexedDB (IndexedDBStore#recordPuzzleAttempt) and
// never reach the server, so a server-side read for an anon caller always
// returns empty. `/api/puzzles` is public static puzzle metadata (id →
// category), not per-user state, so consulting it to bucket the local
// attempts by category is not a "server round trip for progress" in the
// sense this fix removes.
function buildLocalProgress(allCounts, puzzleCategoryMap, attempts) {
  const attemptedByCategory = {};
  const correctByCategory = {};
  for (const a of attempts) {
    const cat = puzzleCategoryMap[a.puzzle_id];
    if (!cat) continue;
    if (!attemptedByCategory[cat]) attemptedByCategory[cat] = new Set();
    if (!correctByCategory[cat]) correctByCategory[cat] = new Set();
    attemptedByCategory[cat].add(a.puzzle_id);
    if (a.first_attempt_correct) correctByCategory[cat].add(a.puzzle_id);
  }

  const progress = {};
  for (const slug of Object.keys(allCounts)) {
    const total = allCounts[slug] ?? 0;
    const attempted = attemptedByCategory[slug]?.size || 0;
    const correct = correctByCategory[slug]?.size || 0;
    const accuracy = attempted > 0 ? correct / attempted : 0;
    const cleared = correct >= total && total > 0;
    progress[slug] = { attempted, correct, total, accuracy, cleared };
  }
  return { progress };
}

export function SetPickerScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { session, store } = useStore();
  const handleUpgrade = useUpgradeCheckout();
  const isAuthenticated = !!session;
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUiState, setUpgradeUiState] = useState('idle');

  // See SettingsScreen.jsx's identical subscription for the full rationale:
  // UpgradeModal's controlled uiState/onUiStateChange props had no caller, so
  // a real payment left the modal stuck on 'loading' with no way to close.
  // This screen has no per-user tier state (its "locked" sets come from the
  // static CHALLENGE_SETS constant, not the account's tier), so there's
  // nothing else to refresh here — the modal itself now owns auto-dismissing
  // (with its slide-away animation) once 'success' renders.
  useEffect(() => {
    return subscribeCheckoutReturn((state) => {
      if (state === 'activated') {
        setUpgradeUiState('success');
        resetCheckoutReturnState();
      } else if (state === 'failed') {
        setUpgradeUiState('timeout');
        resetCheckoutReturnState();
      }
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetches = [
          fetch(`${API}/api/puzzles/counts`),
        ];
        let progressFetchIndex = null;
        if (isAuthenticated) {
          progressFetchIndex = fetches.length;
          fetches.push(
            fetch(`${API}/api/user/challenge-progress`, {
              credentials: 'include',
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

        if (isAuthenticated) {
          if (progressFetchIndex !== null && results[progressFetchIndex]) {
            try {
              const progressData = await results[progressFetchIndex].json();
              setProgressData(progressData);
            } catch (err) {
              console.error('Failed to fetch challenge progress', err);
              setProgressData(null);
            }
          }
        } else {
          // Anonymous: read progress from the local store (see
          // buildLocalProgress above) instead of the server.
          try {
            const [puzzlesRes, attempts] = await Promise.all([
              fetch(`${API}/api/puzzles`),
              store.getAllPuzzleAttempts(),
            ]);
            const puzzlesData = await puzzlesRes.json();
            const puzzleCategoryMap = {};
            for (const cat of puzzlesData.categories || []) {
              for (const p of cat.puzzles || []) {
                puzzleCategoryMap[p.id] = cat.id;
              }
            }
            setProgressData(buildLocalProgress(allCounts, puzzleCategoryMap, attempts));
          } catch (err) {
            console.error('Failed to compute local challenge progress', err);
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
  }, [isAuthenticated]);

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
          onDismiss={() => { setUpgradeOpen(false); setUpgradeUiState('idle'); }}
          onUpgrade={handleUpgrade}
          uiState={upgradeUiState}
          onUiStateChange={setUpgradeUiState}
        />
      )}
    </div>
  );
}
