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

/** Where the repository is read from by an assistant: a page as plain text. */
const RAW = 'https://raw.githubusercontent.com/acosta290/fluvy/main/docs';
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

/** A key as the data says it: no group, and a default only where there is one. */
const keyData = (key: Key): Record<string, unknown> => ({
  key: key.key,
  label: key.label,
  ...(key.meaning ? { does: key.meaning } : {}),
  ...(key.helper ? { helper: key.helper } : {}),
  type: key.type,
  ...(key.required ? { required: true } : {}),
  ...('default' in key ? { default: key.default } : {}),
  ...(key.defaultWords ? { default_in_words: key.defaultWords } : {}),
  ...(key.values.length
    ? { values: Object.fromEntries(key.values.map(({ value, label }) => [value, label])) }
    : {}),
  ...(key.range ? { range: key.range } : {}),
});

/** Every card as data: what `docs/cards.json` holds. */
export function cardsData(cards: readonly CardDoc[], pictures: Manifest): unknown {
  return {
    about:
      'Fluvy’s cards as data, generated from the cards’ editors by `pnpm docs:cards`. A card is `type` plus any of its `keys`; `does` says what a key does, `label` and `helper` are the editor’s words for it, `default` what the card does when the key is left out (never written by the editor), `values` a choice’s values with the editor’s word for each. `lists` are edited item by item: an item is the `id` field alone (a bare entity id) or a map with it and any of `item`. `example` draws the pictures; `layouts` are the example with one more key each; `demo` opens the example in the live demo. Paths are relative to docs/.',
    cards: cards.map((card) => ({
      type: `custom:${card.tag}`,
      name: card.name,
      description: card.description,
      section: card.section,
      page: `cards/${card.short}.md`,
      ...(card.example
        ? {
            demo: demoOf(card.short),
            pictures: {
              light: `images/cards/${pictureName(card.short, 'light')}`,
              dark: `images/cards/${pictureName(card.short, 'dark')}`,
              ...(pictures[card.short]
                ? { width: pictures[card.short]?.width, height: pictures[card.short]?.height }
                : {}),
            },
            example: card.example.config,
          }
        : {}),
      ...(card.layout
        ? {
            layout: card.layout,
            layouts: Object.fromEntries(
              card.drawn.flatMap((one) => (one.layout ? [[one.layout, one.config]] : [])),
            ),
          }
        : {}),
      keys: card.keys.map(keyData),
      ...(card.lists.length
        ? {
            lists: card.lists.map((list) => ({
              key: list.key,
              label: list.label,
              ...(list.meaning ? { does: list.meaning } : {}),
              ...(list.helper ? { helper: list.helper } : {}),
              id: list.id,
              ...(list.sections ? { between_items: list.sections } : {}),
              item: list.item.map(keyData),
            })),
          }
        : {}),
      ...(card.reads.length
        ? {
            older_names: card.reads.map((read) => ({
              from: read.from,
              ...(read.to ? { to: read.to } : {}),
              ...(read.partly ? { some_values_only: true } : {}),
            })),
          }
        : {}),
    })),
  };
}

/** The docs as an assistant finds its way in them: what Fluvy is, where the cards' data is, a line a card. */
export function llmsText(cards: readonly CardDoc[], sections: readonly string[]): string {
  const lines = [
    '# Fluvy',
    '',
    '> Fluvy is a theme and a card library for Home Assistant, installed through HACS. Its cards are Lovelace custom cards: in YAML a card is `type: custom:fluvy-<name>-card` plus the entity or entities it draws and any option of its editor.',
    '',
    'To write a card’s configuration, read its page: it has the card’s picture, the YAML that draws the picture, a table of every key (what it does, its type, its default, its values), the fields of its lists’ items and the older names it still reads. A key left at its default is left out. The same facts for every card at once are in cards.json.',
    '',
    '## Data',
    '',
    `- [cards.json](${RAW}/cards.json): every card’s keys, what each does, types, defaults, values, the editor’s words, its example and its pictures`,
    `- [The live demo](${DEMO}): every card’s example on a simulated house, \`?card=<card>\` for one of them, with its YAML`,
    '',
    ...sections.flatMap((section) => [
      `## ${section}`,
      '',
      ...cards
        .filter((card) => card.section === section)
        .map(
          (card) =>
            `- [${card.name}](${RAW}/cards/${card.short}.md): \`custom:${card.tag}\`. ${card.description}`,
        ),
      '',
    ]),
    '## Guides',
    '',
    `- [The cards](${RAW}/cards.md): what every card shares (names, actions, colours, unavailable entities) and the longer guides`,
    `- [Getting started](${RAW}/getting-started.md): the first dashboard`,
    `- [The automatic dashboards](${RAW}/automatic-dashboard.md): the dashboards Fluvy builds from the house, and their options`,
    `- [Energy](${RAW}/energy.md): the energy cards together`,
    `- [The theme](${RAW}/theme.md): palettes, colours, a colour per card`,
    `- [The settings panel](${RAW}/settings-panel.md): the house's settings`,
    `- [Troubleshooting](${RAW}/troubleshooting.md)`,
  ];
  return `${lines.join('\n')}\n`;
}
