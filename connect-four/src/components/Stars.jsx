export function Stars({ n, total = 3 }) {
  const clamped = Math.max(0, Math.min(n, total));
  return (
    <span style={{ letterSpacing: 1, color: 'var(--eval-mid)', fontSize: 13 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ opacity: i < clamped ? 1 : 0.28 }}>★</span>
      ))}
    </span>
  );
}
