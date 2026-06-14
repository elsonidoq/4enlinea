---
name: c4solver-binary-stale-crash-fix-delete-and-recompile
description: "When c4solver crashes unexpectedly (exit 137 / SIGKILL), delete the binary and recompile from source"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 11bfc8cc-cbaf-4157-9b04-8ccfc5e53ae3
---

If the c4solver binary crashes with exit 137 (SIGKILL) or behaves incorrectly (e.g., ignores flags, produces wrong output), **delete the binary and recompile from scratch**.

```bash
cd solver-src
rm c4solver
make
# This also runs: cp c4solver ../connect-four/server/c4solver
```

**Why:** Stale object files or a corrupted binary copy can cause silent failures that look like bugs in the C++ code. The Makefile copies the fresh binary to `connect-four/server/c4solver` automatically. Spent significant debugging time in one session chasing a crash that was simply a stale binary — the crash vanished after a clean rebuild.

**How to apply:** Before investigating any c4solver crash or unexpected behavior, always try deleting and recompiling first. This is especially true after code changes to `Solver.cpp`, `main.cpp`, or any other solver source file.

**Railway deployment:** The committed binary at `connect-four/server/c4solver` is a **macOS ARM64 (Mach-O)** executable — it cannot run on Railway's Linux containers. The Railway build must compile from source via `connect-four/nixpacks.toml`. The `solver-src/` directory is at the **repo root** (a sibling of `connect-four/`, not inside it); the nixpacks build command is `cd ../solver-src && make && npm run build`. The Makefile has no macOS-specific flags and produces a correct Linux binary.
