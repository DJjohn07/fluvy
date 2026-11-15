/**
 * The cards' docs, written from the code or held to it (#199): a page a card in `docs/cards/`, the index between
 * `<!-- generated:cards -->` and `<!-- /generated:cards -->` in `docs/cards.md` (the prose around it is written by
 * hand and kept), and the same for an assistant in `docs/cards.json` and `docs/llms.txt`. With `--check` nothing is
 * written: it fails where a file is not what the code says. The pictures are `pnpm docs:images`'s, taken in a
 * browser; this reads only their manifest.
 *
 *   pnpm docs:cards                     writes the pages, the index and the data
 *   pnpm --filter @fluvy/docs check     what `pnpm check` runs
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCards, SECTIONS } from './cards.js';
import { ROOT } from './facts.js';
import { cardPage, cardsData, indexBlock, llmsText } from './pages.js';
import { FOLDER, MANIFEST, type Manifest } from './pictures.js';

const check = process.argv.includes('--check');
const DOCS = join(ROOT, 'docs');
const PAGES = join(DOCS, 'cards');
const INDEX = join(DOCS, 'cards.md');
const OPEN = '<!-- generated:cards -->';
const CLOSE = '<!-- /generated:cards -->';

const cards = await readCards();
const sections = SECTIONS.map(([title]) => title);
const pictures = join(ROOT, FOLDER);
const manifest = JSON.parse(
  await readFile(join(pictures, MANIFEST), 'utf8').catch(() => '{}'),
) as Manifest;

const current = await readFile(INDEX, 'utf8');
const start = current.indexOf(OPEN);
const end = current.indexOf(CLOSE);
if (start < 0 || end < 0) throw new Error(`${INDEX}: the generated markers are missing`);
const index = `${current.slice(0, start)}${OPEN}\n\n${indexBlock(cards, sections, manifest)}\n\n${current.slice(end)}`;

/** Every file this writes, by its path from the repository's root, and what it holds. */
const written = new Map<string, string>([
  ['docs/cards.md', index],
  ...cards.map((card) => [`docs/cards/${card.short}.md`, cardPage(card, manifest)] as const),
  ['docs/cards.json', `${JSON.stringify(cardsData(cards, manifest), null, 2)}\n`],
  ['docs/llms.txt', llmsText(cards, sections)],
]);
const pages = new Set(cards.map((card) => `${card.short}.md`));
const strays = (await readdir(PAGES).catch(() => [] as string[])).filter(
  (name) => !pages.has(name),
);

if (check) {
  const found: string[] = [];
  for (const [path, text] of written)
    if ((await readFile(join(ROOT, path), 'utf8').catch(() => undefined)) !== text)
      found.push(`${path} is not what the code says: run pnpm docs:cards`);
  for (const name of strays)
    found.push(`docs/cards/${name} is the page of no card: run pnpm docs:cards`);
  if (found.length) {
    for (const line of found) console.error(`✗ ${line}`);
    process.exit(1);
  }
  console.log(
    `✓ the cards' docs: ${cards.length} cards, their pages, the index and the data as the code says`,
  );
} else {
  await mkdir(PAGES, { recursive: true });
  for (const [path, text] of written) await writeFile(join(ROOT, path), text);
  for (const name of strays) await rm(join(PAGES, name));
  console.log(
    `docs: ${cards.length} cards in ${sections.length} sections, their pages, cards.json and llms.txt`,
  );
}
