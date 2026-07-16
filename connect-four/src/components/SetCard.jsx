import { useTranslation } from 'react-i18next';
import { Stars } from './Stars.jsx';
import { Icon } from './Icon.jsx';

const BAR_HEIGHT = 4;
const BAR_RADIUS = 2;

function getAccuracyColor(accuracy) {
  if (accuracy >= 0.8) return '#4caf50';
  if (accuracy >= 0.5) return '#ffc107';
  return '#f44336';
}

// `isAuthenticated` is intentionally accepted-but-unused: callers (e.g.
// SetPickerScreen) still pass it, but progress display no longer gates on
// it — see showProgress below.
export function SetCard({ title, stars, positionCount, locked, onClick, progress }) {
  const { t } = useTranslation();
  // Progress renders for anyone (signed-in or anon) once it exists and the
  // set isn't locked — anon progress comes from the local store (see
  // SetPickerScreen), so auth state is not a valid gate here.
  const showProgress = !!progress && !locked;

  const rightSlot = showProgress && progress.cleared ? (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: '#4caf50', display: 'grid', placeItems: 'center',
      flexShrink: 0,
    }} aria-label={t('setcard.cleared')}>
      <Icon name="check" size={14} color="#fff" />
    </div>
  ) : (!locked ? <Icon name="chevR" size={18} color="var(--ink-faint)" /> : null);

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
        border: locked
          ? '1px solid #e6e2d9'
          : showProgress && progress.cleared
            ? '2px solid #4caf50'
            : '1px solid #f0ebe1',
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
          {positionCount != null && <span>· {t('setcard.positions', { count: positionCount })}</span>}
        </div>
        {showProgress && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Progress bar */}
            <div
              style={{
                width: '100%', height: BAR_HEIGHT, borderRadius: BAR_RADIUS,
                background: 'var(--line)',
              }}
              aria-label={t('setcard.progress')}
            >
              <div style={{
                width: `${progress.total > 0 ? (progress.correct / progress.total) * 100 : 0}%`,
                height: '100%', borderRadius: BAR_RADIUS,
                background: 'var(--ink)',
                transition: 'width .3s',
              }} />
            </div>
            {/* Accuracy bar — hidden when no attempts */}
            {progress.attempted > 0 && (
              <div style={{
                width: '100%', height: BAR_HEIGHT, borderRadius: BAR_RADIUS,
                background: 'var(--line)',
              }}>
                <div style={{
                  width: `${progress.accuracy * 100}%`,
                  height: '100%', borderRadius: BAR_RADIUS,
                  background: getAccuracyColor(progress.accuracy),
                  transition: 'width .3s',
                }} />
              </div>
            )}
          </div>
        )}
      </div>
      {rightSlot}
    </button>
  );
}
