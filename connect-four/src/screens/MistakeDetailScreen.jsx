import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { Icon } from '../components/Icon.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';
import { canRevealAnon } from '../lib/anonDeepReveal.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

const DIFFICULTIES = [
  { key: 'easy',    subtitleKey: 'sparring.easySub' },
  { key: 'medium',  subtitleKey: 'sparring.mediumSub', isDefault: true },
  { key: 'hard',    subtitleKey: 'sparring.hardSub' },
  { key: 'perfect', subtitleKey: 'sparring.perfectSub' },
];

export function MistakeDetailScreen({ go, goBack, blunderNavList: navListProp, index: initialIndex, mistakeContext, mistakeSource, id, difficulty: difficultyProp }) {
  const { t } = useTranslation();
  const { session } = useStore();

  const [index, setIndex] = useState(initialIndex ?? 0);
  const [resolving, setResolving] = useState(false);
  const [highlightCol, setHighlightCol] = useState(null);
  const [zhCells, setZhCells] = useState([]);
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [coldNavList, setColdNavList] = useState(null);
  const [coldBootState, setColdBootState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'not_found' | 'error'

  // Start-from-here state
  const [fromPositionError, setFromPositionError] = useState(null);
  const [diffPickerOpen, setDiffPickerOpen] = useState(false);
  const [pickedDifficulty, setPickedDifficulty] = useState('medium');

  // Cold-boot fetch: when id is present and navListProp is empty, fetch the blunder.
  // Spec 042 US2 (FR-008/FR-009): the response now carries `totalMoves` (parent
  // game's total ply count) and `siblingMistakes` (every mistake in that game,
  // ordered by moveIndex). Build a full navList from siblingMistakes — not a
  // single-item array — so "Move N / M" and "X of Y" are correct on a cold-opened
  // permalink, not a default "1 of 1". Sibling entries carry no board_state by
  // design (research.md §10); only the requested id's entry is fully hydrated up
  // front. Other siblings are fetched lazily when the user steps to them (T017).
  useEffect(() => {
    if (!id || (navListProp && navListProp.length > 0)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColdBootState('loading');
    fetch(`${API}/api/blunders/${encodeURIComponent(id)}`)
      .then(async res => {
        if (res.status === 404) { setColdBootState('not_found'); return; }
        if (!res.ok) { setColdBootState('error'); return; }
        const data = await res.json();
        const siblings = (data.siblingMistakes && data.siblingMistakes.length > 0)
          ? data.siblingMistakes
          : [{ id: data.id, moveIndex: data.moveIndex, quality: data.quality, resolved_at: data.resolved_at }];
        const list = siblings.map(s => (
          s.id === data.id
            ? { ...data, totalMoves: data.totalMoves }
            : { id: s.id, moveIndex: s.moveIndex, quality: s.quality, resolved_at: s.resolved_at, totalMoves: data.totalMoves }
        ));
        const foundIndex = siblings.findIndex(s => s.id === data.id);
        setColdNavList(list);
        setIndex(foundIndex >= 0 ? foundIndex : 0);
        setColdBootState('ready');
      })
      .catch(() => setColdBootState('error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spec 042 US2 / T017: lazy per-sibling stepping. A cold-boot navList entry that
  // isn't the originally-requested id has no `board_state` yet (siblingMistakes
  // deliberately omits it — research.md §10). When Prev/Next steps onto such an
  // entry, fetch its own full GET /api/blunders/:id at that moment — no eager
  // prefetch of the whole navList. In-app navigation (navListProp present) never
  // needs this: that navList already carries full board data for every entry.
  async function ensureSiblingLoaded(targetIndex) {
    if (navListProp && navListProp.length > 0) return;
    const entry = coldNavList?.[targetIndex];
    if (!entry || entry.board_state !== undefined) return;
    try {
      const res = await fetch(`${API}/api/blunders/${encodeURIComponent(entry.id)}`);
      if (res.ok) {
        const data = await res.json();
        setColdNavList(prev => {
          if (!prev) return prev;
          const next = [...prev];
          next[targetIndex] = { ...data, totalMoves: data.totalMoves ?? prev[targetIndex]?.totalMoves };
          return next;
        });
      }
    } catch {
      // leave the stub in place; isPendingSibling keeps rendering the loading state
    }
  }

  // Derive the effective navList: prefer in-app navListProp, fall back to cold-boot fetch
  const navList = useMemo(() => {
    if (navListProp && navListProp.length > 0) return navListProp;
    return coldNavList ?? [];
  }, [navListProp, coldNavList]);

  const blunders = navList ?? [];

  const blunder = blunders[index];
  const isReviewed = blunder?.resolved_at != null;

  // Derive isReviewed from resolved_at
  const [reviewedMap, setReviewedMap] = useState(() => {
    const map = {};
    blunders.forEach((b, i) => { map[i] = b.resolved_at != null; });
    return map;
  });

  const effectiveReviewed = reviewedMap[index] ?? isReviewed;

  useEffect(() => {
    track('mistake_reviewed', { blunderId: blunder?.id });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const boardObj = useMemo(() => {
    if (!blunder) return { board: [], heights: [] };
    return buildBoard(blunder.board_state || '');
  }, [blunder]);

  // Spec 042 US6 (FR-020/FR-021, T053): patternCells (generic pattern-agnostic
  // fork/threat cells, Decision 3) feeds the SAME highlight channel as
  // threat_cells — no new frontend prop, never parsed from prose. Both fields
  // may be absent/undefined for a cold-boot stub sibling entry mid-navigation
  // (see isPendingSibling), hence the `|| []` guards. Deduped by (col,row) in
  // case a pattern's cells happen to overlap threat_cells for the same mistake.
  const userMajorThreats = useMemo(() => {
    const combined = [...(blunder?.threat_cells || []), ...(blunder?.patternCells || [])];
    const seen = new Set();
    const result = [];
    for (const tc of combined) {
      const key = `${tc.col},${tc.row}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ c: tc.col, r: tc.row });
    }
    return result;
  }, [blunder]);

  const overlays = useMemo(() => {
    if (!blunder) return [];
    const landingRow = boardObj.heights[blunder.move_played];
    const result = [{ c: blunder.move_played, r: landingRow ?? 0, type: 'tr' }];
    (blunder.threat_cells || []).forEach(tc => {
      result.push({ c: tc.col, r: tc.row, type: 'td' });
    });
    if (highlightCol != null && boardObj.heights[highlightCol] < 6) {
      result.push({ c: highlightCol, r: boardObj.heights[highlightCol], type: 'tg' });
    }
    return result;
  }, [blunder, boardObj, highlightCol]);

  // Back navigation: contextual based on mistakeContext.
  // Spec 042 T025 (FR-012): a mistake reached in-app (mistakeContext === 'game' from
  // ReviewScreen.navigateToMistake, or 'list' from MistakesListScreen) was always
  // *pushed* onto browser history from the screen it should return to — so Back must
  // *pop* (goBack/window.history.back) rather than push a fresh 'review' entry.
  // Pushing a new entry here (the old behavior) left a stale blunderDetail entry
  // directly beneath the new review entry, so the *next* Back press popped back onto
  // the mistake instead of continuing toward Home — the mistake -> game -> mistake
  // cycle bug. A cold-opened permalink has neither mistakeContext nor mistakeSource
  // (they are session-only nav params, never URL-encoded) and must still go straight
  // to Home in one press — that behavior (spec-037, do not regress) is unaffected by
  // this change since it's gated by the first branch below.
  function handleBack() {
    if (!mistakeContext && !mistakeSource) { go('home'); return; }
    goBack();
  }

  // Start a new game from the position just before this mistake
  async function doStartFromHere(diff) {
    if (!blunder) return;
    setFromPositionError(null);
    const gameId = blunder.game_id ?? blunder.papergames_game_id ?? mistakeSource?.gameId ?? null;
    if (!gameId) { setFromPositionError(t('sparring.reviewError')); return; }
    const N = (blunder.board_state || '').length;
    try {
      const res = await fetch(`${API}/api/games/from-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, N, difficulty: diff }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      go('game', { initialMoves: data.moves, side: data.side, difficulty: data.difficulty });
    } catch {
      setFromPositionError(t('sparring.reviewError'));
    }
  }

  function handleStartFromHere() {
    const knownDifficulty = difficultyProp ?? blunder?.difficulty ?? null;
    if (!knownDifficulty) {
      setDiffPickerOpen(true);
    } else {
      doStartFromHere(knownDifficulty);
    }
  }

  // Display move number — only meaningful when blunder exists
  const displayMoveNumber = blunder ? (blunder.moveIndex ?? 0) + 1 : 0;

  // TopBar meta content — only when blunder exists
  let metaContent = null;
  if (blunder) {
    if (mistakeSource) {
      metaContent = (
        <button
          onClick={() => go('review', { id: mistakeSource.gameId })}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-soft)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {`Move ${displayMoveNumber} / ${mistakeSource.totalMoves} · ${mistakeSource.date} ›`}
        </button>
      );
    } else {
      // FR-008: totalMoves (parent game's total ply count, from GET /api/blunders/:id)
      // is the correct denominator — blunders.length (the sibling-mistake count) is
      // only the right value for "X of Y" in the Toolbar below, not for "Move N / M"
      // here. Fall back to blunders.length only when totalMoves is unavailable
      // (defensive — should not happen for a real row per contracts/api-blunders-id.md).
      metaContent = (
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
          {`Move ${displayMoveNumber} / ${blunder.totalMoves ?? blunders.length}`}
        </span>
      );
    }
  }

  // Spec 042 US2 / T017: a cold-boot sibling entry stepped onto but not yet
  // hydrated (no board_state) — render a lightweight loading state for the board
  // panel instead of the full detail body (whose fields would otherwise be
  // undefined mid-fetch).
  const isPendingSibling = blunder != null && blunder.board_state === undefined;

  function handlePrev() {
    setHighlightCol(null);
    setDeepRevealOpen(false);
    setZhCells([]);
    setFromPositionError(null);
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      ensureSiblingLoaded(newIndex);
    }
  }

  function handleNext() {
    setHighlightCol(null);
    setDeepRevealOpen(false);
    setZhCells([]);
    setFromPositionError(null);
    if (index < blunders.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      ensureSiblingLoaded(newIndex);
    }
  }

  async function handleMarkReviewed() {
    if (!session) return;
    setResolving(true);
    try {
      const res = await fetch(`${API}/api/coach/queue/${blunder.id}/resolve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 204) {
        setReviewedMap(prev => ({ ...prev, [index]: true }));
        if (blunders[index]) {
          blunders[index].resolved_at = new Date().toISOString();
        }
      }
    } catch {
      // revert: isReviewed stays false, resolving cleared
    } finally {
      setResolving(false);
    }
  }

  const isGreenPlayer = blunder ? (blunder.board_state || '').length % 2 === 0 : null;
  const coachMessages = [
    {
      text: t('mistakes.detail.coach.line1', { n: (blunder?.move_played ?? 0) + 1 }),
      mood: 'think',
      ...(isGreenPlayer != null ? {
        disc: isGreenPlayer ? 'green' : 'gray',
        discLabel: isGreenPlayer ? 'You played Green' : 'You played Gray',
      } : {}),
    },
    { text: t('mistakes.detail.coach.line2'), mood: 'think' },
  ];

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.detail.topbarTitle')}
        onBack={handleBack}
        meta={blunder ? metaContent : undefined}
        onLogoClick={() => go('home')}
      />

      {/* Cold-boot loading state */}
      {coldBootState === 'loading' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--line)',
            borderTopColor: 'var(--ink-soft)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{t('common.loading', 'Loading…')}</span>
        </div>
      )}

      {/* Cold-boot not-found state */}
      {coldBootState === 'not_found' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <span style={{ color: 'var(--ink)', fontSize: 18, fontWeight: 700 }}>{t('mistakes.detail.notFound', 'Blunder not found')}</span>
          <button onClick={handleBack} style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{t('common.back', 'Back')}</button>
        </div>
      )}

      {/* Cold-boot error state */}
      {coldBootState === 'error' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <span style={{ color: 'var(--ink)', fontSize: 18, fontWeight: 700 }}>{t('common.error', 'Something went wrong')}</span>
          <button onClick={handleBack} style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{t('common.back', 'Back')}</button>
        </div>
      )}

      {/* In-app empty navList state */}
      {(coldBootState === 'ready' || coldBootState === 'idle') && !blunder && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
          {t('mistakes.detail.noBlunderFound', 'no blunder found')}
        </div>
      )}

      {(coldBootState === 'ready' || coldBootState === 'idle') && blunder && (
        <>
      {isPendingSibling ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--line)',
            borderTopColor: 'var(--ink-soft)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{t('common.loading', 'Loading…')}</span>
        </div>
      ) : deepRevealOpen ? (
        <>
          <CoachDialog messages={coachMessages} />
          <DeepRevealPane
            isOpen={deepRevealOpen}
            onClose={() => setDeepRevealOpen(false)}
            moveString={blunder.board_state || ''}
            col={blunder.move_played}
            feature="past_mistakes"
            navigate={go}
            onReveal={d => {
              setHighlightCol(blunder.correct_move);
              track('deep_reveal_viewed', { context: 'past_mistakes', cached: d.cached ?? false });
            }}
            onZhCellsChange={setZhCells}
            userMajorThreats={userMajorThreats}
            boardContent={
              <div style={{ width: '100%' }}>
                <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
              </div>
            }
          />
        </>
      ) : (
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '0 18px 12px' }}>
        {/* Coach dialog */}
        <CoachDialog messages={coachMessages} />

        {/* Board */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
          <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
        </div>

        {/* Severity indicator — FR-001: label + color only, never gates an action */}
        {(blunder.quality === 'blunder' || blunder.quality === 'suboptimal') && (
          <div style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: 999,
            background: blunder.quality === 'blunder' ? 'var(--eval-bad-bg)' : 'var(--eval-mid-bg)',
            color: blunder.quality === 'blunder' ? 'var(--eval-bad)' : 'var(--eval-mid)',
          }}>
            {t(`mistakes.detail.severity.${blunder.quality}`)}
          </div>
        )}

        {/* Pattern tag */}
        {blunder.pattern_category && blunder.pattern_category !== 'unknown' && (
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            padding: '0 4px',
          }}>
            {t('mistakes.pattern.' + blunder.pattern_category)}
          </div>
        )}

        {/* Legend */}
        <div style={{ padding: '0 4px' }}>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--threat-red)', boxShadow: '0 0 0 2px rgba(232,84,62,.5) inset' }} />
              {t('mistakes.detail.legend.yourMove')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--threat-gray)', boxShadow: '0 0 0 2px rgba(60,66,80,.5) inset' }} />
              {t('mistakes.detail.legend.opponentThreat')}
            </div>
          </div>
        </div>

        {/* Start a new game from here */}
        {(blunder.game_id || blunder.papergames_game_id || mistakeSource?.gameId) && (
          <button
            onClick={handleStartFromHere}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '13px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1.5px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink)',
              fontFamily: 'inherit',
            }}
          >
            {t('sparring.startFromHere')}
          </button>
        )}

        {/* Error for start-from-here */}
        {fromPositionError && (
          <p style={{ color: 'var(--eval-bad)', textAlign: 'center', fontSize: 13, margin: 0 }}>
            {fromPositionError}
          </p>
        )}

        {/* Deep reveal trigger. Anonymous onboarding users get ONE free reveal:
            show the trigger while canRevealAnon is true (unused, or re-opening the
            same one); once spent, fall through to the sign-in gate. DeepRevealPane
            enforces the same gate on the fetch and marks it spent on success. */}
        {(session || canRevealAnon(`${blunder.board_state || ''}:${blunder.move_played}`)) ? (
          <button
            onClick={() => setDeepRevealOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '13px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--disc-green, #2e9e57)',
              color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            {t('mistakes.detail.whatShouldIHave')}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '13px 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            fontWeight: 700,
            border: '1.5px solid var(--line)',
            color: 'var(--ink-soft)',
            fontFamily: 'inherit',
          }}>
            {t('mistakes.detail.signInToUnlock', 'Sign in to unlock')}
          </div>
        )}

        {/* Mark as reviewed */}
        {session && blunder.is_owner !== false && (
          <>
            {effectiveReviewed ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '13px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-soft)',
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
                opacity: 0.6,
              }}>
                <Icon name="check" size={16} color="var(--ink-soft)" />
                {t('mistakes.detail.markedReviewed')}
              </div>
            ) : (
              <button
                onClick={handleMarkReviewed}
                disabled={resolving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: resolving ? 'var(--line)' : 'var(--green)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: resolving ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background .12s',
                }}
              >
                {resolving ? '...' : t('mistakes.detail.markReviewed')}
              </button>
            )}
          </>
        )}
      </div>
          )}

          {/* Toolbar: Prev / Next */}
          <Toolbar>
        <button
          onClick={handlePrev}
          disabled={index === 0}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: index === 0 ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: index === 0 ? 0.4 : 1,
          }}
        >
          <Icon name="chevL" size={20} />
          Prev
        </button>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ink-soft)',
          padding: '0 12px',
          whiteSpace: 'nowrap',
        }}>
          {`${index + 1} of ${blunders.length}`}
        </span>
        <button
          onClick={handleNext}
          disabled={index === blunders.length - 1}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: index === blunders.length - 1 ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: index === blunders.length - 1 ? 0.4 : 1,
          }}
        >
          Next
          <Icon name="chevR" size={20} />
        </button>
      </Toolbar>
        </>
      )}

      {/* Difficulty picker bottom sheet — for papergames games with no known difficulty */}
      {diffPickerOpen && (
        <>
          <div
            onClick={() => setDiffPickerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff',
            colorScheme: 'light',
            borderRadius: '20px 20px 0 0',
            padding: '20px 18px 32px',
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--ink-soft)',
              marginBottom: 2,
            }}>
              {t('sparring.chooseDifficulty')}
            </div>

            {DIFFICULTIES.map(d => {
              const selected = pickedDifficulty === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setPickedDifficulty(d.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--card)',
                    border: '2px solid',
                    borderColor: selected ? 'var(--disc-green)' : 'var(--line)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontFamily: 'inherit',
                    transition: 'border-color .12s, box-shadow .12s',
                    boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 17,
                        color: 'var(--ink)',
                      }}>
                        {t(`sparring.${d.key}`)}
                      </span>
                      {d.isDefault && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: 'var(--font-display)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'var(--eval-good-bg)',
                          color: 'var(--disc-green)',
                          letterSpacing: 0.3,
                        }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                      marginTop: 3,
                      lineHeight: 1.3,
                    }}>
                      {t(d.subtitleKey)}
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2.5px solid',
                    borderColor: selected ? 'var(--disc-green)' : 'var(--ink-faint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color .12s',
                  }}>
                    {selected && (
                      <div style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: 'var(--disc-green)',
                      }} />
                    )}
                  </div>
                </button>
              );
            })}

            <button
              className="btn btn-primary"
              onClick={() => { setDiffPickerOpen(false); doStartFromHere(pickedDifficulty); }}
              style={{ marginTop: 6 }}
            >
              {t('sparring.startGame')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
