---
name: project_ungrounded_highlights_look_real
description: "A rendered highlight is NOT evidence of a grounded one — regexFallbackParse synthesises column highlights client-side when a text has zero [zone:] tags, so a fully ungrounded explanation looks highlighted on screen"
metadata: 
  node_type: memory
  type: project
  originSessionId: 46936d36-32c8-49d6-8650-094a297fcd4e
  modified: 2026-08-05T20:08:52.484Z
---

**Trigger:** you are judging whether a deep-reveal / coach explanation is *grounded* — whether the
model actually pointed at the squares it names. Especially when looking at the rendered app, a
screenshot, or `/admin/grounding-diff`.

## The trap

`AnnotatedExplanation` (`src/components/AnnotatedExplanation.jsx`) does this:

```js
const primary = parseAnnotatedText(text);
// Fall back to regex-based detection for old cache entries without [zone:] tags.
if (primary.zones.length === 0 && primary.terms.length === 0 && text) {
  return regexFallbackParse(text);
}
```

`regexFallbackParse` (`src/lib/annotatedText.js`) scrapes `"column N"` / `"col N"` out of **prose**
and synthesises `colN` zones **client-side**. They render as ordinary dotted-underline highlights and
light up a whole column on click.

So an explanation where the model emitted **zero** annotations does **not** look empty on screen. It
looks highlighted. Nothing about those highlights is grounded in the reasoning engine — no
`allowedSet` check, no `checkP5Strong`, no engine evidence — and they can **never** resolve to a
single square, only a column.

Note the fallback is all-or-nothing: it only fires when there are **zero** zones *and* zero terms. A
text with one real tag gets no fallback at all, so partial grounding renders *fewer* underlines than
none — the visual signal is not even monotonic in grounding.

## How to judge grounding instead

Count the `[zone:…]` tags in the **stored** text, and split out cell-level ones:

```js
const specs = [...text.matchAll(/\[zone:([^\]]+)\]/g)].map(m => m[1])
  .filter((s, i, a) => a.indexOf(s) === i);            // open + close share a spec
const cellLevel = specs.filter(s => /(^|:)c\d+r\d+/.test(s) || s.includes('windows:')).length;
```

`cellLevel` is the honest measure: it is exactly what the fallback cannot fabricate.
`AdminGroundingDiffPage.jsx`'s `countGroundedZones` helper is this, already written.

## Why this matters enough to record

2026-08-05: the spec-058 before/after comparison page initially showed a "0 highlights" badge on
panels that visibly rendered underlines — contradictory on its face, and in the *flattering*
direction: it made the pre-epic BEFORE column look partly grounded when it had emitted nothing at
all. Had the page counted rendered underlines instead of emitted tags, it would have **understated
the improvement while looking more rigorous**. The same trap will make any screenshot-based or
browser-based QA of grounding read as a pass.

Corollary for users, not just agents: the fallback means a completely ungrounded explanation still
ships column highlights to a real player, bypassing every server-side grounding guard — see
**OI-173**.

Related: [[project_annotation_gate_and_zones]] (the server-side gate, and what it does and does not
check), [[feedback_served_vs_raw_diff]] (diff served vs raw before blaming any layer),
[[feedback_verify_at_the_source_layer]] (the general rule this is an instance of).
