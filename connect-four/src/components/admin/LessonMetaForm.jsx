import React from 'react';

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Props:
 *   meta: { title, id, order, free, userPerspective }
 *   onChange: (updatedMeta) => void
 */
export default function LessonMetaForm({ meta, onChange }) {
  function update(key, value) {
    const updated = { ...meta, [key]: value };
    if (key === 'title' && !meta._idManuallyEdited) {
      updated.id = toSlug(value);
    }
    onChange(updated);
  }

  function updateId(value) {
    onChange({ ...meta, id: value, _idManuallyEdited: true });
  }

  const inputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', boxSizing: 'border-box' };
  const labelStyle = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      <div>
        <label style={labelStyle}>Title</label>
        <input value={meta.title} onChange={e => update('title', e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="Lesson title" />
      </div>
      <div>
        <label style={labelStyle}>ID / slug</label>
        <input value={meta.id} onChange={e => updateId(e.target.value)} style={{ ...inputStyle, width: '100%', fontFamily: 'monospace' }} placeholder="lesson-id" />
      </div>
      <div>
        <label style={labelStyle}>Order</label>
        <input type="number" min={1} value={meta.order} onChange={e => update('order', parseInt(e.target.value, 10))} style={{ ...inputStyle, width: '100%' }} />
      </div>
      <div>
        <label style={labelStyle}>Tier</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[true, false].map(isFree => (
            <button
              key={String(isFree)}
              onClick={() => update('free', isFree)}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer',
                background: meta.free === isFree ? (isFree ? '#166534' : '#7c2d12') : '#222',
                color: '#fff', border: '1px solid #444',
              }}
            >
              {isFree ? 'Free' : 'Pro'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={labelStyle}>User plays as</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {['red', 'yellow'].map(p => (
            <button
              key={p}
              onClick={() => update('userPerspective', p)}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer',
                background: meta.userPerspective === p ? (p === 'red' ? '#166534' : '#854d0e') : '#222',
                color: '#fff', border: '1px solid #444',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
