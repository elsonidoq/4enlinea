import React, { useEffect, useState } from 'react';
import BoardEditor from './BoardEditor.jsx';
import { WINDOW_HIGHLIGHT_COLOR, DEFAULT_WINDOW_HIGHLIGHT_COLOR, windowHighlightsToZhCells } from '../../lib/lessonWindows.js';
import { toggleWindowCell, sortWindowCells, describeWindowDraft } from '../../lib/windowDraft.js';

const MOOD_OPTIONS = ['happy', 'think'];
const WINDOW_TYPES = Object.keys(WINDOW_HIGHLIGHT_COLOR);
// Neutral default: 'claim' is the "look at this window" marker, not a player's threat.
const DEFAULT_WINDOW_TYPE = 'claim';

/** Cells as the admin reads them. 0-indexed, matching SocraticEditor's column buttons. */
function cellSpanText(cells) {
  if (!cells?.length) return '(no cells)';
  const first = cells[0];
  const last = cells[cells.length - 1];
  return `c${first.c},r${first.r} → c${last.c},r${last.r}`;
}

/**
 * Swatch that matches what ConceptScreen actually renders: the lessonWindows palette at
 * opacity 0.4 (Board draws the capsule at 0.4). BoardEditor's OVERLAY_COLORS are a
 * different, brighter set — using them here would show the admin a colour the lesson
 * never displays.
 */
function windowSwatch(type, extra = {}) {
  return {
    display: 'inline-block', width: 22, height: 11, borderRadius: 6, flexShrink: 0,
    background: WINDOW_HIGHLIGHT_COLOR[type] ?? DEFAULT_WINDOW_HIGHLIGHT_COLOR,
    opacity: 0.4,
    ...extra,
  };
}
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
 *   lang: 'en' | 'es' — which sibling fields (text/text_es, label/label_es,
 *     infoProse/infoProse_es) to display and edit. Non-translatable fields
 *     (movestring, overlays) are unaffected. Defaults to 'en'.
 *   onChange: (updatedSlide) => void
 *   onMoveUp: () => void
 *   onMoveDown: () => void
 *   onDelete: () => void
 */
