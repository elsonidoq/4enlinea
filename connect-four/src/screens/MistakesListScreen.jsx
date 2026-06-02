import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Board } from '../components/Board.jsx';
import { CoachAvatar } from '../components/CoachAvatar.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

const SEVERITY_LEVELS = [
  { min: 1,  max: 1,  label: 'Minor',    color: '#16a34a', bg: 'rgba(22,163,74,0.12)'  },
  { min: 2,  max: 3,  label: 'Moderate', color: '#d97706', bg: 'rgba(217,119,6,0.12)'  },
  { min: 4,  max: 10, label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.12)'  },
];

function severityLevel(score) {
  return SEVERITY_LEVELS.find(l => score >= l.min && score <= l.max) ?? null;
}

function SeverityMeter({ score }) {
  const lvl = severityLevel(score);
  if (!lvl) return null;
  const barIndex = SEVERITY_LEVELS.indexOf(lvl); // 0, 1, or 2
  const heights = [7, 10, 13];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 10, background: lvl.bg, color: lvl.color, fontSize: 11, fontWeight: 700 }}
          title={'Severity · ' + lvl.label}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13 }}>
        {heights.map((h, i) => (
          <span key={i} style={{ width: 3.5, height: h, borderRadius: 1.5, background: 'currentColor', opacity: i <= barIndex ? 1 : 0.28 }} />
        ))}
      </span>
      {lvl.label}
    </span>
  );
}

export function MistakesListScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [blunders, setBlunders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    track('screen_viewed', { path: 'mistakes' });
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API}/api/coach/queue?status=all`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => {
        setBlunders(data.blunders || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [session]);

  const filteredBlunders = useMemo(() => {
    if (filter === 'unreviewed') return blunders.filter(b => !b.resolved_at);
    if (filter === 'reviewed') return blunders.filter(b => !!b.resolved_at);
    return blunders;
  }, [blunders, filter]);

  // Anonymous gate
  if (!session) {
    return (
      <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('mistakes.title')} onBack={goBack} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', color: 'var(--ink-soft)' }}>
            <Icon name="user" size={34} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>{t('mistakes.gate.heading')}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4, maxWidth: 300 }}>{t('mistakes.gate.body')}</div>
          <button
            onClick={() => go('stats')}
            style={{
              marginTop: 8,
              width: '100%', maxWidth: 260,
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--green)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('mistakes.gate.cta')}
          </button>
          <button
            onClick={() => go('stats')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-soft)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            {t('mistakes.gate.later')}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('mistakes.title')} onBack={goBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('mistakes.title')} onBack={goBack} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--ink)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (blunders.length === 0) {
    return (
      <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('mistakes.title')} onBack={goBack} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', gap: 14 }}>
          <CoachAvatar size={88} mood="happy" />
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>{t('mistakes.empty.heading')}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4, maxWidth: 300 }}>{t('mistakes.empty.body')}</div>
          <button
            onClick={() => go('difficulty')}
            style={{
              marginTop: 8,
              width: '100%', maxWidth: 260,
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--green)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('mistakes.empty.cta')}
          </button>
        </div>
      </div>
    );
  }

  // Populated list
  const tabs = ['all', 'unreviewed', 'reviewed'];

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar title={t('mistakes.title')} onBack={goBack} />
      <div style={{ padding: '4px 18px 10px', display: 'flex', gap: 8 }}>
        {tabs.map(tab => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: '1.5px solid var(--border)',
                background: active ? 'var(--green)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-soft)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background .12s, color .12s',
              }}
            >
              {t('mistakes.filter.' + tab)}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredBlunders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('mistakes.emptyFilter')}
          </div>
        ) : (
          filteredBlunders.map((b, i) => {
            const boardObj = buildBoard(b.board_state || '');
            const landingRow = boardObj.heights[b.move_played];
            const overlays = [
              { c: b.move_played, r: landingRow, type: 'tr' },
              ...(b.threat_cells || []).map(tc => ({ c: tc.col, r: tc.row, type: 'td' })),
            ];

            return (
              <button
                key={b.id}
                onClick={() => go('mistakeDetail', { blunders, index: i, status: filter })}
                style={{
                  display: 'flex',
                  gap: 12,
                  background: '#fff',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                  boxShadow: 'var(--shadow-sm)',
                  borderLeft: '3px solid var(--green)',
                }}
              >
                <div style={{ width: 100, flexShrink: 0 }}>
                  <Board board={boardObj.board} compact canPlay={false} overlays={overlays} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {b.pattern_category && b.pattern_category !== 'unknown' && (
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: 'var(--teal)',
                      }}>
                        {t('mistakes.pattern.' + b.pattern_category)}
                      </div>
                    )}
                    <SeverityMeter score={b.severity} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </div>
                  {b.resolved_at && (
                    <div style={{
                      display: 'inline-flex',
                      alignSelf: 'flex-start',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: 'var(--green)',
                      padding: '2px 8px',
                      borderRadius: 10,
                      marginTop: 2,
                    }}>
                      {t('mistakes.reviewed')}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
