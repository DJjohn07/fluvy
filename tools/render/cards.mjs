#!/usr/bin/env node
/**
 * The cards' pictures in the docs (#199): each card's base example from the gallery (`tools/docs/src/gallery.ts`),
 * drawn by the playground's `gallery` sheet on the demo house at the pinned moment, in light and in dark, written as
 * WebP to `docs/images/cards/<card>-<mode>.webp` with the manifest `pictures.json` beside them (`pictures.ts`: what
 * each is of, and its size). A full card is drawn at the design's 360 in its section's 16 px margin, so its picture
 * shows 392 wide, saved at 2×; a half card's picture is its own column in the same margin. Quality 80.
 *
 * A picture is rewritten only where it differs from the one in the folder beyond a renderer's own noise (more than
 * CHANGED of its pixels moved by more than SHIFT), or where its size or its example changed: the history grows only
 * where a card's look did. Without `--only`, the pictures of a card no longer in the gallery are removed.
 *
 *   pnpm docs:images                         every card (the playground at $PLAYGROUND, else :5183)
 *   pnpm docs:images -- --only tile,lights
 *   --url http://127.0.0.1:5183/  --out docs/images/cards
 *
 * Exit code 1 when a page throws or a card's frame is not on the sheet.
 */
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { drawn, GALLERY, mounted, shortName } from '../docs/src/gallery.ts';
import { digest, FOLDER, MANIFEST, MODES, pictureName } from '../docs/src/pictures.ts';
import { launchOptions, parseArgs, PLAYGROUND } from './lib.mjs';

const run = promisify(execFile);

const args = parseArgs(process.argv.slice(2), { only: '', url: PLAYGROUND, out: FOLDER });

/** The moment every picture shows (Thursday 17 September 2026, 21:50 in the house's Madrid). */
const AT = '2026-09-17T19:50:00Z';
/** A section's width, the design's: a full card's. */
const SECTION = 360;
/** The section's margin round its cards, kept round the picture. */
const MARGIN = 16;
/** How long a card is given to draw once its frame is on screen (a camera's still). */
const SETTLE = 900;
/** A pixel moved when one of its channels moved by more than this; a picture changed when more than CHANGED did. */
const SHIFT = 40;
const CHANGED = 1 / 4000;

const bases = Object.entries(GALLERY).map(([tag, example]) => {
  const [base] = drawn(tag, example);
  return { short: shortName(tag), base, example: digest(mounted(base)) };
});
const wanted = args.only ? args.only.split(',') : bases.map(({ short }) => short);
for (const short of wanted)
  if (!bases.some((card) => card.short === short))
    throw new Error(
      `Unknown card "${short}". Known: ${bases.map((card) => card.short).join(', ')}`,
    );

/** The gallery in a mode, on the house's palette and language, its clock pinned. */
const address = (mode) =>
  `${args.url}?${new URLSearchParams({ sheet: 'gallery', width: String(SECTION), at: AT, palette: 'linen', mode, lang: 'en' })}`;

/** A picture's pixels (RGB) and its size, as ffmpeg decodes it; none where there is no file. */
async function decode(file) {
  try {
    const [{ stdout: size }, { stdout: rgb }] = await Promise.all([
      run('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=p=0',
        file,
      ]),
      run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
        encoding: 'buffer',
        maxBuffer: 1 << 26,
      }),
    ]);
    const [width, height] = size.trim().split(',').map(Number);
    return { width, height, rgb };
  } catch {
    return undefined;
  }
}

/** Whether a new picture shows what the old one does, but for a renderer's noise. */
function same(before, after) {
  if (!before || before.width !== after.width || before.height !== after.height) return false;
  let moved = 0;
  for (let i = 0; i < after.rgb.length; i += 3)
    if (
      Math.abs(after.rgb[i] - before.rgb[i]) > SHIFT ||
      Math.abs(after.rgb[i + 1] - before.rgb[i + 1]) > SHIFT ||
      Math.abs(after.rgb[i + 2] - before.rgb[i + 2]) > SHIFT
    )
      moved += 1;
  return moved <= after.width * after.height * CHANGED;
}

