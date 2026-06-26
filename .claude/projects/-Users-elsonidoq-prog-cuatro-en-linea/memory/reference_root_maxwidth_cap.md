---
name: reference_root_maxwidth_cap
metadata: 
  node_type: memory
  type: reference
  originSessionId: ce1d4cfc-a772-4e5f-9ad3-e197c64bc9c0
---

`#root` has a hard `max-width: 480px; margin: 0 auto` in `src/index.css` — the mobile-app shell shared by the actual game UI. Setting `width: 100%` on a page does nothing; the 480px cap dominates and the page stays a narrow centered column.

**Do NOT remove/raise the cap globally** — the game UI is designed for that 480px shell and will break.

For a full-width desktop/admin page (e.g. `AdminDeepRevealEvalPage.jsx`), override `#root` **locally and reversibly** with a mount/unmount effect:

```js
useEffect(() => {
  const root = document.getElementById('root');
  const prev = { maxWidth: root.style.maxWidth, width: root.style.width };
  root.style.maxWidth = 'none';
  root.style.width = '100%';
  return () => { root.style.maxWidth = prev.maxWidth; root.style.width = prev.width; };
}, []);
```

Restoring on unmount keeps the rest of the app's 480px shell intact. Related admin-page gotcha: admin pages bypass `Navigator`/`ProfileStoreProvider` (see frontend-conventions.md).
