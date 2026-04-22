import { useState, useEffect, useCallback, useRef } from "react";

const ROWS = 6;
const COLS = 7;
const EMPTY = null;
const HUMAN = "human";
const AI = "ai";

// ── Game logic ───────────────────────────────────────────────────────────────

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

function getAvailableRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--)
    if (board[r][col] === EMPTY) return r;
  return -1;
}

function dropPiece(board, col, player) {
  const nb = board.map(r => [...r]);
  const row = getAvailableRow(nb, col);
  if (row === -1) return null;
  nb[row][col] = player;
  return nb;
}

function isBoardFull(board) {
  return board[0].every(c => c !== EMPTY);
}

function checkWinner(board, player) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0,1,2,3].every(i => board[r][c+i] === player)) return [[r,c],[r,c+1],[r,c+2],[r,c+3]];
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => board[r+i][c] === player)) return [[r,c],[r+1,c],[r+2,c],[r+3,c]];
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0,1,2,3].every(i => board[r+i][c+i] === player)) return [[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]];
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0,1,2,3].every(i => board[r-i][c+i] === player)) return [[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]];
  return null;
}

function scoreWindow(w, player) {
  const opp = player === AI ? HUMAN : AI;
  const p = w.filter(c => c === player).length;
  const e = w.filter(c => c === EMPTY).length;
  const o = w.filter(c => c === opp).length;
  if (p === 4) return 100;
  if (p === 3 && e === 1) return 7;
  if (p === 2 && e === 2) return 0.5;
  if (o === 3 && e === 1) return -4;
  return 0;
}

function scoreBoard(board, player) {
  let score = 0;
  const mid = Math.floor(COLS / 2);
  score += board.map(r => r[mid]).filter(c => c === player).length * 3;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c],board[r][c+1],board[r][c+2],board[r][c+3]], player);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]], player);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c],board[r+1][c+1],board[r+2][c+2],board[r+3][c+3]], player);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c],board[r-1][c+1],board[r-2][c+2],board[r-3][c+3]], player);
  return score;
}

// Unified minimax — rootPlayer is who we're optimizing for (score is always from their POV)
function minimax(board, depth, alpha, beta, currentPlayer, rootPlayer) {
  const opp = currentPlayer === AI ? HUMAN : AI;
  if (checkWinner(board, rootPlayer)) return { score: 1000000 + depth };
  if (checkWinner(board, opp === rootPlayer ? currentPlayer : opp)) return { score: -1000000 - depth };
  if (isBoardFull(board) || depth === 0) return { score: scoreBoard(board, rootPlayer) };

  const cols = [3,2,4,1,5,0,6];
  const maximizing = currentPlayer === rootPlayer;
  let best = maximizing ? -Infinity : Infinity;
  let bestCol = cols.find(c => getAvailableRow(board, c) !== -1);

  for (const col of cols) {
    if (getAvailableRow(board, col) === -1) continue;
    const res = minimax(dropPiece(board, col, currentPlayer), depth-1, alpha, beta, opp, rootPlayer);
    if (maximizing) {
      if (res.score > best) { best = res.score; bestCol = col; }
      alpha = Math.max(alpha, best);
    } else {
      if (res.score < best) { best = res.score; bestCol = col; }
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }

  return { score: best, col: bestCol };
}

// Root-level AI move with random tie-breaking among equally-scored columns
function aiMove(board, depth) {
  const cols = [3,2,4,1,5,0,6];
  let best = -Infinity;
  let bestCols = [];
  for (const col of cols) {
    if (getAvailableRow(board, col) === -1) continue;
    const res = minimax(dropPiece(board, col, AI), depth, -Infinity, Infinity, HUMAN, AI);
    if (res.score > best) { best = res.score; bestCols = [col]; }
    else if (res.score === best) { bestCols.push(col); }
  }
  return bestCols[Math.floor(Math.random() * bestCols.length)];
}

// ── Analysis helpers ─────────────────────────────────────────────────────────

function boardToText(board) {
  const header = "     col1 col2 col3 col4 col5 col6 col7";
  const rows = board.map((row, r) =>
    `fila${r+1}  ` + row.map(cell =>
      cell === HUMAN ? " 🔴 " : cell === AI ? " 🟡 " : " ·  "
    ).join("")
  ).join("\n");
  return header + "\n" + rows;
}

function getActiveThreats(board) {
  const results = [];
  const directions = [
    { dr:0, dc:1, name:"horizontal" },
    { dr:1, dc:1, name:"diagonal ↘" },
    { dr:1, dc:-1, name:"diagonal ↙" },
  ];
  for (const player of [HUMAN, AI]) {
    const label = player === HUMAN ? "tuya (🔴)" : "IA (🟡)";
    for (const { dr, dc, name } of directions) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cells = [];
          let valid = true;
          for (let i = 0; i < 4; i++) {
            const nr = r + dr*i, nc = c + dc*i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
            cells.push({ r: nr, c: nc, v: board[nr][nc] });
          }
          if (!valid) continue;
          const mine = cells.filter(x => x.v === player).length;
          const empty = cells.filter(x => x.v === EMPTY).length;
          const opp = cells.filter(x => x.v !== player && x.v !== EMPTY).length;
          if (mine === 3 && empty === 1 && opp === 0) {
            const gap = cells.find(x => x.v === EMPTY);
            if (getAvailableRow(board, gap.c) === gap.r) {
              results.push(`Amenaza ${label} ${name}: ganar en col${gap.c+1} fila${gap.r+1}`);
            }
          }
        }
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        const cells = [0,1,2,3].map(i => board[r+i][c]);
        const mine = cells.filter(v => v === player).length;
        const empty = cells.filter(v => v === EMPTY).length;
        const opp = cells.filter(v => v !== player && v !== EMPTY).length;
        if (mine === 3 && empty === 1 && opp === 0) {
          const gapIdx = cells.findIndex(v => v === EMPTY);
          const gapRow = r + gapIdx;
          if (getAvailableRow(board, c) === gapRow) {
            results.push(`Amenaza ${player === HUMAN ? "tuya (🔴)" : "IA (🟡)"} vertical: ganar en col${c+1} fila${gapRow+1}`);
          }
        }
      }
    }
  }
  return results.length ? results.join("\n") : "Sin amenazas inmediatas de 3 en línea.";
}

