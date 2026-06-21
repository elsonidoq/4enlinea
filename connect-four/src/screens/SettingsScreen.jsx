import { useState, useEffect } from 'react';
import { useStore } from '../store/ProfileStore.jsx';
import { TopBar } from '../components/TopBar.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function SettingsScreen({ go, goBack }) {
  const { store, session } = useStore();
  const isAuthenticated = !!session;

  const [papergamesId, setPapergamesId] = useState('');
  const [savedValue, setSavedValue] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Import state ───────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [importJobId, setImportJobId] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Fetch profile on mount to get latest papergames_id
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await store.getProfile();
        if (cancelled) return;
        const id = profile.papergames_id || '';
        setPapergamesId(id);
        setSavedValue(id);
      } catch (_) {
        // Ignore — user can still type
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  async function handleSave() {
    setError(null);
    setSuccess(false);

    const trimmed = papergamesId.trim();
    if (!trimmed || trimmed.length > 64) {
      setError('Account ID must be between 1 and 64 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ papergames_id: trimmed }),
      });

      if (res.status === 204) {
        setSavedValue(trimmed);
        setPapergamesId(trimmed);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Invalid input.');
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch (_) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Import handler + polling ───────────────────────────────────────────────
  async function handleImport() {
    setImportError(null);
    setImportResult(null);
    setImporting(true);

    try {
      const res = await fetch(`${API}/api/user/papergames/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });

      if (res.status === 202) {
        const body = await res.json();
        setImportJobId(body.jobId);
        // Polling will start via the useEffect below
      } else {
        const body = await res.json().catch(() => ({}));
        setImportError(body.error || 'Import failed. Please try again.');
        setImporting(false);
      }
    } catch (_) {
      setImportError('Network error. Please try again.');
      setImporting(false);
    }
  }

  // Poll import status
  useEffect(() => {
    if (!importJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}/api/user/papergames/import/status?jobId=${importJobId}`,
          { credentials: 'include' },
        );

        if (!res.ok) {
          if (res.status === 404) {
            setImportError('Import job lost. Please try again.');
            stopPolling();
            return;
          }
          return; // transient — retry on next tick
        }

        const job = await res.json();
        setImportStatus(job.status);

        if (job.status === 'done') {
          stopPolling();
          if (job.capReached) {
            setImportResult("You've reached your 15-game limit.");
          } else if (job.blunderErrors > 0) {
            setImportError(`Imported ${job.imported} game${job.imported !== 1 ? 's' : ''}, but analysis failed to save for ${job.blunderErrors} move${job.blunderErrors !== 1 ? 's' : ''}. Please try re-importing.`);
          } else {
            setImportResult(`Imported ${job.imported} game${job.imported !== 1 ? 's' : ''}.`);
          }
        } else if (job.status === 'error') {
          stopPolling();
          setImportError(job.error || 'Import failed.');
        }
        // pending/running — keep polling (no action needed)
      } catch (_) {
        // transient network error — retry on next tick
      }
    }, 2000);

    function stopPolling() {
      clearInterval(interval);
      setImporting(false);
    }

    return () => clearInterval(interval);
  }, [importJobId]);

  // ── Unauthenticated view ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title="Settings" onBack={() => goBack ? goBack() : go('home')} />
        <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <p style={{ fontSize: 16, margin: 0 }}>Sign in to connect your Papergames account.</p>
        </div>
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Settings" onBack={() => goBack ? goBack() : go('home')} />

      <div style={{ padding: '8px 18px 26px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* ── Papergames section ─────────────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>
            Papergames Import
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Enter your Papergames account ID to import your game history.
          </p>

          {/* Input row: text field + "Find" link */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="text"
              value={papergamesId}
              onChange={(e) => { setPapergamesId(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Your Papergames account ID"
              maxLength={128}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: 15,
                border: `1.5px solid ${error ? 'var(--eval-bad)' : 'var(--ink-faint)'}`,
                borderRadius: 8,
                background: 'var(--card)',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <a
              href="https://papergames.io/en/account"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
                textDecoration: 'underline',
              }}
            >
              Find your account ID
            </a>
          </div>

          {/* Validation error */}
          {error && (
            <p style={{ fontSize: 13, color: 'var(--eval-bad)', margin: '0 0 10px' }}>
              {error}
            </p>
          )}

          {/* Success indicator */}
          {success && (
            <p style={{ fontSize: 13, color: 'var(--disc-green)', margin: '0 0 10px' }}>
              Saved!
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: 14, padding: '8px 20px' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleImport}
              disabled={importing || !savedValue}
              style={{ fontSize: 14, padding: '8px 20px' }}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>

          {/* Import progress / result / error */}
          {importing && importStatus !== 'done' && importStatus !== 'error' && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '10px 0 0' }}>
              Importing... {importStatus === 'running' ? 'Processing games' : 'Starting'}
            </p>
          )}
          {importResult && (
            <p style={{ fontSize: 13, color: 'var(--disc-green)', margin: '10px 0 0' }}>
              {importResult}
            </p>
          )}
          {importError && (
            <p style={{ fontSize: 13, color: 'var(--eval-bad)', margin: '10px 0 0' }}>
              {importError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
