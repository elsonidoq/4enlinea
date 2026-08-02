// Spec 055 (Epic 8) US2, T027-T029 (FR-008, SC-003).
//
// `tests/unit/splitRevealZoom.test.js` only exercises `computeFrozenBoardWidth` as a
// pure function — it never renders `SplitReveal.jsx`, so it cannot catch a bug in how
// (or whether) the component actually wires that computed width into the DOM. This
// test renders `SplitReveal` for real, in a short container, and checks the render
// seam that the pure-function test cannot reach: (a) the board wrapper's applied
// `maxWidth` keeps the board within the enclosing pane, and (b) that `maxWidth` cap is
// actually present (`constrain`), not silently dropped.
//
// jsdom has no ResizeObserver; `useDragSplit`'s container-height-tracking effect
// (src/lib/useDragSplit.js:72-82) constructs one unconditionally. This mock delivers a
// single synchronous contentRect on `observe()`, mirroring the real
// ResizeObserver -> setContainerH wiring, so `containerH` is set before any assertion
// runs.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const CONTAINER_H = 300; // A short pane. At the default initialSplitPct (40), this
// makes computeFrozenBoardWidth(300, 40) return ~100.17px — a positive width BELOW the
// pre-fix `>=200` gate (T029). That is exactly the historical bug: a valid, small,
// computed cap being dropped entirely because it didn't clear an unrelated 200px
// threshold, falling back to an unclamped `width: 100%` (see
// specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md's
// superseded "Current mechanism" section).

let deliverResize;
before(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) {
      deliverResize = () => cb([{ contentRect: { height: CONTAINER_H } }]);
    }
    observe() { deliverResize(); }
    unobserve() {}
    disconnect() {}
  };
});

const { render, cleanup } = await import('@testing-library/react');
const { SplitReveal } = await import('../../src/components/SplitReveal.jsx');

beforeEach(() => cleanup());

// Stands in for the enclosing pane's rendered width. jsdom has no layout engine (no
// real getBoundingClientRect from CSS), so — like the other style-assertion DOM tests
// in this suite (e.g. tests/dom/SlideEditorWindows.dom.test.jsx) — this test reads the
// component's own computed style output rather than a measured pixel box. 250px is a
// plausible narrow/short real device pane, comfortably above the fixed
// implementation's MIN_BOARD_W (120) and comfortably below the buggy fallback width
// below.
const PANE_WIDTH = 250;

// Stands in for Board.jsx's own intrinsic sizing when SplitReveal drops its maxWidth
// cap: production Board sizes itself from its own pixel-based ResizeObserver state,
// not from the parent's percentage width, so an unclamped wrapper does not
// automatically keep it inside the pane — it can render at whatever width Board
// computes for itself, which is exactly OI-29's bug ("leaving width: 100% to blow the
// board up to full screen width"). Model that here with a probe whose own declared
// width is deliberately larger than PANE_WIDTH, so an unclamped wrapper visibly fails
// assertion (a).
const UNCLAMPED_INTRINSIC_WIDTH = 9999;

function BoardProbe() {
  return (
    <div data-testid="board-probe" style={{ width: UNCLAMPED_INTRINSIC_WIDTH }} />
  );
}

test('SplitReveal keeps the rendered board width within the enclosing pane and keeps maxWidth/constrain applied, in a short container', () => {
  const { container } = render(
    <SplitReveal
      isOpen
      boardContent={<BoardProbe />}
      revealContent={<div>reveal</div>}
      initialSplitPct={40}
      minTopPct={30}
      maxTopPct={75}
    />,
  );

  const probe = container.querySelector('[data-testid="board-probe"]');
  assert.equal(probe !== null, true, 'BoardProbe must render inside SplitReveal');

  // The wrapper SplitReveal.jsx renders directly around boardContent (the div at
  // SplitReveal.jsx:106-113) is boardContent's DOM parent.
  const wrapper = probe.parentElement;
  const maxWidthStyle = wrapper.style.maxWidth;

  // (b) constrain/maxWidth styling remains applied: a numeric cap must be present.
  // An empty/absent maxWidth means SplitReveal fell back to width: 100% — the bug.
  assert.equal(maxWidthStyle !== '', true, 'SplitReveal must apply a maxWidth cap, not drop it');

  const boardW = parseFloat(maxWidthStyle);
  assert.equal(
    Number.isFinite(boardW) && boardW > 0,
    true,
    `maxWidth must be a finite positive px value, got "${maxWidthStyle}"`,
  );

  // (a) the effective rendered board width (the cap, since it is present) must stay
  // within the enclosing pane's width.
  assert.equal(
    boardW <= PANE_WIDTH,
    true,
    `boardW (${boardW}) must fit within PANE_WIDTH (${PANE_WIDTH})`,
  );
});
