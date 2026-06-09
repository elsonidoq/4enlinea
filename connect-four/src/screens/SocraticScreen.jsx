import { useState, useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Board } from '../components/Board.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { ToolButton } from '../components/ToolButton.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { boardSpecToBoard } from '../lib/board.js';
import { socraticReducer } from '../lib/socraticReducer.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function SocraticScreen({ go, goBack, lessonId }) {
  const { t } = useTranslation();
  const { store } = useStore();
  const [lesson, setLesson] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [phase, dispatch] = useReducer(socraticReducer, 'ask');
  const [showHint, setShowHint] = useState(false);

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
        console.error('[SocraticScreen] fetch error:', err);
        setLoadState('error');
      });
  }, [lessonId]);


  function advance() {
    if (
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

  function handleColumnClick(col) {
    if (phase !== 'ask' && phase !== 'wrong1') return;
    const correct = col === lesson.socratic.correctCol;
    dispatch({ type: correct ? 'CORRECT' : 'WRONG' });
  }

  if (loadState === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar onBack={() => goBack()} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
          {t('common.loading', 'Loading…')}
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !lesson || !lesson.socratic) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar onBack={() => goBack()} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{t('common.error', 'Something went wrong.')}</p>
          <button className="btn btn-ghost" onClick={() => goBack()}>{t('common.back', 'Back')}</button>
        </div>
      </div>
    );
  }

  const { socratic } = lesson;
  const correctCol = socratic.correctCol;

  // Derive overlays — only add win overlay in wrong2
  const overlays = phase === 'wrong2'
    ? [{ c: correctCol, r: socratic.boardSpec[correctCol].length, type: 'win' }]
    : [];

  // CoachDialog messages
  const coachMessages = showHint
    ? [{ text: t(`lesson.${lessonId}.socratic.hint`, { defaultValue: t('socratic.hint') }), mood: 'think' }]
    : {
        ask:     [{ text: t(`lesson.${lessonId}.socratic.ask`,     { defaultValue: t('socratic.ask') }),     mood: 'think' }],
        wrong1:  [{ text: t('socratic.wrong1'),  mood: 'oops' }],
        wrong2:  [{ text: t('socratic.wrong2'),  mood: 'oops' }],
        correct: [{ text: t(`lesson.${lessonId}.socratic.correct`, { defaultValue: t('socratic.correct') }), mood: 'happy' }],
      }[phase];

  const canPlay = phase === 'ask' || phase === 'wrong1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t(`lesson.${lessonId}.title`, { defaultValue: '' })}
        onBack={() => go('saga')}
      />

      <CoachDialog messages={coachMessages} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 8px' }}>
        <Board
          board={boardSpecToBoard(socratic.boardSpec)}
          canPlay={canPlay}
          onColumnClick={handleColumnClick}
          overlays={overlays}
        />
      </div>

      <Toolbar>
        <ToolButton
          icon="help"
          label={t('common.hint', 'Hint')}
          onClick={() => setShowHint(true)}
        />
        {(phase === 'correct' || phase === 'wrong2') && (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={advance}>
            {t('common.continue', 'Continue')}
          </button>
        )}
      </Toolbar>
    </div>
  );
}
