import { useState, useEffect, useRef, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || '';

const STATUS_LABELS = {
  approved: 'Approved',
  awaiting_approval: 'Awaiting Approval',
  needs_audio: 'Needs Audio',
  ineligible: 'Ineligible',
};

const STATUS_ORDER = ['awaiting_approval', 'needs_audio', 'approved', 'ineligible'];

const TTS_VOICES = ['alloy','ash','coral','echo','fable','nova','onyx','sage','shimmer'];

function StatusBadge({ status, reason }) {
  const colors = {
    approved: { bg: '#dcfce7', fg: '#166534' },
    awaiting_approval: { bg: '#fef9c3', fg: '#854d0e' },
    needs_audio: { bg: '#f3f4f6', fg: '#374151' },
    ineligible: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = colors[status] || colors.needs_audio;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
      {reason && <span style={{ fontWeight: 400, opacity: 0.7 }}>({reason})</span>}
    </span>
  );
}

function AudioPlayer({ slug, generatedAt }) {
  if (!slug) return null;

  const cacheBuster = generatedAt ? `?t=${encodeURIComponent(generatedAt)}` : '';

  return (
    <audio
      key={`${slug}-${generatedAt}`}
      controls
      preload="none"
      src={`${API}/api/admin/audio/play/${slug}${cacheBuster}`}
      style={{ height: 28, width: 200 }}
    />
  );
}

export function AdminAudioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyKeys, setBusyKeys] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [speed, setSpeed] = useState('1.0');
  const [speedError, setSpeedError] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/audio/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    fetch(`${API}/api/admin/audio/prompt`)
      .then(r => r.json())
      .then(j => {
        setPrompt(j.prompt || '');
        setSpeed(String(j.speed ?? 1.0));
        setVoice(j.voice || 'alloy');
      })
      .catch(() => {});
  }, []);

  function handleSpeedChange(val) {
    setSpeed(val);
    const n = parseFloat(val);
    if (isNaN(n) || n < 0.25 || n > 4.0) {
      setSpeedError('Must be a number between 0.25 and 4.0');
    } else {
      setSpeedError('');
    }
  }

  async function handleSavePrompt() {
    if (speedError) return;
    setPromptSaving(true);
    setPromptSaved(false);
    try {
      const res = await fetch(`${API}/api/admin/audio/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, speed: parseFloat(speed), voice }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setPromptSaving(false);
    }
  }

  async function handleGenerate(key) {
    setBusyKeys(prev => new Set([...prev, key]));
    try {
      const res = await fetch(`${API}/api/admin/audio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchStatus();
    } catch (err) {
      alert(`Generate failed: ${err.message}`);
    } finally {
      setBusyKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }

  async function handleApprove(key) {
    setBusyKeys(prev => new Set([...prev, key]));
    try {
      const res = await fetch(`${API}/api/admin/audio/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      await fetchStatus();
    } catch (err) {
      alert(`Approve failed: ${err.message}`);
    } finally {
      setBusyKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }

  async function handleGenerateAll() {
    if (!window.confirm(`Generate audio for all ${data?.counts?.needs_audio || 0} keys needing audio? This will call the OpenAI TTS API.`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/audio/generate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus();
    } catch (err) {
      alert(`Generate all failed: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleApproveAll() {
    if (!window.confirm(`Approve all ${data?.counts?.awaiting_approval || 0} keys awaiting approval?`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/audio/approve-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus();
    } catch (err) {
      alert(`Approve all failed: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
        Loading audio registry...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="dark-surface" style={{ minHeight: '100vh', color: 'var(--text)', fontFamily: 'var(--font-body)', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>
        Coach Audio Manager
      </h1>

      {/* Voice instructions prompt */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Voice Instructions Prompt
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Voice
            </label>
            <select
              value={voice}
              onChange={e => setVoice(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {TTS_VOICES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Speed
            </label>
            <input
              type="text"
              value={speed}
              onChange={e => handleSpeedChange(e.target.value)}
              style={{
                width: 80,
                padding: '6px 10px',
                borderRadius: 8,
                border: speedError ? '1px solid var(--red)' : '1px solid rgba(255,255,255,0.12)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
              }}
            />
            {speedError && <span style={{ fontSize: 12, color: 'var(--red)' }}>{speedError}</span>}
            <span style={{ fontSize: 11, opacity: 0.4 }}>0.25 – 4.0</span>
          </div>
        </div>

        <button
          onClick={handleSavePrompt}
          disabled={promptSaving || !!speedError}
          style={{
            marginTop: 8,
            padding: '7px 18px',
            borderRadius: 8,
            border: 'none',
            background: promptSaved ? 'var(--eval-good)' : 'var(--disc-green)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: promptSaving ? 'not-allowed' : 'pointer',
            opacity: promptSaving ? 0.6 : 1,
            fontFamily: 'var(--font-display)',
            transition: 'background 0.2s',
          }}
        >
          {promptSaving ? 'Saving...' : promptSaved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
        fontSize: 13,
      }}>
        {STATUS_ORDER.map(s => (
          <StatusBadge key={s} status={s} />
        ))}
        <span style={{ opacity: 0.6 }}>{data?.counts?.total ?? 0} total</span>
      </div>

      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={handleGenerateAll}
          disabled={bulkLoading || (data?.counts?.needs_audio ?? 0) === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--disc-green)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: (data?.counts?.needs_audio ?? 0) > 0 && !bulkLoading ? 'pointer' : 'not-allowed',
            opacity: (data?.counts?.needs_audio ?? 0) > 0 && !bulkLoading ? 1 : 0.5,
            fontFamily: 'var(--font-display)',
          }}
        >
          {bulkLoading ? 'Generating...' : `Generate All New (${data?.counts?.needs_audio ?? 0})`}
        </button>

        <button
          onClick={handleApproveAll}
          disabled={bulkLoading || (data?.counts?.awaiting_approval ?? 0) === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--eval-good)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: (data?.counts?.awaiting_approval ?? 0) > 0 && !bulkLoading ? 'pointer' : 'not-allowed',
            opacity: (data?.counts?.awaiting_approval ?? 0) > 0 && !bulkLoading ? 1 : 0.5,
            fontFamily: 'var(--font-display)',
          }}
        >
          Approve All ({data?.counts?.awaiting_approval ?? 0})
        </button>
      </div>

      {/* Key lists by status */}
      {STATUS_ORDER.map(status => {
        const items = data?.[status] ?? [];
        if (items.length === 0) return null;

        return (
          <div key={status} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {STATUS_LABELS[status]}
              <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>({items.length})</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(item => {
                const isBusy = busyKeys.has(item.key);

                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Key + text preview */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, wordBreak: 'break-all', marginBottom: 2 }}>
                        {item.key}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                        {item.text || <span style={{ opacity: 0.3 }}>(no text in en.json)</span>}
                      </div>
                    </div>

                    <StatusBadge status={item.status} reason={item.reason} />

                    {/* Playback — show for awaiting_approval and approved */}
                    {item.status !== 'needs_audio' && item.status !== 'ineligible' && (
                      <AudioPlayer slug={item.slug} generatedAt={item.generated_at} />
                    )}

                    {/* Actions */}
                    {item.status === 'needs_audio' && (
                      <button
                        onClick={() => handleGenerate(item.key)}
                        disabled={isBusy}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none',
                          background: 'var(--disc-green)', color: '#fff',
                          fontWeight: 700, fontSize: 12, cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.5 : 1, whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {isBusy ? '...' : 'Generate'}
                      </button>
                    )}

                    {item.status === 'awaiting_approval' && (
                      <button
                        onClick={() => handleApprove(item.key)}
                        disabled={isBusy}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none',
                          background: 'var(--eval-good)', color: '#fff',
                          fontWeight: 700, fontSize: 12, cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.5 : 1, whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {isBusy ? '...' : 'Approve'}
                      </button>
                    )}

                    {(item.status === 'awaiting_approval' || item.status === 'approved') && (
                      <button
                        onClick={() => handleGenerate(item.key)}
                        disabled={isBusy}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                          background: 'transparent', color: 'var(--text)',
                          fontWeight: 700, fontSize: 12, cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.5 : 0.7, whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {isBusy ? '...' : 'Regenerate'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AdminAudioPage;
