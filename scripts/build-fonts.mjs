#!/usr/bin/env node
/**
 * Builds "insales-icons" icon fonts.
 *
 * Two input modes:
 *   default            — one font per set in config/icons.mjs, sources
 *                        resolved from npm packages
 *   --dir <path> […]   — one font per folder of flat .svg files; the file
 *                        name becomes the glyph / .icon-<name> class and
 *                        codepoints are assigned alphabetically from 0xE800
 *
 * Per font: stage the sources under their glyph names, convert with
 * fantasticon, render style.css and validate. Output lands in
 * public/fonts/icons-<set>/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generateFonts } from 'fantasticon';

import { CSS_CLASS, FIRST_CODEPOINT, FONT_NAME, icons, sets } from '../config/icons.mjs';
import { renderDemoData } from '../templates/demo-data.mjs';
import { renderCss } from '../templates/style.css.mjs';

const FONT_TYPES = ['eot', 'svg', 'ttf', 'woff', 'woff2'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingRoot = path.join(root, '.font-build');
// Generated fonts are committed to the repo (like the original InSales
// font-generator) and referenced relatively by the demo and consumers.
const outputRoot = path.join(root, 'fonts');

const USAGE = `insales-icons font builder

Usage:
  npm run fonts                   build every set from config/icons.mjs
  npm run fonts -- --dir <path>   build a font from a folder of .svg files
                                  (repeat --dir for several folders)

Folder mode:
  - a flat folder of *.svg files (subfolders are ignored)
  - the file name without .svg becomes the glyph and the .icon-<name> class
  - codepoints are assigned alphabetically, starting at \\E800
  - output: public/fonts/icons-<folder-name>/

Options:
  -d, --dir <path>   folder of SVG sources (repeatable)
  -h, --help         show this help`;

function parseCli() {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string', multiple: true, short: 'd' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  return values;
}

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

// A manifest set's resolve() returns a node_modules-relative specifier: a
// direct path ("pkg/icons/x.svg") or a glob ("pkg/**/x.svg") for packages
// that group icons into category directories. Globs are looked up in a
// per-directory file-name index so every source stays inside its package.
const sourceIndexes = new Map();

function indexSvgFiles(dir) {
  const index = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.svg') && !index.has(entry.name)) index.set(entry.name, fullPath);
    }
  };
  walk(dir);
  return index;
}

function indexedSvgDir(packageSubdir) {
  let index = sourceIndexes.get(packageSubdir);
  if (!index) {
    index = indexSvgFiles(path.join(root, 'node_modules', packageSubdir));
    sourceIndexes.set(packageSubdir, index);
  }
  return index;
}

function resolveSourcePath(set, file) {
  const [packageSubdir, fileName] = set.resolve(file).split('**/');
  if (!fileName) return path.join(root, 'node_modules', packageSubdir);

  const hit = indexedSvgDir(packageSubdir).get(fileName);
  if (!hit) throw new Error(`cannot locate "${packageSubdir}/**/${fileName}" in node_modules`);
  return hit;
}

/** [{name, source}] for a manifest set, in canonical codepoint order. */
function collectManifestSources(setKey, set) {
  return icons.map((name) => {
    const file = set.map[name];
    if (!file) throw new Error(`"${name}" is missing from the "${setKey}" manifest map`);

    return { name, source: resolveSourcePath(set, file) };
  });
}

/** [{name, source}] for a plain folder of .svg files, alphabetically. */
function collectDirectorySources(dirPath) {
  const absolute = path.resolve(dirPath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
    throw new Error(`not a directory: ${absolute}`);
  }

  const files = fs.readdirSync(absolute).filter((file) => /\.svg$/i.test(file)).sort();
  if (files.length === 0) throw new Error(`no .svg files in ${absolute}`);

  return files.map((file) => {
    const name = file.replace(/\.svg$/i, '');
    if (!/^[\w-]+$/.test(name)) {
      throw new Error(`"${file}" in ${absolute}: glyph name "${name}" cannot be used as a CSS class — rename it (letters, digits, "-", "_")`);
    }
    return { name, source: path.join(absolute, file) };
  });
}

function manifestJobs() {
  return Object.entries(sets).map(([key, set]) => ({
    key,
    header: `${set.label} — ${set.package} (${set.license})`,
    sources: collectManifestSources(key, set),
  }));
}

