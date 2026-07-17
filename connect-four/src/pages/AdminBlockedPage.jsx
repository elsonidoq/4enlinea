import React from 'react';

// FR-028: rendered for any /admin/* path reached from a non-localhost origin.
// Deliberately minimal — no data fetch, no lazy admin-bundle import — so it
// can render even when nothing else in the admin surface can.
export default function AdminBlockedPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Not available</h1>
      <p>This page is only available from localhost.</p>
    </div>
  );
}
