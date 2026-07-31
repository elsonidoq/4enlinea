import { useTranslation } from 'react-i18next';

export function CoachAvatar({ size = 58, mood = 'happy' }) {
  const { t } = useTranslation();
  return (
    <svg
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, boxShadow: 'var(--shadow-sm)', border: '2.5px solid #fff' }}
      viewBox="0 0 100 100"
      aria-label={t('common.coach')}
    >
      <rect width="100" height="100" fill="#dcefff" />
      {/* shoulders / sweater */}
      <path d="M16 100 C18 78 32 70 50 70 C68 70 82 78 84 100 Z" fill="#2f7d7a" />
      <path d="M40 72 L50 84 L60 72 Z" fill="#f4f1ea" />
      <path d="M44 71 L50 80 L56 71 Z" fill="#cfd8d6" />
      {/* neck */}
      <rect x="42" y="60" width="16" height="14" rx="6" fill="#e8b893" />
      {/* head */}
      <ellipse cx="50" cy="44" rx="22" ry="24" fill="#f0c29c" />
      {/* ears */}
      <circle cx="28" cy="46" r="4.5" fill="#e8b893" />
      <circle cx="72" cy="46" r="4.5" fill="#e8b893" />
      {/* hair */}
      <path d="M27 40 C25 20 42 14 50 14 C58 14 75 20 73 40 C73 33 68 28 60 27 C55 31 45 31 40 27 C32 28 27 33 27 40 Z" fill="#6b4327" />
      <path d="M27 41 C25 33 28 27 31 25 C29 31 30 37 31 41 Z" fill="#5a371f" />
      {/* eyebrows */}
      <rect x="35" y="36" width="11" height="3" rx="1.5" fill="#6b4327" />
      <rect x="54" y="36" width="11" height="3" rx="1.5" fill="#6b4327" />
      {/* glasses */}
      <g fill="none" stroke="#3a3631" strokeWidth="2.4">
        <rect x="33" y="40" width="14" height="11" rx="5.5" fill="#ffffff" fillOpacity="0.35" />
        <rect x="53" y="40" width="14" height="11" rx="5.5" fill="#ffffff" fillOpacity="0.35" />
        <path d="M47 45 H53" />
        <path d="M33 44 L28 43" />
        <path d="M67 44 L72 43" />
      </g>
      {/* eyes */}
      {mood === 'oops'
        ? <g><path d="M37 46 q3 -3 6 0" stroke="#3a3631" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M57 46 q3 -3 6 0" stroke="#3a3631" strokeWidth="2.2" fill="none" strokeLinecap="round" /></g>
        : <g><circle cx="40" cy="46" r="2.4" fill="#3a3631" /><circle cx="60" cy="46" r="2.4" fill="#3a3631" /></g>}
      {/* nose */}
      <path d="M50 48 v6 q0 2 -2 2" fill="none" stroke="#d99c6e" strokeWidth="2" strokeLinecap="round" />
      {/* beard */}
      <path d="M30 50 C30 64 38 72 50 72 C62 72 70 64 70 50 C70 56 64 60 50 60 C36 60 30 56 30 50 Z" fill="#6b4327" />
      <path d="M34 55 C36 65 43 70 50 70 C57 70 64 65 66 55 C62 61 56 63 50 63 C44 63 38 61 34 55 Z" fill="#7a4f30" />
      {/* mouth */}
      {mood === 'think'
        ? <rect x="44" y="63" width="12" height="2.6" rx="1.3" fill="#9c6a4a" />
        : mood === 'oops'
        ? <ellipse cx="50" cy="64" rx="4" ry="3" fill="#9c4a3a" />
        : <path d="M43 62 q7 6 14 0" fill="none" stroke="#9c4a3a" strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  );
}
