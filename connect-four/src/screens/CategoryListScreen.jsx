import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Board } from '../components/Board.jsx';
import { CoachAvatar } from '../components/CoachAvatar.jsx';
import { Icon } from '../components/Icon.jsx';
import { SeverityMeter } from '../components/SeverityMeter.jsx';
import { MistakesGate } from '../components/MistakesGate.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function CategoryListScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [blunders, setBlunders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics on mount
  useEffect(() => {
    track('screen_viewed', { screen: 'mistake_categories' });
  }, []);

  // Fetch all blunders
  const fetchBlunders = useCallback(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API}/api/coach/queue?status=all`, {
      credentials: 'include',
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

  useEffect(() => {
    fetchBlunders();
  }, [fetchBlunders]);

  // Group blunders by pattern_category into CategoryEntry[]
  const categories = useMemo(() => {
    const groups = {};
    for (const b of blunders) {
      const slug = b.pattern_category || 'unknown';
      if (!groups[slug]) groups[slug] = [];
      groups[slug].push(b);
    }
    const entries = Object.entries(groups).map(([slug, items]) => {
      const unreviewed = items.filter(b => !b.resolved_at);
      const maxSev = Math.max(...unreviewed.map(b => b.severity ?? 0), 0);
      // Most-critical unreviewed blunder: highest severity, oldest created_at as tiebreaker.
      // If all reviewed, pick the most-critical overall.
      const candidates = unreviewed.length > 0 ? unreviewed : items;
      const sorted = [...candidates].sort((a, b) => {
        const sevDiff = (b.severity ?? 0) - (a.severity ?? 0);
        if (sevDiff !== 0) return sevDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      return { slug, items, unreviewed, maxSev, thumb: sorted[0] };
    });

    // Sort: maxSev desc; maxSev===0 at bottom; stable within ties
    entries.sort((a, b) => {
      if (a.maxSev === 0 && b.maxSev === 0) return 0;
      if (a.maxSev === 0) return 1;
      if (b.maxSev === 0) return -1;
      return b.maxSev - a.maxSev;
    });

    return entries;
  }, [blunders]);

  const totalUnreviewed = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.unreviewed.length, 0),
    [categories],
  );

  const isEmpty = blunders.length === 0;

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.title')}
        onBack={() => go('stats')}
        meta={totalUnreviewed > 0 ? t('mistakes.to_review', { count: totalUnreviewed }) : null}
      />

      <MistakesGate
        session={session}
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        onRetry={() => fetchBlunders()}
        renderSignedOut={() => (
          <>
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
          </>
        )}
        renderEmpty={() => (
          <>
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
          </>
        )}
      >
        {/* Category rows */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(cat => {
            const boardObj = buildBoard(cat.thumb.board_state || '');
            const landingRow = cat.thumb.move_played != null ? boardObj.heights[cat.thumb.move_played] : 0;
            const thumbOverlays = [
              { c: cat.thumb.move_played, r: landingRow, type: 'tr' },
            ];

            return (
              <button
                key={cat.slug}
                onClick={() => go('mistakeDetail', { category: cat.slug })}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: '#fff',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Left: Board thumbnail */}
                <div style={{ width: 100, flexShrink: 0 }}>
                  <Board board={boardObj.board} compact canPlay={false} overlays={thumbOverlays} />
                </div>

                {/* Body: label, SeverityMeter, badge */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                    {t('mistakes.pattern.' + cat.slug)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SeverityMeter score={cat.maxSev} />
                    {cat.unreviewed.length > 0 ? (
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        background: 'rgba(217,119,6,0.12)',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}>
                        {t('mistakes.cat.new', { count: cat.unreviewed.length })}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--green)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {t('mistakes.cat.done')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: count + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {cat.items.length}
                  </span>
                  <Icon name="chevR" size={18} />
                </div>
              </button>
            );
          })}
        </div>
      </MistakesGate>
    </div>
  );
}
