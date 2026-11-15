/**
 * What `docs/` says about the cards, written from what the code says (`cards.ts`): a page a card
 * (`docs/cards/<card>.md`: its picture, the YAML that draws it, a link to try it in the live demo, every key in a
 * table with what it does, its lists, its layouts, the older names it reads), the index in `docs/cards.md` (a
 * thumbnail, the name and what it is, by section), and the same as data for an assistant (`docs/cards.json`,
 * `docs/llms.txt`). Pure text from the model: `build.ts` writes it or holds the files to it.
 */
import type { CardDoc, Key, List } from './cards.js';
import { layoutKey } from './gallery.js';
import { pictureName, type Manifest, type Mode } from './pictures.js';
import { toYaml } from './yaml.js';

/** The live demo: every card's examples on the simulated house, each with its YAML. */
export const DEMO = 'https://acosta290.github.io/fluvy/';

/** A card's examples in the live demo, at one of its layouts where one is named. */
export const demoOf = (short: string, layout?: string): string =>
  `${DEMO}?card=${short}${layout ? `&layout=${encodeURIComponent(layout)}` : ''}`;

/** A section's card frame: what a picture is as wide as when nothing says otherwise (a full card and its margins). */
const FRAME = 392;
/** How wide the index draws a full card's thumbnail. */
const THUMB = 160;

/** The width a card's picture shows at: half its pixels. */
const shownWidth = (card: CardDoc, pictures: Manifest): number =>
  Math.round((pictures[card.short]?.width ?? 2 * FRAME) / 2);

/** A card's picture in the reader's theme: the dark one where GitHub is dark, `from` the page's way to `docs/`. */
function picture(card: CardDoc, from: string, width: number, alt: string): string {
  const file = (mode: Mode): string => `${from}images/cards/${pictureName(card.short, mode)}`;
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${file('dark')}"><img src="${file('light')}" width="${width}" alt="${alt}"></picture>`;
}

/** A text as a table's cell holds it: on one line, its bars escaped. */
const cell = (text: string): string => text.replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ');

/** A value as the YAML writes it, in code. */
const code = (value: unknown): string =>
  `\`${typeof value === 'string' ? value : JSON.stringify(value)}\``;

/** A sentence as it ends a cell's part: its full stop, unless it has one. */
const sentence = (text: string): string => (/[.!?…)]$/.test(text) ? text : `${text}.`);

/** What a key or a list does: the editor's word for it, the docs' sentence, then what the editor says under it. */
const does = (key: Pick<Key, 'label' | 'meaning' | 'helper'>): string =>
  [
    `*${key.label}*.`,
    ...(key.meaning ? [sentence(key.meaning)] : []),
    ...(key.helper && key.helper !== key.label ? [sentence(key.helper)] : []),
  ].join(' ');

/** What the card does when a key is left out: `required`, a value, the same in words, or nothing said. */
function defaultOf(key: Key): string {
  if (key.required) return 'required';
  if (key.defaultWords) return key.defaultWords;
  if (!('default' in key)) return '';
  const value = key.default;
  if (value === '' || value === null || value === undefined) return 'none';
  if (Array.isArray(value)) return value.length ? value.map(code).join(', ') : 'none';
  return code(value);
}

/** A choice's values, each with the editor's word where it says more than the value; a number's range. */
function valuesOf(key: Key): string {
  if (key.range) return key.range;
  return key.values
    .map(({ value, label }) => {
      const same =
        label.toLowerCase().replace(/[\s_-]+/g, '') === value.toLowerCase().replace(/[\s_-]+/g, '');
      return same ? code(value) : `${code(value)} (${label})`;
    })
    .join(', ');
}

