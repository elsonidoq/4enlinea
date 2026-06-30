# `connect-four/scripts/` — DB / ops / asset tooling

Scripts here are **ops / data / asset** tools run from the package root (`connect-four/`). They do
**not** import `server/` runtime modules — that is the line between this folder and
`server/scripts/` (which imports `classifier.js`, `explainContext.js`, the solver, the reason engine).

Contents: TTS synthesis (`generate-tts.js`), DB validation/backfill
(`validate-puzzle-counts.mjs`, `verify-undercut-puzzles.mjs`, `backfill-confirmation-challenges.mjs`),
and solver-score data (`generate_scores_for_movestring.mjs` + `movestring_scores.json`).

Full, pipeline-grouped catalogue with usage: the **"Scripts & tooling"** section of the repo-root
`README.md`.
