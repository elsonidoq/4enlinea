import { useTranslation } from 'react-i18next';

// Links to /terms, /privacy, /refunds, and the new /pricing-legal — these
// remain server-served static legal pages that live outside the SPA, so they
// must be plain <a href> that perform a full navigation rather than SPA route
// changes. /pricing is the one exception (spec 053 US4, FR-024): it is now an
// in-app React route (PricingScreen), so its footer entry routes through the
// app's sole navigation mechanism, go('pricing')
// (docs/architecture/frontend-conventions.md §Screen Navigation), instead of
// a full-page <a href> like the others.
export function LegalFooter({ go }) {
  const { t } = useTranslation();

  const linkStyle = {
    color: 'var(--ink-soft)',
    textDecoration: 'none',
    fontWeight: 600,
  };

  const links = [
    { href: '/terms', label: t('footer.terms') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/refunds', label: t('footer.refunds') },
    { href: '/pricing-legal', label: t('footer.pricingLegal') },
  ];

  return (
    <footer
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px 10px',
        padding: '18px 18px 22px',
        fontSize: 13,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px 10px' }}>
        <button
          type="button"
          onClick={() => go?.('pricing')}
          style={{ ...linkStyle, background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
        >
          {t('footer.pricing')}
        </button>
        <span style={{ color: 'var(--ink-soft)', opacity: 0.5 }}>·</span>
      </span>
      {links.map((link, i) => (
        <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px 10px' }}>
          <a href={link.href} style={linkStyle}>{link.label}</a>
          {i < links.length - 1 && <span style={{ color: 'var(--ink-soft)', opacity: 0.5 }}>·</span>}
        </span>
      ))}
    </footer>
  );
}