export default function SlideEditor({ slide, index, total, lang = 'en', onChange, onMoveUp, onMoveDown, onDelete }) {
  const suffix = lang === 'es' ? '_es' : '';
  const fk = (base) => `${base}${suffix}`;

  // Window-highlight draft. `index` is the committed window being re-picked, or null for a
  // new one; `null` draft = not picking. The draft lives here and NOT in the slide: a draft
  // that fails isStraightLineWindow must never be written out, because Board renders a
  // window blindly from cells[0] to cells[last].
  const [draft, setDraft] = useState(null); // { index: number|null, cells: [], type: string }
  const [draftError, setDraftError] = useState('');

  const windows = slide.windowHighlights ?? [];

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

  /**
   * Single write path for windowHighlights. An empty list DELETES the key rather than
   * storing `[]`: every unedited lesson today simply has no windowHighlights, the loader
   * and validator treat absent as valid, and writing an empty array into every slide the
   * admin opens would churn all 15 lesson files for nothing.
   */
  function setWindows(next) {
    if (next.length === 0) {
      const { windowHighlights, ...rest } = slide; // eslint-disable-line no-unused-vars
      onChange(rest);
    } else {
      onChange({ ...slide, windowHighlights: next });
    }
  }

  function updateWindow(i, patch) {
    setWindows(windows.map((w, j) => j === i ? { ...w, ...patch } : w));
  }

  function pickWindowCell(col, row) {
    if (!draft) return;
    const { cells, error } = toggleWindowCell(draft.cells, { c: col, r: row });
    setDraft({ ...draft, cells });
    setDraftError(error ?? '');
  }

  function commitDraft() {
    const next = [...windows];
    if (draft.index == null) {
      next.push({ type: draft.type, cells: draft.cells });
    } else {
      next[draft.index] = { ...next[draft.index], type: draft.type, cells: draft.cells };
    }
    setWindows(next);
    setDraft(null);
    setDraftError('');
  }

  function updateLegendLabel(i, label) {
    const items = slide.legendItems.map((li, j) => j === i ? { ...li, [fk('label')]: label } : li);
    onChange({ ...slide, legendItems: items });
  }

  const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };
  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 };
  const input = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', width: '100%', boxSizing: 'border-box' };
  const select = { padding: '6px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' };
  const smallBtn = { padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 };

  const draftValidity = draft ? describeWindowDraft(draft.cells) : null;

  // Live capsule preview: committed windows plus the draft. An INVALID draft is drawn as
  // one dot per picked cell rather than a capsule — drawing first→last would render a
  // straight capsule that visually hides the very bend the admin needs to see.
  const previewZhCells = [
    ...windowHighlightsToZhCells(draft?.index != null ? windows.filter((_, j) => j !== draft.index) : windows),
    ...(draft && draft.cells.length > 0 ? [{
      color: WINDOW_HIGHLIGHT_COLOR[draft.type] ?? DEFAULT_WINDOW_HIGHLIGHT_COLOR,
      windows: draftValidity.valid ? [draft.cells] : draft.cells.map(c => [c, c]),
    }] : []),
  ];

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
        zhCells={previewZhCells}
        pickCellsActive={!!draft}
        onPickCell={pickWindowCell}
        pickCellsNotice="Picking window cells — click them in order along the line. Click a picked cell to remove it."
      />

      {/* Window counts — the only authored half of the feature. The 6x7 `windowCounts`
          array is a DERIVED CACHE: saveLessonFile recomputes it from this slide's
          movestring on every write and strips it when the box is unchecked, so there is
          nothing here to edit by hand and no numbers to keep in sync. The board preview
          above does not show them until you save, for the same reason boardSpec is
          re-derived server-side rather than previewed live. */}
      <div>
        <div style={label}>Window counts</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={slide.showWindowCounts === true}
            onChange={e => updateField('showWindowCounts', e.target.checked)}
            aria-label={`Slide ${index + 1} show window counts`}
          />
          <span>Show how many four-in-a-rows are still open to the learner through each empty cell</span>
        </label>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          Counted from <strong>{slide.movestring ? 'this slide’s board' : 'the empty board'}</strong> for the
          lesson’s own player. Numbers are recomputed on save — they will not appear in the preview above.
        </div>
      </div>

      {/* Window highlights — translucent capsules drawn over a straight line of cells.
          Deliberately NOT routed through legendItems: the content gate requires every
          legendItems[].type to have a matching per-cell overlay, and a window has none. */}
      <div>
        <div style={label}>Window highlights{lang === 'es' ? ' (Español)' : ''}</div>

        {windows.map((w, i) => {
          const needsEs = typeof w.label === 'string' && w.label.trim().length > 0
            && !(typeof w.label_es === 'string' && w.label_es.trim().length > 0);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={windowSwatch(w.type)} />
              <select
                value={w.type ?? ''}
                onChange={e => updateWindow(i, { type: e.target.value })}
                style={{ ...select, fontSize: 12 }}
                aria-label={`Slide ${index + 1} window ${i + 1} type`}
              >
                {WINDOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa' }}>{cellSpanText(w.cells)}</span>
              <input
                value={w[fk('label')] ?? ''}
                onChange={e => updateWindow(i, { [fk('label')]: e.target.value })}
                style={{ ...input, flex: 1, minWidth: 160 }}
                placeholder={lang === 'es' ? '(no Spanish translation yet)' : 'Window label (optional)'}
                aria-label={`Slide ${index + 1} window ${i + 1} label`}
              />
              <button
                onClick={() => { setDraft({ index: i, cells: w.cells ?? [], type: w.type ?? DEFAULT_WINDOW_TYPE }); setDraftError(''); }}
                disabled={!!draft}
                style={smallBtn}
              >
                Edit cells
              </button>
              <button
                onClick={() => setWindows(windows.filter((_, j) => j !== i))}
                style={{ ...smallBtn, color: '#f87171' }}
                aria-label={`Slide ${index + 1} remove window ${i + 1}`}
              >
                ✕
              </button>
              {needsEs && (
                <span style={{ fontSize: 11, color: '#fbbf24', width: '100%' }}>
                  ⚠ This label has no Spanish sibling — it will ship English in Spanish, and
                  tests/unit/lessonContent.test.js fails a label without a label_es.
                </span>
              )}
            </div>
          );
        })}

        {!draft && (
          <button
            onClick={() => { setDraft({ index: null, cells: [], type: DEFAULT_WINDOW_TYPE }); setDraftError(''); }}
            style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6 }}
          >
            + Add window
          </button>
        )}

        {draft && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, border: '1px dashed #8b5cf6', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700 }}>
                {draft.index == null ? 'New window' : `Editing window ${draft.index + 1}`}
              </span>
              <span style={windowSwatch(draft.type)} />
              <select
                value={draft.type}
                onChange={e => setDraft({ ...draft, type: e.target.value })}
                style={{ ...select, fontSize: 12 }}
                aria-label={`Slide ${index + 1} draft window type`}
              >
                {WINDOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#ddd' }}>
              {draft.cells.length === 0
                ? '(no cells picked)'
                : draft.cells.map((c, i) => `${i + 1}. c${c.c},r${c.r}`).join('   ')}
            </div>

            <div style={{ fontSize: 12, color: draftValidity.valid ? '#4ade80' : '#f87171' }}>
              {draftError || draftValidity.message}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={commitDraft}
                disabled={!draftValidity.valid}
                style={{ ...smallBtn, cursor: draftValidity.valid ? 'pointer' : 'not-allowed' }}
              >
                Save window
              </button>
              {draftValidity.canFixOrder && (
                <button
                  onClick={() => { setDraft({ ...draft, cells: sortWindowCells(draft.cells) }); setDraftError(''); }}
                  style={smallBtn}
                >
                  Fix order
                </button>
              )}
              <button
                onClick={() => { setDraft({ ...draft, cells: draft.cells.slice(0, -1) }); setDraftError(''); }}
                disabled={draft.cells.length === 0}
                style={smallBtn}
              >
                Undo last
              </button>
              <button
                onClick={() => { setDraft(null); setDraftError(''); }}
                style={smallBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coach messages */}
      <div>
        <div style={label}>Coach messages{lang === 'es' ? ' (Español)' : ''}</div>
        {slide.coachMessages.map((msg, i) => (
          // alignItems: flex-start (not center) so the mood select and ✕ stay pinned to the
          // top of a multi-line message instead of floating to its vertical middle.
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-start' }}>
            <textarea
              value={msg[fk('text')] ?? ''}
              onChange={e => updateCoachMessage(i, fk('text'), e.target.value)}
              placeholder={lang === 'es' ? '(no Spanish translation yet)' : 'Coach message text'}
              rows={3}
              style={{ ...input, flex: 1, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
              aria-label={`Slide ${index + 1} coach message ${i + 1}`}
            />
            <select value={msg.mood} onChange={e => updateCoachMessage(i, 'mood', e.target.value)} style={{ padding: '6px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' }} aria-label={`Slide ${index + 1} coach message ${i + 1} mood`}>
              {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => removeCoachMessage(i)} style={{ padding: '2px 8px', color: '#f87171' }} aria-label={`Slide ${index + 1} remove coach message ${i + 1}`}>✕</button>
          </div>
        ))}
        <button onClick={addCoachMessage} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6 }}>+ Add message</button>
      </div>

      {/* Legend items (auto-synced, labels editable) */}
      {slide.legendItems.length > 0 && (
        <div>
          <div style={label}>Legend{lang === 'es' ? ' (Español)' : ''}</div>
          {slide.legendItems.map((li, i) => (
            <div key={li.type} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', width: 48 }}>{li.type}</span>
              <input
                value={li[fk('label')] ?? ''}
                onChange={e => updateLegendLabel(i, e.target.value)}
                style={{ ...input, flex: 1 }}
                placeholder={lang === 'es' ? '(no Spanish translation yet)' : 'Legend label'}
              />
            </div>
          ))}
        </div>
      )}

      {/* infoProse */}
      <div>
        <div style={label}>Info prose{lang === 'es' ? ' (Español)' : ''}</div>
        <textarea
          value={slide[fk('infoProse')] ?? ''}
          onChange={e => updateField(fk('infoProse'), e.target.value)}
          rows={3}
          style={{ ...input, resize: 'vertical' }}
          placeholder={lang === 'es' ? '(no Spanish translation yet)' : 'Explanatory text shown below the board'}
        />
      </div>
    </div>
  );
}
