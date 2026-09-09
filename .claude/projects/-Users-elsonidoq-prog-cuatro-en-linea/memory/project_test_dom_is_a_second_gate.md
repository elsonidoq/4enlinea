---
name: project_test_dom_is_a_second_gate
description: "React screen tests do NOT run in test:fast — they live in tests/dom/ under a separate test:dom script, so a broken screen ships with the prescribed gate green"
metadata:
  type: project
---

**Trigger: before reporting a suite result, before wiring a new test file, or any time you fix
something in `src/screens/` or `src/components/` and are about to call it verified.**

`npm run test:fast` is NOT the whole gate. **React screen/component tests are absent from it
entirely.** They live in `connect-four/tests/dom/*.dom.test.jsx` and run only under a second script,
`npm run test:dom` (`node --import ./tests/dom/setup.js --experimental-test-module-mocks --test ...`).
Verify with: `node -e "const p=require('./package.json'); console.log(/tests\/dom/.test(p.scripts['test:fast']))"`
=> `false`.

**Why this bites.** Every brief, plan and QA report in this repo quotes a single `test:fast` number
as *the* baseline. During the 2026-09-08 QA remediation, seven of the nineteen issues were
screen-level (OI-171, 177, 166, 167, 179, 180, 181) — all invisible to that gate. A batch could have
shipped a blank `ChallengeScreen` with `test:fast` sitting green. The original blockers had already
proved the point: **1785 green tests coexisted with three blockers.**

Consequences:
- A `.jsx` test placed in `test:fast`'s list is a **SyntaxError**, not a failure — it needs the
  `--import ./tests/dom/setup.js` loader. New screen tests go in `test:dom`'s list.
- Report BOTH numbers, always. Baselines as of 2026-09-09 (end of the QA remediation):
  **`test:fast` 1843 / 0 fail, `test:dom` 117 / 0 fail.**
- jsdom does **no layout and resolves no CSS custom properties**. It cannot measure a rendered pixel
  size or tell you a colour. Assert on the style value your code sets and say plainly that the
  rendered result needs a real browser — do not claim a measurement you did not make.

Related: [[project_dom_test_hang_diagnosis]], [[feedback_verify_at_the_source_layer]].
