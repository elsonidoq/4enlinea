// Bug (OI-45): regenerating an already-APPROVED coach clip from /admin/audio
// silently overwrites the human-approved recording and the new take goes live
// immediately, unreviewed — with no warning shown to the admin before the
// fetch fires. Spec 051 US3 Fix 1 (FR-015) requires an explicit confirmation
// prompt before that request is sent, reusing the CLI's existing warning copy
// (scripts/generate-tts.js:409-421, adapted).
//
// This test renders the real AdminAudioPage with one `approved` item in the
// status list, clicks that item's "Regenerate" button, and asserts:
//   - a confirm prompt appears (via a stubbed window.confirm) whose text warns
//     the recording is approved and the new take goes live immediately/unreviewed
//   - confirming lets the fetch proceed (generate is called)
//   - cancelling aborts (no fetch call)
// It fails against today's handleGenerate, which never calls window.confirm at
// all for a single-key regenerate.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  // AdminAudioPage renders no Board-family component, so no ResizeObserver
  // stub is needed here (unlike the Socratic/lesson-editor DOM tests).
});

const STATUS_DATA = {
  counts: { total: 1, approved: 1, awaiting_approval: 0, needs_audio: 0, ineligible: 0 },
  approved: [
    {
      key: 'coach.spoken.some_key',
      status: 'approved',
      reason: null,
      slug: 'some-slug',
      generated_at: '2026-07-01T00:00:00.000Z',
      text: 'Some approved coach line.',
    },
  ],
  awaiting_approval: [],
  needs_audio: [],
  ineligible: [],
};

let fetchCalls;
let confirmCalls;
let confirmReturn;

beforeEach(() => {
  fetchCalls = [];
  confirmCalls = [];
  confirmReturn = true;

  const confirmStub = (message) => {
    confirmCalls.push(message);
    return confirmReturn;
  };
  globalThis.confirm = confirmStub;
  if (typeof window !== 'undefined') window.confirm = confirmStub;

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    fetchCalls.push({ url: u, init });

    if (u.includes('/api/admin/audio/status')) {
      return { ok: true, json: async () => STATUS_DATA };
    }
    if (u.includes('/api/admin/audio/prompt')) {
      return { ok: true, json: async () => ({ prompt: '', speed: 1.0, voice: 'alloy', model: 'gpt-4o-mini-tts' }) };
    }
    if (u.includes('/api/admin/lessons') && !u.includes('audio-status')) {
      return { ok: true, json: async () => [] };
    }
    if (u.includes('/api/admin/audio/generate')) {
      return { ok: true, json: async () => ({ generated: true }) };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

async function renderPage() {
  const { render, screen, cleanup, fireEvent, waitFor } = await import('@testing-library/react');
  const { AdminAudioPage } = await import('../../src/pages/AdminAudioPage.jsx');

  const utils = render(<AdminAudioPage />);

  await waitFor(() => {
    assert.ok(screen.getByRole('button', { name: 'Regenerate' }), 'expected the approved item\'s Regenerate button to render');
  });

  return { ...utils, screen, cleanup, fireEvent, waitFor };
}

test('regenerating an approved clip shows a confirm warning before the fetch fires, and proceeds on confirm', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderPage();

  const generateCallsBefore = fetchCalls.filter(c => c.url.includes('/api/admin/audio/generate') && !c.url.includes('generate-all')).length;

  fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

  await waitFor(() => {
    assert.equal(confirmCalls.length, 1, `expected exactly one window.confirm() call; got ${confirmCalls.length}`);
  });

  const warning = confirmCalls[0].toLowerCase();
  assert.ok(warning.includes('approved'), `expected the warning to mention the clip is approved; got: ${confirmCalls[0]}`);
  assert.ok(warning.includes('immediately') || warning.includes('unapproved') || warning.includes('unreviewed'),
    `expected the warning to disclose the new take goes live immediately/unreviewed; got: ${confirmCalls[0]}`);

  await waitFor(() => {
    const generateCallsAfter = fetchCalls.filter(c => c.url.includes('/api/admin/audio/generate') && !c.url.includes('generate-all')).length;
    assert.equal(generateCallsAfter, generateCallsBefore + 1, 'expected the generate request to fire after confirming');
  });

  cleanup();
});

test('cancelling the confirm warning aborts — no generate request is sent', async () => {
  confirmReturn = false;
  const { screen, cleanup, fireEvent } = await renderPage();

  const generateCallsBefore = fetchCalls.filter(c => c.url.includes('/api/admin/audio/generate') && !c.url.includes('generate-all')).length;

  fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

  // Give any (incorrect, pre-fix) async fetch a tick to fire so a false pass
  // isn't possible due to timing.
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(confirmCalls.length, 1, 'expected window.confirm() to have been called once');
  const generateCallsAfter = fetchCalls.filter(c => c.url.includes('/api/admin/audio/generate') && !c.url.includes('generate-all')).length;
  assert.equal(generateCallsAfter, generateCallsBefore, 'expected no generate request when the warning is cancelled');

  cleanup();
});
