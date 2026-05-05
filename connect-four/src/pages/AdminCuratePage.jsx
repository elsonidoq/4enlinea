import { useState } from 'react';
import { CandidateDashboard } from '../components/CandidateDashboard.jsx';
import { CurationWorkspace } from '../components/CurationWorkspace.jsx';

export default function AdminCuratePage() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  if (selectedCategory !== null) {
    return (
      <CurationWorkspace
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  return (
    <CandidateDashboard onSelectCategory={cat => setSelectedCategory(cat)} />
  );
}
