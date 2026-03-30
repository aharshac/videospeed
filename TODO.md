# Bugs

## High

- [ ] **`restore_defaults()` crashes in error handler — `status` scoping bug**
      `src/ui/options/options.js`: `const status` is declared inside the `try` block (~line 846)
      but referenced in the `catch` block (~line 877). Since `const` is block-scoped, if the
      `try` body throws, the `catch` block hits `ReferenceError: status is not defined`, hiding
      the original error and leaving the options page in a broken state.

## Medium

- [ ] **Test failure: `injection-bridge.test.js` — polyfill wraps sync throws in Promises**
      The test replaces `chrome.storage.sync.set` with a synchronously-throwing function.
      Now that `injection-bridge.js` calls `browser.storage.sync.set()` via the polyfill,
      the polyfill wraps the call in a Promise — turning the synchronous throw into an
      unhandled rejection that escapes the `try/catch`. The "Extension context invalidated"
      test fails and the companion "non-invalidation errors" test produces unhandled rejections.

- [ ] **`get-status` promise never resolves if page doesn't respond**
      `src/content/injection-bridge.js` ~line 88: the `get-status` handler returns a Promise
      that only resolves when a `status-response` window message arrives. No timeout or cleanup.
      If the page context never responds, the Promise hangs forever, the `responseHandler`
      listener leaks, and the messaging channel stays open indefinitely.

- [ ] **`build:release` scripts use POSIX env syntax — broken on Windows**
      `package.json`: `"build:release": "RELEASE=1 node scripts/build.mjs ..."` — the
      `RELEASE=1` prefix is POSIX-only. On Windows (cmd/PowerShell), this fails with
      `'RELEASE=1' is not recognized`. Needs `cross-env` or a `--release` CLI flag.

- [ ] **Popup `sendMessage` calls have no `.catch()` — unhandled rejections**
      `src/ui/popup/popup.js` ~lines 140-160: `setSpeed()` and `adjustSpeed()` call
      `browser.tabs.sendMessage()` without `.catch()`. On internal pages (`chrome://`,
      `about:`) or when the content script isn't injected, this produces unhandled Promise
      rejections. Also, on Chrome, returning `undefined` from `onMessage` listeners causes
      the polyfill to reject with "message port closed" on every message.

## Low

- [ ] **`setupDocumentCSS` in `inject.js` always 404s on iframe CSS injection**
      `src/content/inject.js` ~line 340: runs in page context where `chrome.runtime` is
      unavailable, so the fallback `/src/styles/inject.css` resolves against the host site
      origin (e.g., `https://youtube.com/src/styles/inject.css`), producing a 404.

- [ ] **`validate-extension.js` checks for nonexistent `shadow.css`**
      `tests/e2e/validate-extension.js` ~line 36: tests for `src/styles/shadow.css` which
      doesn't exist. This validation always fails.

- [ ] **`StorageManager.get()` missing `chrome.runtime.lastError` check**
      `src/core/storage-manager.js` ~line 55: the Chrome callback path for `get()` doesn't
      check `chrome.runtime.lastError`, unlike `set()`, `remove()`, and `clear()` which all do.

- [ ] **Wrong polyfill URL in `CONTRIBUTING.md`**
      ~Line 99 links to `https://github.com/nicedoc/webextension-polyfill`. The correct repo
      is `https://github.com/mozilla/webextension-polyfill`.
