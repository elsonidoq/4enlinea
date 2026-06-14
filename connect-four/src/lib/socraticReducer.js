// Phase state machine for the Socratic screen.
// States: 'ask' | 'wrong1' | 'wrong2' | 'correct'
// Actions: { type: 'CORRECT' } | { type: 'WRONG' } | { type: 'ADVANCE' }

export function socraticReducer(phase, action) {
  switch (phase) {
    case 'ask':
      if (action.type === 'CORRECT') return 'correct';
      if (action.type === 'WRONG')   return 'wrong1';
      return phase;
    case 'wrong1':
      if (action.type === 'CORRECT') return 'correct';
      if (action.type === 'WRONG')   return 'wrong2';
      return phase;
    case 'wrong2':
    case 'correct':
      return phase; // terminal until navigation
    default:
      return phase;
  }
}
