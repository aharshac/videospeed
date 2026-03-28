/**
 * Basic E2E tests for Video Speed Controller extension on Firefox
 * Uses Playwright for Firefox browser automation
 */

import {
  launchFirefoxWithExtension,
  waitForExtension,
  waitForVideo,
  controlVideo,
  getVideoSpeed,
  testKeyboardShortcut,
  assert,
  sleep,
} from './firefox-e2e-utils.js';

export default async function runFirefoxBasicE2ETests() {
  console.log('🦊 Running Firefox Basic E2E Tests...\n');

  let context;
  let passed = 0;
  let failed = 0;

  const runTest = async (testName, testFn) => {
    try {
      console.log(`   🧪 ${testName}`);
      await testFn();
      console.log(`   ✅ ${testName}`);
      passed++;
    } catch (error) {
      console.log(`   ❌ ${testName}: ${error.message}`);
      failed++;
    }
  };

  try {
    // Launch Firefox with extension
    const result = await launchFirefoxWithExtension();
    context = result.context;
    const page = result.page;

    await runTest('Extension should load in Firefox', async () => {
      const testPagePath = `file://${process.cwd()}/tests/e2e/test-video.html`;
      await page.goto(testPagePath, { waitUntil: 'domcontentloaded' });
      await sleep(3000);

      const extensionLoaded = await waitForExtension(page, 8000);
      assert.true(extensionLoaded, 'Extension should be loaded');
    });

    await runTest('Video element should be detected', async () => {
      const videoReady = await waitForVideo(page, 'video', 10000);
      assert.true(videoReady, 'Video should be ready');
    });

    await runTest('Initial video speed should be 1.0x', async () => {
      const speed = await getVideoSpeed(page);
      assert.equal(speed, 1, 'Initial speed should be 1.0x');
    });

    await runTest('Faster button should increase speed', async () => {
      const initialSpeed = await getVideoSpeed(page);
      const success = await controlVideo(page, 'faster');
      assert.true(success, 'Faster button should work');

      const newSpeed = await getVideoSpeed(page);
      assert.true(newSpeed > initialSpeed, 'Speed should increase');
    });

    await runTest('Slower button should decrease speed', async () => {
      const initialSpeed = await getVideoSpeed(page);
      const success = await controlVideo(page, 'slower');
      assert.true(success, 'Slower button should work');

      const newSpeed = await getVideoSpeed(page);
      assert.true(newSpeed < initialSpeed, 'Speed should decrease');
    });

    await runTest('Keyboard shortcuts should work', async () => {
      // Reset speed first
      await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          video.playbackRate = 1.0;
        }
      });
      await sleep(200);

      // Test 'D' key for faster
      const initialSpeed = await getVideoSpeed(page);
      await testKeyboardShortcut(page, 'KeyD');

      const newSpeed = await getVideoSpeed(page);
      assert.true(newSpeed > initialSpeed, 'D key should increase speed');
    });
  } catch (error) {
    console.log(`   💥 Test setup failed: ${error.message}`);
    failed++;
  } finally {
    if (context) {
      await context.close();
    }
  }

  console.log(`\n   📊 Firefox E2E Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
