import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Icon } from '../components/Icon.jsx';
import { track } from '../lib/track.js';

const DIFFICULTIES = [
  { key: 'easy', subtitleKey: 'sparring.easySub', isDefault: false },
  { key: 'medium', subtitleKey: 'sparring.mediumSub', isDefault: true },
  { key: 'hard', subtitleKey: 'sparring.hardSub', isDefault: false },
  { key: 'perfect', subtitleKey: 'sparring.perfectSub', isDefault: false },
];

const SIDES = [
  { value: 'first', discColor: 'var(--disc-green)', nameKey: 'sparring.sideGreen', labelKey: 'sparring.sideFirst' },
  { value: 'second', discColor: 'var(--disc-gray)', nameKey: 'sparring.sideGray', labelKey: 'sparring.sideSecond' },
];

export function DifficultyPickerScreen({ go, goBack }) {
  const { t } = useTranslation();
  const [diff, setDiff] = useState('medium');
  const [side, setSide] = useState('first');

  function handleStart() {
    track('game_started', { difficulty: diff, side });
    go('game', { difficulty: diff, side });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('nav.sparring')}
        onBack={goBack}
        onLogoClick={() => go('home')}
      />

      <div style={{ padding: '8px 18px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Difficulty section */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--ink-soft)',
          marginBottom: 10,
          marginTop: 4,
        }}>
          {t('sparring.chooseDifficulty')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DIFFICULTIES.map(d => {
            const selected = diff === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setDiff(d.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--card)',
                  border: '2px solid',
                  borderColor: selected ? 'var(--disc-green)' : 'var(--line)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                  transition: 'border-color .12s, box-shadow .12s',
                  boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 17,
                      color: 'var(--ink)',
                    }}>
                      {t(`sparring.${d.key}`)}
                    </span>
                    {d.isDefault && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: 'var(--font-display)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'var(--eval-good-bg)',
                        color: 'var(--disc-green)',
                        letterSpacing: 0.3,
                      }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--ink-soft)',
                    marginTop: 3,
                    lineHeight: 1.3,
                  }}>
                    {t(d.subtitleKey)}
                  </div>
                </div>

                {/* Radio indicator */}
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '2.5px solid',
                  borderColor: selected ? 'var(--disc-green)' : 'var(--ink-faint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'border-color .12s',
                }}>
                  {selected && (
                    <div style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: 'var(--disc-green)',
                    }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Play as section */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--ink-soft)',
          marginTop: 28,
          marginBottom: 10,
        }}>
          {t('sparring.playAs')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SIDES.map(s => {
            const selected = side === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSide(s.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 12px',
                  borderRadius: 16,
                  background: 'var(--card)',
                  border: '2.5px solid',
                  borderColor: selected ? 'var(--ink)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  transition: 'border-color .12s, box-shadow .12s',
                  boxShadow: 'var(--shadow-sm)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: s.discColor,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 15,
                  color: 'var(--ink)',
                }}>
                  {t(s.nameKey)}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink-faint)',
                }}>
                  {t(s.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer pushes the button to the bottom */}
        <div style={{ flex: 1 }} />

        {/* Start game button */}
        <button
          className="btn btn-primary"
          onClick={handleStart}
          style={{ marginTop: 16 }}
        >
          {t('sparring.startGame')} <Icon name="play" size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
