import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Board } from '../components/Board.jsx';
import { Icon } from '../components/Icon.jsx';
import { AudioToggleButton } from '../components/AudioToggleButton.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { useGameBoard } from '../lib/useGameBoard.js';
import { createOnboardingSeenGate } from '../lib/onboardingFirstMove.js';
import { pickGameEndScreen } from '../lib/onboardingGameEnd.js';
import { createOnboardingSkipHandler } from '../lib/onboardingSkip.js';
import { useAudio } from '../lib/useAudio.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function GameScreen({ go, goReplace, difficulty, side, initialMoves = '', onboarding = false }) {
  const { t } = useTranslation();
  const { store } = useStore();
  const { playSfx, playMusic, pauseMusic, sfxEnabled, musicEnabled, speechEnabled, toggleSfx, toggleMusic, toggleSpeech } = useAudio();
  const { speakCoachMessage } = useCoachSpeech();

  const landingSoundTimerRef = useRef(null);
  // FR-005 (research.md R5): one-shot 'seen' engagement signal, created once
  // per mount so its internal "moved" flag survives re-renders without
  // triggering any of its own.
  const onboardingSeenGateRef = useRef(null);
  if (onboardingSeenGateRef.current === null) {
    onboardingSeenGateRef.current = createOnboardingSeenGate({
      onboarding,
      updateProfile: (patch) => store.updateProfile(patch),
    });
  }

  // Epic 8 — Onboarding Experience, US4 (T041, FR-009): skip control, only
  // rendered when onboarding === true. Fire-and-forget 'skipped' write +
  // analytics + immediate route to Home (createOnboardingSkipHandler owns
  // the exact semantics, unit-tested in onboardingSkip.test.js).
  const onboardingSkipHandlerRef = useRef(null);
  if (onboardingSkipHandlerRef.current === null) {
    onboardingSkipHandlerRef.current = createOnboardingSkipHandler({
      updateProfile: (patch) => store.updateProfile(patch),
      track,
      go,
    });
  }

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
    } catch {
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
    } catch {
      // proceed with null id on network failure
    }

    // 3. Store methods (fire-and-forget)
    try { await store.saveSparringRecord(result); } catch { /* fire-and-forget: ignore */ }
    try { await store.recordActivityDay(); } catch { /* fire-and-forget: ignore */ }

    // 4. Analytics
    track('game_ended', { result, moveCount: movesStr.length, difficulty });

    // 5. Wait for sound to finish, then navigate onward. Epic 8 — Onboarding Experience, US3
    // (T034, research.md R5): every end-of-game outcome (win/loss/draw via the normal flow,
    // resign via handleResign()'s onGameEnd?.(...) call into this same saveGame() seam) funnels
    // through this one branch point. Feature 2: every outcome routes to the post-game review
    // screen; an onboarding session advances from there to the import offer via review's own
    // Continue CTA, so we pass the `onboarding` flag through as a nav param.
    const elapsed = Date.now() - soundStartedAt;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, POST_GAME_SOUND_MS - elapsed)));
    goReplace(pickGameEndScreen(onboarding), { id: gameId, onboarding, result });
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

  // ── Onboarding: thin wrapper around the human-move handler ───────
  // Fires the 'seen' engagement signal on the first move only (FR-005), via
  // the pure gate above. This is a simple engagement signal, NOT
  // aha/coach-reaction detection (research.md R5) — useGameBoard.js itself
  // stays unchanged.
  function handleColumnClickWithOnboarding(col) {
    onboardingSeenGateRef.current();
    handleColumnClick(col);
  }

  // ── Audio: wrapped column click ──────────────────────────────────
  function onColumnClick(col) {
    if (!userTurn || gameOver || aiThinking) return;
    if (heights[col] >= 6) return;
    handleColumnClickWithOnboarding(col);
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
        title={t('game.title')}
        onBack={() => go('difficulty')}
        meta={t('game.move', { n: moveHistory.length })}
        rightIcon="gear"
        onRight={() => {}}
        onLogoClick={() => go('home')}
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
          {hintActive ? t('sparring.hintActive') : t('sparring.hintsOn')}
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
          {t('game.resign')}
        </button>

        {/* Epic 8 — Onboarding Experience, US4 (T041/FR-009): skip control, onboarding sessions only */}
        {onboarding && (
          <button
            type="button"
            onClick={() => onboardingSkipHandlerRef.current()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
              background: 'rgba(0,0,0,0.04)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
              color: 'var(--ink-soft)',
            }}
          >
            {t('onboarding.skip')}
          </button>
        )}

        {/* Audio toggle buttons */}
        <AudioToggleButton
          enabled={sfxEnabled}
          onToggle={toggleSfx}
          ariaLabel={sfxEnabled ? t('audio.muteSfx') : t('audio.unmuteSfx')}
          title={sfxEnabled ? t('audio.sfxOn') : t('audio.sfxOff')}
          iconOn="speaker"
          iconOff="speakerOff"
        />

        <AudioToggleButton
          enabled={musicEnabled}
          onToggle={toggleMusic}
          ariaLabel={musicEnabled ? t('audio.muteMusic') : t('audio.unmuteMusic')}
          title={musicEnabled ? t('audio.musicOn') : t('audio.musicOff')}
          iconOn="music"
          iconOff="musicOff"
        />

        <AudioToggleButton
          enabled={speechEnabled}
          onToggle={toggleSpeech}
          ariaLabel={speechEnabled ? t('audio.muteSpeech') : t('audio.unmuteSpeech')}
          title={speechEnabled ? t('audio.speechOn') : t('audio.speechOff')}
          iconOn="speaker"
          iconOff="speakerOff"
        />
      </Toolbar>
    </div>
  );
}
