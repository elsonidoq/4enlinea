import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CoachAvatar } from './CoachAvatar.jsx';

/** Shared styling for the 🔁 / ⏹ narration controls. */
const NARRATION_BUTTON_STYLE = {
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: 'none',
  background: '#fff',
  boxShadow: 'var(--shadow-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 15,
  color: 'var(--ink-soft)',
  WebkitTapHighlightColor: 'transparent',
};

/**
 * `maxBubblesHeight` caps the scrolling bubbles column. It defaults to 120, which is the
 * value every call site had baked in before OI-167, so no screen changes unless it opts
 * in. Lesson slides opt into a taller cap because their coach copy runs past 200 chars
 * and the column is bottom-anchored (see the scroll effect below) — overflow is cut off
 * the TOP, so the reader loses the START of the sentence and cannot tell.
 *
 * `hasNarration` is an optional override. By default it is derived from
 * messages[].audio, which is correct for every screen whose only narration is the
 * bubbles. ConceptScreen also narrates the slide's infoProse, so it passes the value
 * in — otherwise a prose-only slide would render no narration controls.
 */
export function CoachDialog({ messages, size = 58, fixed = false, onReplay, onStop, hasNarration, maxBubblesHeight = 120 }) {
  const { t } = useTranslation();
  const mood = messages[messages.length - 1]?.mood ?? 'happy';
  const bubblesRef = useRef(null);
  const narrationAvailable = hasNarration ?? messages.some(
    (m) => typeof m?.audio === 'string' && m.audio.trim().length > 0,
  );

  useEffect(() => {
    if (bubblesRef.current) {
      bubblesRef.current.scrollTop = bubblesRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-end', padding: '6px 18px 10px',
      flexShrink: 0,
      ...(fixed ? {
        background: 'rgba(255,255,255,0.45)',
        margin: '0 12px', borderRadius: 18, padding: '10px 12px',
        backdropFilter: 'blur(2px)',
        height: 140,
      } : {}),
    }}>
      <CoachAvatar size={size} mood={mood} />
      <div
        ref={bubblesRef}
        data-testid="coach-bubbles"
        style={{
          display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0,
          maxHeight: maxBubblesHeight, overflowY: 'auto',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              borderRadius: '16px 16px 16px 5px',
              padding: '11px 14px',
              fontSize: 14.5, lineHeight: 1.34, color: 'var(--ink)',
              boxShadow: 'var(--shadow-sm)', fontWeight: 600,
              position: 'relative',
              animation: 'bubbleIn .32s cubic-bezier(.2,.9,.3,1.2)',
              opacity: m.faded ? 0.28 : 1,
            }}
          >
            {m.evalNum && (
              <span style={{
                float: 'right', marginLeft: 8, background: '#f1efe9', color: 'var(--ink-soft)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5,
                padding: '2px 8px', borderRadius: 8,
              }}>
                {m.evalNum}
              </span>
            )}
            {m.disc && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: m.disc === 'green' ? 'var(--disc-green)' : 'var(--disc-gray)',
                  boxShadow: m.disc === 'green'
                    ? '0 2px 0 #228245'
                    : '0 2px 0 #25293a',
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  color: m.disc === 'green' ? 'var(--disc-green)' : 'var(--disc-gray)',
                }}>
                  {m.discLabel}
                </span>
              </span>
            )}
            {m.lead && (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                {m.lead}
              </span>
            )}
            {m.text}
          </div>
        ))}
      </div>
      {narrationAvailable && (onReplay || onStop) && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              aria-label={t('audio.replayNarration')}
              title={t('audio.replayNarration')}
              style={NARRATION_BUTTON_STYLE}
            >
              🔁
            </button>
          )}
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              aria-label={t('audio.stopNarration')}
              title={t('audio.stopNarration')}
              style={NARRATION_BUTTON_STYLE}
            >
              ⏹
            </button>
          )}
        </div>
      )}
    </div>
  );
}
