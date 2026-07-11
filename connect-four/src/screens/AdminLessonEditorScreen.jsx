import React, { useState, useEffect, useCallback } from 'react';
import LessonMetaForm from '../components/admin/LessonMetaForm.jsx';
import SlideEditor from '../components/admin/SlideEditor.jsx';
import SocraticEditor from '../components/admin/SocraticEditor.jsx';
import PuzzlePickerModal from '../components/admin/PuzzlePickerModal.jsx';
import PuzzlePickerRow from '../components/admin/PuzzlePickerRow.jsx';
import { parseMovestring, boardToSpec } from '../lib/movestring.js';

function authHeaders() {
  const sb = localStorage.getItem('supabase.auth.token');
  if (!sb) return {};
  try {
    const parsed = JSON.parse(sb);
    const token = parsed?.currentSession?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const VALID_CATEGORIES = [
  'immediate_threat', 'forced_block', 'double_threat', 'claimeven', 'z_threat',
  'undercut', 'overcut', 'figure_7', 'j_shape', 'odd_even_threat',
];

function emptyLesson() {
  return {
    title: '',
    id: '',
    order: 12,
    free: true,
    userPerspective: 'yellow',
    slides: [emptySlide()],
    socratic: null,
    confirmationCategory: null,
    confirmationCount: 2,
    confirmationChallenges: [],
  };
}

function emptySlide() {
  return { movestring: '', overlays: [], coachMessages: [{ text: '', mood: 'happy' }], legendItems: [], infoProse: '' };
}

// Shared hydration shape: converts a raw lesson JSON (from GET /api/admin/lessons/:id
// or the generate-audio response's `lesson` field) into editor state, filling in
// defaults for optional array/string fields. Used by the initial-load effect AND
// by the "Generate audios" handler so both rehydrate identically.
function hydrateLesson(data) {
  return {
    ...data,
    slides: data.slides.map(s => ({
      ...s,
      movestring: s.movestring ?? '',
      overlays: s.overlays ?? [],
      legendItems: s.legendItems ?? [],
      coachMessages: s.coachMessages ?? [],
      infoProse: s.infoProse ?? '',
    })),
    socratic: data.socratic ? {
      ...data.socratic,
      movestring: data.socratic.movestring ?? '',
      overlays: data.socratic.overlays ?? [],
      _boardInstructions: data.socratic._boardInstructions ?? '',
    } : null,
    confirmationChallenges: data.confirmationChallenges ?? [],
  };
}

// Convert editor state to the lesson JSON payload.
// boardSpec is derived from movestring (used by the app to render).
// movestring is stored alongside boardSpec so the editor can round-trip cleanly.
function lessonToJsonPayload(lesson) {
  const { _idManuallyEdited, ...rest } = lesson;
  const convertBoard = (ms) => boardToSpec(parseMovestring(ms ?? ''));
  const challenges = rest.confirmationChallenges ?? [];
  return {
    ...rest,
    confirmationCount: challenges.length > 0 ? challenges.length : rest.confirmationCount,
    confirmationChallenges: challenges.length > 0 ? challenges : undefined,
    slides: rest.slides.map(slide => ({
      movestring: slide.movestring ?? '',
      coachMessages: slide.coachMessages,
      boardSpec: convertBoard(slide.movestring),
      overlays: slide.overlays,
      legendItems: slide.legendItems,
      infoProse: slide.infoProse,
    })),
    socratic: rest.socratic ? {
      movestring: rest.socratic.movestring ?? '',
      boardSpec: convertBoard(rest.socratic.movestring),
      overlays: rest.socratic.overlays ?? [],
      correctCol: rest.socratic.correctCol,
      _boardInstructions: rest.socratic._boardInstructions ?? '',
    } : null,
  };
}

/**
 * Props:
 *   lessonId: string | null  (null = new lesson)
 *   onBack: () => void
 */
export default function AdminLessonEditorScreen({ lessonId, onBack }) {
  const [lesson, setLesson] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [audioState, setAudioState] = useState('idle'); // idle | saving | generating | error
  const [audioError, setAudioError] = useState('');
  const [audioResult, setAudioResult] = useState(null); // { generated, failed } from last run
  const isNew = !lessonId;

  useEffect(() => {
    if (isNew) {
      setLesson(emptyLesson());
      return;
    }
    fetch(`/api/admin/lessons/${lessonId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setLesson(hydrateLesson(data)));
  }, [lessonId]);

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const payload = lessonToJsonPayload(lesson);
      const url = isNew ? '/api/admin/lessons' : `/api/admin/lessons/${lessonId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
      return true;
    } catch (e) {
      setSaveState('error');
      setSaveError(e.message);
      return false;
    }
  }, [lesson, isNew, lessonId]);

  // Mandatory save -> generate -> rehydrate coordination contract (plan.md):
  // save must complete and succeed BEFORE we ask the server to generate audio,
  // otherwise an in-flight edit could be silently lost when the generate-audio
  // response's `lesson` (read from disk) overwrites local state.
  const handleGenerateAudio = useCallback(async () => {
    if (isNew) {
      setAudioState('error');
      setAudioError('Save the lesson before generating audio.');
      return;
    }
    setAudioResult(null);
    setAudioState('saving');
    setAudioError('');
    const saved = await handleSave();
    if (!saved) {
      setAudioState('error');
      setAudioError('Save failed — audio generation aborted.');
      return;
    }
    setAudioState('generating');
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/generate-audio`, {
        method: 'POST',
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio generation failed');
      setLesson(hydrateLesson(data.lesson));
      setAudioResult({ generated: data.generated ?? [], failed: data.failed ?? [] });
      setAudioState('idle');
    } catch (e) {
      setAudioState('error');
      setAudioError(e.message);
    }
  }, [handleSave, isNew, lessonId]);

  const handleDelete = useCallback(async () => {
    await fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE', headers: authHeaders() });
    onBack();
  }, [lessonId, onBack]);

  function addSlide() {
    setLesson(l => ({ ...l, slides: [...l.slides, emptySlide()] }));
  }

  function updateSlide(i, updated) {
    setLesson(l => ({ ...l, slides: l.slides.map((s, j) => j === i ? updated : s) }));
  }

  function deleteSlide(i) {
    setLesson(l => ({ ...l, slides: l.slides.filter((_, j) => j !== i) }));
  }

  function moveSlide(i, dir) {
    setLesson(l => {
      const slides = [...l.slides];
      const target = i + dir;
      if (target < 0 || target >= slides.length) return l;
      [slides[i], slides[target]] = [slides[target], slides[i]];
      return { ...l, slides };
    });
  }

  // ── Confirmation puzzle management ─────────────────────────────────────────────

  function handleAddPuzzle(puzzleData) {
    setLesson(l => ({
      ...l,
      confirmationChallenges: [...(l.confirmationChallenges ?? []), {
        puzzleId: puzzleData.id,
        moveString: puzzleData.move_string,
        goalPrompt: puzzleData.goal_prompt || '',
        goalPredicateType: puzzleData.goal_predicate_type || l.confirmationCategory,
        goalPredicateParams: puzzleData.goal_predicate_params ?? null,
        cooperativeAiMoves: puzzleData.cooperative_ai_moves ?? [],
        interactionMode: puzzleData.interaction_mode || 'single_move',
        highlightMetadata: puzzleData.highlight_metadata ?? null,
        correctCol: puzzleData.correct_col,
        userPlayer: puzzleData.user_player,
      }],
    }));
  }

  function handleRemovePuzzle(idx) {
    setLesson(l => ({
      ...l,
      confirmationChallenges: l.confirmationChallenges.filter((_, i) => i !== idx),
    }));
  }

  function handleMovePuzzle(idx, dir) {
    setLesson(l => {
      const challenges = [...l.confirmationChallenges];
      const target = idx + dir;
      if (target < 0 || target >= challenges.length) return l;
      [challenges[idx], challenges[target]] = [challenges[target], challenges[idx]];
      return { ...l, confirmationChallenges: challenges };
    });
  }

  if (!lesson) return <div style={{ color: '#fff', padding: 32 }}>Loading…</div>;

  const sectionLabel = { fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 20 }}>{isNew ? 'New lesson' : `Edit: ${lesson.title || lesson.id}`}</h1>
      </div>

      {/* Metadata */}
      <section>
        <div style={sectionLabel}>Metadata</div>
        <LessonMetaForm meta={lesson} onChange={updated => setLesson(l => ({ ...l, ...updated }))} />
      </section>

      {/* Slides */}
      <section>
        <div style={sectionLabel}>Slides</div>
        {lesson.slides.map((slide, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <SlideEditor
              slide={slide}
              index={i}
              total={lesson.slides.length}
              onChange={updated => updateSlide(i, updated)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, 1)}
              onDelete={() => deleteSlide(i)}
            />
          </div>
        ))}
        <button onClick={addSlide} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>+ Add slide</button>
      </section>

      {/* Socratic */}
      <section>
        <div style={sectionLabel}>Socratic</div>
        <SocraticEditor
          enabled={lesson.socratic !== null}
          socratic={lesson.socratic}
          onChange={s => setLesson(l => ({ ...l, socratic: s }))}
        />
      </section>

      {/* Confirmation */}
      <section>
        <div style={sectionLabel}>Confirmation challenges</div>
        <div style={{ background: '#1e1e1e', padding: 16, borderRadius: 8, border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Category dropdown — filter for picker + metadata */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Category</label>
            <select
              value={lesson.confirmationCategory ?? ''}
              onChange={e => setLesson(l => ({ ...l, confirmationCategory: e.target.value || null }))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' }}
            >
              <option value="">None</option>
              {VALID_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Curated puzzle list */}
          {lesson.confirmationChallenges?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lesson.confirmationChallenges.map((puzzle, i) => (
                <PuzzlePickerRow
                  key={puzzle.puzzleId || i}
                  puzzle={puzzle}
                  index={i}
                  total={lesson.confirmationChallenges.length}
                  onRemove={() => handleRemovePuzzle(i)}
                  onMoveUp={() => handleMovePuzzle(i, -1)}
                  onMoveDown={() => handleMovePuzzle(i, 1)}
                />
              ))}
            </div>
          )}

          {/* Derived count + Add button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#888' }}>
              {lesson.confirmationChallenges?.length || 0} puzzle(s) selected
            </span>
            <button
              onClick={() => setShowPicker(true)}
              disabled={!lesson.confirmationCategory}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: lesson.confirmationCategory ? 'pointer' : 'not-allowed',
                background: lesson.confirmationCategory ? '#166534' : '#333', color: '#fff', fontWeight: 700,
                border: 'none', fontSize: 13,
              }}
            >
              + Add Puzzle
            </button>
          </div>

          {/* Legacy fallback: random draw count (only when no curated puzzles) */}
          {(!lesson.confirmationChallenges || lesson.confirmationChallenges.length === 0) && lesson.confirmationCategory && (
            <div style={{ borderTop: '1px solid #333', paddingTop: 10 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
                Or use random draw (legacy)
              </label>
              <input
                type="number" min={0}
                value={lesson.confirmationCount}
                onChange={e => setLesson(l => ({ ...l, confirmationCount: parseInt(e.target.value, 10) || 0 }))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', width: 80 }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Action bar */}
      <div style={{ position: 'sticky', bottom: 0, background: '#111', borderTop: '1px solid #333', padding: '12px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{ padding: '8px 24px', borderRadius: 8, cursor: 'pointer', background: '#166534', color: '#fff', fontWeight: 700 }}
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save'}
        </button>
        <button
          onClick={() => window.open(`/lessons/${lesson.id}?adminPreview=1`, '_blank')}
          disabled={isNew && saveState !== 'saved'}
          style={{ padding: '8px 24px', borderRadius: 8, cursor: 'pointer', background: '#1d4ed8', color: '#fff' }}
        >
          Preview ↗
        </button>
        <button
          onClick={handleGenerateAudio}
          disabled={isNew || audioState === 'saving' || audioState === 'generating'}
          style={{ padding: '8px 24px', borderRadius: 8, cursor: 'pointer', background: '#0f766e', color: '#fff', fontWeight: 700 }}
        >
          {audioState === 'saving' ? 'Saving…' : audioState === 'generating' ? 'Generating audio…' : 'Generate audios'}
        </button>
        {!isNew && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#7f1d1d', color: '#fff' }}
          >
            Delete
          </button>
        )}
        {saveState === 'error' && <span style={{ color: '#f87171', fontSize: 13 }}>{saveError}</span>}
      </div>

      {audioState === 'error' && audioError && (
        <div style={{ color: '#f87171', fontSize: 13 }}>Audio generation error: {audioError}</div>
      )}
      {audioResult && (
        <div style={{ fontSize: 13, color: '#ccc', background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 12 }}>
          <div>Generated {audioResult.generated.length} audio file(s).</div>
          {audioResult.failed.length > 0 && (
            <div style={{ color: '#f59e0b', marginTop: 6 }}>
              {audioResult.failed.length} message(s) failed:
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {audioResult.failed.map((f, i) => (
                  <li key={i}>{f.locator}: {f.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 999 }}>
          <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 32, maxWidth: 360, textAlign: 'center' }}>
            <p>Delete <strong>{lesson.title || lesson.id}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#7f1d1d', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Puzzle picker modal */}
      {showPicker && (
        <PuzzlePickerModal
          category={lesson.confirmationCategory}
          existingPuzzles={lesson.confirmationChallenges ?? []}
          onAdd={(puzzleData) => { handleAddPuzzle(puzzleData); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
