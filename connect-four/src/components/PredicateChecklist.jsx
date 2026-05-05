const CATEGORY_CRITERIA = {
  1: [{ key: 'win', label: 'Winning move exists', tags: ['immediate_threat'] }],
  2: [{ key: 'block', label: "Opponent's threat is blocked", tags: ['forced_block'] }],
  3: [{ key: 'double', label: 'Two simultaneous threats created', tags: ['double_threat'] }],
  4: [{ key: 'fork', label: 'Fork setup sequence started', tags: ['fork_setup'] }],
  5: [{ key: 'zug', label: 'Best move in zugzwang', tags: ['zugzwang'] }],
  6: [{ key: 'parity', label: 'Parity control maintained', tags: ['parity_control'] }],
  7: [{ key: 'forbidden', label: 'Forbidden columns identified', tags: ['forbidden_columns'] }],
};

export function PredicateChecklist({ category, predicatePass, classifierTags = [] }) {
  const criteria = CATEGORY_CRITERIA[category] ?? [];

  return (
    <div style={container}>
      <div style={heading}>Predicate</div>
      {criteria.map(({ key, label, tags }) => {
        const tagHit = tags.some(t => classifierTags.includes(t));
        const pass = predicatePass && (tagHit || predicatePass);
        return (
          <div key={key} style={row}>
            <span style={{ ...dot, background: pass ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ color: pass ? 'var(--green)' : 'var(--text-muted)', fontSize: 13 }}>{label}</span>
          </div>
        );
      })}
      <div style={row}>
        <span style={{ ...dot, background: predicatePass ? 'var(--green)' : 'var(--red)' }} />
        <span style={{ color: predicatePass ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 13 }}>
          {predicatePass ? 'PASS' : 'FAIL'}
        </span>
      </div>
    </div>
  );
}

const container = { padding: '8px 0', borderTop: '1px solid var(--border-dim)' };
const heading = { fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };
const row = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 };
const dot = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };
