import { useState } from 'react';
import { CandidateDashboard } from '../components/CandidateDashboard.jsx';
import { CurationWorkspace } from '../components/CurationWorkspace.jsx';

export default function AdminCuratePage() {
  const [selection, setSelection] = useState(null); // { category, status }

  if (selection !== null) {
    return (
      <CurationWorkspace
        category={selection.category}
        status={selection.status}
        onBack={() => setSelection(null)}
      />
    );
  }

  return (
    <CandidateDashboard onSelectCategory={(cat, status) => setSelection({ category: cat, status: status ?? 'pending' })} />
  );
}
