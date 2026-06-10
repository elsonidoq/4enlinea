import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { colsToBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const PAGE_SIZE = 20;

const CELL_COLOR = {
  red:   '#22c55e',
  yellow: '#9ca3af',
  empty: 'var(--surface-2)',
};

function MiniBoard({ cols }) {
  const board = colsToBoard(cols);
  // Show bottom-left 4×4 slice: rows 0–3, cols 0–3
  const slice = board.slice(0, 4).map(r => r.slice(0, 4));
  // Render top-to-bottom (row 3 first, row 0 last) to match visual gravity
  const rows = [...slice].reverse();

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 12px)', gridTemplateColumns: 'repeat(4, 12px)', gap: 1 }}>
      {rows.map((row, ri) =>
        row.map((cell, ci) => (
          <div
            key={`${ri}-${ci}`}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: CELL_COLOR[cell] ?? CELL_COLOR.empty,
            }}
          />
        ))
      )}
    </div>
  );
}

function GameCard({ game, t, onClick }) {
  const dateStr = new Date(game.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const diffKey = `games.difficulty_${game.difficulty}`;
  const diffLabel = t(diffKey);
  const meta = game.accuracy != null ? `${diffLabel} · ${t('games.accuracy', { value: Math.round(game.accuracy) })}` : diffLabel;

  return (
    <button className="game-card" onClick={onClick} style={{ fontFamily: 'inherit', color: 'var(--ink)', color_scheme: 'light' }}>
      <div className="gc-board">
        <MiniBoard cols={game.cols} />
      </div>
      <div className="gc-info">
        <div className="gc-top">
          <span className={`gc-outcome ${game.outcome}`}>
            {game.outcome === 'won' ? t('games.filter_won') : game.outcome === 'lost' ? t('games.filter_lost') : t('games.filter_draw')}
          </span>
          <span className="gc-date">{dateStr}</span>
        </div>
        <div className="gc-meta">{meta}</div>
        {game.blunder_count > 0 && (
          <div className="gc-blunders">
            {t(game.blunder_count === 1 ? 'games.blunder_count_one' : 'games.blunder_count_other', { count: game.blunder_count })}
          </div>
        )}
      </div>
    </button>
  );
}

const FILTERS = [
  { key: 'all',         label: 'games.filter_all' },
  { key: 'won',         label: 'games.filter_won' },
  { key: 'lost',        label: 'games.filter_lost' },
  { key: 'draw',        label: 'games.filter_draw' },
  { key: 'has_blunder', label: 'games.filter_has_blunder' },
];

export function PastGamesListScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    track('screen_view', { screen: 'pastGames' });
  }, []);

  const fetchGames = useCallback(async (activeFilter, currentOffset, append = false) => {
    if (!session) return;

    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: currentOffset });
    if (activeFilter === 'has_blunder') {
      params.set('has_blunder', 'true');
    } else if (activeFilter !== 'all') {
      params.set('outcome', activeFilter);
    }

    try {
      const res = await fetch(`${API}/api/games?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setGames(prev => append ? [...prev, ...(data.games || [])] : (data.games || []));
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setGames([]);
    setOffset(0);
    fetchGames(filter, 0, false);
  }, [filter, session]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange(key) {
    if (key === filter) return;
    setFilter(key);
  }

  function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    setLoadingMore(true);
    fetchGames(filter, nextOffset, true);
  }

  // Anonymous gate
  if (!session) {
    return (
      <div style={{ background: 'var(--bg-spar)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('games.title')} onBack={goBack ?? (() => go('home'))} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', color: 'var(--ink-soft)' }}>
            <Icon name="user" size={34} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Sign in to see your past games</div>
        </div>
      </div>
    );
  }

  const hasMore = games.length < total;

  return (
    <div style={{ background: 'var(--bg-spar)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar title={t('games.title')} onBack={goBack ?? (() => go('home'))} />

      {/* Filter pills */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: '1.5px solid var(--border)',
                background: active ? 'var(--disc-green)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-soft)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'background .12s, color .12s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t(label)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('games.loading')}
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
            {error}
          </div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
            {t('games.empty')}
          </div>
        ) : (
          <>
            {games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                t={t}
                onClick={() => go('review', { id: game.id })}
              />
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  marginTop: 4,
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: loadingMore ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: loadingMore ? 0.6 : 1,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {loadingMore ? t('games.loading') : t('games.load_more')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
