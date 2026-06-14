const SEVERITY_LEVELS = [
  { min: 1,  max: 1,  label: 'Minor',    color: '#16a34a', bg: 'rgba(22,163,74,0.12)'  },
  { min: 2,  max: 3,  label: 'Moderate', color: '#d97706', bg: 'rgba(217,119,6,0.12)'  },
  { min: 4,  max: 10, label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.12)'  },
];

function severityLevel(score) {
  return SEVERITY_LEVELS.find(l => score >= l.min && score <= l.max) ?? null;
}

export function SeverityMeter({ score }) {
  const lvl = severityLevel(score);
  if (!lvl) return null;
  const barIndex = SEVERITY_LEVELS.indexOf(lvl); // 0, 1, or 2
  const heights = [7, 10, 13];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 10, background: lvl.bg, color: lvl.color, fontSize: 11, fontWeight: 700 }}
          title={'Severity · ' + lvl.label}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13 }}>
        {heights.map((h, i) => (
          <span key={i} style={{ width: 3.5, height: h, borderRadius: 1.5, background: 'currentColor', opacity: i <= barIndex ? 1 : 0.28 }} />
        ))}
      </span>
      {lvl.label}
    </span>
  );
}
