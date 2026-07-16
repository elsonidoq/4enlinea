import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachAvatar } from '../components/CoachAvatar.jsx';
import { Icon } from '../components/Icon.jsx';
import { MistakesGate } from '../components/MistakesGate.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { resolveCategoryListBack } from './categoryListBack.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function CategoryListScreen({ go, goBack, navContext }) {
  const { t } = useTranslation();
  const { session } = useStore();
  // categories: [{ category, count }], one entry per pattern_category with >=1 blunder for
  // this user — sourced from the true per-category count aggregate (spec 041 US2), not derived
  // from a single (truncatable) page of /api/coach/queue.
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics on mount
  useEffect(() => {
    track('screen_viewed', { screen: 'mistake_categories' });
  }, []);

  // Fetch true per-category counts
  const fetchCategories = useCallback(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API}/api/coach/category-counts`, {
      credentials: 'include',
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [session]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const isEmpty = categories.length === 0;

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.title')}
        onBack={() => {
          if (resolveCategoryListBack({ navContext }) === 'home') { go('home'); return; }
          goBack();
        }}
        onLogoClick={() => go('home')}
      />

      <MistakesGate
        session={session}
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        onRetry={() => fetchCategories()}
        renderSignedOut={() => (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', color: 'var(--ink-soft)' }}>
              <Icon name="user" size={34} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>{t('mistakes.gate.heading')}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4, maxWidth: 300 }}>{t('mistakes.gate.body')}</div>
            <button
              onClick={() => go('stats')}
              style={{
                marginTop: 8,
                width: '100%', maxWidth: 260,
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--green)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('mistakes.gate.cta')}
            </button>
            <button
              onClick={() => go('stats')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-soft)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {t('mistakes.gate.later')}
            </button>
          </>
        )}
        renderEmpty={() => (
          <>
            <CoachAvatar size={88} mood="happy" />
            <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>{t('mistakes.empty.heading')}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4, maxWidth: 300 }}>{t('mistakes.empty.body')}</div>
            <button
              onClick={() => go('difficulty')}
              style={{
                marginTop: 8,
                width: '100%', maxWidth: 260,
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--green)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('mistakes.empty.cta')}
            </button>
          </>
        )}
      >
        {/* Category rows — one card per category with >=1 blunder, driven by the true
            per-category count (spec 041 US2); no per-blunder thumbnail/severity data is
            available from this aggregate, so cards are count-driven only. */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(cat => (
            <button
              key={cat.category}
              onClick={() => go('mistakeDetail', { category: cat.category })}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: '#fff',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                color: 'var(--ink)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Body: label */}
              <div style={{ flex: 1, fontWeight: 700, fontSize: 15, lineHeight: 1.2, minWidth: 0 }}>
                {t('mistakes.pattern.' + cat.category)}
              </div>

              {/* Right: count + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {cat.count}
                </span>
                <Icon name="chevR" size={18} />
              </div>
            </button>
          ))}
        </div>
      </MistakesGate>
    </div>
  );
}
