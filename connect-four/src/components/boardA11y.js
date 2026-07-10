// Spec 043 US1 (FR-001..FR-006, contracts/board-a11y-contract.md, data-model.md ColumnA11yProps)
//
// Pure derivation of the per-column wrapper's accessibility attributes, extracted out of
// Board.jsx so it is unit-testable with plain `node:test` (Board.jsx itself contains JSX syntax,
// which `node --test` cannot parse — there is no JSX loader configured for this repo's test
// runner). Board.jsx is the sole consumer; keep this file free of JSX/React imports so it stays
// importable as-is.
//
// Contract (see contracts/board-a11y-contract.md for the full table):
//   canPlay === false               -> role/ariaLabel/tabIndex/ariaDisabled all undefined (no
//                                       attribute rendered at all — read-only board, FR-002)
//   canPlay === true, !colFull      -> role: 'button', ariaLabel: 'column N' (1-based), tabIndex: 0,
//                                       ariaDisabled: undefined
//   canPlay === true, colFull       -> role: 'button', ariaLabel: 'column N', tabIndex: -1,
//                                       ariaDisabled: true (FR-006: non-playable column stays a
//                                       button for AT purposes, but is removed from Tab order and
//                                       reports its disabled state)
export function getColumnA11yProps({ col, canPlay, colFull }) {
  if (!canPlay) {
    return {
      role: undefined,
      ariaLabel: undefined,
      tabIndex: undefined,
      ariaDisabled: undefined,
    };
  }

  const tappable = !colFull;

  return {
    role: 'button',
    ariaLabel: `column ${col + 1}`,
    tabIndex: tappable ? 0 : -1,
    ariaDisabled: tappable ? undefined : true,
  };
}
