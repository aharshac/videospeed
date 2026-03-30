import esbuild from 'esbuild';
import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const pkg = require(path.join(rootDir, 'package.json'));

const isWatch = process.argv.includes('--watch');
const isRelease = process.env.RELEASE === '1';

// Determine target browser(s) from --browser flag (default: chrome)
const browserArg = process.argv.find((a) => a.startsWith('--browser='));
const browserTargets = browserArg
  ? browserArg.split('=')[1].split(',')
  : ['chrome'];

const BROWSER_CONFIG = {
  chrome: {
    target: 'chrome114',
    manifestOverlay: 'manifest.chrome.json',
  },
  firefox: {
    target: 'firefox109',
    manifestOverlay: 'manifest.firefox.json',
  },
};

/**
 * Merge base manifest with browser-specific overlay and inject version.
 */
async function buildManifest(browserName, outDir) {
  const base = await fs.readJson(path.join(rootDir, 'manifest.json'));
  const overlayPath = path.join(rootDir, BROWSER_CONFIG[browserName].manifestOverlay);
  const overlay = await fs.readJson(overlayPath);

  const merged = { ...base, ...overlay };
  merged.version = pkg.version;

  await fs.writeJson(path.join(outDir, 'manifest.json'), merged, { spaces: 2 });
  console.log(
    `  ✅ Manifest version set to ${pkg.version} (${browserName})${isRelease ? ' [release]' : ''}`
  );
}

async function copyStaticFiles(outDir) {
  try {
    // Ensure the output directory exists and is clean
    await fs.emptyDir(outDir);

    // Paths to copy
    const pathsToCopy = {
      'src/assets': path.join(outDir, 'assets'),
      'src/ui': path.join(outDir, 'ui'),
      'src/styles': path.join(outDir, 'styles'),
      'LICENSE': path.join(outDir, 'LICENSE'),
      'CONTRIBUTING.md': path.join(outDir, 'CONTRIBUTING.md'),
      'PRIVACY.md': path.join(outDir, 'PRIVACY.md'),
      'README.md': path.join(outDir, 'README.md'),
    };

    // Perform copy operations
    for (const [src, dest] of Object.entries(pathsToCopy)) {
      await fs.copy(path.join(rootDir, src), dest, {
        filter: (srcPath) => !path.basename(srcPath).endsWith('.js'),
      });
    }

    console.log('  ✅ Static files copied');
  } catch (error) {
    console.error('  ❌ Error copying static files:', error);
    process.exit(1);
  }
}

async function buildForBrowser(browserName) {
  const config = BROWSER_CONFIG[browserName];
  if (!config) {
    console.error(`❌ Unknown browser: ${browserName}. Use "chrome" or "firefox".`);
    process.exit(1);
  }

  const outDir = path.resolve(rootDir, 'dist', browserName);

  console.log(`\n🔨 Building for ${browserName}...`);

  await copyStaticFiles(outDir);
  await buildManifest(browserName, outDir);

  const esbuildConfig = {
    bundle: true,
    sourcemap: isRelease ? false : false, // set true locally if debugging
    minify: isRelease,
    target: config.target,
    platform: 'browser',
    legalComments: 'none',
    format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' },
    entryPoints: {
      content: 'src/entries/content-entry.js',
      inject: 'src/entries/inject-entry.js',
      background: 'src/background.js',
      'ui/popup/popup': 'src/ui/popup/popup.js',
      'ui/options/options': 'src/ui/options/options.js',
    },
    outdir: outDir,
  };

  if (isWatch) {
    const ctx = await esbuild.context(esbuildConfig);
    await ctx.watch();
    console.log(`  🔧 Watching for changes (${browserName})...`);
  } else {
    await esbuild.build(esbuildConfig);
    console.log(`  ✅ Build complete (${browserName})`);
  }
}

async function build() {
  try {
    for (const browserName of browserTargets) {
      await buildForBrowser(browserName.trim());
    }
    console.log('\n🎉 All builds complete');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
