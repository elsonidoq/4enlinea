import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { track } from '../lib/track.js';
import { ONBOARDING_GAME_PARAMS } from '../lib/onboardingRouting.js';
import { useLanguage } from '../lib/useLanguage.js';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function SettingsScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const { lang, changeLanguage } = useLanguage();
  const isAuthenticated = !!session;

  // Epic 8 — Onboarding Experience, US4 (T043/FR-010, research.md R6): "Replay intro" —
  // visible for ANY onboarding state, reaches Settings from Home in <=2 nav actions (SC-004).
  // Calls go('game', {...onboarding:true}) DIRECTLY, bypassing the Navigator auto-detect effect
  // (T018) entirely — this is an explicit user action, not the anonymous-only auto-route.
  // Fires onboarding_started here because the auto-route effect (App.jsx) early-returns on the
  // replay path, so this is the ONLY start signal for a manual replay (contracts/onboarding-api.md
  // event table: "first-run redirect fires (or manual Settings replay starts)").
  function handleReplayIntro() {
    track('onboarding_started', { source: 'settings_replay' });
    go('game', ONBOARDING_GAME_PARAMS);
  }

  const [papergamesId, setPapergamesId] = useState('');
  const [savedValue, setSavedValue] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Subscription section (D3) ───────────────────────────────────────────
  const [tier, setTier] = useState('free');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalError, setPortalError] = useState(false);
  const handleUpgrade = useUpgradeCheckout('/settings');

  async function openPortal() {
    setPortalError(false);
    try {
      const res = await fetch(`${API}/api/stripe/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ returnPath: '/settings' }),
      });
      if (!res.ok) { setPortalError(true); return; }
      const { portalUrl } = await res.json();
      window.location.href = portalUrl;
    } catch (_) {
      setPortalError(true);
    }
  }

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
        setTier(profile.tier === 'paid' ? 'paid' : 'free');
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
      setError(t('settings.papergames.errorAccountIdLength'));
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
        setError(body.error || t('settings.papergames.errorInvalidInput'));
      } else {
        setError(t('settings.papergames.errorSaveFailed'));
      }
    } catch (_) {
      setError(t('settings.papergames.errorNetwork'));
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
        setImportError(body.error || t('settings.papergames.errorImportFailed'));
        setImporting(false);
      }
    } catch (_) {
      setImportError(t('settings.papergames.errorNetwork'));
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
            setImportError(t('settings.papergames.errorJobLost'));
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
            setImportResult(t('settings.papergames.capReached'));
          } else {
            // T032/T036 (spec 041 US5/US6): report imported/skipped/blunderErrors as
            // distinct, honestly-worded counts rather than collapsing any non-zero
            // count into a single generic error. NOTE: `skipped` counts rooms that
            // could not be processed (transient fetch/parse/analysis failure) — the
            // importer does not track "already-imported duplicate" as a separate
            // count (see docs/architecture/api-conventions.md, GET
            // /api/user/papergames/import/status). Copy below describes what the
            // field actually measures instead of asserting "duplicate" causation
            // the code cannot back up.
            let result = t('settings.papergames.importedCount', { count: job.imported });
            if (job.skipped > 0) {
              result += t('settings.papergames.skippedCount', { count: job.skipped });
            }
            setImportResult(result);

            if (job.blunderErrors > 0) {
              setImportError(t('settings.papergames.blunderErrorsCount', { count: job.blunderErrors }));
            } else {
              setImportError(null);
            }
          }
        } else if (job.status === 'error') {
          stopPolling();
          setImportError(job.error || t('settings.papergames.errorImportFailedGeneric'));
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

  // ── Dev-only local reset ───────────────────────────────────────────────────
  // Wipes local IndexedDB data (anonymous progress), signs out (drops the
  // httpOnly session cookie), and clears web storage, then reloads — landing in
  // a clean signed-out state. Needed to test signed-out UI locally, where the
  // session cookie can't be cleared from DevTools. Gated to dev (localhost) like
  // the AuthModal "Dev: skip auth" button; never shipped to prod/staging.
  //
  // We CLEAR the object stores in place rather than indexedDB.deleteDatabase():
  // a delete is blocked as long as any connection (this tab's live app store, or
  // another open tab) holds the DB open, leaving the next open() hanging — which
  // strands the subsequent sign-in, because switchToSupabase awaits _db(). A
  // clear-transaction needs no exclusive lock, so it never blocks or hangs.
  function clearIndexedDBData() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      let req;
      try { req = indexedDB.open('decodec4'); } catch { return finish(); }
      req.onerror = finish;
      req.onblocked = finish;
      req.onsuccess = () => {
        const db = req.result;
        try {
          const names = Array.from(db.objectStoreNames);
          if (names.length === 0) { db.close(); return finish(); }
          const tx = db.transaction(names, 'readwrite');
          names.forEach((n) => tx.objectStore(n).clear());
          tx.oncomplete = () => { db.close(); finish(); };
          tx.onerror = () => { db.close(); finish(); };
          tx.onabort = () => { db.close(); finish(); };
        } catch { db.close(); finish(); }
      };
      setTimeout(finish, 1500); // safety net
    });
  }

  async function handleDevReset() {
    // 1. Drop the server session cookie so we come back signed out.
    try {
      await fetch(`${API}/api/auth/signout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    // 2. Clear web storages (postLoginReturnTo, any cached prefs).
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
    // 3. Wipe local IndexedDB data, then reload into a clean signed-out state.
    await clearIndexedDBData();
    window.location.reload();
  }

  const devReset = import.meta.env.DEV && (
    <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px dashed var(--ink-faint)' }}>
      <button
        type="button"
        onClick={handleDevReset}
        style={{
          width: '100%', padding: '10px 0',
          borderRadius: 12, border: '1.5px dashed #aaa',
          background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--ink-soft)',
        }}
      >
        🛠 Dev: clear IndexedDB &amp; sign out
      </button>
    </div>
  );

  // ── Unauthenticated view ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title={t('settings.title')} onBack={() => goBack ? goBack() : go('home')} onLogoClick={() => go('home')} />
        <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <p style={{ fontSize: 16, margin: 0 }}>{t('settings.papergames.signInPrompt')}</p>
        </div>
        <div style={{ padding: '0 18px 26px' }}>
          <button
            type="button"
            onClick={handleReplayIntro}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, padding: '10px 0' }}
          >
            {t('onboarding.replayIntro')}
          </button>
        </div>
        {devReset && <div style={{ padding: '0 18px 26px' }}>{devReset}</div>}
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.title')} onBack={() => goBack ? goBack() : go('home')} onLogoClick={() => go('home')} />

      <div style={{ padding: '8px 18px 26px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* ── Papergames section ─────────────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>
            {t('settings.papergames.title')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
            {t('settings.papergames.description')}
          </p>

          {/* Input row: text field + "Find" link */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="text"
              value={papergamesId}
              onChange={(e) => { setPapergamesId(e.target.value); setError(null); setSuccess(false); }}
              placeholder={t('settings.papergames.idPlaceholder')}
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
              {t('settings.papergames.findAccountId')}
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
              {t('settings.papergames.saved')}
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
              {saving ? t('settings.papergames.saving') : t('settings.papergames.save')}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleImport}
              disabled={importing || !savedValue}
              style={{ fontSize: 14, padding: '8px 20px' }}
            >
              {importing ? t('settings.papergames.importing') : t('settings.papergames.import')}
            </button>
          </div>

          {/* Import progress / result / error */}
          {importing && importStatus !== 'done' && importStatus !== 'error' && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '10px 0 0' }}>
              {importStatus === 'running' ? t('settings.papergames.importingProcessing') : t('settings.papergames.importingStarting')}
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
          {/* T035/T036 (spec 041 US6): post-import CTA to Past Games — shown for any
              completed job that produced a result message (full success, capReached,
              or partial success with skipped/blunderErrors), never for a hard job
              failure (job.status === 'error', which only sets importError). */}
          {importResult && (
            <button
              className="btn btn-ghost"
              onClick={() => go('pastGames')}
              style={{ fontSize: 14, padding: '8px 20px', marginTop: 10 }}
            >
              {t('settings.papergames.viewImportedGames')}
            </button>
          )}
        </section>

        {/* Epic 8 — Onboarding Experience, US4 (T043/FR-010): re-launchable for any state */}
        <section>
          <button
            type="button"
            onClick={handleReplayIntro}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, padding: '10px 0' }}
          >
            {t('onboarding.replayIntro')}
          </button>
        </section>

        {/* D3: tier-aware Subscription section — free -> UpgradeModal (5th call
            site, identical props to the other four); paid -> Stripe billing
            portal, which had zero frontend callers before this. */}
        <section>
          <h3>{t('settings.subscriptionHeading')}</h3>
          <p>{tier === 'paid' ? t('settings.planPaid') : t('settings.planFree')}</p>
          {tier === 'paid' ? (
            <button className="btn btn-ghost" onClick={openPortal} style={{ width: '100%', fontSize: 14, padding: '10px 0' }}>
              {t('settings.manageSubscription')}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setUpgradeOpen(true)} style={{ width: '100%', fontSize: 14, padding: '10px 0' }}>
              {t('settings.upgradeCta')}
            </button>
          )}
          {portalError && (
            <p role="alert" style={{ fontSize: 13, color: 'var(--eval-bad)', margin: '10px 0 0' }}>
              {t('settings.portalError')}
            </p>
          )}
        </section>

        {/* OI-15: language switcher machinery — es.json is a partial bundle
            (2 of 24 sections) until the separate translation effort lands. */}
        <section>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
            {t('settings.language.label')}
          </label>
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, padding: '10px' }}
          >
            <option value="en">{t('settings.language.en')}</option>
            <option value="es">{t('settings.language.es')}</option>
          </select>
        </section>

        {devReset}
      </div>

      {upgradeOpen && (
        <UpgradeModal onDismiss={() => setUpgradeOpen(false)} onUpgrade={handleUpgrade} />
      )}
    </div>
  );
}
