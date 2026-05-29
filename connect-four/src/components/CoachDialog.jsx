import { useRef, useEffect } from 'react';
import { CoachAvatar } from './CoachAvatar.jsx';

export function CoachDialog({ messages, size = 58, fixed = false }) {
  const mood = messages[messages.length - 1]?.mood ?? 'happy';
  const bubblesRef = useRef(null);

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
      } : {}),
    }}>
      <CoachAvatar size={size} mood={mood} />
      <div
        ref={bubblesRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0,
          maxHeight: 120, overflowY: 'auto',
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
            {m.lead && (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                {m.lead}
              </span>
            )}
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
