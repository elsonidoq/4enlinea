import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// The shared i18next instance — used inside the `useCallback([])` websocket closure,
// where a `t` captured at first render could resolve against a stale language.
import i18n from '../i18n/index.js';
import { useBoardState } from '../lib/useBoardState.js';
import { TopBar } from '../components/TopBar.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Board } from '../components/Board.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';

// ── Socket.IO v4 wire helpers ──────────────────────────────────────────────

function parseMessage(raw) {
  if (typeof raw !== 'string') return { eio: -1 };
  const eio = Number(raw[0]);
  if (eio !== 4) return { eio };
  const sio = Number(raw[1]);
  const rest = raw.slice(2);
  if ((sio === 2 || sio === 3) && rest.length > 0) {
    let id;
    let jsonStart = 0;
    const match = rest.match(/^(\d+)/);
    if (match && match.index === 0) {
      id = Number(match[1]);
      jsonStart = match[1].length;
    }
    try {
      const data = JSON.parse(rest.slice(jsonStart));
      return { eio, sio, id, data };
    } catch {
      return { eio, sio, id, rest: rest.slice(jsonStart) };
    }
  }
  return { eio, sio };
}

function emit(ws, event, payload, msgId) {
  const prefix = msgId != null ? `4${msgId}` : '42';
  console.log('[papergames →]', event, payload);
  ws.send(prefix + JSON.stringify([event, payload]));
}

// ── Component ──────────────────────────────────────────────────────────────

