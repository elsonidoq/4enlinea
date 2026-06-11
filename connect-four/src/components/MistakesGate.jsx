/**
 * MistakesGate — guards all non-populated states for the Mistakes surface.
 *
 * Two concrete callers: CategoryListScreen (Level 1) and MistakesListScreen (Level 2).
 * Both need different signed-out and empty-authenticated content, supplied via
 * render-callback props. Loading and error states are shared.
 *
 * Props:
 *   session       — the user session object (falsy = signed out)
 *   loading       — boolean, show spinner
 *   error         — string | null, show error + Retry
 *   isEmpty       — boolean, true when data array is empty (and session exists)
 *   onRetry       — () => void, called on Retry tap (defaults to window.location.reload)
 *   renderSignedOut — () => JSX, required; rendered when !session
 *   renderEmpty    — () => JSX, required; rendered when isEmpty && session
 *   children      — JSX, the populated list (rendered when none of the above apply)
 */
export function MistakesGate({
  session,
  loading,
  error,
  isEmpty,
  onRetry,
  renderSignedOut,
  renderEmpty,
  children,
}) {
  // Signed-out gate
  if (!session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 36px',
        textAlign: 'center',
        gap: 16,
      }}>
        {renderSignedOut()}
      </div>
    );
  }

  // Loading spinner
  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: 'var(--ink-soft)',
      }}>
        Loading...
      </div>
    );
  }

  // Error + Retry
  if (error) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 36px',
        textAlign: 'center',
        gap: 12,
      }}>
        <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{error}</div>
        <button
          onClick={onRetry || (() => window.location.reload())}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Authenticated empty state
  if (isEmpty && session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 36px',
        textAlign: 'center',
        gap: 14,
      }}>
        {renderEmpty()}
      </div>
    );
  }

  // Populated — render children (the list)
  return children;
}
