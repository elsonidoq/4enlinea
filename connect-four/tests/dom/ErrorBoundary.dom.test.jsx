import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.jsx';

function Boom() {
  throw new Error('boom');
}

test('ErrorBoundary renders the fallback when a child throws', () => {
  // Suppress React's expected error log noise for this deliberate throw.
  const orig = console.error;
  console.error = () => {};
  try {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
  } finally {
    console.error = orig;
  }
  // ErrorFallback shows a Retry button (role=button). Assert the fallback mounted.
  assert.ok(screen.getByRole('button'));
});