export function PlayOnlineScreen({ go, goBack }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('idle');
  const [queueCount, setQueueCount] = useState(null);
  const [roomUid, setRoomUid] = useState(null);
  // i18n: hold the *key*, not the resolved string. `setErrorMsg` fires from inside a
  // useCallback([]) closure, so a `t()` captured there could resolve against a stale
  // language; translating at render time keeps the message in the learner's locale.
  const [errorMsg, setErrorMsg] = useState('');

  // Game-level React state (triggers re-render)
  const [gameStatus, setGameStatus] = useState(''); // '' | 'your-turn' | 'opponent-turn' | 'you-win' | 'you-lose' | 'draw'
  const [opponentName, setOpponentName] = useState('');

  // Board side — updated when game:start fires
  const [side, setSide] = useState('first');

  // Shown when an anonymous user finishes a game (save returns 401).
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const { store } = useStore();
  // Single-save guard: saveAndReview can fire from both the commitMove path
  // and the game:finish path for a normal win. Reset in retry().
  const savedRef = useRef(false);

  const wsRef = useRef(null);
  const msgIdRef = useRef(20);
  const joinedRef = useRef(false);
  const roomUidRef = useRef(null);

  // WebSocket-level metadata (doesn't trigger re-renders).
  // Trimmed in T1: moves, playableFrames, isFinished removed.
  const gameRef = useRef({
    ourUserId: null,
    ourSymbol: null,         // 'circle-dark' or 'circle-light'
    opponentSymbol: null,
    isOurTurn: false,
    winnerId: null,
  });

  // ── useBoardState — pure board mechanics ──────────────────────────────────
  const {
    moveHistory,
    board,
    heights,
    fullCols,
    lastDrop,
    gameOver,
    userTurn,
    userColor,
    commitMove,
    reset,
  } = useBoardState({ initialMoves: '', side });

  // boardApiRef mirrors live hook values so the ws.onmessage closure (defined
  // once inside start()) can read fresh values without stale-closure risk.
  // commitMove and reset are stable (no deps in useCallback), but we include
  // them here for convenience. handleColumnClick is invoked by React's event
  // system so it can close over React state directly.
  const boardApiRef = useRef(null);

  // resetRef: stable ref so game:start handler (long-lived closure) can call
  // reset() without stale-closure risk. reset is stable from useBoardState
  // but isn't in boardApiRef, so we keep a dedicated ref.
  const resetRef = useRef(reset);
  // Intentional "latest ref" pattern: the game:start handler lives in a closure
  // created once inside start() and must call the current reset. See the
  // boardApiRef rule in docs/architecture/frontend-conventions.md.
  // eslint-disable-next-line react-hooks/refs
  resetRef.current = reset;

  // ── saveAndReview — save the finished game and navigate to review ─────────
  // Save-fast strategy: POST the game row, navigate to ReviewScreen immediately;
  // blunder extraction runs fire-and-forget server-side. Anonymous users (401)
  // get a login prompt instead of navigation.
  // Call sites: handleColumnClick (our win/draw), game:action handler
  // (opponent win/draw), handleResign (we resign), game:finish handler
  // (timeout/resign/disconnect — secondary path).
  const saveAndReview = useCallback(async (result, finalMoveHistory) => {
    if (savedRef.current) return; // guard against double-fire
    savedRef.current = true;

    // Update status display
    if (result === 'win') setGameStatus('you-win');
    else if (result === 'loss') setGameStatus('you-lose');
    else setGameStatus('draw');

    // Analytics + streak — same as GameScreen
    track('game_ended', { result, moveCount: finalMoveHistory.length, source: 'online' });
    try { await store.recordActivityDay(); } catch { /* non-fatal */ }

    const rid = roomUidRef.current;
    const g = gameRef.current;
    if (!rid || !g.ourUserId) return;

    try {
      const res = await fetch('/api/user/papergames/save-live-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomUid: rid, papergamesAccountId: g.ourUserId }),
      });

      if (res.status === 401) {
        // Anonymous user — show login prompt, stay on screen
        setShowLoginPrompt(true);
        return;
      }

      if (res.ok) {
        const { id } = await res.json();
        go('review', { id });
      }
    } catch (err) {
      console.error('[save-live-game]', err);
    }
  }, [go, store]);

  // boardApiRef mirrors live hook values so the ws.onmessage closure (defined
  // once inside start()) can read fresh values without stale-closure risk.
  // saveAndReview is included here because the WS handlers (game:action,
  // game:finish) must call the latest version, not the one captured when
  // start() first ran.
  // eslint-disable-next-line react-hooks/refs
  boardApiRef.current = { commitMove, heights, gameOver, moveHistory, saveAndReview };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ── Column click handler (React event — safe to close over React state) ──
  const handleColumnClick = useCallback((col) => {
    const ws = wsRef.current;
    const g = gameRef.current;
    const api = boardApiRef.current;
    if (!g.isOurTurn || api.gameOver || api.heights[col] >= 6 || !ws) return;
    const landingY = 5 - api.heights[col];
    emit(ws, 'game:action', { x: col, y: landingY, roomId: roomUidRef.current }, msgIdRef.current++);
    const { won, draw } = api.commitMove(col);
    g.isOurTurn = false;
    setGameStatus('opponent-turn');
    if (won || draw) {
      saveAndReview(won ? (userColor === 'red' ? 'win' : 'loss') : 'draw', [...api.moveHistory, col]);
    }
  }, [userColor, saveAndReview]);

  // ── Resign handler ────────────────────────────────────────────────────────
  const handleResign = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || boardApiRef.current.gameOver) return;
    // TODO: confirm papergames resign event name; fallback ws.close()
    emit(ws, 'game:resign', { roomId: roomUidRef.current }, msgIdRef.current++);
    setGameStatus('you-lose');
    saveAndReview('loss', boardApiRef.current.moveHistory);
  }, [saveAndReview]);

  // ── Start / matchmaking ────────────────────────────────────────────────
  const start = useCallback(async () => {
    setPhase('registering');
    setErrorMsg('');

    const fingerprint = String(Date.now());

    try {
      const regRes = await fetch('/api/papergames/guest-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Player', fingerprint }),
      });
      if (!regRes.ok) throw new Error(`Registration failed: ${regRes.status}`);
      const { access } = await regRes.json();

      const tRes = await fetch(`/api/papergames/tournament/open`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!tRes.ok) throw new Error(`Tournament fetch failed: ${tRes.status}`);
      const { uid: tournamentUid } = await tRes.json();

      setPhase('searching');

      const ws = new WebSocket(
        `wss://papergames.io/socket.io/?locale=en&fp=${fingerprint}&EIO=4&transport=websocket`
      );
      wsRef.current = ws;

      ws.onopen = () => {};

      ws.onmessage = (evt) => {
        const msg = parseMessage(evt.data);

        if (msg.eio === 2) {
          ws.send('3');
          return;
        }

        if (msg.eio === 0) {
          ws.send(`40{"token":"${access}"}`);
          return;
        }

        if (msg.eio === 4 && msg.sio === 2 && msg.data) {
          const [eventName, payload] = msg.data;

          // Full logging for game events
          if (eventName === 'game:start' || eventName === 'game:action' || eventName === 'game:finish') {
            console.log(`[papergames ←] ${eventName}:`, JSON.stringify(payload, null, 2));
          } else {
            console.log(`[papergames ←] ${eventName}:`, JSON.stringify(payload));
          }

          // ── Matchmaking ──────────────────────────────────────────────

          if (eventName === 'user:connect') {
            msgIdRef.current = 20;
            joinedRef.current = false;
            gameRef.current.ourUserId = payload?.userId || null;
            emit(ws, 'tournament:subscribe', { uid: tournamentUid }, msgIdRef.current++);
            emit(ws, 'match-maker:enqueue', { uid: tournamentUid, csi: crypto.randomUUID() }, msgIdRef.current++);
          }

          if (eventName === 'match-maker:queue-statistics') {
            setQueueCount(payload?.queuedPlayers ?? null);
          }

          if (eventName === 'room:join-auto' && !joinedRef.current) {
            const rid = payload?.roomUid;
            if (rid) {
              joinedRef.current = true;
              roomUidRef.current = rid;
              setRoomUid(rid);
              setPhase('found');
              // Store our symbol from matchmaker
              if (payload?.symbol) {
                gameRef.current.ourSymbol = payload.symbol;
                gameRef.current.opponentSymbol = payload.symbol === 'circle-dark' ? 'circle-light' : 'circle-dark';
              }
              emit(ws, 'match-maker:deueue', { uid: tournamentUid }, msgIdRef.current++);
              emit(ws, 'room:view', rid, msgIdRef.current++);
              // Send game:start as the "I'm ready" signal
              console.log('[papergames →] game:start (ready)', rid);
              ws.send('4' + (msgIdRef.current++) + JSON.stringify(['game:start', rid]));
            }
          }

          // ── Game start ───────────────────────────────────────────────

          if (eventName === 'game:start' && payload?.isStarted && !payload?.isFinished) {
            let rid = roomUidRef.current;
            if (!rid && typeof payload === 'object') {
              rid = payload.roomUid || payload.roomId;
            }
            if (rid) {
              console.log('[papergames →] game:start (ack)', rid);

              const g = gameRef.current;
              g.ourUserId = payload?.currentPlayer?.id || g.ourUserId;

              // Find opponent in players list
              const opponent = (payload?.players || []).find(p => p.id !== g.ourUserId);
              if (opponent) {
                setOpponentName(opponent.name || i18n.t('playOnline.opponent'));
                if (!g.opponentSymbol && opponent.symbol) {
                  g.opponentSymbol = opponent.symbol;
                  g.ourSymbol = opponent.symbol === 'circle-dark' ? 'circle-light' : 'circle-dark';
                }
              }

              // Determine side: currentPlayer in game:start = first player
              const firstPlayerId = payload?.currentPlayer?.id;
              const newSide = firstPlayerId === g.ourUserId ? 'first' : 'second';
              g.isOurTurn = firstPlayerId === g.ourUserId;
              g.winnerId = null;

              // Update side state and reset board
              setSide(newSide);
              resetRef.current(); // clears moveHistory, lastDrop, gameOver

              setGameStatus(g.isOurTurn ? 'your-turn' : 'opponent-turn');

              // Acknowledge
              ws.send('4' + (msgIdRef.current++) + JSON.stringify(['game:start', rid]));
              setPhase('playing');
            } else {
              console.warn('[papergames] game:start received but no roomUid available');
            }
          }

          // ── Game action (move) ───────────────────────────────────────

          if (eventName === 'game:action') {
            const act = payload?.action?.action;
            const moverId = payload?.action?.userId;
            const g = gameRef.current;
            const api = boardApiRef.current;

            if (act && moverId && moverId !== g.ourUserId) {
              // Opponent's move — commit via boardApiRef (commitMove is stable)
              const { won, draw } = api.commitMove(act.x);
              if (won || draw) {
                const status = draw ? 'draw' : 'you-lose';
                setGameStatus(status);
                // Read saveAndReview through boardApiRef — this closure was
                // created once in start() and would otherwise hold a stale ref.
                api.saveAndReview(draw ? 'draw' : 'loss', api.moveHistory);
              }
            }
            // Our own echo — skip (we already committed optimistically in handleColumnClick)

            if (payload?.action?.switchTurn) {
              g.isOurTurn = payload.action.currentUserIdTurn === g.ourUserId;
            }
            if (!api.gameOver) {
              setGameStatus(g.isOurTurn ? 'your-turn' : 'opponent-turn');
            }
          }

          // ── Game finish ──────────────────────────────────────────────

          if (eventName === 'game:finish') {
            const g = gameRef.current;
            const api = boardApiRef.current;
            const winnerId = payload?.winner?.id ?? payload?.winner;
            const result = !winnerId ? 'draw' : winnerId === g.ourUserId ? 'win' : 'loss';
            // Only fire if board didn't already detect the end (no winning disc = timeout/resign)
            if (!api.gameOver) {
              api.saveAndReview(result, api.moveHistory);
            }
            const status = !winnerId ? 'draw' : winnerId === g.ourUserId ? 'you-win' : 'you-lose';
            setGameStatus(status);
          }
        }
      };

      ws.onerror = () => {
        setErrorMsg('playOnline.errorConnection');
        setPhase('error');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
      };
    } catch (err) {
      console.error('[playOnline] start failed', err);
      setErrorMsg('common.error');
      setPhase('error');
    }
    // saveAndReview is accessed via boardApiRef.current inside the ws closure,
    // so it is intentionally not a dependency here.
  }, []);

  const retry = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    gameRef.current = {
      ourUserId: null,
      ourSymbol: null,
      opponentSymbol: null,
      isOurTurn: false,
      winnerId: null,
    };
    setPhase('idle');
    setQueueCount(null);
    setRoomUid(null);
    setErrorMsg('');
    setGameStatus('');
    setOpponentName('');
    setSide('first');
    setShowLoginPrompt(false);
    savedRef.current = false;
    resetRef.current(); // clears moveHistory, lastDrop, gameOver
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'playing' && roomUid) {
    // gameStatus is set to a terminal value by every end-of-game path, including
    // resign/timeout where useBoardState's gameOver stays null (no winning disc).
    const isGameOver = !!gameOver
      || gameStatus === 'you-win' || gameStatus === 'you-lose' || gameStatus === 'draw';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar
          title={t('playOnline.title')}
          onBack={goBack}
          meta={t('playOnline.moveMeta', { n: moveHistory.length })}
          onLogoClick={() => go('home')}
        />

        {/* Opponent banner — replaces CoachDialog */}
        <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 14, color: 'var(--ink-secondary)', minHeight: 36 }}>
          {opponentName
            ? <><span>vs </span><strong>{opponentName}</strong></>
            : <span style={{ opacity: 0.5 }}>{t('playOnline.waitingForOpponent')}</span>
          }
        </div>

        {/* DEBUG-ONLY: link to the live papergames room. Remove/hide before launch. */}
        {roomUid && (
          <div style={{ padding: '0 16px 4px', textAlign: 'center', fontSize: 12 }}>
            <a
              href={`https://papergames.io/en/r/${roomUid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink-secondary)', opacity: 0.6 }}
            >
              Open room on papergames ↗
            </a>
          </div>
        )}

        {/* Status line */}
        <div style={{ padding: '4px 16px', textAlign: 'center', fontWeight: 600, minHeight: 24 }}>
          {gameStatus === 'your-turn' && t('playOnline.yourTurn')}
          {gameStatus === 'opponent-turn' && t('playOnline.opponentThinking', { name: opponentName || t('playOnline.opponent') })}
          {gameStatus === 'you-win' && t('playOnline.youWon')}
          {gameStatus === 'you-lose' && t('playOnline.opponentWon', { name: opponentName || t('playOnline.opponent') })}
          {gameStatus === 'draw' && t('playOnline.draw')}
        </div>

        {/* Anonymous user — shown when the save returned 401 instead of navigating */}
        {showLoginPrompt && (
          <p style={{ margin: '4px 16px', textAlign: 'center', color: 'var(--ink-secondary)', fontSize: 14 }}>
            {t('playOnline.loginToSave')}
          </p>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <Board
              board={board}
              onColumnClick={handleColumnClick}
              canPlay={userTurn && !gameOver}
              fullCols={fullCols}
              lastDrop={lastDrop}
            />
          </div>
        </div>

        <Toolbar>
          {isGameOver ? (
            <button
              type="button"
              onClick={retry}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
                background: 'var(--disc-green, #4caf50)',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                color: '#fff',
              }}
            >
              {t('playOnline.playAgain')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResign}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
                background: 'rgba(232,84,62,0.08)',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                color: 'var(--red)',
              }}
            >
              {t('playOnline.resign')}
            </button>
          )}
        </Toolbar>
      </div>
    );
  }

  // Non-playing phases wrapped in TopBar chrome
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('playOnline.title')} onBack={goBack} onLogoClick={() => go('home')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
        {phase === 'idle' && (
          <button
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--disc-green, #4caf50)',
              color: '#fff',
              fontWeight: 600,
            }}
            onClick={start}
          >
            {t('playOnline.start')}
          </button>
        )}

        {phase === 'registering' && <p>{t('playOnline.registering')}</p>}

        {phase === 'searching' && (
          <p>
            {t('playOnline.searching')}
            {queueCount != null && t('playOnline.queueCount', { count: queueCount })}
          </p>
        )}

        {phase === 'found' && <p>{t('playOnline.found')}</p>}

        {phase === 'error' && (
          <div>
            <p style={{ color: 'var(--error, #e57373)' }}>{t(errorMsg)}</p>
            <button
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1.1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--disc-green, #4caf50)',
                color: '#fff',
                fontWeight: 600,
              }}
              onClick={retry}
            >
              {t('playOnline.tryAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
