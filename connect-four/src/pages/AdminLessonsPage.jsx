import React, { useState } from 'react';
import AdminLessonListScreen from '../screens/AdminLessonListScreen.jsx';
import AdminLessonEditorScreen from '../screens/AdminLessonEditorScreen.jsx';

export default function AdminLessonsPage() {
  const [view, setView] = useState('list'); // 'list' | 'edit' | 'new'
  const [editingId, setEditingId] = useState(null);

  if (view === 'edit' || view === 'new') {
    return (
      <AdminLessonEditorScreen
        lessonId={view === 'edit' ? editingId : null}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <AdminLessonListScreen
      onEdit={(id) => { setEditingId(id); setView('edit'); }}
      onNew={() => { setEditingId(null); setView('new'); }}
    />
  );
}
