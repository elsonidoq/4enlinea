import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Board } from '../components/Board.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { InfoProsePanel } from '../components/InfoProsePanel.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { boardSpecToBoard } from '../lib/board.js';
import { winLegendColor } from '../lib/overlayColors.js';
import { useAudio } from '../lib/useAudio.js';
import { speakLessonAudio, stopSpeech } from '../lib/useCoachSpeech.js';
import { getSlideNarrationQueue } from '../lib/lessonNarration.js';
import { langHeaders } from '../lib/apiLang.js';
import { useLessonLockGuard } from '../lib/useLessonLockGuard.js';
import { windowHighlightsToZhCells, WINDOW_HIGHLIGHT_COLOR, DEFAULT_WINDOW_HIGHLIGHT_COLOR, WINDOW_COUNT_MAX, windowCountTint } from '../lib/lessonWindows.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// Every overlay type but `win` has a colour fixed by the type alone. `win` rings a
// DISC, so its colour follows the disc's identity — see winLegendColor() and OI-168;
// it is resolved per slide below rather than looked up here.
const OVERLAY_SWATCH_COLOR = {
  tg:    'rgba(76, 175, 80, 0.4)',
  td:    'rgba(150, 150, 150, 0.4)',
  claim: 'var(--claim, #f59e0b)',
};

/**
 * @param {string} type  the legend row's overlay type.
 * @param {{ board: string[][], overlays: Array<{c:number,r:number,type:string}> }} slideCtx
 *   the same board + overlays handed to <Board>, so a `win` swatch can take the colour
 *   the board actually paints on those cells instead of a hardcoded green.
 */
function swatchColor(type, slideCtx) {
  if (type === 'win') return winLegendColor(slideCtx.board, slideCtx.overlays);
  return OVERLAY_SWATCH_COLOR[type] ?? 'rgba(128, 128, 128, 0.4)';
}

