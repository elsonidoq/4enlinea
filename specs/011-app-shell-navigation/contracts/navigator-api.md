# Navigator API Contract

This contract governs the screen-key navigation interface introduced in Epic 1b.
All subsequent epics that navigate between screens MUST use this API.

---

## go(screenKey, params)

```
go(screenKey: string, params?: object): void
```

- Replaces current screen immediately. No async.
- Saves current `screen` as `prevScreen` (one-level only).
- Calls `setActiveScreen(screenKey)` before any React state update.
- Calls `track('screen_viewed', { screen: screenKey })` on every invocation.
- If `screenKey` is not in the registry: stays on current screen, emits `console.warn('[navigator] unknown screen key: <key>')`.
- `params` is stored alongside `screen` and spread as props onto the rendered component. Subsequent epics may read e.g. `props.category` when navigated via `go('challenge', { category: 'immediate_threat' })`.

## goBack()

```
goBack(): void
```

TopBar back button calls `goBack()` — **not** `go(prevScreen)`. `goBack` updates state directly without invoking `go()`, so it does not push a new `prevScreen` entry:

```js
setActiveScreen(prevScreen);
track('screen_viewed', { screen: prevScreen });
setScreen(prevScreen);
setParams({});
setPrevScreen(null);  // one-level only; cleared after back navigation
```

Calling `go(prevScreen)` instead would incorrectly set `prevScreen = screen` (the screen being left) rather than `null`, breaking the back-stack invariant.

---

## setActiveScreen(key)

Exported from `src/lib/track.js`:

```
setActiveScreen(key: string): void
```

- Sets module-level `activeScreen` variable.
- Must be called before `track()` to ensure the correct `path` is sent.
- Called by Navigator on every `go()` invocation and on app mount before `session_start`.

---

## Screen Registry Keys (cross-epic locked)

| Key | Surface group | Background token | Status in Epic 1b |
|---|---|---|---|
| `home` | home | `--bg-home` | Implemented |
| `stats` | home | `--bg-home` | Implemented |
| `saga` | lessons | `--bg-lessons` | Placeholder |
| `concept` | lessons | `--bg-lessons` | Placeholder |
| `socratic` | lessons | `--bg-lessons` | Placeholder |
| `clchallenge` | lessons | `--bg-lessons` | Placeholder |
| `setpicker` | challenges | `--bg-challenges` | Placeholder |
| `challenge` | challenges | `--bg-challenges` | Placeholder |
| `summary` | challenges | `--bg-challenges` | Placeholder |
| `difficulty` | sparring | `--bg-sparring` | Placeholder |
| `game` | sparring | `--bg-sparring` | Placeholder |
| `review` | sparring | `--bg-sparring` | Placeholder |
| `explorer` | sparring | `--bg-sparring` | Placeholder |
| `mistakes` | home | `--bg-home` | Placeholder |
| `mistakeDetail` | home | `--bg-home` | Placeholder |
