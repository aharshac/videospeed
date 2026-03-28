/**
 * Chrome API mock for testing
 */

const mockStorage = {
  enabled: true,
  lastSpeed: 1.0,
  keyBindings: [],
  rememberSpeed: false,

  audioBoolean: false,
  startHidden: false,
  controllerOpacity: 0.3,
  controllerButtonSize: 14,
  blacklist: 'www.instagram.com\nx.com',
  logLevel: 1,
};

// Track onChanged listeners so set() can fire them
const onChangedListeners = [];

export const chromeMock = {
  storage: {
    sync: {
      get: (keys, callback) => {
        const result =
          typeof keys === 'object' && keys !== null
            ? Object.keys(keys).reduce((acc, key) => {
                acc[key] = mockStorage[key] !== undefined ? mockStorage[key] : keys[key];
                return acc;
              }, {})
            : { ...mockStorage };

        // Support both callback (chrome.*) and Promise (browser.*) calling conventions
        if (typeof callback === 'function') {
          setTimeout(() => callback(result), 10);
        } else {
          return new Promise((resolve) => setTimeout(() => resolve(result), 10));
        }
      },
      set: (items, callback) => {
        // Build changes object BEFORE mutating storage (mirrors real chrome behavior)
        const changes = {};
        for (const [key, newValue] of Object.entries(items)) {
          changes[key] = { oldValue: mockStorage[key], newValue };
        }

        Object.assign(mockStorage, items);

        // Fire onChanged listeners asynchronously (mirrors real chrome behavior)
        setTimeout(() => {
          for (const listener of onChangedListeners) {
            listener(changes, 'sync');
          }
        }, 5);

        if (typeof callback === 'function') {
          setTimeout(() => {
            if (globalThis.chrome) {
              callback();
            }
          }, 10);
        } else {
          return new Promise((resolve) => setTimeout(resolve, 10));
        }
      },
      remove: (keys, callback) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => delete mockStorage[key]);
        if (typeof callback === 'function') {
          setTimeout(() => callback(), 10);
        } else {
          return new Promise((resolve) => setTimeout(resolve, 10));
        }
      },
      clear: (callback) => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        if (typeof callback === 'function') {
          setTimeout(() => callback(), 10);
        } else {
          return new Promise((resolve) => setTimeout(resolve, 10));
        }
      },
    },
    onChanged: {
      addListener: (callback) => {
        onChangedListeners.push(callback);
      },
      removeListener: (callback) => {
        const idx = onChangedListeners.indexOf(callback);
        if (idx !== -1) {
          onChangedListeners.splice(idx, 1);
        }
      },
    },
  },
  runtime: {
    getURL: (path) => `chrome-extension://test-extension/${path}`,
    id: 'test-extension-id',
    lastError: null,
    openOptionsPage: () => Promise.resolve(),
    onMessage: {
      addListener: (_callback) => {
        // Mock message listener
      },
      removeListener: (_callback) => {
        // Mock message listener removal
      },
    },
    onInstalled: {
      addListener: (_callback) => {},
    },
    onStartup: {
      addListener: (_callback) => {},
    },
  },
  tabs: {
    query: (queryInfo, callback) => {
      const result = [
        {
          id: 1,
          active: true,
          url: 'https://www.youtube.com/watch?v=test',
        },
      ];
      if (typeof callback === 'function') {
        callback(result);
      } else {
        return Promise.resolve(result);
      }
    },
    sendMessage: (tabId, message, callback) => {
      if (typeof callback === 'function') {
        setTimeout(() => callback({}), 10);
      } else {
        return new Promise((resolve) => setTimeout(() => resolve({}), 10));
      }
    },
  },
  action: {
    setIcon: (details, callback) => {
      if (typeof callback === 'function') {
        setTimeout(() => callback(), 10);
      } else {
        return new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
  },
};

/**
 * Install Chrome API mock into global scope
 * Also installs as `browser` to match webextension-polyfill
 */
export function installChromeMock() {
  globalThis.chrome = chromeMock;
  globalThis.browser = chromeMock;
}

/**
 * Clean up Chrome API mock from global scope
 */
export function cleanupChromeMock() {
  delete globalThis.chrome;
  delete globalThis.browser;
}

/**
 * Reset mock storage to defaults
 */
export function resetMockStorage() {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  Object.assign(mockStorage, {
    enabled: true,
    lastSpeed: 1.0,
    keyBindings: [],
    rememberSpeed: false,

    audioBoolean: false,
    startHidden: false,
    controllerOpacity: 0.3,
    controllerButtonSize: 14,
    blacklist: 'www.instagram.com\nx.com',
    logLevel: 1,
  });
  // Clear all onChanged listeners between tests
  onChangedListeners.length = 0;
}

/**
 * Get a direct reference to mock storage for assertions
 * This lets tests inspect what was actually written without going through get()
 */
export function getMockStorage() {
  return mockStorage;
}

/**
 * Write directly to mock storage WITHOUT firing onChanged listeners.
 * Simulates an external context (e.g. another tab) writing to chrome.storage
 * and then manually fires onChanged to simulate Chrome's behavior.
 */
export function simulateExternalStorageWrite(items) {
  const changes = {};
  for (const [key, newValue] of Object.entries(items)) {
    changes[key] = { oldValue: mockStorage[key], newValue };
  }
  Object.assign(mockStorage, items);

  // Fire listeners synchronously for test determinism
  for (const listener of onChangedListeners) {
    listener(changes, 'sync');
  }
}
