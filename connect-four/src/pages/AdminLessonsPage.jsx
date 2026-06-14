import React, { useState } from 'react';
import AdminLessonListScreen from '../screens/AdminLessonListScreen.jsx';
import AdminLessonEditorScreen from '../screens/AdminLessonEditorScreen.jsx';

export default function AdminLessonsPage() {
  const [view, setView] = useState('list'); // 'list' | 'edit' | 'new'
  const [editingId, setEditingId] = useState(null);

  const content = (view === 'edit' || view === 'new') ? (
    <AdminLessonEditorScreen
      lessonId={view === 'edit' ? editingId : null}
      onBack={() => setView('list')}
    />
  ) : (
    <AdminLessonListScreen
      onEdit={(id) => { setEditingId(id); setView('edit'); }}
      onNew={() => { setEditingId(null); setView('new'); }}
    />
  );

  return (
    <div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {content}
    </div>
  );
}
