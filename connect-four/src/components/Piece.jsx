export function Piece({ color = 'empty', highlight = null, heatValue = 0, step = null }) {
  let bg, border, shadow;

  if (color === 'red') {
    bg = 'var(--red)';
    border = '1px solid var(--red)';
    shadow = '0 2px 8px var(--red-g)';
  } else if (color === 'yellow') {
    bg = 'var(--yellow)';
    border = '1px solid var(--yellow)';
    shadow = '0 2px 8px var(--yellow-g)';
  } else {
    bg = 'var(--bg)';
    border = '1px solid var(--border-dim)';
    shadow = 'none';
  }

  if (highlight === 'winning') {
    shadow = '0 0 14px var(--green-g), 0 0 0 2px var(--green)';
  }

  if (highlight === 'hint' && color === 'empty') {
    bg = 'rgba(34,197,94,.18)';
    border = '1.5px solid var(--green)';
    shadow = '0 0 8px rgba(34,197,94,.35)';
  }

  if (highlight === 'selected' && color === 'empty') {
    bg = 'rgba(245,184,32,.18)';
    border = '1.5px solid var(--yellow)';
    shadow = '0 0 8px rgba(245,184,32,.35)';
  }

  if (highlight === 'threat' && color === 'empty') {
    bg = 'rgba(139,92,246,.18)';
    border = '1.5px solid #8b5cf6';
    shadow = '0 0 8px rgba(139,92,246,.35)';
  }

  if (highlight === 'support' && color === 'empty') {
    bg = 'rgba(139,92,246,.08)';
    border = '1.5px dashed #8b5cf6';
    shadow = 'none';
  }

  if (highlight === 'loser' && color === 'empty') {
    bg = 'rgba(239,68,68,.18)';
    border = '1.5px solid var(--red)';
    shadow = '0 0 8px rgba(239,68,68,.35)';
  }

  if (highlight === 'winner' && color === 'empty') {
    bg = 'rgba(245,184,32,.18)';
    border = '1.5px solid var(--yellow)';
    shadow = '0 0 8px var(--yellow-g)';
  }

  if (heatValue > 0 && color === 'empty') {
    bg = `rgba(232, 57, 46, ${Math.min(heatValue, 0.85)})`;
    border = '1px solid rgba(232, 57, 46, .4)';
    shadow = 'none';
  }

  const stepColor = highlight === 'winner' ? 'var(--yellow)' : 'var(--red)';

  return (
    <div
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: bg,
        border,
        boxShadow: shadow,
        flexShrink: 0,
        transition: 'background .1s, box-shadow .1s',
      }}
    >
      {step !== null && (
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          color: stepColor,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>{step}</span>
      )}
    </div>
  );
}
