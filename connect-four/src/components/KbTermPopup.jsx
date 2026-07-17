import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// A raw KB slug ("community-z-threat", "immediate_threat", …) must never reach the
// user (finding 10). humanize() is the LAST-RESORT fallback when a slug has no
// kb.term.<kbId> i18n entry yet: strip the community- prefix, replace -/_ with
// spaces, title-case what's left.
function humanize(kbId) {
  const stripped = kbId.replace(/^community-/, '');
  return stripped
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Position-fixed popup for KB term definitions.
 *
 * Anchored to the tapped term span's bounding rect.
 * Shows the term's display name, a 1–2 sentence summary, and
 * optionally a CTA (Go to lesson / Go to practice).
 *
 * Props:
 *   kbId             — KB article slug (e.g. "community-z-threat")
 *   summary          — short summary string from the termsMap
 *   lessonId         — lesson JSON id from kbTermLesson, or null
 *   practiceCategory — puzzle category slug from kbTermLesson, or null
 *   lessonCompleted  — boolean, whether the user completed the lesson
 *   rect             — DOMRect of the tapped span (for positioning)
 *   onClose          — () => void
 *   navigate         — (screenKey, params) => void for CTA navigation
 */
export function KbTermPopup({
  kbId,
  summary,
  lessonId,
  practiceCategory,
  lessonCompleted,
  rect,
  onClose,
  navigate,
}) {
  const { t } = useTranslation();
  const popupRef = useRef(null);

  // Close on outside tap.
  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    }
    // Use a microtask delay to avoid the same tap that opened the popup
    // from immediately closing it.
    const id = setTimeout(() => {
      document.addEventListener('click', handleClick, { capture: true });
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [onClose]);

  // T13 (finding 10): displayName is i18n-driven so it also localizes in Spanish
  // mode — KB_TERM_LESSON's own `displayName` field is English-only and is used
  // here only as a source for lessonId/practiceCategory, not for the label.
  const displayName = t(`kb.term.${kbId}`, { defaultValue: humanize(kbId) });

  // Determine CTA
  let ctaLabel = null;
  let ctaAction = null;
  if (lessonId && !lessonCompleted) {
    ctaLabel = t('kb.cta.lesson');
    ctaAction = () => {
      onClose();
      navigate('concept', { lessonId });
    };
  } else if (practiceCategory && lessonCompleted) {
    ctaLabel = t('kb.cta.practice');
    ctaAction = () => {
      onClose();
      navigate('challenge', { category: practiceCategory });
    };
  }

  // Position the popup near the tapped span.
  // Place it below the span if there is room, or above otherwise.
  const popupStyle = {
    position: 'fixed',
    zIndex: 10000,
    background: '#fff',
    border: '1px solid var(--line, #d4cdbc)',
    borderRadius: 10,
    padding: '14px 16px',
    maxWidth: 300,
    minWidth: 220,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--ink, #1a1a1a)',
  };

  // Anchor below the span by default; flip above if too close to bottom.
  const margin = 8;
  const popupHeight = 120; // rough estimate
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow > popupHeight + margin) {
      popupStyle.top = rect.bottom + margin;
    } else {
      popupStyle.bottom = window.innerHeight - rect.top + margin;
    }
    // Center horizontally on the span, clamped to viewport.
    const popupWidth = 300;
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));
    popupStyle.left = left;
  } else {
    // Fallback: center of viewport.
    popupStyle.top = '50%';
    popupStyle.left = '50%';
    popupStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div ref={popupRef} style={popupStyle} role="dialog">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
      }}>
        <strong style={{ fontSize: 14 }}>{displayName}</strong>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            color: 'var(--ink-soft, #888)',
            padding: '0 0 0 8px',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <p style={{ margin: '0 0 12px', color: 'var(--ink-soft, #555)' }}>
        {summary}
      </p>

      {ctaLabel && (
        <button
          onClick={ctaAction}
          style={{
            background: 'var(--disc-green, #2FAA5A)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
