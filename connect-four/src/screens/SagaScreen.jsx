import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { useUpgradeCheckout } from '../lib/useUpgradeCheckout.js';
import { subscribeCheckoutReturn } from '../lib/checkoutReturnFlow.js';
import { deriveLockReason, dispatchLockAction } from './sagaLock.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// CSS keyframes injected once as a style tag
const PULSE_STYLE = `
@keyframes lessonNodePulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%       { transform: scale(1.15); opacity: 0.2; }
}
`;

function injectPulseStyle() {
  if (document.getElementById('lesson-node-pulse-style')) return;
  const el = document.createElement('style');
  el.id = 'lesson-node-pulse-style';
  el.textContent = PULSE_STYLE;
  document.head.appendChild(el);
}

const NODE_SIZE = 52;

function LessonNode({ lesson, state, onTap }) {
  const { t } = useTranslation();

  const stateLabel = {
    done:     t('lesson.node.done',      'Completed'),
    current:  t('lesson.node.current',   'In progress'),
    unlocked: t('lesson.node.unlocked',  'Unlocked'),
    locked:   t('lesson.node.locked',    'Locked'),
  }[state];

  const circleStyle = {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    ...(state === 'done' && {
      background: 'var(--disc-green)',
    }),
    ...(state === 'current' && {
      background: '#fff',
      border: '3px solid var(--disc-green)',
    }),
    ...(state === 'unlocked' && {
      background: '#fff',
      border: '3px dashed #c9c3b6',
    }),
    ...(state === 'locked' && {
      background: 'var(--lock-bg)',
      opacity: 0.7,
    }),
  };

  const iconStyle = {
    fontSize: 22,
    color: state === 'done' ? '#fff' : state === 'locked' ? 'var(--lock)' : 'var(--disc-green)',
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', cursor: 'pointer' }}
      onClick={onTap}
    >
      {/* Circle with optional pulse ring */}
      <div style={{ position: 'relative', flexShrink: 0, width: NODE_SIZE, height: NODE_SIZE }}>
        {state === 'current' && (
          <div style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '3px solid var(--disc-green)',
            animation: 'lessonNodePulse 1.8s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
        <div style={circleStyle}>
          {state === 'done'    && <span style={iconStyle}>✓</span>}
          {state === 'locked'  && <span style={{ fontSize: 20 }}>🔒</span>}
          {(state === 'current' || state === 'unlocked') && (
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--disc-green)',
              opacity: state === 'current' ? 1 : 0.3,
            }} />
          )}
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--ink)',
          }}>
            {t(`lesson.${lesson.id}.title`, { defaultValue: lesson.title })}
          </span>
          {lesson.free === false && (
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              background: 'var(--disc-green)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 6,
              fontFamily: 'var(--font-display)',
            }}>
              PRO
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--ink-soft)',
          fontWeight: 600,
          marginTop: 2,
        }}>
          {stateLabel}
        </div>
      </div>
    </div>
  );
}

export function SagaScreen({ go, goBack }) {
  const { t } = useTranslation();
  const { store } = useStore();
  const handleUpgrade = useUpgradeCheckout();
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [tier, setTier] = useState('free');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUiState, setUpgradeUiState] = useState('idle');
  const [orderLockOpen, setOrderLockOpen] = useState(false);

  // See SettingsScreen.jsx's identical subscription for the full rationale:
  // UpgradeModal's controlled uiState/onUiStateChange props had no caller, so
  // a real payment left the modal stuck on 'loading' and `tier` (fetched once
  // below) never refreshed — lessons paying should unlock stayed locked. The
  // modal itself now owns auto-dismissing (with its slide-away animation)
  // once 'success' renders.
  useEffect(() => {
    return subscribeCheckoutReturn((state) => {
      if (state === 'activated') {
        setTier('paid');
        setUpgradeUiState('success');
      } else if (state === 'failed') {
        setUpgradeUiState('timeout');
      }
    });
  }, []);

  useEffect(() => {
    injectPulseStyle();
    track('screen_viewed', { screen: 'saga_map' });

    fetch(`${API}/api/lessons`)
      .then(r => r.json())
      .then(data => setLessons(data))
      .catch(err => console.error('[SagaScreen] fetch lessons error:', err));

    if (store) {
      store.getLessonProgress()
        .then(data => setProgress(data))
        .catch(err => console.error('[SagaScreen] getLessonProgress error:', err));

      store.getProfile()
        .then(p => setTier(p?.tier ?? 'free'))
        .catch(() => setTier('free'));
    }
  }, [store]);

  useEffect(() => {
    if (!orderLockOpen) return;
    const timer = setTimeout(() => setOrderLockOpen(false), 3200);
    return () => clearTimeout(timer);
  }, [orderLockOpen]);

  function deriveNodeState(lesson) {
    const isDone = progress.some(p => p.lessonId === lesson.id && p.status === 'complete');
    if (isDone) return 'done';

    const reason = deriveLockReason(lesson, lessons, progress, tier);
    if (reason !== 'none') return 'locked';

    // 'current' = first lesson (by order) that is not done and accessible
    const firstAccessible = lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .find(l => {
        const done = progress.some(p => p.lessonId === l.id && p.status === 'complete');
        const locked = deriveLockReason(l, lessons, progress, tier) !== 'none';
        return !done && !locked;
      });

    if (firstAccessible && firstAccessible.id === lesson.id) return 'current';

    return 'unlocked';
  }

  function handleNodeTap(lesson) {
    const isDone = progress.some(p => p.lessonId === lesson.id && p.status === 'complete');
    if (isDone) {
      go('concept', { lessonId: lesson.id });
      return;
    }

    const reason = deriveLockReason(lesson, lessons, progress, tier);
    const action = dispatchLockAction(reason);
    if (action === 'upgrade') {
      setUpgradeOpen(true);
    } else if (action === 'orderLock') {
      setOrderLockOpen(true);
    } else {
      go('concept', { lessonId: lesson.id });
    }
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('saga.title', 'Lessons')}
        onBack={() => go('home')}
        onLogoClick={() => go('home')}
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {sortedLessons.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 15 }}>
            {t('saga.empty', 'No lessons available yet.')}
          </div>
        ) : (
          sortedLessons.map(lesson => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              state={deriveNodeState(lesson)}
              onTap={() => handleNodeTap(lesson)}
            />
          ))
        )}
      </div>

      {orderLockOpen && (
        <div
          onClick={() => setOrderLockOpen(false)}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            maxWidth: 420,
            width: 'calc(100% - 36px)',
            background: 'var(--ink)',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            zIndex: 50,
            textAlign: 'center',
          }}
        >
          {t('saga.orderLock.message', 'Finish the previous lesson to unlock this one')}
        </div>
      )}

      {upgradeOpen && (
        <UpgradeModal
          onDismiss={() => { setUpgradeOpen(false); setUpgradeUiState('idle'); }}
          onUpgrade={handleUpgrade}
          uiState={upgradeUiState}
          onUiStateChange={setUpgradeUiState}
        />
      )}
    </div>
  );
}