/** The keys in tables: the form's own first, then one under the name of each folded group. */
function keyTables(keys: readonly Key[], defaults: boolean): string {
  const groups = [...new Set(keys.map((key) => key.group ?? ''))];
  const head = defaults
    ? '| Key | What it does | Type | Default | Values |\n| --- | --- | --- | --- | --- |'
    : '| Key | What it does | Type | Values |\n| --- | --- | --- | --- |';
  return groups
    .map((group) => {
      const rows = keys
        .filter((key) => (key.group ?? '') === group)
        .map((key) =>
          [
            code(key.key),
            cell(does(key)),
            key.type,
            ...(defaults ? [cell(defaultOf(key))] : []),
            cell(valuesOf(key)),
          ].join(' | '),
        )
        .map((row) => `| ${row} |`);
      return `${group ? `**${group}**\n\n` : ''}${head}\n${rows.join('\n')}`;
    })
    .join('\n\n');
}

/** A list of the card: what an item is, and the fields it may carry. */
function listSection(list: List): string {
  const between =
    list.sections === 'labels'
      ? ' Between its items, `type: section` with a `label` heads a group.'
      : list.sections
        ? ' Between its items, `type: section` with a `label` heads a group and `type: divider` draws a line.'
        : '';
  const bare =
    list.id === 'entity'
      ? 'An item is an entity id, or a map with `entity` and any of these keys.'
      : `An item is a map with \`${list.id}\` and any of these keys.`;
  return [
    `### \`${list.key}\``,
    `${does(list)} ${bare}${between}`,
    keyTables(list.item, false),
  ].join('\n\n');
}

