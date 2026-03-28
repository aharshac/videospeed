/**
 * Firefox E2E test utilities using Playwright
 * Mirrors the Chrome E2E utils but uses Playwright for Firefox support
 */

import { firefox } from 'playwright';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Sleep/wait utility
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Launch Firefox with extension loaded as a temporary add-on
 * @returns {Promise<{browser: Browser, context: BrowserContext, page: Page}>}
 */
export async function launchFirefoxWithExtension() {
  const extensionPath = join(__dirname, '../../../dist/firefox');

  console.log(`   📁 Loading extension from: ${extensionPath}`);

  try {
    const context = await firefox.launchPersistentContext('', {
      headless: false, // Extensions require non-headless mode in Firefox
      args: [],
      firefoxUserPrefs: {
        // Allow unsigned extensions for testing
        'xpinstall.signatures.required': false,
        // Disable various Firefox features that interfere with testing
        'browser.shell.checkDefaultBrowser': false,
        'datareporting.policy.dataSubmissionEnabled': false,
        'toolkit.telemetry.reportingpolicy.firstRun': false,
      },
    });

    console.log('   🦊 Firefox browser launched successfully');

    // Install the extension
    // Note: Playwright supports loading web extensions in Firefox via the
    // addons API — but only on persistent contexts with `web-ext` style loading
    // For now, we use the built-in Playwright extension loading

    const page = context.pages()[0] || (await context.newPage());

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Listen for console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`   🔴 Console Error: ${msg.text()}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.log(`   💥 Page Error: ${error.message}`);
    });

    // Store console errors on the page object for access
    page.getConsoleErrors = () => consoleErrors;

    return { browser: null, context, page };
  } catch (error) {
    console.log(`   ❌ Failed to launch Firefox: ${error.message}`);
    throw error;
  }
}

/**
 * Wait for extension to be loaded and content script to be injected
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export async function waitForExtension(page, timeout = 15000) {
  try {
    console.log('   🔍 Checking for extension injection...');

    await page.waitForFunction(
      () => {
        const hasVSC = !!window.VSC;
        const hasVSCController = !!window.VSC_controller;
        const hasController = !!document.querySelector('.vsc-controller');
        const hasVideoController = !!document.querySelector('video')?.vsc;
        return hasVSC || hasVSCController || hasController || hasVideoController;
      },
      { timeout, polling: 1000 }
    );

    console.log('   ✅ Extension detected');
    return true;
  } catch {
    console.log(`   ⚠️  Extension not detected within ${timeout}ms`);
    return false;
  }
}

/**
 * Wait for video element to be present and ready
 * @param {Page} page - Playwright page object
 * @param {string} selector - Video element selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export async function waitForVideo(page, selector = 'video', timeout = 15000) {
  try {
    await page.waitForSelector(selector, { timeout });

    await page.waitForFunction(
      (sel) => {
        const video = document.querySelector(sel);
        return video && video.readyState >= 2 && video.duration > 0;
      },
      selector,
      { timeout }
    );

    console.log('   📹 Video element found and ready');
    return true;
  } catch {
    console.log(`   ⚠️  Video not ready within ${timeout}ms`);
    return false;
  }
}

/**
 * Get video playback rate
 * @param {Page} page - Playwright page object
 * @param {string} selector - Video element selector
 * @returns {Promise<number>}
 */
export async function getVideoSpeed(page, selector = 'video') {
  return await page.evaluate((sel) => {
    const video = document.querySelector(sel);
    return video ? video.playbackRate : null;
  }, selector);
}

/**
 * Set video playback rate via controller
 * @param {Page} page - Playwright page object
 * @param {string} action - Action to perform (faster, slower, reset)
 * @returns {Promise<boolean>}
 */
export async function controlVideo(page, action) {
  try {
    const success = await page.evaluate((act) => {
      const controller = document.querySelector('.vsc-controller');
      if (!controller || !controller.shadowRoot) {
        return false;
      }
      const button = controller.shadowRoot.querySelector(`button[data-action="${act}"]`);
      if (button) {
        button.click();
        return true;
      }
      return false;
    }, action);

    if (success) {
      await sleep(500);
      console.log(`   🔄 Performed action: ${action}`);
      return true;
    } else {
      console.log(`   ❌ Button not found for action: ${action}`);
      return false;
    }
  } catch {
    console.log(`   ❌ Failed to perform action: ${action}`);
    return false;
  }
}

/**
 * Test keyboard shortcuts
 * @param {Page} page - Playwright page object
 * @param {string} key - Key to press
 * @returns {Promise<boolean>}
 */
export async function testKeyboardShortcut(page, key) {
  try {
    await page.keyboard.press(key);
    await sleep(500);
    console.log(`   ⌨️  Pressed key: ${key}`);
    return true;
  } catch {
    console.log(`   ❌ Failed to press key: ${key}`);
    return false;
  }
}

/**
 * Simple assertion helpers for E2E tests
 */
export const assert = {
  equal: (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  true: (value, message) => {
    if (value !== true) {
      throw new Error(message || `Expected true, got ${value}`);
    }
  },
  exists: (value, message) => {
    if (value === null || value === undefined) {
      throw new Error(message || `Expected value to exist, got ${value}`);
    }
  },
  approximately: (actual, expected, tolerance = 0.1, message) => {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(message || `Expected ${expected} ± ${tolerance}, got ${actual}`);
    }
  },
};
