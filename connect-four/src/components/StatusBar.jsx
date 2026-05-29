export function StatusBar({ time = '9:41' }) {
  return (
    <div style={{
      height: 50, flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 26px 0 30px',
      fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14,
      color: 'var(--ink)', zIndex: 40,
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 11 }}>
          {[5, 7, 9, 11].map((h, i) => (
            <i key={i} style={{ width: 3, height: h, background: 'var(--ink)', borderRadius: 1, display: 'block' }} />
          ))}
        </div>
        <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
          <path d="M9 12.5C5.6 9 2 7 9 2.5 16 7 12.4 9 9 12.5z" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 12C6.8 9.6 4.5 8.2 9 5 13.5 8.2 11.2 9.6 9 12z" fill="var(--ink)" />
        </svg>
        <div style={{ width: 23, height: 12, border: '1.6px solid var(--ink)', borderRadius: 3, position: 'relative' }}>
          <i style={{ position: 'absolute', inset: '1.6px', width: '70%', background: 'var(--ink)', borderRadius: 1 }} />
          <i style={{ position: 'absolute', right: -3.5, top: 3, width: 2, height: 5, background: 'var(--ink)', borderRadius: '0 1px 1px 0', display: 'block' }} />
        </div>
      </div>
    </div>
  );
}
