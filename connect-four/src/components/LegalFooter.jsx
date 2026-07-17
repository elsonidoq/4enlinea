import { useTranslation } from 'react-i18next';

// Links to the server-served static legal pages (/pricing, /terms, /privacy,
// /refunds). These live outside the SPA, so they must be plain <a href> that
// perform a full navigation rather than SPA route changes.
export function LegalFooter() {
  const { t } = useTranslation();

  const linkStyle = {
    color: 'var(--ink-soft)',
    textDecoration: 'none',
    fontWeight: 600,
  };

  const links = [
    { href: '/pricing', label: t('footer.pricing') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/refunds', label: t('footer.refunds') },
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
      {links.map((link, i) => (
        <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px 10px' }}>
          <a href={link.href} style={linkStyle}>{link.label}</a>
          {i < links.length - 1 && <span style={{ color: 'var(--ink-soft)', opacity: 0.5 }}>·</span>}
        </span>
      ))}
    </footer>
  );
}
