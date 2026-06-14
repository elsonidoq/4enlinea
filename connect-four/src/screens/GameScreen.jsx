import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Board } from '../components/Board.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { useGameBoard } from '../lib/useGameBoard.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function GameScreen({ go, goBack, goReplace, difficulty, side, initialMoves = '' }) {
  const { t } = useTranslation();
  const { store, session } = useStore();

  // ── Game persistence ────────────────────────────────────────────
  async function saveGame(result, finalMoves) {
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
      const headers = { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) };
      const res = await fetch(`${API}/api/games`, {
        method: 'POST',
        headers,
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

    // 5. Navigate to review screen (replaces the /game entry in browser history)
    goReplace('review', { id: gameId });
  }

  // ── Game board hook ─────────────────────────────────────────────
  const {
    moveHistory,
    board,
    fullCols,
    lastDrop,
    aiThinking,
    gameOver,
    hintOverlays,
    hintActive,
    coachMessages,
    handleColumnClick,
    handleHintToggle,
    handleResign,
    userTurn,
  } = useGameBoard({ initialMoves: initialMoves || '', side, difficulty, onGameEnd: saveGame });

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
          <Board
            board={board}
            onColumnClick={handleColumnClick}
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
      </Toolbar>
    </div>
  );
}
