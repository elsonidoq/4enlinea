import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';

import {
  summarizeResetImpact,
  formatResetWarning,
  confirmReset,
} from '../../scripts/generate-tts.js';

/** Collect everything written to a fake output stream. */
function fakeOutput() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  stream.text = () => chunks.join('');
  return stream;
}

const REGISTRY = [
  { key: 'coach.spoken.a.0', status: 'approved', generated_at: 'g1', approved_at: 'a1' },
  { key: 'coach.spoken.a.1', status: 'approved', generated_at: 'g2', approved_at: 'a2' },
  { key: 'coach.spoken.b.0', status: 'awaiting_approval', generated_at: 'g3', approved_at: null },
  { key: 'coach.spoken.c.0', status: 'needs_audio', generated_at: null, approved_at: null },
  { key: 'coach.spoken.d.0', status: 'ineligible', generated_at: null, approved_at: null },
];

test('summarizeResetImpact counts what a reset would erase', () => {
  const impact = summarizeResetImpact(REGISTRY);
  assert.equal(impact.total, 5);
  assert.equal(impact.approved, 2);
  assert.equal(impact.awaitingApproval, 1);
  assert.equal(impact.withApprovalRecord, 2);
  assert.equal(impact.withGeneratedAudio, 3);
});

test('summarizeResetImpact on an empty registry reports nothing to lose', () => {
  const impact = summarizeResetImpact([]);
  assert.equal(impact.total, 0);
  assert.equal(impact.approved, 0);
  assert.equal(impact.withApprovalRecord, 0);
});

test('formatResetWarning states the real blast radius, not just "are you sure"', () => {
  const text = formatResetWarning('es', summarizeResetImpact(REGISTRY));
  // It must name the counts at stake...
  assert.match(text, /2 approved/);
  assert.match(text, /tts-registry\.es\.json/);
  // ...and say what is NOT destroyed, so the reader can judge the risk.
  assert.match(text, /manifest/i);
  assert.match(text, /not touched|NOT touched/);
  // ...and point at the non-destructive alternative.
  assert.match(text, /--key/);
});

test('confirmReset proceeds without prompting when --yes is passed', async () => {
  const output = fakeOutput();
  const ok = await confirmReset('es', summarizeResetImpact(REGISTRY), {
    assumeYes: true,
    output,
    isTTY: true,
  });
  assert.equal(ok, true);
});

test('confirmReset refuses on a non-TTY stdin instead of hanging or proceeding', async () => {
  const output = fakeOutput();
  const ok = await confirmReset('es', summarizeResetImpact(REGISTRY), {
    input: Readable.from([]),
    output,
    isTTY: false,
  });
  assert.equal(ok, false);
  assert.match(output.text(), /--yes/);
});

test('confirmReset accepts only the exact typed phrase', async () => {
  const output = fakeOutput();
  const ok = await confirmReset('es', summarizeResetImpact(REGISTRY), {
    input: Readable.from(['reset es\n']),
    output,
    isTTY: true,
  });
  assert.equal(ok, true);
});

test('confirmReset rejects a reflexive "y"', async () => {
  const output = fakeOutput();
  const ok = await confirmReset('es', summarizeResetImpact(REGISTRY), {
    input: Readable.from(['y\n']),
    output,
    isTTY: true,
  });
  assert.equal(ok, false);
});

test('confirmReset rejects the phrase for a different language', async () => {
  const output = fakeOutput();
  const ok = await confirmReset('es', summarizeResetImpact(REGISTRY), {
    input: Readable.from(['reset en\n']),
    output,
    isTTY: true,
  });
  assert.equal(ok, false);
});
