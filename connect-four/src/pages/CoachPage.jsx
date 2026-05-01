import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { PaywallModal } from '../components/PaywallModal.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Board } from '../components/Board.jsx';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';
const ROWS = 6;
const COLS = 7;

const CATEGORY_NAMES = {
  1: 'Immediate Threat', 2: 'Forced Block', 3: 'Double Threat',
  4: 'Fork Setup', 5: 'Zugzwang', 6: 'Parity Control',
};

function buildBoard(moves) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  const heights = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10) - 1;
    if (isNaN(col) || col < 0 || col >= COLS) continue;
    if (heights[col] >= ROWS) continue;
    board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return board;
}

function WeaknessMap({ data }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <div style={sectionLabel}>Accuracy by pattern</div>
      {data.map(item => {
        const rate = Math.round((1 - item.missRate) * 100);
        const color = rate >= 80 ? 'var(--green)' : rate >= 60 ? 'var(--yellow)' : 'var(--red)';
        return (
          <div key={item.category} style={catBarRow}>
            <div style={catBarLabel}>{CATEGORY_NAMES[item.category]}</div>
            <div style={catBarTrack}>
              <div style={{ ...catBarFill, width: `${rate}%`, background: color }} />
            </div>
            <div style={{ ...catBarPct, color }}>{rate}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CoachPage() {
  const { t } = useTranslation();
  const { session } = useStore();
  const [loading, setLoading] = useState(true);
  const [weaknessMap, setWeaknessMap] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isPaidGated, setIsPaidGated] = useState(false);

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [currentBlunder, setCurrentBlunder] = useState(null);
  const [reviewBoard, setReviewBoard] = useState(null);
  const [reviewAttempts, setReviewAttempts] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    loadCoachData();
  }, [session]);

  async function loadCoachData() {
    setLoading(true);
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const [wRes, qRes] = await Promise.all([
      fetch(`${API}/api/coach/weakness-map`, { headers }),
      fetch(`${API}/api/coach/queue`, { headers }),
    ]);

    if (wRes.status === 403) { setIsPaidGated(true); setLoading(false); return; }
    if (wRes.ok) setWeaknessMap((await wRes.json()).weaknessMap ?? []);
    if (qRes.ok) setQueueCount((await qRes.json()).queueCount ?? 0);
    setLoading(false);
  }

  async function startReview() {
    setReviewLoading(true);
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const res = await fetch(`${API}/api/coach/queue`, { headers });
    if (!res.ok) { setReviewLoading(false); return; }
    const data = await res.json();
    if (!data.puzzle) {
      setQueueCount(0);
      setReviewLoading(false);
      return;
    }
    setCurrentBlunder(data.puzzle);
    setReviewBoard(buildBoard(data.puzzle.moveString ?? ''));
    setQueueCount(data.queueCount ?? 0);
    setReviewAttempts(0);
    setReviewFeedback(null);
    setReviewMode(true);
    setReviewLoading(false);
  }

  async function handleReviewMove(col) {
    if (!currentBlunder || reviewFeedback) return;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
    const res = await fetch(`${API}/api/puzzles/${currentBlunder.puzzleId}/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ candidateCol: col, moveHistory: [], attemptNumber: reviewAttempts + 1 }),
    });
    const data = await res.json();
    const newAttempts = reviewAttempts + 1;
    setReviewAttempts(newAttempts);

    if (data.result === 'correct' || data.result === 'tied') {
      setReviewFeedback('correct');
      await fetch(`${API}/api/coach/queue/${currentBlunder.blunderId}/resolve`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setQueueCount(q => Math.max(0, q - 1));
    } else if (newAttempts >= 2) {
      setReviewFeedback('skip');
    } else {
      setReviewFeedback('wrong');
    }
  }

  async function nextReviewItem() {
    setReviewFeedback(null);
    setReviewAttempts(0);
    if (queueCount <= 0) {
      setReviewMode(false);
      setCurrentBlunder(null);
      return;
    }
    await startReview();
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Loading…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={page}>
        <div style={sectionHeader}>
          <div style={sectionTitle}>{t('coach.title')}</div>
        </div>
        <div style={{ margin: '12px 20px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 12 }}>
            Sign in to access your Personal AI Coach.
          </div>
          <button onClick={() => setShowAuth(true)} style={btnPrimary}>Sign in</button>
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  if (isPaidGated) {
    return (
      <div style={page}>
        <div style={sectionHeader}>
          <div style={sectionTitle}>{t('coach.title')}</div>
        </div>
        <div style={{ margin: '12px 20px', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--yellow)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--yellow)', marginBottom: 8 }}>
            🔒 Paid Feature
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Personal AI Coach
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 16 }}>
            Get a personalized review queue built from your blunders. Available on the paid plan.
          </div>
          <button
            style={btnPrimary}
            onClick={() => {
              setShowPaywall(true);
              track('paywall_viewed', { trigger: 'coach_gate' });
            }}
          >
            Upgrade
          </button>
        </div>
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trigger="coach_gate" session={session} />
      </div>
    );
  }

  if (reviewMode && currentBlunder) {
    return (
      <div style={page}>
        <div style={sectionHeader}>
          <div style={sectionTitle}>Review</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{queueCount} left</div>
        </div>

        <div style={{ padding: '4px 20px 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {currentBlunder.goalPrompt ?? 'Solve this position.'}
        </div>

        <div style={{ padding: '0 16px' }}>
          <Board
            board={reviewBoard}
            onColumnClick={handleReviewMove}
            canPlay={!reviewFeedback || reviewFeedback === 'wrong'}
          />
        </div>

        {reviewFeedback === 'wrong' && (
          <div style={{ ...feedbackBox, borderLeftColor: 'var(--red)' }}>
            <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, marginBottom: 4 }}>✗ Not the best move — try again</div>
          </div>
        )}

        {reviewFeedback === 'correct' && (
          <div style={{ ...feedbackBox, borderLeftColor: 'var(--green)' }}>
            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 4 }}>✓ Correct — blunder resolved</div>
            <button onClick={nextReviewItem} style={btnPrimary}>
              {queueCount > 0 ? 'Next →' : 'Finish'}
            </button>
          </div>
        )}

        {reviewFeedback === 'skip' && (
          <div style={{ ...feedbackBox, borderLeftColor: 'var(--text-muted)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>Skipped — will revisit later</div>
            <button onClick={nextReviewItem} style={btnPrimary}>
              {queueCount > 0 ? 'Next →' : 'Finish'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={sectionHeader}>
        <div style={sectionTitle}>{t('coach.title')}</div>
      </div>

      {weaknessMap.length > 0 && <WeaknessMap data={weaknessMap} />}

      <div style={{ margin: '0 20px 16px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Review Queue
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5 }}>
          {queueCount === 0
            ? t('coach.emptyQueue')
            : t('coach.queueCount', { count: queueCount })}
        </div>
        {queueCount > 0 && (
          <button style={btnPrimary} onClick={startReview} disabled={reviewLoading}>
            {reviewLoading ? '…' : t('coach.startReview')}
          </button>
        )}
      </div>
    </div>
  );
}

const page = { display: 'flex', flexDirection: 'column', background: 'var(--bg)', minHeight: '100%' };
const sectionHeader = { padding: '14px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' };
const sectionTitle = { fontSize: 22, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--text)' };
const sectionLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, paddingTop: 12, borderTop: '1px solid var(--border-dim)' };
const catBarRow = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 };
const catBarLabel = { fontSize: 11, fontWeight: 600, width: 110, flexShrink: 0, color: 'var(--text-sub)' };
const catBarTrack = { flex: 1, background: 'var(--border)', borderRadius: 3, height: 6, overflow: 'hidden' };
const catBarFill = { height: '100%', borderRadius: 3 };
const catBarPct = { fontSize: 11, fontFamily: "'Courier New', monospace", fontWeight: 700, width: 34, textAlign: 'right', flexShrink: 0 };
const btnPrimary = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '13px 20px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--red)', color: '#fff', marginTop: 12, fontFamily: 'inherit' };
const feedbackBox = { margin: '10px 16px', padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)' };
