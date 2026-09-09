// OI-165 — the claimeven challenge feedback hardcodes "secures Gray's draw" on positions the
// solver scores +2 (a Gray WIN), contradicting the same screen's goal prompt and the lesson's
// own slide 3 ("whether that wins, draws, or merely survives depends on the position").
//
// Six strings, two files: eval.claimeven.{optimal,suboptimal,blunder}.summary.0 in en.json AND
// es.json. `eval.*` has only 6 keys and the existing parity test over them is presence-only, so
// nothing else catches this.
//
// The fix chosen is outcome-neutral wording (not deriving the word from the solver score) —
// see batch-F.md for the justification. This test pins that: no claimeven eval summary may
// assert a game outcome, in either language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../../src/i18n/en.json' with { type: 'json' };
import es from '../../src/i18n/es.json' with { type: 'json' };

const QUALITIES = ['optimal', 'suboptimal', 'blunder'];

// Words that assert a specific game result. The KB entry (docs/knowledge-base/allis-claimeven.md,
// `statement`) scopes Claimeven to guaranteeing the controller ACCESS to the upper even squares —
// it never promises a draw; whether that wins or draws is position-dependent.
const OUTCOME_ASSERTIONS = [
  /\bdraw(s|ing)?\b/i,        // en
  /\bempat\w*/i,             // es: empate / empatar / empata
  /\btabla(s)?\b/i,          // es alt
];

for (const [name, tree] of [['en', en], ['es', es]]) {
  test(`[${name}] no eval.claimeven.*.summary string asserts a draw`, () => {
    for (const quality of QUALITIES) {
      const node = tree.eval?.claimeven?.[quality]?.summary;
      assert.ok(node && typeof node === 'object', `${name}.json eval.claimeven.${quality}.summary missing`);
      for (const [idx, text] of Object.entries(node)) {
        for (const re of OUTCOME_ASSERTIONS) {
          assert.equal(
            re.test(text), false,
            `${name}.json eval.claimeven.${quality}.summary.${idx} asserts an outcome the position may not have: ${JSON.stringify(text)}`,
          );
        }
      }
    }
  });

  test(`[${name}] eval.claimeven.*.summary still names the Claimeven concept`, () => {
    // Outcome-neutral must not mean vague — the feedback still has to identify the pattern.
    for (const quality of QUALITIES) {
      const node = tree.eval.claimeven[quality].summary;
      for (const [idx, text] of Object.entries(node)) {
        assert.match(text, /claimeven/i, `${name}.json eval.claimeven.${quality}.summary.${idx}`);
      }
    }
  });
}

test('en and es carry the same eval.claimeven summary keys (no English-only edit)', () => {
  for (const quality of QUALITIES) {
    assert.deepEqual(
      Object.keys(en.eval.claimeven[quality].summary).sort(),
      Object.keys(es.eval.claimeven[quality].summary).sort(),
      `eval.claimeven.${quality}.summary keys diverge between en.json and es.json`,
    );
  }
});
