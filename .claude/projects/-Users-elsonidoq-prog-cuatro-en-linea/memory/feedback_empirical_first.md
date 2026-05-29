---
name: Prefer empirical testing over theoretical analysis
description: Don't spend many iterations doing mental analysis — run the code, make the API call, test empirically first.
type: feedback
originSessionId: b0f55ba3-5d89-4123-8903-e23bf84def14
---
When investigating a bug, default to running code and making API calls early rather than extended theoretical reasoning about what *should* happen.

**Why:** In the heatmap bug session, I did 40+ rounds of mental analysis (tracing bitboard math, parity logic, C++ internals) before the user interrupted twice and provided the exact moves string. The whole investigation was resolved in two bash commands once I had the real data.

**How to apply:** As soon as a reproduction path is plausible (a specific endpoint, a binary to run, a test to write), do it. Reserve theoretical analysis for when there's no way to test directly, or to explain *why* after the empirical result is known.
