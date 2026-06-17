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

export function MistakesListScreen({ go, goBack, category }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [blunders, setBlunders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('unreviewed');

  // Analytics on mount when category is set
  useEffect(() => {
    if (category) {
      track('mistake_category_detail_viewed', { category });
    }
  }, [category]);

  // Fetch blunders for the given category
  const fetchBlunders = useCallback(() => {
    if (!session || !category) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API}/api/coach/queue?status=all&category=${encodeURIComponent(category)}`, {
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
  }, [session, category]);

  useEffect(() => {
    fetchBlunders();
  }, [fetchBlunders]);

  // Filter blunders by tab
  const filteredBlunders = useMemo(() => {
    if (filter === 'unreviewed') return blunders.filter(b => !b.resolved_at);
    if (filter === 'reviewed') return blunders.filter(b => !!b.resolved_at);
    return blunders;
  }, [blunders, filter]);

  // Null guard — render nothing when no category is set
  if (!category) return null;

  const isEmpty = blunders.length === 0;
  const tabs = ['unreviewed', 'reviewed'];

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.pattern.' + category)}
        onBack={() => go('mistakes')}
        meta={
          blunders.length === 1
            ? t('mistakes.detail.meta_count', { count: blunders.length })
            : t('mistakes.detail.meta_count_pl', { count: blunders.length })
        }
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
        {/* Filter tabs */}
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
                  border: '1.5px solid var(--line)',
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

        {/* Blunder list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredBlunders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
              {filter === 'unreviewed'
                ? t('mistakes.detail.all_caught_up')
                : t('mistakes.detail.none_reviewed')}
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
                  onClick={() => go('blunderDetail', { id: filteredBlunders[i].id, blunderNavList: filteredBlunders, index: i, mistakeContext: 'list', mistakeSource: null })}
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
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 10,
                        padding: '1px 8px',
                        background: 'var(--card)',
                        boxShadow: 'var(--shadow-sm)',
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--ink-soft)',
                        fontFamily: 'inherit',
                      }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: (b.board_state || '').length % 2 === 0 ? 'var(--disc-green)' : 'var(--disc-gray)',
                          flexShrink: 0,
                        }} />
                        {(b.board_state || '').length % 2 === 0 ? 'Green' : 'Gray'}
                      </span>
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
      </MistakesGate>
    </div>
  );
}
