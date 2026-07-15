import { describe, it, expect } from 'vitest';
import { coachQueueItem } from './useCoachSpeech.js';

describe('coachQueueItem', () => {
  it('en → bare slug (root path)', () => {
    expect(coachQueueItem('immediate_threat--optimal--0', 'en')).toBe('immediate_threat--optimal--0');
  });
  it('es → language-prefixed', () => {
    expect(coachQueueItem('immediate_threat--optimal--0', 'es')).toBe('es/immediate_threat--optimal--0');
  });
});