const out = resolve(args.out);
await mkdir(out, { recursive: true });
const manifestFile = join(out, MANIFEST);
const manifest = JSON.parse(await readFile(manifestFile, 'utf8').catch(() => '{}'));
const dir = await mkdtemp(join(tmpdir(), 'fluvy-cards-'));
const browser = await chromium.launch(launchOptions);
const started = Date.now();
const written = [];
let failed = false;

for (const mode of MODES) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: mode,
    reducedMotion: 'reduce',
    timezoneId: 'Europe/Madrid',
  });
  // the page's clock held at the moment, so a running timer or a camera's clock reads the same in every picture
  await context.clock.setFixedTime(new Date(AT));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(address(mode));
  await page.waitForSelector('html[data-ready="1"]', { timeout: 120_000 });
  // every frame as a dashboard's section shows its cards, on the page's colour and without the sheet's outline; each is
  // taken where it stands, laid out from the start at its width (a card hidden and shown again may not fit afresh)
  await page.addStyleTag({
    content: `body { background: var(--fluvy-page); }
.pg-frame { background: var(--fluvy-page); box-shadow: none; border-radius: 0; }`,
  });
  for (const { short, base, example } of bases.filter((card) => wanted.includes(card.short))) {
    const frame = page.locator(`[data-frame=${JSON.stringify(`gallery/${base.name}`)}]`);
    if (!(await frame.count())) {
      console.error(`✗ ${short}: no frame gallery/${base.name} on the sheet`);
      failed = true;
      continue;
    }
    // on screen, what loads only there (a camera's stills) loads
    await frame.scrollIntoViewIfNeeded();
    await page.waitForTimeout(SETTLE);
    await page.evaluate(() => document.fonts.ready);
    const box = await frame.boundingBox();
    const card = await frame.locator(':scope > *').first().boundingBox();
    // a half card's picture ends a margin past its column
    const width = Math.round(card.x + card.width + MARGIN - box.x);
    const png = join(dir, `${short}-${mode}.png`);
    await page.screenshot({ path: png, clip: { x: box.x, y: box.y, width, height: box.height } });
    const name = pictureName(short, mode);
    const next = join(dir, name);
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      png,
      '-c:v',
      'libwebp',
      '-quality',
      '80',
      '-compression_level',
      '6',
      next,
    ]);
    const after = await decode(next);
    const kept = manifest[short]?.example === example && same(await decode(join(out, name)), after);
    if (!kept) {
      await copyFile(next, join(out, name));
      written.push(name);
    }
    manifest[short] = { example, width: after.width, height: after.height };
    console.log(
      `${kept ? '·' : '✓'} ${name} ${after.width}×${after.height}${kept ? ' (as it was)' : ''}`,
    );
  }
  if (errors.length) {
    console.error(`✗ ${mode}: the page reported errors\n  ${[...new Set(errors)].join('\n  ')}`);
    failed = true;
  }
  await context.close();
}
await browser.close();
await rm(dir, { recursive: true, force: true });

// the manifest in the gallery's order; without --only, nothing of a card that is gone
const shorts = bases.map(({ short }) => short);
const ordered = Object.fromEntries(
  shorts.filter((short) => manifest[short]).map((short) => [short, manifest[short]]),
);
await writeFile(manifestFile, `${JSON.stringify(ordered, null, 2)}\n`);
if (!args.only) {
  const pictures = new Set(
    shorts.flatMap((short) => MODES.map((mode) => pictureName(short, mode))),
  );
  for (const file of await readdir(out))
    if (file.endsWith('.webp') && !pictures.has(file)) {
      await rm(join(out, file));
      console.log(`− ${file} (no card)`);
    }
}
console.log(
  `${written.length} written, the rest as they were, in ${((Date.now() - started) / 1000).toFixed(0)} s`,
);
process.exitCode = failed ? 1 : 0;
