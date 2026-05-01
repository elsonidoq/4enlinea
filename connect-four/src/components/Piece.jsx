export function Piece({ color = 'empty', highlight = null, heatValue = 0 }) {
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

  if (heatValue > 0 && color === 'empty') {
    bg = `rgba(232, 57, 46, ${Math.min(heatValue, 0.85)})`;
    border = '1px solid rgba(232, 57, 46, .4)';
    shadow = 'none';
  }

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: bg,
        border,
        boxShadow: shadow,
        flexShrink: 0,
        transition: 'background .1s, box-shadow .1s',
      }}
    />
  );
}
