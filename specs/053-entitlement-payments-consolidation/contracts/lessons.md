# Contract: `GET /api/lessons/:id` — locked-response addition

Existing handler (`server/index.js:674-679`, unchanged in structure):
```js
app.get('/api/lessons/:id', (req, res) => {
  const locale = req.locale ?? 'en';
  const lesson = getLesson(req.params.id, locale);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});
```

**New behavior**: after the `404` check, compute entitlement via the production entry point and build the
response through the new pure function before sending:
```js
app.get('/api/lessons/:id', (req, res) => {
  const locale = req.locale ?? 'en';
  const lesson = getLesson(req.params.id, locale);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  const entitlement = entitlementForRequest(req);
  res.json(buildLessonResponse(lesson, entitlement));
});
```
(`entitlementForRequest`, not the internal `computeEntitlement`, per contracts/entitlement.md and
research.md Decision 1.)

## `server/lessonEntitlement.js` (new module)

```js
/**
 * @param {object} lesson  full lesson object from getLesson(id, locale)
 * @param {{ entitled: boolean, authenticated: boolean }} entitlement
 * @returns {object} full lesson (unchanged) OR the redacted locked stub
 */
export function buildLessonResponse(lesson, entitlement) {
  if (lesson.free || entitlement.entitled) return lesson;
  return {
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    free: lesson.free,
    locked: true,
    authenticated: entitlement.authenticated,
  };
}
```

## Response contract

| Caller | Lesson | Response |
|---|---|---|
| Signed-out | Free | `200`, full lesson (unchanged) |
| Signed-out | Paid | `200 { id, title, order, free: false, locked: true, authenticated: false }` — **no `slides` key present** |
| Free-tier signed-in | Paid | `200 { id, title, order, free: false, locked: true, authenticated: true }` |
| Session-lapsed (was signed in) | Paid | `200 { id, title, order, free: false, locked: true, authenticated: false }` — indistinguishable from signed-out at this layer; the client's own `lastKnownGood` state (not this response) is what lets it tell the two apart and attempt a refresh |
| Paid-tier signed-in | Paid | `200`, full lesson (unchanged) |
| Any caller | id does not exist | `404 { error: 'not_found' }` — unchanged, out of scope (spec Edge Cases) |

**`locked` key semantics**: present and `true` only on the redacted response. Absent (not `false`) on every
full-content response — no consumer should ever see `locked: false`. `authenticated` is present only
alongside `locked: true`; it is never present on a full-content response.

**Consumers of `locked: true`** (ALL THREE must handle it — this contract previously named only one and that
was a plan gap; see plan.md's Source Code map and research.md Decision 3's addendum):
- `src/screens/ConceptScreen.jsx` — currently indexes `lesson.slides[slideIndex]` unguarded (lines
  78/89/100/166); MUST check `locked === true` first and render the existing upgrade-prompt affordance
  instead of indexing `slides`, which is absent on the locked stub and would throw a `TypeError`.
- `src/screens/SocraticScreen.jsx` — same fetch pattern, same guard requirement.
- `src/screens/CLChallengeScreen.jsx`'s cold-boot fetch pattern (`GET /api/lessons/:lessonId`, per
  `frontend-conventions.md` §"`clchallenge` cold-boot fetch pattern") — must render the same upgrade-prompt
  experience it already shows when `useLessonLockGuard` blocks client-side, now also reachable via a direct
  cold-boot fetch of a locked lesson.
- Any future direct fetch of `GET /api/lessons/:id` for a paid lesson — verified by an integration test
  (US1) asserting a signed-out `curl`-equivalent fetch gets this exact shape with no `slides` key, plus one
  component test per screen above asserting the upgrade-prompt renders instead of a crash/blank screen.

## Documentation task

This contract, including the literal `locked: true` field and its absence-means-unlocked convention, MUST
be added to `docs/architecture/api-conventions.md` under the `GET /api/lessons/:id` route (a new subsection
— today's `api-conventions.md` has no dedicated `/api/lessons/*` section at all; this is the first one).
