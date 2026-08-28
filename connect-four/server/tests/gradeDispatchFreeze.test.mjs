// Spec 059 (Deep-Reveal Remediation, Epic 12), US1 / T006a.
//
// Grep-level, text-only check of `.claude/skills/grade-fv-sufficiency/SKILL.md` — no LLM call, no
// grading fan-out, no sub-agent dispatch. This is the automated referent for epic AC 3a
// (`docs/epics/deep-reveal-remediation-epic.md:391`: "A test or manual check confirms the dispatch
// instruction names the checked-in path") and AC 4 (`:394`: byte-identical dispatch messages,
// no out-of-rubric context).
//
// It asserts two things about the dispatch step T006 wrote:
//   (a) the dispatch step names the checked-in
//       `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` path verbatim
//       (not the old scratchpad-regenerated `<scratchpad>/GRADER_INSTRUCTIONS.md`).
//   (b) the dispatch step's own text carries the no-out-of-rubric-context prohibition (no
//       open-issue lists, no hypotheses, no "known traps" in a dispatch message).
//
// This test reads SKILL.md as plain text and greps for the required strings inside the dispatch
// step's own paragraph — it does not execute the skill, dispatch any sub-agent, or call an LLM.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(
  __dirname,
  '..', '..', '..',
  '.claude', 'skills', 'grade-fv-sufficiency', 'SKILL.md',
);

const CHECKED_IN_RUBRIC_PATH =
  'connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md';

function readSkill() {
  return readFileSync(SKILL_PATH, 'utf8');
}

// Isolates the dispatch step's own paragraph(s) — the MANDATORY step (T006) that replaced the old
// "write the whole prompt template to <scratchpad>/GRADER_INSTRUCTIONS.md" step. We locate it by
// string search (per the epic/tasks.md instruction — SKILL.md's line numbers drift), anchored on
// the "MANDATORY" marker T006 introduced, running through the three-line dispatch message itself.
function extractDispatchStepText(skillText) {
  const startMarker = 'MANDATORY — do NOT write a fresh rubric to the scratchpad';
  const startIdx = skillText.indexOf(startMarker);
  assert.ok(
    startIdx !== -1,
    'Could not find the MANDATORY dispatch step in SKILL.md (searched for a stable marker string, ' +
      'not a line number, per task instructions) — has the dispatch step been renamed or removed?',
  );
  // The step runs until the next numbered list item ("3. **Dispatch in waves...") or a clear break.
  const endMarker = '3. **Dispatch in waves';
  const endIdx = skillText.indexOf(endMarker, startIdx);
  assert.ok(endIdx !== -1, 'Could not find the end of the dispatch step (step 3 marker) in SKILL.md.');
  return skillText.slice(startIdx, endIdx);
}

// Markdown bold markers and line-wrap whitespace/newlines are presentation, not content — normalize
// both away before running a prose-level substring/regex check so a reflow or a bold-emphasis
// change doesn't spuriously break this test. The verbatim PATH check is run against the raw text
// separately (paths never contain markdown or embedded newlines).
function normalizeProse(text) {
  return text.replace(/\*\*/g, '').replace(/\s+/g, ' ');
}

describe('grade-fv-sufficiency SKILL.md dispatch step is frozen (T006a)', () => {
  it('names the checked-in GRADER_INSTRUCTIONS_v2.md path verbatim inside the dispatch step', () => {
    const skillText = readSkill();
    const dispatchStep = extractDispatchStepText(skillText);
    assert.ok(
      dispatchStep.includes(CHECKED_IN_RUBRIC_PATH),
      `Dispatch step does not name the checked-in rubric path "${CHECKED_IN_RUBRIC_PATH}" verbatim.`,
    );
  });

  it('does not instruct writing a fresh rubric copy to the scratchpad', () => {
    const skillText = readSkill();
    const dispatchStep = normalizeProse(extractDispatchStepText(skillText));
    // The old behavior wrote a fresh copy to this scratchpad path; the step must now explicitly
    // forbid that, not merely omit it.
    assert.ok(
      /do NOT write a fresh rubric/i.test(dispatchStep),
      'Dispatch step no longer explicitly prohibits regenerating a fresh rubric to the scratchpad.',
    );
  });

  it('prohibits out-of-rubric context (open-issue lists, hypotheses, "known traps") in the dispatch message', () => {
    const skillText = readSkill();
    const dispatchStep = normalizeProse(extractDispatchStepText(skillText));
    assert.ok(
      /no open-issue lists/i.test(dispatchStep),
      'Dispatch step text does not explicitly prohibit open-issue lists in a dispatch message.',
    );
    assert.ok(
      /no hypotheses/i.test(dispatchStep),
      'Dispatch step text does not explicitly prohibit hypotheses in a dispatch message.',
    );
    assert.ok(
      /known traps/i.test(dispatchStep),
      'Dispatch step text does not explicitly mention "known traps" as prohibited context.',
    );
  });

  it('states the dispatch message is exactly three lines, verbatim except id/condition/output path', () => {
    const skillText = readSkill();
    const dispatchStep = normalizeProse(extractDispatchStepText(skillText));
    assert.ok(
      /exactly these three lines/i.test(dispatchStep) || /three-line dispatch/i.test(dispatchStep),
      'Dispatch step does not describe the dispatch message as a fixed three-line format.',
    );
  });

  it('the legacy in-skill rubric template block is explicitly marked SUPERSEDED, not silently left dispatchable', () => {
    const skillText = readSkill();
    const supersededIdx = skillText.indexOf('SUPERSEDED — do not dispatch the template below');
    assert.ok(
      supersededIdx !== -1,
      'The old in-skill rubric template (formerly written fresh to the scratchpad each run) is not ' +
        'marked SUPERSEDED — a future reader could mistake it for the live dispatch source.',
    );
  });
});
