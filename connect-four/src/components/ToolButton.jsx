import { Icon } from './Icon.jsx';

export function ToolButton({ icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: color ?? 'var(--ink-soft)',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, padding: '4px 12px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={24} color={color ?? 'currentColor'} />
      </span>
      <span>{label}</span>
    </button>
  );
}
