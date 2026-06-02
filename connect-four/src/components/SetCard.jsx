import { Stars } from './Stars.jsx';
import { Icon } from './Icon.jsx';

export function SetCard({ title, stars, positionCount, locked, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: locked ? 'var(--lock-bg)' : 'var(--card)',
        borderRadius: 'var(--radius-sm)',
        padding: '15px 16px',
        boxShadow: locked ? 'none' : 'var(--shadow-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        border: locked ? '1px solid #e6e2d9' : '1px solid #f0ebe1',
        width: '100%',
        textAlign: 'left',
        transition: 'transform .1s, box-shadow .15s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: locked ? '#e6e2d9' : '#fff2e2',
      }}>
        <Icon
          name={locked ? 'lock' : 'target'}
          size={locked ? 20 : 22}
          color={locked ? 'var(--lock)' : '#d6892a'}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
          color: locked ? 'var(--ink-faint)' : 'var(--ink)',
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
          <Stars n={stars} />
          {positionCount != null && <span>· {positionCount} positions</span>}
        </div>
      </div>
      {!locked && <Icon name="chevR" size={18} color="var(--ink-faint)" />}
    </button>
  );
}
