import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { useStore } from '../store/ProfileStore.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

function barColor(pct) {
  if (pct >= 75) return 'var(--eval-good)';
  if (pct >= 50) return 'var(--eval-mid)';
  return 'var(--eval-bad)';
}

export function StatsScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { store, session, signOut } = useStore();
  const isAuthenticated = !!session;

  const [accuracy, setAccuracy] = useState('--');
  const [lessonsCount, setLessonsCount] = useState(0);
  const [sparringRecord, setSparringRecord] = useState({ W: 0, L: 0, D: 0 });
  const [streak, setStreak] = useState(0);
  const [patternAccuracy, setPatternAccuracy] = useState(null);
  const [recommendedLesson, setRecommendedLesson] = useState(null);

  useEffect(() => {
    if (!store) return;
    if (store.getStats) {
      // Authenticated: pull live stats aggregated from puzzle_attempts on the server
      store.getStats()
        .then(s => {
          if (!s) return;
          if (s.accuracy != null) setAccuracy(`${s.accuracy}%`);
          if (s.byPattern && Object.keys(s.byPattern).length > 0) setPatternAccuracy(s.byPattern);
        })
        .catch(() => {});
    } else {
      // Anonymous: fall back to last saved challenge session in IndexedDB
      store.getLastChallengeSession?.()
        ?.then(s => { if (s?.accuracy != null) setAccuracy(`${Math.round(s.accuracy)}%`); })
        .catch(() => {});
    }
  }, [store]);

  useEffect(() => {
    store?.getLessonProgress?.()
      ?.then(list => { if (list) setLessonsCount(list.filter(s => s.status === 'complete').length); })
      .catch(() => {}); // store method absent until Epic 7
  }, [store]);

  useEffect(() => {
    store?.getSparringRecord?.()
      ?.then(r => { if (r) setSparringRecord(r); })
      .catch(() => {}); // store method absent until Epic 7
  }, [store]);

  useEffect(() => {
    store?.getStreak?.()
      ?.then(s => { if (s?.streak_count != null) setStreak(s.streak_count); })
      .catch(() => {}); // store method absent until Epic 7
  }, [store]);

  useEffect(() => {
    if (!isAuthenticated || !patternAccuracy) return;
    fetch(`${API}/api/lessons`)
      .then(r => r.ok ? r.json() : null)
      .then(lessons => {
        if (!lessons || !lessons.length) return;
        const entries = Object.entries(patternAccuracy);
        if (!entries.length) return;
        // byPattern values are { accuracy, attempted } objects
        entries.sort((a, b) => a[1].accuracy - b[1].accuracy);
        const worstPattern = entries[0][0];
        const match = lessons
          .filter(l => l.pattern === worstPattern)
          .sort((a, b) => a.order - b.order)[0];
        if (match) setRecommendedLesson(match);
      })
      .catch(() => {}); // GET /api/lessons absent until Epic 4
  }, [isAuthenticated, patternAccuracy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('stats.title')}
        onBack={goBack}
      />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <StatCard label={t('stats.avg_accuracy')} value={accuracy} />
          <StatCard label={t('stats.lessons_done')} value={lessonsCount} />
        </div>

        <StatCard
          label={t('nav.sparring')}
          value={t('stats.sparring_record', { W: sparringRecord.W, L: sparringRecord.L, D: sparringRecord.D })}
        />

        {isAuthenticated && (
          <>
            <StatCard label={t('stats.day_streak')} value={streak} />

            {patternAccuracy && Object.keys(patternAccuracy).length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-soft)', marginBottom: 10 }}>
                  {t('stats.accuracy_by_pattern')}
                </div>
                {Object.entries(patternAccuracy).map(([pattern, entry]) => {
                  const pct = entry.accuracy ?? 0;
                  return (
                    <div key={pattern} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4, fontWeight: 600 }}>{pattern}</div>
                      <div style={{ height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor(pct), borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {recommendedLesson && (
              <button
                onClick={() => go('saga')}
                style={{ background: 'var(--card)', border: 'none', borderRadius: 'var(--radius)', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}
              >
                {t('stats.coach_recommendation_cta', { lessonTitle: recommendedLesson.title })}
              </button>
            )}

            <button
              onClick={() => go('mistakes')}
              style={{ background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}
            >
              {t('stats.review_mistakes')}
            </button>
          </>
        )}

        {!isAuthenticated && (
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600, padding: '10px 0' }}>
            {t('stats.signup_prompt')}
          </div>
        )}

        {isAuthenticated && (
          <button
            onClick={() => signOut()}
            style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--ink-soft)', marginTop: 8, WebkitTapHighlightColor: 'transparent' }}
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}
