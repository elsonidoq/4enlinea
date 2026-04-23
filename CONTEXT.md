# Cuatro en línea — Contexto del proyecto

Aplicación React de Cuatro en línea con motor de IA, análisis de jugadas via API de Anthropic, y herramientas de entrenamiento. Todo el código vive en un único archivo `connect-four.jsx`.

---

## Motor de juego

Tablero de 6 filas × 7 columnas. Los jugadores son las constantes `HUMAN` y `AI`.

### Minimax

Función unificada `minimax(board, depth, alpha, beta, currentPlayer, rootPlayer)`:

- `currentPlayer`: quién mueve en este nodo del árbol.
- `rootPlayer`: para quién se optimiza el score (el score siempre es desde su perspectiva).
- Usa alpha-beta pruning. Itera columnas en orden `[3,2,4,1,5,0,6]` (centro primero) para mejorar la poda.
- Terminal: victoria del `rootPlayer` = `+1000000 + depth`, derrota = `-1000000 - depth`. El bonus de `depth` hace que prefiera victorias más rápidas y derrotas más tardías.
- Hoja: `scoreBoard(board, rootPlayer)` — evalúa ventanas de 4 celdas en todas las direcciones más bonus por control del centro.

### aiMove(board, depth)

Wrapper raíz para las jugadas de la IA. Itera todas las columnas disponibles, llama `minimax(dropPiece(board, col, AI), depth, ..., HUMAN, AI)` para cada una, y elige aleatoriamente entre las que empatan en el mejor score. El tie-break aleatorio existe para que la IA no sea 100% determinista; vive **solo aquí**, no dentro del minimax recursivo (para no romper el alpha-beta).

### Dificultad

Tres niveles configurables en UI: Fácil=3, Medio=5, Difícil=7. El valor se pasa directamente como `depth` a `aiMove` — **sin `depth-1`** (ese bug fue corregido; el `-1` era un remanente de una refactorización anterior).

### Sugerencias (hints)

`allBestHumanMoves(board, depth=7)`: devuelve todas las columnas que empatan en el mejor score para el humano. Prioridad: victoria inmediata > bloqueo de victoria de IA > minimax con `rootPlayer=HUMAN`. Muestra un dot celeste en el tablero sobre la fila de aterrizaje de cada columna sugerida. Se recalcula en cada render cuando el toggle está activo.

`bestHumanMove(board)`: versión single-result para el prompt de análisis. Usa `depth=7` con `rootPlayer=HUMAN`.

---

## Análisis con Claude API

Después de cada jugada del humano (🔴), se llama `analyzeHumanMove()` que hace un fetch a `https://api.anthropic.com/v1/messages` con modelo `claude-sonnet-4-5`.

El prompt incluye:
- Tablero antes y después de la jugada (en texto con emojis y coordenadas).
- Historial completo de la partida, con jugadas del humano numeradas por separado (`humanMoveNumber`).
- Amenazas activas de 3 en línea antes y después.
- Jugada óptima calculada por `bestHumanMove` con el tablero resultante y sus amenazas — para que Claude compare concretamente.
- Flags de errores graves: victoria disponible no tomada, bloqueo de IA no ejecutado.

El análisis se muestra en un panel lateral. Las jugadas anteriores se archivan abajo. El estado `analyzing` bloquea nuevas jugadas mientras espera la respuesta.

El análisis solo se dispara para jugadas de 🔴 (no para 🟡 en modo solo, ver abajo).

---

## Toggles y modos

### 🧠 Feedback ON/OFF
Activa/desactiva el llamado a Claude API tras cada jugada. Estado: `feedbackEnabled`.

### 💡 Sugerencias ON/OFF
Activa/desactiva las sugerencias del motor en el tablero. Estado: `hintsEnabled`. Cuando está ON, `suggestedCols` se computa con `allBestHumanMoves(board, 7)` en cada render durante el turno del humano.

### 🤖 IA ON/OFF
Desactiva el motor de IA. Estado: `aiEnabled`. En modo OFF el humano juega los dos colores alternando con cada click. El color activo lo lleva `soloColor` (alterna entre `HUMAN` y `AI` tras cada jugada). El hover indicator y el status bar reflejan el color activo. El análisis de Claude solo se dispara cuando `soloColor === HUMAN`.

---

## Acciones

### ↩ Deshacer
Estado: stack `undoStack`. Cada entrada captura el estado completo justo antes de una jugada humana: `{ board, moveHistory, humanMoveCount, currentAnalysis, pastAnalyses, soloColor }`. En modo con IA deshace el par humano+IA; en modo sin IA deshace de a una jugada. Solo disponible cuando `turn === HUMAN && !analyzing && !gameOver`.

### ↺ Nueva / 🤖 IA abre
`reset(aiGoesFirst)` — resetea todo el estado. Con `aiGoesFirst=true` arranca con `turn=AI`, lo que dispara el `useEffect` de la IA inmediatamente.

---

## Invariantes importantes

