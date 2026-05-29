/* ============================================================
   DecodeC4 — 7x6 Interactive Grid Canvas
   cols: array[7] of arrays (bottom->top) of 'g' | 'd'
   overlays: array of { c, r, type }  type: tg|td|claim|win
   badge: { col, type, label }   type: good|mid|bad
   onColumn(c): tap handler (enables hover arrows)
   lastDrop: { c, r } -> drop animation
   ============================================================ */

function Board({ cols, overlays = [], badge, onColumn, lastDrop, compact, fullCols = [] }) {
  const ovMap = {};
  overlays.forEach(o => { ovMap[o.c + "," + o.r] = o.type; });

  return (
    <div className={"board" + (compact ? " compact" : "")}>
      {cols.map((col, c) => {
        const isFull = col.length >= 6 || fullCols.includes(c);
        const tappable = !!onColumn && !isFull;
        return (
          <div
            key={c}
            className={"bcol" + (tappable ? " tappable" : "")}
            onClick={tappable ? () => onColumn(c) : undefined}
          >
            {tappable && <span className="col-arrow"><Icon name="chevD" size={18} color="var(--disc-green)" /></span>}
            {badge && badge.col === c && (
              <span className={"col-badge " + badge.type}>{badge.label}</span>
            )}
            {/* rows top(5) -> bottom(0) */}
            {[5, 4, 3, 2, 1, 0].map(r => {
              const v = col[r];
              const ov = ovMap[c + "," + r];
              const isDrop = lastDrop && lastDrop.c === c && lastDrop.r === r;
              return (
                <div key={r} className="cell">
                  {v && (
                    <div className={"disc " + (v === "g" ? "green" : "gray") + (isDrop ? " drop" : "")}></div>
                  )}
                  {ov === "win" && <span className="winline"></span>}
                  {ov && ov !== "win" && <span className={"ov " + ov}></span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* Helper: build columns from a compact spec.
   spec is array[7] of strings, e.g. "gd" => bottom g, then d. */
function mkCols(spec) {
  return spec.map(s => (s ? s.split("") : []));
}

Object.assign(window, { Board, mkCols });
