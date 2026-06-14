import { Icon } from './Icon.jsx';

export function FeatureCard({ icon, iconBg, iconColor, background, title, subtitle, onClick, badge, wide = false }) {
  const horizontal = wide;
  return (
    <button
      onClick={onClick}
      style={{
        background: background ?? 'var(--card)',
        borderRadius: 'var(--radius)',
        padding: '20px 18px',
        boxShadow: 'var(--shadow)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: horizontal ? 'center' : undefined,
        gap: horizontal ? 16 : 10,
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
        <div style={{
          width: 52, height: 52, borderRadius: 15,
          display: 'grid', placeItems: 'center',
          background: iconBg ?? undefined,
          color: iconColor ?? undefined,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: horizontal ? 1 : undefined, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
      </div>
      {horizontal && (
        <Icon name="chevR" size={22} color="var(--ink-faint)" />
      )}
    </button>
  );
}
