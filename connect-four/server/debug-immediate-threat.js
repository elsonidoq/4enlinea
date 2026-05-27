#!/usr/bin/env node
import { evaluatePredicate } from './predicates.js';

const moveString = '0116034064222505306';
const scores = [-9, -11, -9, -11, 8, 11, 8];
const puzzle = { moveString, category: 'immediate_threat', highlightMetadata: {} };

for (let col = 0; col < 7; col++) {
  const result = evaluatePredicate(puzzle, col, scores);
  console.log(`col ${col + 1}: ${JSON.stringify(result)}`);
}