export function ConceptScreen({ go, goBack, goReplace, lessonId }) {
  const { t } = useTranslation();
  const { store } = useStore();
  const { speechEnabled } = useAudio();
  const [lesson, setLesson] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [slideIndex, setSlideIndex] = useState(0);
  const startedRef = useRef(false);
  // Direct-URL lock guard (PRO tier + lesson order) — mirrors SagaScreen's rules.
  // While it is 'checking' (or after a 'blocked' redirect) loadState stays 'loading',
  // so the normal loading state shows and locked lesson content is never rendered.
  const lockStatus = useLessonLockGuard(lessonId, goReplace);

  useEffect(() => {
    if (lockStatus !== 'allowed') return;
    fetch(`${API}/api/lessons/${lessonId}`, { headers: langHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        // Server-side entitlement gate (spec 053 US1): a locked stub has no `slides`
        // array — indexing it would throw. This can happen even though the client-side
        // useLessonLockGuard above already said 'allowed' (stale/cached tier info), so
        // it needs its own guard. Redirect through the exact same affordance the guard
        // uses on a client-side block (SagaScreen's UpgradeModal via lockAction), rather
        // than inventing a second locked-lesson UI. loadState is left at 'loading' so
        // nothing tries to render `lesson.slides` before the redirect takes effect.
        if (data.locked === true) {
          goReplace('saga', { lockAction: 'upgrade' });
          return;
        }
        setLesson(data);
        setLoadState('ready');
      })
      .catch(err => {
        console.error('[ConceptScreen] fetch error:', err);
        setLoadState('error');
      });
    // goReplace comes from Navigator's useCallback([], ...) — stable identity (same
    // rationale as useLessonLockGuard.js), so including it here doesn't cause re-fetches.
  }, [lessonId, lockStatus, goReplace]);

  // Track lesson start exactly once when lesson first loads
  useEffect(() => {
    if (slideIndex === 0 && lesson && !startedRef.current) {
      startedRef.current = true;
      track('lesson_started', { lessonId });
    }
  }, [lesson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Narrate the current concept slide — coach bubbles first, then the info prose
  // (spec 046 US3, FR-016/FR-019/FR-021). speakLessonAudio pushes onto the module-level
  // singleton queue in useCoachSpeech.js, which plays strictly one at a time in push
  // order, so the bubble-then-prose ordering needs no extra sequencing here.
  // Keyed on slideIndex (and lesson, for the initial load) so narration re-fires on every
  // slide change and on first mount. Cleanup unconditionally calls stopSpeech() so
  // navigating away or changing slides mid-narration never leaves orphaned audio (FR-021).
  useEffect(() => {
    if (!lesson) return undefined;
    const currentSlide = lesson.slides[slideIndex];
    getSlideNarrationQueue(currentSlide, speechEnabled).forEach((path) => speakLessonAudio(path));

    return () => {
      stopSpeech();
    };
  }, [lesson, slideIndex, speechEnabled]);

  function handleReplayNarration() {
    if (!lesson) return;
    stopSpeech();
    const currentSlide = lesson.slides[slideIndex];
    getSlideNarrationQueue(currentSlide, speechEnabled).forEach((path) => speakLessonAudio(path));
  }

  // Prose clips run 50–70s, so the learner needs a way out that is not "disable
  // speech globally". stopSpeech() clears the shared queue and the current clip.
  function handleStopNarration() {
    stopSpeech();
  }

  function handleContinue() {
    if (slideIndex < lesson.slides.length - 1) {
      setSlideIndex(i => i + 1);
    } else if (lesson.socratic != null) {
      go('socratic', { lessonId });
    } else if (
      (lesson.confirmationChallenges?.length > 0) ||
      (lesson.confirmationCategory != null && lesson.confirmationCount > 0)
    ) {
      go('clchallenge', {
        lessonId,
        lessonTitle: lesson.title,
        confirmationCategory: lesson.confirmationCategory,
        confirmationCount: lesson.confirmationCount,
        confirmationChallenges: lesson.confirmationChallenges || null,
      });
    } else {
      store.saveLessonProgress(lessonId, 'complete');
      track('lesson_completed', { lessonId });
      go('saga');
    }
  }

  // Authored window highlights (slides[].windowHighlights) → Board's zhCells capsule
  // renderer. Memoized so the array reference is stable across re-renders triggered by
  // unrelated state (narration): Board's boardPropsAreEqual comparator falls back to
  // Object.is for non-`board` props, so a fresh-but-equal array would defeat the memo.
  // Hoisted above the loading/error early returns — rules of hooks.
  const zhCells = useMemo(
    () => windowHighlightsToZhCells(lesson?.slides?.[slideIndex]?.windowHighlights),
    [lesson, slideIndex],
  );

  // Derived per-cell live-window counts (slides[].windowCounts), stamped into the lesson
  // JSON by saveLessonFile. Memoized for the same reason as zhCells: Board's
  // boardPropsAreEqual falls back to Object.is for non-`board` props, so a fresh-but-equal
  // array every render would defeat the memo.
  const windowCounts = useMemo(
    () => (lesson?.slides?.[slideIndex]?.showWindowCounts === true
      ? lesson.slides[slideIndex].windowCounts ?? null
      : null),
    [lesson, slideIndex],
  );

  if (loadState === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <TopBar onBack={() => goBack()} onLogoClick={() => go('home')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
          {t('common.loading', 'Loading…')}
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !lesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <TopBar onBack={() => goBack()} onLogoClick={() => go('home')} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{t('common.error', 'Something went wrong.')}</p>
          <button className="btn btn-ghost" onClick={() => goBack()}>{t('common.back', 'Back')}</button>
        </div>
      </div>
    );
  }

  const slide = lesson.slides[slideIndex];
  const legendItems = slide.legendItems ?? [];
  // The exact board+overlays handed to <Board> below — the legend resolves its `win`
  // swatch from these, so the swatch and the ring can never disagree (OI-168).
  const slideBoard = boardSpecToBoard(slide.boardSpec);
  const slideOverlays = slide.overlays ?? [];
  // Window highlights get their OWN legend rows rather than going through legendItems:
  // the content gate requires every legendItems[].type to have a matching per-cell
  // overlay of that type on the same slide, and a window has no such overlay.
  const windowLegendItems = (slide.windowHighlights ?? []).filter(w => w.label);
  const hasLegend = legendItems.length > 0 || windowLegendItems.length > 0 || slide.showWindowCounts === true;


  return (
    // height (not minHeight) + minHeight:0 on the scroller: the root is pinned to the
    // viewport so the content area scrolls INTERNALLY and the Toolbar stays reachable
    // at the viewport bottom (QA 2026-07-25: Continue sat below the fold on mobile
    // because minHeight let the root grow past the viewport). 100dvh tracks the mobile
    // dynamic viewport; this codebase already uses it unconditionally elsewhere.
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar
        title={lesson.title}
        onBack={() => go('saga')}
        meta={`${slideIndex + 1} / ${lesson.slides.length}`}
        onLogoClick={() => go('home')}
      />

      {/* hasNarration is passed explicitly because CoachDialog's own derivation only
          sees messages[].audio — a slide whose only clip is the prose would otherwise
          show no controls. */}
      {/* maxBubblesHeight: OI-167. The shared 120px default cut the TOP off the three
          claimeven slides whose coach copy passes ~200 chars (measured 120/139), so the
          sentence read as starting mid-thought. 200 clears 139 with headroom for Spanish,
          which runs longer than the English it is translated from. It is a maxHeight, so
          the 40-odd slides under the old cap are laid out exactly as before and lose no
          prose height. */}
      <CoachDialog
        messages={slide.coachMessages}
        onReplay={handleReplayNarration}
        onStop={handleStopNarration}
        hasNarration={getSlideNarrationQueue(slide, true).length > 0}
        maxBubblesHeight={200}
      />

      {/* Board + legend are pinned (flexShrink: 0); only the infoProse panel scrolls.
          Reading long prose used to scroll the board off screen, which defeats the
          point — the prose is talking about the board. `overflowY: 'auto'` here is the
          graceful-degradation path only: it engages when the viewport cannot fit the
          board plus the prose panel's minHeight floor. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '0 18px 8px' }}>
        <div data-testid="concept-board-block" style={{ flexShrink: 0 }}>
        {/* The board is width-driven (square cells, width: 100%), so the only way to
            cap its HEIGHT is to cap its width. On a tall viewport this maxWidth exceeds
            the column width and does nothing; on a short one it shrinks the board so the
            prose panel below keeps a usable share instead of collapsing to its floor.
            Measured on 390x740: without it the prose got exactly its 96px minimum. */}
        <div style={{ width: '100%', maxWidth: 'calc(34dvh * 7 / 6)', margin: '0 auto' }}>
        <Board
          board={slideBoard}
          canPlay={false}
          overlays={slideOverlays}
          zhCells={zhCells}
          windowCounts={windowCounts}
        />
        </div>

        {hasLegend && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {legendItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: swatchColor(item.type, { board: slideBoard, overlays: slideOverlays }),
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {item.label}
                </span>
              </div>
            ))}
            {windowLegendItems.map((w, i) => (
              <div key={`w${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Pill swatch, not a square: it reads as the capsule drawn on the board.
                    Board renders the capsule at opacity 0.4, so match that here. */}
                <span style={{
                  display: 'inline-block',
                  width: 24,
                  height: 12,
                  borderRadius: 6,
                  background: WINDOW_HIGHLIGHT_COLOR[w.type] ?? DEFAULT_WINDOW_HIGHLIGHT_COLOR,
                  opacity: 0.4,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {w.label}
                </span>
              </div>
            ))}
            {slide.showWindowCounts === true && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Swatch at peak tint, so it reads as the darkest square on the board. */}
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: windowCountTint(WINDOW_COUNT_MAX),
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {t('lesson.windowCounts.legend', 'Four-in-a-rows still open to you')}
                </span>
              </div>
            )}
          </div>
        )}
        </div>

        <InfoProsePanel infoProse={slide.infoProse} />
      </div>

      <Toolbar>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleContinue}>
          {t('common.continue', 'Continue')}
        </button>
      </Toolbar>
    </div>
  );
}
