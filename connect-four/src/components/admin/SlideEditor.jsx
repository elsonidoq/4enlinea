import React, { useEffect } from 'react';
import BoardEditor from './BoardEditor.jsx';

const MOOD_OPTIONS = ['happy', 'think'];
const DEFAULT_LEGEND_LABEL = { tg: 'User threat', td: 'Opponent threat', claim: 'Claimed cell', win: 'Winning move' };

/**
 * Sync legend items to match current overlay types.
 * Keeps existing labels for types that are still present; adds defaults for new types;
 * removes entries for types no longer in overlays.
 */
function syncLegend(overlays, legendItems) {
  const types = [...new Set(overlays.map(o => o.type))];
  return types.map(t => {
    const existing = legendItems.find(li => li.type === t);
    return existing ?? { type: t, label: DEFAULT_LEGEND_LABEL[t] ?? t };
  });
}

/**
 * Props:
 *   slide: { movestring, overlays, coachMessages, legendItems, infoProse }
 *   index: number
 *   total: number
 *   onChange: (updatedSlide) => void
 *   onMoveUp: () => void
 *   onMoveDown: () => void
 *   onDelete: () => void
 */
export default function SlideEditor({ slide, index, total, onChange, onMoveUp, onMoveDown, onDelete }) {
  // Auto-sync legend when overlays change
  useEffect(() => {
    const synced = syncLegend(slide.overlays, slide.legendItems);
    if (JSON.stringify(synced) !== JSON.stringify(slide.legendItems)) {
      onChange({ ...slide, legendItems: synced });
    }
  }, [slide.overlays]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    onChange({ ...slide, [key]: value });
  }

  function updateCoachMessage(i, key, value) {
    const msgs = slide.coachMessages.map((m, j) => j === i ? { ...m, [key]: value } : m);
    onChange({ ...slide, coachMessages: msgs });
  }

  function addCoachMessage() {
    onChange({ ...slide, coachMessages: [...slide.coachMessages, { text: '', mood: 'happy' }] });
  }

  function removeCoachMessage(i) {
    onChange({ ...slide, coachMessages: slide.coachMessages.filter((_, j) => j !== i) });
  }

  function updateLegendLabel(i, label) {
    const items = slide.legendItems.map((li, j) => j === i ? { ...li, label } : li);
    onChange({ ...slide, legendItems: items });
  }

  const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };
  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 };
  const input = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: '#fff' }}>Slide {index + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ padding: '2px 8px' }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ padding: '2px 8px' }}>↓</button>
          <button onClick={onDelete} style={{ padding: '2px 8px', color: '#f87171' }}>✕</button>
        </div>
      </div>

      {/* Board */}
      <BoardEditor
        label="Board"
        movestring={slide.movestring ?? ''}
        overlays={slide.overlays ?? []}
        onMovestringChange={ms => updateField('movestring', ms)}
        onOverlaysChange={ov => updateField('overlays', ov)}
      />

      {/* Coach messages */}
      <div>
        <div style={label}>Coach messages</div>
        {slide.coachMessages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input
              value={msg.text}
              onChange={e => updateCoachMessage(i, 'text', e.target.value)}
              placeholder="Coach message text"
              style={{ ...input, flex: 1 }}
            />
            <select value={msg.mood} onChange={e => updateCoachMessage(i, 'mood', e.target.value)} style={{ padding: '6px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' }}>
              {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => removeCoachMessage(i)} style={{ padding: '2px 8px', color: '#f87171' }}>✕</button>
          </div>
        ))}
        <button onClick={addCoachMessage} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6 }}>+ Add message</button>
      </div>

      {/* Legend items (auto-synced, labels editable) */}
      {slide.legendItems.length > 0 && (
        <div>
          <div style={label}>Legend</div>
          {slide.legendItems.map((li, i) => (
            <div key={li.type} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', width: 48 }}>{li.type}</span>
              <input
                value={li.label}
                onChange={e => updateLegendLabel(i, e.target.value)}
                style={{ ...input, flex: 1 }}
                placeholder="Legend label"
              />
            </div>
          ))}
        </div>
      )}

      {/* infoProse */}
      <div>
        <div style={label}>Info prose</div>
        <textarea
          value={slide.infoProse ?? ''}
          onChange={e => updateField('infoProse', e.target.value)}
          rows={3}
          style={{ ...input, resize: 'vertical' }}
          placeholder="Explanatory text shown below the board"
        />
      </div>
    </div>
  );
}
