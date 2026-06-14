export function ProgressBar({ value, max, pct }) {
  const w = pct != null ? pct : (value / max) * 100;
  return (
    <div style={{ height: 11, borderRadius: 6, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <i style={{ display: 'block', height: '100%', borderRadius: 6, background: 'var(--disc-green)', width: `${w}%`, transition: 'width .4s' }} />
    </div>
  );
}
