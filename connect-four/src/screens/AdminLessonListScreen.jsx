import React, { useState, useEffect } from 'react';

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

/**
 * Props:
 *   onEdit: (lessonId: string) => void
 *   onNew: () => void
 */
export default function AdminLessonListScreen({ onEdit, onNew }) {
  const [lessons, setLessons] = useState(null);

  async function load() {
    const res = await fetch('/api/admin/lessons', { headers: authHeaders() });
    setLessons(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  }

  if (!lessons) return <div style={{ color: '#fff', padding: 32 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Lessons</h1>
        <button
          onClick={onNew}
          style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#166534', color: '#fff', fontWeight: 700 }}
        >
          + New lesson
        </button>
      </div>

      {lessons.length === 0 && <p style={{ color: '#888' }}>No lessons yet.</p>}

      {lessons.map(lesson => (
        <div
          key={lesson.id}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1e1e1e', borderRadius: 8, marginBottom: 8, border: '1px solid #333' }}
        >
          <span style={{ width: 28, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>{lesson.order}</span>
          <span style={{ flex: 1, fontWeight: 600 }}>{lesson.title || lesson.id}</span>
          <span style={{ fontSize: 12, color: lesson.free ? '#4ade80' : '#f59e0b', width: 36 }}>{lesson.free ? 'Free' : 'Pro'}</span>
          <button onClick={() => onEdit(lesson.id)} style={{ padding: '4px 14px', borderRadius: 6, cursor: 'pointer' }}>Edit</button>
          <button onClick={() => handleDelete(lesson.id, lesson.title)} style={{ padding: '4px 14px', borderRadius: 6, cursor: 'pointer', color: '#f87171' }}>✕</button>
        </div>
      ))}
    </div>
  );
}
