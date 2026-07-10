import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Board } from '../components/Board.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { boardSpecToBoard } from '../lib/board.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

const OVERLAY_SWATCH_COLOR = {
  tg:    'rgba(76, 175, 80, 0.4)',
  td:    'rgba(150, 150, 150, 0.4)',
  claim: 'var(--claim, #f59e0b)',
  win:   'rgba(76, 175, 80, 0.9)',
};

function swatchColor(type) {
  return OVERLAY_SWATCH_COLOR[type] ?? 'rgba(128, 128, 128, 0.4)';
}

export function ConceptScreen({ go, goBack, lessonId }) {
  const { t } = useTranslation();
  const { store } = useStore();
  const [lesson, setLesson] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [slideIndex, setSlideIndex] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/lessons/${lessonId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setLesson(data);
        setLoadState('ready');
      })
      .catch(err => {
        console.error('[ConceptScreen] fetch error:', err);
        setLoadState('error');
      });
  }, [lessonId]);

  // Track lesson start exactly once when lesson first loads
  useEffect(() => {
    if (slideIndex === 0 && lesson && !startedRef.current) {
      startedRef.current = true;
      track('lesson_started', { lessonId });
    }
  }, [lesson]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loadState === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar onBack={() => goBack()} onLogoClick={() => go('home')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
          {t('common.loading', 'Loading…')}
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !lesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
  const hasLegend = legendItems.length > 0;
  const hasInfoProse = slide.infoProse && slide.infoProse.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t(`lesson.${lessonId}.title`, { defaultValue: lesson.title })}
        onBack={() => go('saga')}
        meta={`${slideIndex + 1} / ${lesson.slides.length}`}
        onLogoClick={() => go('home')}
      />

      <CoachDialog messages={slide.coachMessages} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 8px' }}>
        <Board
          board={boardSpecToBoard(slide.boardSpec)}
          canPlay={false}
          overlays={slide.overlays ?? []}
        />

        {hasLegend && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {legendItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: swatchColor(item.type),
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasInfoProse && (
          <div style={{
            marginTop: 12,
            padding: '12px 14px',
            background: '#fff',
            borderRadius: 12,
            boxShadow: 'var(--shadow-sm)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--ink)',
          }}>
            {slide.infoProse}
          </div>
        )}
      </div>

      <Toolbar>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleContinue}>
          {t('common.continue', 'Continue')}
        </button>
      </Toolbar>
    </div>
  );
}