- `humanMoveCount` cuenta solo las jugadas de 🔴, independiente del total de jugadas del tablero. Se usa para etiquetar los análisis ("Tu jugada nº2").
- `moveHistory` es el historial completo `[{player, col}]` de todas las jugadas en orden. Se pasa al prompt de Claude.
- El undo restaura `soloColor` desde el snapshot para que el modo sin IA quede consistente.
- `analyzing === true` bloquea clicks en el tablero y el botón de deshacer.
- En modo sin IA, `turn` siempre queda en `HUMAN`; la alternancia de colores la maneja `soloColor`, no `turn`.

---

## Heatmap / Explicaciones

Cuando `showExplanations` y `hintsEnabled` están ON, al hacer hover sobre una columna sugerida se muestra un overlay borroso de calor sobre el tablero.

### Flujo completo

1. **Frontend** (`App.jsx`): `handleBoardMouseEnter(col)` construye el string de candidato:
   ```js
   const candidateMoves = movesToString([...moveHistory, { player: HUMAN, col }]);
   ```
   `movesToString` ignora el campo `player`; solo concatena `col + 1` (1-indexed). Hace `POST /api/explain` con ese string.

2. **Servidor** (`server/index.js`): Lanza un proceso one-shot `c4solver -x -b 7x6.book`, escribe el string de movidas a stdin, lee una línea de stdout con 85 tokens: `{moves} {42 ints heatCurrent} {42 ints heatOpponent}`. Los 42 ints son row-major con row 0 = fila visual inferior (C++ row 0 = fondo).

3. **Mapeo de paridad** en el servidor:
   ```js
   const humanIsCurrentInPosition = moves.length % 2 === 1;
   const human = humanIsCurrentInPosition ? opponent : current;
   const ai    = humanIsCurrentInPosition ? current  : opponent;
   ```
   Asume que el humano siempre mueve primero. Si la IA abre la partida, este mapeo queda invertido.

4. **C++ `-x` mode** (`main.cpp`): Llama `solver.explain(P, heatCurrent, heatOpponent)`.

5. **`Solver::explain`** (`Solver.cpp`): Resetea la tabla de transposición (usada como visited-set), zeroes los grids, llama `explainSearch(P, heatCurrent, heatOpponent)`.

6. **`explainSearch`** (recursivo):
   - Si el libro de apertura contiene P: retorna (sin datos).
   - Si `canWinNext()`: registra las 4 celdas ganadoras en `heatP0` (jugador actual), retorna.
   - Si `possibleNonLosingMoves() == 0`: el oponente gana; registra sus celdas ganadoras en `heatP1`, retorna.
   - Sino: itera movidas no perdedoras, recursa con arrays swapeados: `explainSearch(P2, heatP1, heatP0)`.
   - Límite de nodos: 500 000.

7. **`findWinningCells`** (`Position.hpp`): dado el bitboard del jugador tras colocar una pieza, devuelve las 4 celdas `(row, col)` del 4-en-línea.

8. **Frontend render**: Para cada celda `(r, c)`, `cppRow = ROWS - 1 - r`. `humanHeat = explainData.human[cppRow][c] / maxHuman` → overlay rojo. `aiHeat = explainData.ai[cppRow][c] / maxAi` → overlay amarillo.

### Bug corregido (2026-04-23)

El heatmap mostraba las celdas de la **amenaza forzante** en vez de la **línea ganadora real**.

**Causa raíz**: el branch `possibleNonLosingMoves() == 0` de `explainSearch` llamaba a `getOpponentWinningMovesMask()` y registraba esas celdas directamente. Pero esas son las celdas que *fuerzan* al oponente (las amenazas inmediatas que lo dejan sin movida segura), no el 4-en-línea con el que el humano gana después de la respuesta forzada.

**Ejemplo** (`moves = "444444777777166662661322222535111133335"`, hover Col5):
- Amenaza forzante: diagonal en (row=3,col=4) — la IA bloquea aquí.
- Línea ganadora real: horizontal en row=4, cols 2-5 (cppCoords) — el humano juega ahí después.
- El código anterior mostraba la diagonal; el corregido muestra la horizontal.

**Fix** (`Solver.cpp::explainSearch`): cuando `possibleNonLosingMoves() == 0`, en lugar de registrar las celdas de la amenaza forzante, se recursa sobre todas las movidas jugables del perdedor para que el branch `canWinNext()` del oponente registre la línea real:
```cpp
if (possible == 0) {
    for (int col = 0; col < Position::WIDTH; col++) {
        if (P.canPlay(col)) {
            Position P2(P);
            P2.playCol(col);
            explainSearch(P2, heatP1, heatP0);
        }
    }
    return;
}
```

**Test**: `solver-src/test_explain.cpp` — ejecutar con `make test` en `solver-src/`.

---

## Stack técnico

- React con hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
- Sin librerías externas — todo el styling es inline.
- API de Anthropic llamada directamente desde el browser (el proxy de autenticación lo maneja el entorno de Claude.ai).
