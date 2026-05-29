export function FeatureCard({ icon, title, subtitle, onClick, badge, wide = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        padding: '20px 18px',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'left',
        border: 'none',
        width: wide ? '100%' : undefined,
        transition: 'transform .12s, box-shadow .15s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: 'var(--eval-good-bg)', color: '#1c8a4a',
          fontFamily: 'var(--font-display)',
        }}>
          {badge}
        </span>
      )}
      {icon && (
        <div style={{ width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center' }}>
          {icon}
        </div>
      )}
      {title && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.35, fontWeight: 600 }}>
          {subtitle}
        </div>
      )}
    </button>
  );
}
