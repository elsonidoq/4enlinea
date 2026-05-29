export function Toolbar({ children }) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px 16px',
      background: 'rgba(255,255,255,0.55)',
      borderTop: '1px solid rgba(0,0,0,0.05)',
      backdropFilter: 'blur(3px)',
    }}>
      {children}
    </div>
  );
}
