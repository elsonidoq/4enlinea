import { Icon } from './Icon.jsx';

// OI-180 — the three audio toggles (SFX / music / speech) measured 36×36 on a 390×844 mobile
// viewport, below the 44×44 minimum tap target, on BOTH GameScreen and ChallengeScreen. The
// style object was copy-pasted inline six times (three per screen) — there was no shared
// component, so "fix it once" silently fixed only one screen. This is that shared component.
//
// Only the hit area grew: the icon is still 22px and the background is still transparent, so
// the toolbars look unchanged; each button just claims 8px more width in its row.
export const AUDIO_TOGGLE_SIZE = 44;

const BUTTON_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: AUDIO_TOGGLE_SIZE,
  height: AUDIO_TOGGLE_SIZE,
  // Belt and braces: a flex parent may compress width/height, but not below the minimums.
  minWidth: AUDIO_TOGGLE_SIZE,
  minHeight: AUDIO_TOGGLE_SIZE,
  borderRadius: 10,
  border: 'none',
  padding: 0,
  background: 'transparent',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  // ChallengeScreen's copies carried this; GameScreen's did not. Keeping it everywhere is what
  // stops the toolbar from shrinking these back below 44px on a narrow viewport.
  flexShrink: 0,
};

/**
 * One audio on/off toggle.
 *
 * @param {boolean} enabled       current state — picks the icon, its colour and the labels
 * @param {() => void} onToggle   click handler
 * @param {string} ariaLabel      accessible name (already resolved through i18n)
 * @param {string} title          tooltip (already resolved through i18n)
 * @param {string} iconOn         Icon name when enabled
 * @param {string} iconOff        Icon name when disabled
 */
export function AudioToggleButton({ enabled, onToggle, ariaLabel, title, iconOn, iconOff }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      title={title}
      style={BUTTON_STYLE}
    >
      <Icon
        name={enabled ? iconOn : iconOff}
        size={22}
        color={enabled ? 'var(--ink-soft)' : 'var(--ink-faint)'}
      />
    </button>
  );
}
