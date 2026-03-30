# Bugs

- [ ] **Test failure: `injection-bridge.test.js` — "Extension context invalidated" test broken**
      The test replaces `chrome.storage.sync.set` with a synchronously-throwing function.
      Previously, `injection-bridge.js` called `chrome.storage.sync.set()` directly, so the
      `try/catch` caught the throw. Now it calls `browser.storage.sync.set()` via the polyfill,
      which wraps the call in a Promise — turning the synchronous throw into an unhandled
      rejection that escapes the `try/catch`. The listener isn't removed, so the assertion fails.
      The companion test ("non-invalidation errors keep the listener alive") has the same issue.

- [ ] **`get-status` promise never resolves if page doesn't respond**
      In `src/content/injection-bridge.js`, when a `get-status` runtime message arrives, a
      Promise is returned that only resolves when a `status-response` window message is received.
      If the page context never sends one (no video, page navigating, extension disabled), the
      Promise hangs forever and the `responseHandler` listener leaks. The messaging channel stays
      open indefinitely.

- [ ] **Wrong polyfill URL in `CONTRIBUTING.md`**
      Line 99 links to `https://github.com/nicedoc/webextension-polyfill`. The correct repo is
      `https://github.com/mozilla/webextension-polyfill`.

- [ ] **`scripts/clean.mjs` missing trailing newline**
