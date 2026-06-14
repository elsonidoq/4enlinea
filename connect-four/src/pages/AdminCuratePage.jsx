import { useState } from 'react';
import { CandidateDashboard } from '../components/CandidateDashboard.jsx';
import { CurationWorkspace } from '../components/CurationWorkspace.jsx';

export default function AdminCuratePage() {
  const [selection, setSelection] = useState(null); // { category, status }

  const content = selection !== null ? (
    <CurationWorkspace
      category={selection.category}
      status={selection.status}
      onBack={() => setSelection(null)}
    />
  ) : (
    <CandidateDashboard onSelectCategory={(cat, status) => setSelection({ category: cat, status: status ?? 'pending' })} />
  );

  return (
    <div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {content}
    </div>
  );
}