// Returns all columns that tie for the best human move (for hints)
function allBestHumanMoves(board, depth = 7, player = HUMAN) {
  const opp = player === HUMAN ? AI : HUMAN;
  const cols = [0,1,2,3,4,5,6];
  const available = cols.filter(c => getAvailableRow(board, c) !== -1);
  if (available.length === 0) return [];

  // Immediate win — absolute priority
  const winCols = available.filter(c => checkWinner(dropPiece(board, c, player), player));
  if (winCols.length > 0) return winCols;

  // Must block if opponent can win immediately
  const blockCols = available.filter(c => checkWinner(dropPiece(board, c, opp), opp));
  if (blockCols.length > 0) return blockCols;

  // Score each column: drop player piece, then opponent responds
  const scored = available.map(col => {
    const nb = dropPiece(board, col, player);
    const res = minimax(nb, depth, -Infinity, Infinity, opp, player);
    return { col, score: res.score };
  });

  const best = Math.max(...scored.map(s => s.score));
  return scored.filter(s => s.score === best).map(s => s.col);
}

// Best single human move for the analysis prompt
function bestHumanMove(board) {
  const available = [0,1,2,3,4,5,6].filter(c => getAvailableRow(board, c) !== -1);

  for (const col of available)
    if (checkWinner(dropPiece(board, col, HUMAN), HUMAN)) return col;
  for (const col of available)
    if (checkWinner(dropPiece(board, col, AI), AI)) return col;

  let bestCol = available[0], bestScore = -Infinity;
  for (const col of available) {
    const res = minimax(dropPiece(board, col, HUMAN), 7, -Infinity, Infinity, AI, HUMAN);
    if (res.score > bestScore) { bestScore = res.score; bestCol = col; }
  }
  return bestCol;
}

async function analyzeHumanMove({ boardBefore, boardAfter, col, humanMoveNumber, moveHistory, humanWon, optimalCol }) {
  let landedRow = -1;
  for (let r = 0; r < ROWS; r++) {
    if (boardAfter[r][col] === HUMAN && boardBefore[r][col] === EMPTY) { landedRow = r; break; }
  }

  let humanWinCol = null;
  for (let c = 0; c < COLS; c++) {
    if (getAvailableRow(boardBefore, c) === -1) continue;
    if (checkWinner(dropPiece(boardBefore, c, HUMAN), HUMAN)) { humanWinCol = c; break; }
  }

  let aiWinCol = null;
  for (let c = 0; c < COLS; c++) {
    if (getAvailableRow(boardBefore, c) === -1) continue;
    if (checkWinner(dropPiece(boardBefore, c, AI), AI)) { aiWinCol = c; break; }
  }

  const missedWin = humanWinCol !== null && col !== humanWinCol;
  const missedBlock = aiWinCol !== null && col !== aiWinCol;
  const playedOptimal = optimalCol === col;

  // Describe what the optimal board would look like
  const optimalBoard = dropPiece(boardBefore, optimalCol, HUMAN);
  const optimalRow = (() => {
    for (let r = 0; r < ROWS; r++)
      if (optimalBoard[r][optimalCol] === HUMAN && boardBefore[r][optimalCol] === EMPTY) return r;
    return -1;
  })();

  const historyLines = moveHistory.map((m, i) =>
    `  ${i+1}. ${m.player === HUMAN ? "Humano 🔴" : "IA     🟡"} → col${m.col+1}`
  ).join("\n");

  const prompt = `Sos un entrenador de cuatro en línea. Analizá la jugada número ${humanMoveNumber} del humano (su ${humanMoveNumber}ª ficha en la partida).

─── TABLERO ANTES de la jugada ───
${boardToText(boardBefore)}

─── TABLERO DESPUÉS de la jugada ───
${boardToText(boardAfter)}
(🔴 = humano, 🟡 = IA, · = vacío)

El humano colocó en col${col+1}, fila${landedRow+1}.

─── SECUENCIA DE LA PARTIDA ───
${historyLines}

─── AMENAZAS ANTES ───
${getActiveThreats(boardBefore)}

─── AMENAZAS DESPUÉS ───
${getActiveThreats(boardAfter)}

─── JUGADA ÓPTIMA (motor de dificultad máxima) ───
${playedOptimal
  ? `El humano jugó exactamente la jugada óptima: col${col+1}.`
  : `El motor hubiera jugado col${optimalCol+1} (fila${optimalRow+1}). Tablero resultante:\n${boardToText(optimalBoard)}\nAmenazas que esa jugada genera:\n${getActiveThreats(optimalBoard)}`
}

─── DIAGNÓSTICO CALCULADO ───
${missedWin ? `🚨 Había victoria disponible en col${humanWinCol+1} y no la tomó.` : ""}
${missedBlock ? `🚨 La IA podía ganar en col${aiWinCol+1} y no lo bloqueó.` : ""}
${humanWon ? "✅ El humano ganó con esta jugada." : ""}

Escribí 2-3 oraciones en español rioplatense directo, hablando al jugador. Usá la comparación con la jugada del motor como base del análisis: explicá concretamente qué diferencia hace jugar en col${optimalCol+1} vs col${col+1} en términos de amenazas, control o bloqueo. Si la jugada fue óptima, decilo y explicá por qué es buena. No uses frases genéricas.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();

  if (data.type === "error") {
    console.error("Anthropic API error:", data.error);
    return `Error de API: ${data.error?.message ?? "desconocido"}`;
  }

  return data.content?.[0]?.text ?? "Respuesta vacía de la API.";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ConnectFour() {
  const [board, setBoard] = useState(createBoard());
  const [turn, setTurn] = useState(HUMAN);
  const [winner, setWinner] = useState(null);
  const [winCells, setWinCells] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState(null);
  const [difficulty, setDifficulty] = useState(5);

  // Full move history: [{player, col}]
  const [moveHistory, setMoveHistory] = useState([]);
  // Count of human moves only (for labeling analysis)
  const [humanMoveCount, setHumanMoveCount] = useState(0);

  // Board snapshots stack for undo: each entry is the full state before a human move
  // Each entry: { board, moveHistory, humanMoveCount, currentAnalysis }
  const [undoStack, setUndoStack] = useState([]);

  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hintsDepth, setHintsDepth] = useState(5);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [soloColor, setSoloColor] = useState(HUMAN); // tracks whose "turn" visually in solo mode
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pastAnalyses, setPastAnalyses] = useState([]);

  const analysisBoxRef = useRef(null);
  const isWinCell = (r, c) => winCells.some(([wr, wc]) => wr === r && wc === c);

  // Active player for hints: soloColor in solo mode, HUMAN otherwise
  const hintPlayer = !aiEnabled ? soloColor : HUMAN;

  // Suggested cols: only computed when hints are on and it's human's turn
  const suggestedCols = hintsEnabled && turn === HUMAN && !gameOver
    ? allBestHumanMoves(board, hintsDepth, hintPlayer)
    : [];

  const colScores = hintsEnabled && turn === HUMAN && !gameOver
    ? Array(COLS).fill(0).map((_, c) => {
        if (getAvailableRow(board, c) === -1) return null;
        const opp = hintPlayer === HUMAN ? AI : HUMAN;
        const nb = dropPiece(board, c, hintPlayer);
        return minimax(nb, hintsDepth, -Infinity, Infinity, opp, hintPlayer).score;
      })
    : null;

  const handleColumnClick = useCallback(async (col) => {
    if (turn !== HUMAN || gameOver || analyzing) return;
    if (getAvailableRow(board, col) === -1) return;

    // In solo mode, the active piece color alternates each click
    const activePlayer = !aiEnabled ? soloColor : HUMAN;

    const boardBefore = board.map(r => [...r]);
    const newBoard = dropPiece(board, col, activePlayer);
    const newHistory = [...moveHistory, { player: activePlayer, col }];
    const activeWon = !!checkWinner(newBoard, activePlayer);

    // Only increment humanMoveCount for actual human (red) moves
    const newHumanMoveCount = activePlayer === HUMAN ? humanMoveCount + 1 : humanMoveCount;

    // Save undo snapshot — in solo mode each move is individually undoable
    setUndoStack(prev => [...prev, {
      board: boardBefore,
      moveHistory,
      humanMoveCount,
      currentAnalysis,
      pastAnalyses,
      soloColor,
    }]);

    setBoard(newBoard);
    setHumanMoveCount(newHumanMoveCount);
    setMoveHistory(newHistory);
    setWinCells([]);
    setWinner(null);
    setGameOver(false);

    if (activeWon) {
      setWinCells(checkWinner(newBoard, activePlayer));
      setWinner(activePlayer);
      setGameOver(true);
    } else if (isBoardFull(newBoard)) {
      setWinner("draw");
      setGameOver(true);
    } else if (!aiEnabled) {
      // Solo mode: alternate color, stay on HUMAN turn
      setSoloColor(c => c === HUMAN ? AI : HUMAN);
    } else {
      setTurn(AI);
    }

    // Analysis only for human (red) moves with feedback enabled
    if (currentAnalysis) setPastAnalyses(prev => [currentAnalysis, ...prev].slice(0, 12));
    setCurrentAnalysis(null);

    if (!feedbackEnabled || activePlayer !== HUMAN) return;

    setAnalyzing(true);
    const optimalCol = bestHumanMove(boardBefore);

    analyzeHumanMove({
      boardBefore,
      boardAfter: newBoard,
      col,
      humanMoveNumber: newHumanMoveCount,
      moveHistory: newHistory,
      humanWon: activePlayer === HUMAN && activeWon,
      optimalCol,
    }).then(text => {
      setCurrentAnalysis({ humanMoveNum: newHumanMoveCount, col, text });
      setAnalyzing(false);
      setTimeout(() => analysisBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    });
  }, [board, turn, gameOver, analyzing, moveHistory, humanMoveCount, currentAnalysis, pastAnalyses, feedbackEnabled, aiEnabled, soloColor]);

  // AI turn
  useEffect(() => {
    if (!aiEnabled || turn !== AI || gameOver) return;
    const t = setTimeout(() => {
      const col = aiMove(board, difficulty);
      const nb = dropPiece(board, col, AI);
      const win = checkWinner(nb, AI);
      setBoard(nb);
      setMoveHistory(prev => [...prev, { player: AI, col }]);
      if (win) { setWinCells(win); setWinner(AI); setGameOver(true); }
      else if (isBoardFull(nb)) { setWinner("draw"); setGameOver(true); }
      else setTurn(HUMAN);
    }, 500);
    return () => clearTimeout(t);
  }, [turn, board, gameOver, difficulty]);

  const canUndo = turn === HUMAN && !analyzing && !gameOver && undoStack.length > 0;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const snapshot = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setBoard(snapshot.board);
    setMoveHistory(snapshot.moveHistory);
    setHumanMoveCount(snapshot.humanMoveCount);
    setCurrentAnalysis(snapshot.currentAnalysis);
    setPastAnalyses(snapshot.pastAnalyses);
    if (snapshot.soloColor !== undefined) setSoloColor(snapshot.soloColor);
    setTurn(HUMAN);
    setWinner(null);
    setWinCells([]);
    setGameOver(false);
    setAnalyzing(false);
  }, [canUndo, undoStack]);

  const reset = (aiGoesFirst = false) => {
    setBoard(createBoard());
    setTurn(aiGoesFirst ? AI : HUMAN);
    setWinner(null);
    setWinCells([]);
    setGameOver(false);
    setHoverCol(null);
    setMoveHistory([]);
    setHumanMoveCount(0);
    setUndoStack([]);
    setCurrentAnalysis(null);
    setAnalyzing(false);
    setPastAnalyses([]);
    setSoloColor(HUMAN);
  };

  // ── Game ──
  const activeColor = !aiEnabled ? soloColor : (turn === HUMAN ? HUMAN : AI);
  const statusMsg = gameOver
    ? winner === HUMAN ? "🏆 ¡Ganaron las rojas!"
    : winner === AI ? (!aiEnabled ? "🏆 ¡Ganaron las amarillas!" : "🤖 Ganó la IA")
    : "🤝 Empate"
    : analyzing ? "⏳ Claude analizando tu jugada..."
    : !aiEnabled ? (soloColor === HUMAN ? "🔴 Turno rojo" : "🟡 Turno amarillo")
    : turn === HUMAN ? "🔴 Tu turno"
    : "🟡 La IA está pensando...";

  return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e", fontFamily:"Georgia,serif", color:"#f0e6c8", display:"flex", flexDirection:"column", alignItems:"center", padding:"18px 12px 40px" }}>
      <div style={{ width:"100%", maxWidth:800 }}>

        {/* Header */}
        <div style={{ marginBottom:14 }}>
          <h1 style={{ margin:"0 0 10px", fontSize:20, fontWeight:900, color:"#f5c842", letterSpacing:"-0.5px" }}>Cuatro en línea</h1>

          {/* Row 1: feedback, sugerencias, depth */}
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
            <button
              onClick={() => setFeedbackEnabled(v => !v)}
              style={{
                padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12, transition:"all 0.15s",
                background: feedbackEnabled ? "#0e2010" : "#1a1a1a",
                color: feedbackEnabled ? "#5dbb6a" : "#555",
                border:`1px solid ${feedbackEnabled ? "#2a5a30" : "#2a2a2a"}`,
              }}>
              {feedbackEnabled ? "🧠 Feedback ON" : "🧠 Feedback OFF"}
            </button>
            <button
              onClick={() => setHintsEnabled(v => !v)}
              style={{
                padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12, transition:"all 0.15s",
                background: hintsEnabled ? "#0e1a2e" : "#1a1a1a",
                color: hintsEnabled ? "#5ab4f5" : "#555",
                border:`1px solid ${hintsEnabled ? "#1a4a7a" : "#2a2a2a"}`,
              }}>
              {hintsEnabled ? "💡 Sugerencias ON" : "💡 Sugerencias OFF"}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, opacity: hintsEnabled ? 1 : 0.3 }}>
              <button onClick={() => setHintsDepth(d => Math.max(1, d-1))} style={{ padding:"3px 7px", borderRadius:6, fontFamily:"inherit", fontSize:12, cursor:"pointer", background:"#0e1a2e", color:"#5ab4f5", border:"1px solid #1a4a7a" }}>−</button>
              <span style={{ minWidth:16, textAlign:"center", color:"#5ab4f5" }}>{hintsDepth}</span>
              <button onClick={() => setHintsDepth(d => Math.min(12, d+1))} style={{ padding:"3px 7px", borderRadius:6, fontFamily:"inherit", fontSize:12, cursor:"pointer", background:"#0e1a2e", color:"#5ab4f5", border:"1px solid #1a4a7a" }}>+</button>
            </div>
          </div>

          {/* Row 2: difficulty + deshacer */}
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
            <button
              onClick={() => { setAiEnabled(v => !v); setSoloColor(HUMAN); }}
              style={{
                padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12, transition:"all 0.15s",
                background: aiEnabled ? "#1a1a1a" : "#1a0e2e",
                color: aiEnabled ? "#555" : "#c07af5",
                border:`1px solid ${aiEnabled ? "#2a2a2a" : "#3a1a5a"}`,
              }}>
              {aiEnabled ? "🤖 IA ON" : "🤖 IA OFF"}
            </button>
            {[{l:"Fácil",v:3},{l:"Difícil",v:5}].map(d => (
              <button key={d.v} onClick={() => setDifficulty(d.v)} style={{
                padding:"6px 12px", borderRadius:8, fontFamily:"inherit", fontSize:12, cursor:"pointer", transition:"all 0.15s",
                border:`1px solid ${difficulty===d.v?"#f5c842":"#2a2a2a"}`,
                background: difficulty===d.v?"#2a2200":"#1a1a1a",
                color: difficulty===d.v?"#f5c842":"#555",
              }}>{d.l}</button>
            ))}
            <button
              onClick={handleUndo} disabled={!canUndo}
              style={{
                padding:"6px 12px", borderRadius:8, fontFamily:"inherit", fontSize:12, transition:"all 0.15s",
                cursor: canUndo ? "pointer" : "not-allowed",
                background: canUndo ? "#1e1a0a" : "#151515",
                color: canUndo ? "#f5c842" : "#333",
                border:`1px solid ${canUndo ? "#4a4010" : "#222"}`,
              }}>↩ Deshacer</button>
          </div>

          {/* Row 3: nueva + ia abre */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={() => reset(false)} style={{ padding:"6px 12px", background:"#1a1a1a", color:"#aaa", border:"1px solid #2a2a2a", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>↺ Nueva</button>
            <button onClick={() => reset(true)} style={{ padding:"6px 12px", background:"#1a1020", color:"#c07af5", border:"1px solid #3a1a5a", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>🤖 IA abre</button>
          </div>
        </div>

        {/* Status */}
        <div style={{
          background: gameOver ? (winner===HUMAN?"#162616":winner===AI?"#261616":"#1a1a1a") : analyzing?"#1a1a2e":"#181818",
          border:"1px solid #252525", borderRadius:10, padding:"9px 16px",
          textAlign:"center", fontSize:14, fontWeight:700, marginBottom:16, transition:"background 0.3s"
        }}>{statusMsg}</div>

        <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start" }}>

          {/* Board */}
          <div style={{ flexShrink:0 }}>
            <div style={{ display:"flex", marginBottom:3 }}>
              {Array(COLS).fill(0).map((_,c) => (
                <div key={c} style={{ width:54, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {hoverCol===c && turn===HUMAN && !gameOver && !analyzing &&
                    <div style={{ width:9, height:9, borderRadius:"50%", background: activeColor===HUMAN ? "#e05050" : "#f5c842", opacity:0.6 }} />}
                </div>
              ))}
            </div>
            <div style={{ background:"#1a3a8f", borderRadius:12, padding:7, boxShadow:"0 8px 40px rgba(0,0,0,0.6)", display:"inline-block" }}>
              {board.map((row, r) => (
                <div key={r} style={{ display:"flex" }}>
                  {row.map((cell, c) => (
                    <div key={c}
                      onClick={() => handleColumnClick(c)}
                      onMouseEnter={() => setHoverCol(c)}
                      onMouseLeave={() => setHoverCol(null)}
                      style={{
                        width:54, height:54, display:"flex", alignItems:"center", justifyContent:"center",
                        cursor: turn===HUMAN && !gameOver && !analyzing ? "pointer" : "default",
                        background: hoverCol===c && turn===HUMAN && !gameOver && !analyzing ? "rgba(255,255,255,0.05)" : "transparent",
                        borderRadius:4, position:"relative"
                      }}>
                      <div style={{
                        width:42, height:42, borderRadius:"50%",
                        background: cell===HUMAN?"#e05050":cell===AI?"#f5c842":"#0a1f5c",
                        boxShadow: isWinCell(r,c)
                          ? `0 0 0 3px white, 0 0 20px ${cell===HUMAN?"#e05050":"#f5c842"}`
                          : cell ? "inset 0 -3px 6px rgba(0,0,0,0.3)" : "inset 0 3px 8px rgba(0,0,0,0.5)",
                        transform: isWinCell(r,c) ? "scale(1.1)" : "scale(1)",
                        transition:"all 0.15s"
                      }} />
                      {/* Hint dot: show on the landing row of each suggested column */}
                      {cell === EMPTY && suggestedCols.includes(c) && getAvailableRow(board, c) === r && (
                        <div style={{
                          position:"absolute", width:14, height:14, borderRadius:"50%",
                          background:"rgba(90,180,245,0.55)",
                          boxShadow:"0 0 8px rgba(90,180,245,0.8)",
                          pointerEvents:"none"
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", marginTop:3 }}>
              {Array(COLS).fill(0).map((_,c) => (
                <div key={c} style={{ width:54, textAlign:"center", fontSize:11, color:"#444" }}>{c+1}</div>
              ))}
            </div>
            {colScores && (
              <div style={{ marginTop:8, border:"1px solid #252525", borderRadius:8, overflow:"hidden" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#444", textAlign:"center", padding:"4px 0", borderBottom:"1px solid #252525", background:"#111" }}>
                  Puntajes por columna
                </div>
                <div style={{ display:"flex" }}>
                  {colScores.map((s, c) => (
                    <div key={c} style={{
                      width:54, textAlign:"center", padding:"4px 0",
                      borderRight: c < COLS-1 ? "1px solid #252525" : "none",
                      background: suggestedCols.includes(c) ? "rgba(90,180,245,0.08)" : "transparent",
                      fontSize:11,
                      color: s === null ? "#333" : suggestedCols.includes(c) ? "#5ab4f5" : "#555",
                      fontWeight: suggestedCols.includes(c) ? 700 : 400,
                    }}>
                      {s === null ? "—" : s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis panel */}
          <div style={{ flex:1, minWidth:210, maxWidth:310 }}>
            <div style={{ fontSize:12, color:"#555", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              🧠 Análisis de Claude
            </div>

            <div ref={analysisBoxRef} style={{
              background:"#141420", border:"1px solid",
              borderColor: analyzing?"#3a3a6a":currentAnalysis?"#263050":"#1e1e1e",
              borderRadius:10, padding:14, minHeight:90, marginBottom:12, transition:"border-color 0.3s"
            }}>
              {!feedbackEnabled ? (
                <p style={{ margin:0, fontSize:13, color:"#3a3a3a", fontStyle:"italic" }}>Feedback desactivado.</p>
              ) : analyzing ? (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:15, height:15, borderRadius:"50%", border:"2px solid #f5c842", borderTopColor:"transparent", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
                  <span style={{ color:"#666", fontSize:13, fontStyle:"italic" }}>Analizando jugada {humanMoveCount}...</span>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : currentAnalysis ? (
                <>
                  <div style={{ fontSize:10, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>
                    Tu jugada nº{currentAnalysis.humanMoveNum} — col {currentAnalysis.col+1}
                  </div>
                  <p style={{ margin:0, fontSize:13, color:"#cfc0a0", lineHeight:1.7 }}>{currentAnalysis.text}</p>
                </>
              ) : (
                <p style={{ margin:0, fontSize:13, color:"#3a3a3a", fontStyle:"italic" }}>Jugá y Claude te dice cómo estuvo.</p>
              )}
            </div>

            {pastAnalyses.length > 0 && (
              <div>
                <div style={{ fontSize:11, color:"#444", marginBottom:7, textTransform:"uppercase", letterSpacing:0.5 }}>Jugadas anteriores</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
                  {pastAnalyses.map((a, i) => (
                    <div key={i} style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:8, padding:"9px 12px", opacity:0.7 }}>
                      <div style={{ fontSize:10, color:"#444", marginBottom:4 }}>Tu jugada nº{a.humanMoveNum} — col {a.col+1}</div>
                      <p style={{ margin:0, fontSize:12, color:"#9a8a70", lineHeight:1.6 }}>{a.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop:14, display:"flex", gap:14, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#e05050" }} />
                <span style={{ fontSize:11, color:"#555" }}>Vos</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#f5c842" }} />
                <span style={{ fontSize:11, color:"#555" }}>IA</span>
              </div>
              {undoStack.length > 0 && (
                <span style={{ fontSize:11, color:"#444" }}>{undoStack.length} jugada{undoStack.length>1?"s":""} deshacible{undoStack.length>1?"s":""}</span>
              )}
            </div>
          </div>
        </div>

        {gameOver && (
          <div style={{ textAlign:"center", marginTop:22 }}>
            <button onClick={reset} style={{
              padding:"11px 30px", background:"#f5c842", color:"#111",
              border:"none", borderRadius:10, fontSize:15, fontWeight:900,
              cursor:"pointer", fontFamily:"inherit"
            }}>Jugar de nuevo</button>
          </div>
        )}
      </div>
    </div>
  );
}
