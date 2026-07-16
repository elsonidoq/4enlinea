import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Icon } from '../components/Icon.jsx';
import { Board } from '../components/Board.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { colsToBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const PAGE_SIZE = 20;

// Thumbnail dimensions: render Board at RENDER_W then scale down.
// compact Board uses pad=9, gap=6; cells have aspectRatio:1.
const THUMB_RENDER_W = 252;
const THUMB_W = 72;
const THUMB_SCALE = THUMB_W / THUMB_RENDER_W;
const _cellW = (THUMB_RENDER_W - 2 * 9 - 6 * 6) / 7;
const THUMB_RENDER_H = 6 * _cellW + 5 * 6 + 2 * 9;
const THUMB_H = Math.round(THUMB_RENDER_H * THUMB_SCALE);

function BoardThumb({ cols }) {
  const board = colsToBoard(cols);
  return (
    <div style={{ width: THUMB_W, height: THUMB_H, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: THUMB_RENDER_W, transformOrigin: 'top left', transform: `scale(${THUMB_SCALE})`, pointerEvents: 'none' }}>
        <Board board={board} compact />
      </div>
    </div>
  );
}

const PAPERGAMES_AVATAR_BASE = 'https://papergames.io/en/assets/images/avatars';

function pgInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function OpponentAvatar({ name, avatarUuid }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (avatarUuid && !imgFailed) {
    return (
      <img
        src={`${PAPERGAMES_AVATAR_BASE}/${avatarUuid}.svg`}
        alt={name}
        onError={() => setImgFailed(true)}
        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', background: 'var(--line)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', flexShrink: 0,
    }}>
      {pgInitials(name)}
    </span>
  );
}

const DIFF_STYLES = {
  easy:    { bg: 'var(--eval-good-bg)', color: '#1c8a4a' },
  medium:  { bg: 'var(--eval-mid-bg)',  color: '#b9760a' },
  hard:    { bg: 'var(--eval-bad-bg)',  color: '#c23a26' },
  perfect: { bg: '#e0e7ff',             color: '#3730a3' },
};

function GameCard({ game, t, onClick }) {
  const dateStr = new Date(game.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const diffStyle = game.difficulty ? (DIFF_STYLES[game.difficulty] ?? {}) : null;

  return (
    <button className="game-card" onClick={onClick} style={{ fontFamily: 'inherit', color: 'var(--ink)' }}>
      <div className="gc-board">
        <BoardThumb cols={game.cols} />
      </div>
      <div className="gc-info">
        <div className="gc-top">
          <span className={`gc-outcome ${game.outcome}`}>
            {game.outcome === 'won' ? t('games.filter_won') : game.outcome === 'lost' ? t('games.filter_lost') : t('games.filter_draw')}
          </span>
          <span className="gc-date">{dateStr}</span>
        </div>

        {/* Row 2: source info */}
        {game.source === 'papergames' ? (
          <div className="gc-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <OpponentAvatar name={game.opponent_name} avatarUuid={game.opponent_avatar} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.opponent_name}</span>
            {game.accuracy != null && (
              <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{t('games.accuracy', { value: Math.round(game.accuracy) })}</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {diffStyle && (
              <span style={{ background: diffStyle.bg, color: diffStyle.color, fontSize: 11.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>
                {game.difficulty === 'perfect' ? t('games.difficulty_perfect_ai') : t(`games.difficulty_${game.difficulty}`)}
              </span>
            )}
            {game.accuracy != null && (
              <span className="gc-meta">{t('games.accuracy', { value: Math.round(game.accuracy) })}</span>
            )}
          </div>
        )}

        {/* Row 3: blunder chip */}
        {game.blunder_count > 0 ? (
          <span className="gc-blunder-chip" style={{ alignSelf: 'flex-start' }}>
            <Icon name="flag" size={11} />
            {t(game.blunder_count === 1 ? 'games.blunder_count_one' : 'games.blunder_count_other', { count: game.blunder_count })}
          </span>
        ) : (
          <span className="gc-no-blunder-chip" style={{ alignSelf: 'flex-start' }}>{t('games.no_blunders')}</span>
        )}
      </div>
    </button>
  );
}

const SORTS = [
  { key: 'recent',          label: 'games.sort_recent' },
  { key: 'played_well',     label: 'games.sort_played_well' },
  { key: 'worst_blunders',  label: 'games.sort_worst_mistakes' },
];

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
  const [sort, setSort] = useState('recent');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    track('screen_view', { screen: 'pastGames' });
  }, []);

  const fetchGames = useCallback(async (activeFilter, activeSort, currentOffset, append = false) => {
    if (!session) return;

    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: currentOffset });
    if (activeFilter === 'has_blunder') {
      params.set('has_blunder', 'true');
    } else if (activeFilter !== 'all') {
      params.set('outcome', activeFilter);
    }
    if (activeSort !== 'recent') {
      params.set('sort', activeSort);
    }

    try {
      const res = await fetch(`${API}/api/games?${params}`, {
        credentials: 'include',
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
    fetchGames(filter, sort, 0, false);
  }, [filter, sort, session]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange(key) {
    if (key === filter) return;
    setFilter(key);
  }

  function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    setLoadingMore(true);
    fetchGames(filter, sort, nextOffset, true);
  }

  // Anonymous gate
  if (!session) {
    return (
      <div style={{ background: 'var(--bg-spar)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('games.title')} onBack={goBack ?? (() => go('home'))} onLogoClick={() => go('home')} />
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
      <TopBar title={t('games.title')} onBack={goBack ?? (() => go('home'))} onLogoClick={() => go('home')} />

      {/* Sort picker */}
      <div style={{ padding: '6px 16px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
        {SORTS.map(({ key, label }) => {
          const active = sort === key;
          return (
            <button
              key={key}
              onClick={() => { if (key !== sort) { setSort(key); setOffset(0); } }}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 10,
                border: active ? 'none' : '1.5px solid var(--line)',
                background: active ? 'var(--disc-green)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-soft)',
                fontWeight: 700,
                fontSize: 12,
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

      {/* Filter pills */}
      <div className="hide-scrollbar" style={{ padding: '8px 16px 10px', display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: '1.5px solid var(--line)',
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
                  border: '1.5px solid var(--line)',
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
