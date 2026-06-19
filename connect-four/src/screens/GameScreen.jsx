import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Board } from '../components/Board.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { useGameBoard } from '../lib/useGameBoard.js';
import { useAudio } from '../lib/useAudio.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function GameScreen({ go, goBack, goReplace, difficulty, side, initialMoves = '' }) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const { playSfx, playMusic, pauseMusic, sfxEnabled, musicEnabled, speechEnabled, toggleSfx, toggleMusic, toggleSpeech } = useAudio();
  const { speakCoachMessage } = useCoachSpeech();

  const landingSoundTimerRef = useRef(null);

  const DISC_LAND_DELAY_MS = 450;
  const POST_GAME_SOUND_MS = 1500;

  // ── Game persistence ────────────────────────────────────────────
  async function saveGame(result, finalMoves) {
    const soundStartedAt = Date.now();
    playSfx(result === 'win' ? 'win' : 'lost');

    const movesStr = finalMoves ? finalMoves.join('') : '';

    // 1. Get device_uuid
    let device_uuid = '';
    try {
      const profile = await store.getProfile();
      device_uuid = profile.device_uuid;
    } catch (e) {
      // fallback: empty string
    }

    // 2. POST /api/games (fire-and-forget)
    let gameId = null;
    try {
      const res = await fetch(`${API}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_uuid,
          moves: movesStr,
          difficulty,
          side,
          result,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        gameId = data.id;
      }
    } catch (e) {
      // proceed with null id on network failure
    }

    // 3. Store methods (fire-and-forget)
    try { await store.saveSparringRecord(result); } catch (e) {}
    try { await store.recordActivityDay(); } catch (e) {}

    // 4. Analytics
    track('game_ended', { result, moveCount: movesStr.length, difficulty });

    // 5. Wait for sound to finish, then navigate to review screen
    const elapsed = Date.now() - soundStartedAt;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, POST_GAME_SOUND_MS - elapsed)));
    goReplace('review', { id: gameId });
  }

  // ── Game board hook ─────────────────────────────────────────────
  const {
    moveHistory,
    board,
    heights,
    fullCols,
    lastDrop,
    aiThinking,
    gameOver,
    hintOverlays,
    hintActive,
    coachMessages,
    lastCoachKeyRef,
    handleColumnClick,
    handleHintToggle,
    handleResign,
    userTurn,
  } = useGameBoard({ initialMoves: initialMoves || '', side, difficulty, onGameEnd: saveGame });

  // ── Audio: wrapped column click ──────────────────────────────────
  function onColumnClick(col) {
    if (!userTurn || gameOver || aiThinking) return;
    if (heights[col] >= 6) return;
    handleColumnClick(col);
  }

  // ── Audio: landing sound (both players) ─────────────────────────────
  useEffect(() => {
    if (!lastDrop) return;
    clearTimeout(landingSoundTimerRef.current);
    const key = lastDrop.r === 0
      ? 'disc_land_bottom'
      : (Math.random() < 0.5 ? 'disc_land_disc' : 'disc_land_disc_2');
    landingSoundTimerRef.current = setTimeout(() => playSfx(key), DISC_LAND_DELAY_MS);
    return () => clearTimeout(landingSoundTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDrop]);

  // ── Audio: coach speech playback ─────────────────────────────────
  useEffect(() => {
    if (lastCoachKeyRef.current) {
      speakCoachMessage(lastCoachKeyRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachMessages.length]);

  // ── Audio: background music lifecycle ────────────────────────────
  useEffect(() => {
    playMusic();
    return () => pauseMusic();
  }, [playMusic, pauseMusic]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <TopBar
        title="Game"
        onBack={() => go('difficulty')}
        meta={`Move ${moveHistory.length}`}
        rightIcon="gear"
        onRight={() => {}}
      />

      <CoachDialog fixed messages={coachMessages} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/*
            lastDrop audit (034): lastDrop comes from useGameBoard hook.
            It is set on both user moves (line 299) and AI moves (line 136).
            Intentional — sparring gameplay always animates the just-placed disc. OK.
          */}
          <Board
            board={board}
            onColumnClick={onColumnClick}
            canPlay={userTurn && !gameOver && !aiThinking}
            fullCols={fullCols}
            lastDrop={lastDrop}
            overlays={hintOverlays}
          />
        </div>
      </div>

      <Toolbar>
        <button
          type="button"
          onClick={handleHintToggle}
          disabled={!userTurn || gameOver || aiThinking}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
            background: hintActive ? 'var(--disc-green)' : 'rgba(0,0,0,0.04)',
            cursor: (userTurn && !gameOver && !aiThinking) ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            color: hintActive ? '#fff' : 'var(--ink)',
            opacity: (userTurn && !gameOver && !aiThinking) ? 1 : 0.4,
            transition: 'background .15s, color .15s',
          }}
        >
          {hintActive ? 'Hint on' : t('sparring.hintsOn')}
        </button>

        <button
          type="button"
          onClick={handleResign}
          disabled={gameOver !== null}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
            background: 'rgba(232,84,62,0.08)',
            cursor: gameOver ? 'default' : 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            color: 'var(--red)', opacity: gameOver ? 0.4 : 1,
          }}
        >
          Resign
        </button>

        {/* Audio toggle buttons */}
        <button
          type="button"
          onClick={toggleSfx}
          aria-label={sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          title={sfxEnabled ? 'SFX on' : 'SFX off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Icon name={sfxEnabled ? 'speaker' : 'speakerOff'} size={22} color={sfxEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>

        <button
          type="button"
          onClick={toggleMusic}
          aria-label={musicEnabled ? 'Mute music' : 'Unmute music'}
          title={musicEnabled ? 'Music on' : 'Music off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Icon name={musicEnabled ? 'music' : 'musicOff'} size={22} color={musicEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>

        <button
          type="button"
          onClick={toggleSpeech}
          aria-label={speechEnabled ? 'Mute speech' : 'Unmute speech'}
          title={speechEnabled ? 'Speech on' : 'Speech off'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Icon name={speechEnabled ? 'speaker' : 'speakerOff'} size={22} color={speechEnabled ? 'var(--ink-soft)' : 'var(--ink-faint)'} />
        </button>
      </Toolbar>
    </div>
  );
}
