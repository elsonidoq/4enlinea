import { Icon } from './Icon.jsx';

export function TopBar({ title, onBack, meta, rightIcon, onRight, right2, onRight2, onLogoClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 10px', flexShrink: 0 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', display: 'grid', placeItems: 'center', color: 'var(--ink)', flexShrink: 0 }}
        >
          <Icon name="back" size={20} />
        </button>
      )}
      <button
        onClick={onLogoClick || undefined}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, margin: 0, cursor: onLogoClick ? 'pointer' : 'default', flexShrink: 0 }}
      >
        Decode<span style={{ color: 'var(--disc-green)' }}>C4</span>
      </button>
      {title && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>
          {title}
        </div>
      )}
      <div style={{ flex: 1 }} />
      {meta && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
          {meta}
        </div>
      )}
      {right2 && (
        <button onClick={onRight2} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
          <Icon name={right2} size={20} />
        </button>
      )}
      {rightIcon && (
        <button onClick={onRight} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
          <Icon name={rightIcon} size={20} />
        </button>
      )}
    </div>
  );
}