/** A layout as the example plus its lines (the key and what it needs beside it), and the layout in the demo. */
function layoutLine(card: CardDoc, layout: string): string {
  const example = card.example;
  if (!example) return '';
  const lines = toYaml({ [layoutKey(example)]: layout, ...example.variants?.[layout]?.config });
  const cols = example.variants?.[layout]?.cols;
  const width = cols && cols < 12 ? ' (drawn at half a section)' : '';
  return `| ${code(layout)} | ${lines
    .split('\n')
    .map((line) => `\`${line}\``)
    .join('<br>')}${width} | [Try it](${demoOf(card.short, layout)}) |`;
}

/** What links a card's page to the guide written by hand in `docs/cards.md`, by the card's tag: the heading's anchor. */
export const GUIDES: Readonly<Record<string, readonly [words: string, anchor: string]>> = {
  'fluvy-thermostat-card': ['Thermostat', 'thermostat'],
  'fluvy-media-card': ['Media', 'media'],
  'fluvy-now-playing-card': ['Media', 'media'],
  'fluvy-remote-card': ['TV remote', 'tv-remote'],
  'fluvy-vacuum-card': ['Vacuum', 'vacuum'],
  'fluvy-chips-card': ['Chips', 'chips'],
  'fluvy-template-card': ['Template', 'template'],
  'fluvy-automations-card': ['Schedules', 'schedules'],
  'fluvy-appliance-card': ['Appliances', 'appliances'],
  'fluvy-appliances-card': ['Appliances', 'appliances'],
  'fluvy-cameras-card': ['Cameras', 'cameras'],
  'fluvy-alerts-card': ['Alerts', 'alerts'],
  'fluvy-items-card': ['Items', 'items'],
  'fluvy-web-card': ['Web page', 'web-page'],
  'fluvy-expander-card': ['Expander', 'expander'],
  'fluvy-chart-card': ['Chart', 'chart'],
  'fluvy-energy-usage-card': ['Energy usage', 'energy-usage'],
  'fluvy-slider-card': ['Slider', 'slider'],
  'fluvy-helpers-card': ['Helpers', 'helpers'],
  'fluvy-openings-card': ['Openings', 'openings'],
  'fluvy-calendar-card': ['Calendar', 'calendar'],
  'fluvy-room-card': ['Rooms', 'rooms'],
  'fluvy-vehicle-card': ['Vehicle', 'vehicle'],
};

/** A heading as GitHub anchors it: lower case, its spaces hyphens, nothing but letters, digits and hyphens. */
export const anchorOf = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replaceAll(' ', '-');

const GENERATED =
  '<!-- Generated by `pnpm docs:cards` from the card’s editor and its example in tools/docs/src/gallery.ts: change those, not this page. -->';

/** A card's page. */
export function cardPage(card: CardDoc, pictures: Manifest): string {
  const example = card.example;
  const guide = GUIDES[card.tag];
  const parts = [
    GENERATED,
    `# ${card.name}`,
    `\`custom:${card.tag}\` · [All cards](../cards.md#${anchorOf(card.section)})${example ? ` · [Try it live](${demoOf(card.short)})` : ''}`,
    card.description,
  ];
  if (example)
    parts.push(
      picture(
        card,
        '../',
        shownWidth(card, pictures),
        `The ${card.name} card, drawn from the configuration below`,
      ),
      `\`\`\`yaml\n${toYaml(example.config)}\n\`\`\``,
      `The picture is this configuration on the demo house, whose names and figures are made up: put your own entities in place of its. [Try it in the live demo](${demoOf(card.short)}), where it answers a tap as it would at home, with each of its layouts and the YAML of each.`,
    );
  if (guide) parts.push(`More about it in the guide: [${guide[0]}](../cards.md#${guide[1]}).`);

  const layout = card.layout;
  const others = card.drawn.flatMap((one) => (one.layout ? [one.layout] : []));
  if (layout && example && others.length) {
    const own = example.own ?? layout.default;
    const why = example.own
      ? 'the one the card takes by itself for this example'
      : 'the one the card has when the key is left out';
    parts.push(
      '## Layouts',
      `\`${layout.key}\` chooses the layout. The picture is ${code(own)}, ${why}; each of the others is the example plus these lines.`,
      `| \`${layout.key}\` | Add to the example | Live |\n| --- | --- | --- |\n${others.map((value) => layoutLine(card, value)).join('\n')}`,
    );
  }

  parts.push(
    '## Options',
    'Every key the card’s editor shows: the editor’s word for it in italics, then what it does. *Default* is what the card does when the key is left out, as the editor shows it on a new card; the editor never writes a default into the configuration.',
    keyTables(
      [
        ...card.keys,
        ...card.lists.map((list): Key => ({
          key: list.key,
          label: list.label,
          ...(list.meaning ? { meaning: list.meaning } : {}),
          ...(list.helper ? { helper: list.helper } : {}),
          type: `list ([its items](#${list.key}))`,
          required: false,
          values: [],
        })),
      ],
      true,
    ),
  );
  if (card.lists.length) parts.push('## Lists', ...card.lists.map(listSection));
  if (card.reads.length)
    parts.push(
      '## Older names',
      'Names the card still reads, so a dashboard written before keeps working. They are read, never written back.',
      `| Older name | Read as |\n| --- | --- |\n${card.reads
        .map(
          (read) =>
            `| ${code(read.from)} | ${read.to ? `${code(read.to)}${read.partly ? ' (some of its values)' : ''}` : 'folded into the keys above'} |`,
        )
        .join('\n')}`,
    );
  return `${parts.join('\n\n')}\n`;
}

/** The index: every card by section, a thumbnail in the reader's theme, its name and type, what it is. */
export function indexBlock(
  cards: readonly CardDoc[],
  sections: readonly string[],
  pictures: Manifest,
): string {
  const lead = `Every card with its picture, in light or dark as your GitHub is. A card’s page has the YAML of its picture and every key it takes with what it does; [the live demo](${DEMO}) has each one to try.`;
  const tables = sections.map((section) => {
    const rows = cards
      .filter((card) => card.section === section)
      .map((card) => {
        const page = `cards/${card.short}.md`;
        const thumb = Math.round((shownWidth(card, pictures) * THUMB) / FRAME);
        const live = card.example ? `<br>[Try it live](${demoOf(card.short)})` : '';
        return `| <a href="${page}">${picture(card, '', thumb, '')}</a> | [**${card.name}**](${page})<br>\`custom:${card.tag}\`${live} | ${cell(card.description)} |`;
      });
    return `## ${section}\n\n| | Card | What it is |\n| --- | --- | --- |\n${rows.join('\n')}`;
  });
  return [lead, ...tables].join('\n\n');
}
