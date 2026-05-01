import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/ProfileStore.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { store } = useStore();
  const [todayStats, setTodayStats] = useState(null);

  useEffect(() => {
    if (!store?.getSessionStats) return;
    const today = new Date().toISOString().slice(0, 10);
    store.getSessionStats(today).then(s => {
      if (s?.stats) setTodayStats(s.stats);
    }).catch(() => {});
  }, [store]);

  const totalAttempted = todayStats
    ? Object.values(todayStats).reduce((s, v) => s + v.attempted, 0)
    : 0;
  const totalCorrect = todayStats
    ? Object.values(todayStats).reduce((s, v) => s + v.correct, 0)
    : 0;
  const accuracy = totalAttempted > 0
    ? Math.round((totalCorrect / totalAttempted) * 100)
    : null;

  return (
    <div style={page}>
      {/* Stats */}
      <div style={statRow}>
        <div style={statPill}>
          <div style={{ ...statValue, color: 'var(--red)' }}>{totalAttempted}</div>
          <div style={statLabel}>Today</div>
        </div>
        <div style={statPill}>
          <div style={{ ...statValue, color: 'var(--green)' }}>
            {accuracy !== null ? `${accuracy}%` : '—'}
          </div>
          <div style={statLabel}>Accuracy</div>
        </div>
      </div>

      {/* Entry cards */}
      <div style={cardList}>
        <EntryCard
          icon="🎯"
          title="Puzzle Trainer"
          sub={totalAttempted > 0 ? `${totalAttempted} puzzles today` : 'Train your pattern recognition'}
          accentColor="var(--red)"
          progress={accuracy}
          onClick={() => navigate('/puzzles')}
        />
        <EntryCard
          icon="⚔️"
          title="Sparring"
          sub="Play vs AI · Commit-first mode"
          accentColor="var(--teal)"
          onClick={() => navigate('/sparring')}
        />
        <EntryCard
          icon="📋"
          title="Personal AI Coach"
          sub="Weakness map · Review queue"
          accentColor="var(--yellow)"
          onClick={() => navigate('/coach')}
        />
      </div>
    </div>
  );
}

function EntryCard({ icon, title, sub, accentColor, progress, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 'var(--radius)',
        padding: '16px 16px 16px 16px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background .15s, border-color .15s',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3 }}>{sub}</div>
      {progress != null && (
        <div style={{ marginTop: 8, background: 'var(--border)', borderRadius: 3, height: 3 }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 3, background: accentColor }} />
        </div>
      )}
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }}>
        →
      </div>
    </div>
  );
}

const page = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  minHeight: '100%',
  paddingBottom: 12,
};

const statRow = {
  display: 'flex',
  gap: 8,
  padding: '8px 20px 12px',
};

const statPill = {
  flex: 1,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 8px',
  textAlign: 'center',
};

const statValue = {
  fontSize: 26,
  fontWeight: 800,
  fontFamily: "'Courier New', monospace",
  letterSpacing: '-.5px',
};

const statLabel = {
  fontSize: 9,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginTop: 2,
};

const cardList = {
  padding: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};
