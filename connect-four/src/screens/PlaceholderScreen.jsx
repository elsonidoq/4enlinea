export function PlaceholderScreen({ screenKey }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18, color: 'var(--ink-soft)' }}>
      {screenKey} — coming soon
    </div>
  );
}
