import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const pkg = require(path.join(rootDir, 'package.json'));

const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');

const CWS_SIZE_LIMIT = 128 * 1024 * 1024; // 128 MB

const BROWSERS = ['chrome', 'firefox'];

async function packageBrowser(browserName) {
  const browserDistDir = path.join(distDir, browserName);
  const zipName = `videospeed-${browserName}-${pkg.version}.zip`;
  const zipPath = path.join(releaseDir, zipName);

  // Verify dist exists
  if (!(await fs.pathExists(browserDistDir))) {
    console.error(
      `❌ dist/${browserName}/ directory not found. Run "npm run build:release" first.`
    );
    return false;
  }

  // Validate manifest version matches package.json
  const manifest = await fs.readJson(path.join(browserDistDir, 'manifest.json'));
  if (manifest.version !== pkg.version) {
    console.error(
      `❌ Version mismatch (${browserName}): manifest.json has ${manifest.version}, package.json has ${pkg.version}`
    );
    return false;
  }

  // Create zip
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(output);
  archive.directory(browserDistDir, false, (entry) => {
    // Exclude source maps and OS cruft
    if (entry.name.endsWith('.map') || entry.name === '.DS_Store') {
      return false;
    }
    return entry;
  });
  await archive.finalize();
  await done;

  const stats = await fs.stat(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  if (stats.size > CWS_SIZE_LIMIT) {
    console.warn(`⚠️  Warning: ${zipName} is ${sizeMB} MB (Chrome Web Store limit is 128 MB)`);
  }

  console.log(`✅ Packaged ${zipName} (${sizeMB} MB) → release/`);
  return true;
}

async function packageRelease() {
  await fs.ensureDir(releaseDir);

  let allSucceeded = true;
  for (const browser of BROWSERS) {
    const success = await packageBrowser(browser);
    if (!success) {
      allSucceeded = false;
    }
  }

  if (!allSucceeded) {
    process.exit(1);
  }
}

packageRelease().catch((err) => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});