function directoryJobs(dirs) {
  const jobs = dirs.map((dir) => ({
    key: path.basename(path.resolve(dir)),
    header: `${capitalize(path.basename(path.resolve(dir)))} — ${path.resolve(dir)} (SVG folder)`,
    sources: collectDirectorySources(dir),
  }));

  const keys = jobs.map((job) => job.key);
  const duplicateKey = keys.find((key, index) => keys.indexOf(key) !== index);
  if (duplicateKey) throw new Error(`two source folders resolve to the same font name "icons-${duplicateKey}"`);

  return jobs;
}

// Manifest order defines codepoints, so they stay identical to the original
// InSales build: angle-down = \E800 … user = \E852. Folder mode applies the
// same scheme to its alphabetical file order.
function expectedCodepoints(names) {
  return new Map(names.map((name, index) => [name, FIRST_CODEPOINT + index]));
}

function stageSources(setKey, sources) {
  const staging = path.join(stagingRoot, setKey);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });

  for (const { name, source } of sources) {
    if (!fs.existsSync(source)) throw new Error(`source SVG not found for "${name}": ${source}`);
    fs.copyFileSync(source, path.join(staging, `${name}.svg`));
  }
  return staging;
}

function validateFont(result, outputDir, names, codepoints) {
  const misassigned = names.filter((name) => result.codepoints[name] !== codepoints.get(name));
  if (misassigned.length > 0) {
    throw new Error(`glyphs missing or misordered in the generated font: ${misassigned.join(', ')}`);
  }

  const artifacts = [...FONT_TYPES.map((type) => `${FONT_NAME}.${type}`), 'style.css'];
  const missing = artifacts.filter((file) => !fs.existsSync(path.join(outputDir, file)));
  if (missing.length > 0) throw new Error(`expected artifacts not generated: ${missing.join(', ')}`);
}

function fileSizeKb(dir, file) {
  return (fs.statSync(path.join(dir, file)).size / 1024).toFixed(1);
}

async function buildFont(key, sources) {
  const names = sources.map(({ name }) => name);
  const codepoints = expectedCodepoints(names);
  const staging = stageSources(key, sources);
  const outputDir = path.join(outputRoot, `icons-${key}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const result = await generateFonts({
    inputDir: staging,
    outputDir,
    name: FONT_NAME,
    fontTypes: FONT_TYPES,
    assetTypes: ['json'],
    codepoints: Object.fromEntries(codepoints),
    normalize: true,
    fontHeight: 1000,
  });

  fs.writeFileSync(
    path.join(outputDir, 'style.css'),
    renderCss({ fontName: FONT_NAME, cssClass: CSS_CLASS, icons: names, codepoints }),
  );

  validateFont(result, outputDir, names, codepoints);

  console.log(
    `  ✓ ${names.length} glyphs → fonts/icons-${key}/ · ` +
      `woff2 ${fileSizeKb(outputDir, `${FONT_NAME}.woff2`)} kB · ` +
      `woff ${fileSizeKb(outputDir, `${FONT_NAME}.woff`)} kB · ` +
      `ttf ${fileSizeKb(outputDir, `${FONT_NAME}.ttf`)} kB`,
  );
}

async function main() {
  const values = parseCli();
  if (values.help) {
    console.log(USAGE);
    return;
  }

  const fromManifest = !values.dir?.length;
  const jobs = fromManifest ? manifestJobs() : directoryJobs(values.dir);

  try {
    console.log(
      `Building ${jobs.length} "${FONT_NAME}" font(s) · codepoints start at \\${FIRST_CODEPOINT.toString(16).toUpperCase()}`,
    );

    for (const { key, header, sources } of jobs) {
      console.log(`\n▶ ${header}`);
      await buildFont(key, sources);
    }

    if (fromManifest) {
      // The static demo reads its data from this classic-script file, so it
      // keeps working from file:// where ES modules are blocked.
      fs.writeFileSync(
        path.join(outputRoot, 'data.js'),
        renderDemoData({
          fontName: FONT_NAME,
          firstCodepoint: FIRST_CODEPOINT,
          sets: Object.entries(sets).map(([key, set]) => ({
            key,
            label: set.label,
            package: set.package,
            license: set.license,
            icons,
          })),
        }),
      );
      console.log(`\n  ✓ fonts/data.js (demo page data)`);
    }

    console.log(`\n✔ done — every font declares family "${FONT_NAME}" with the same .icon-<name> API.`);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exitCode = 1;
});
