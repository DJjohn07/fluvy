import { describe, expect, it } from 'vitest';
import type { CardDoc, Key } from './cards.js';
import { checkDefaults, checkGallery, checkMeanings, checkPictures } from './checks.js';
import { drawn, mounted, type Example } from './gallery.js';
import { cardPage, demoOf } from './pages.js';
import { digest, type Manifest } from './pictures.js';

const key = (over: Partial<Key> & { readonly key: string }): Key => ({
  label: over.key,
  type: 'text',
  required: false,
  values: [],
  meaning: `What ${over.key} does.`,
  meaningOf: over.key,
  ...over,
});

const EXAMPLE: Example = {
  config: { type: 'custom:fluvy-lamp-card', entity: 'light.desk', name: 'Desk lamp' },
  variants: { compact: {} },
};

/** A card of the docs' model: a lamp with a layout select, a switch, a name and a list of readouts. */
function lamp(example: Example | undefined = EXAMPLE): CardDoc {
  return {
    tag: 'fluvy-lamp-card',
    short: 'lamp',
    name: 'Lamp',
    description: 'A lamp and its readouts.',
    section: 'Everyday',
    keys: [
      key({ key: 'entity', label: 'Entity', type: 'entity (light)', required: true }),
      key({ key: 'name', label: 'Name', helper: 'Your own words' }),
      key({
        key: 'variant',
        label: 'Style',
        type: 'choice',
        default: 'full',
        values: [
          { value: 'full', label: 'Full' },
          { value: 'compact', label: 'Compact' },
        ],
      }),
      key({ key: 'show_icon', label: 'Show the icon', type: 'boolean', default: true }),
    ],
    lists: [
      {
        key: 'readouts',
        label: 'Readouts',
        meaning: 'The readouts under the lamp.',
        meaningOf: 'readouts[]',
        id: 'entity',
        item: [key({ key: 'entity', meaningOf: '[].entity' }), key({ key: 'unit' })],
      },
    ],
    reads: [{ from: 'layout', to: 'variant', partly: false }],
    layout: { key: 'variant', values: ['full', 'compact'], default: 'full' },
    ...(example ? { example } : {}),
    drawn: example ? drawn('fluvy-lamp-card', example) : [],
    known: new Set(['type', 'entity', 'name', 'variant', 'show_icon', 'readouts']),
    normalise: ({ layout, ...config }) => (layout ? { ...config, variant: layout } : config),
  };
}

const gallery = (config: Record<string, unknown>, more: Partial<Example> = {}) => ({
  'fluvy-lamp-card': { ...EXAMPLE, ...more, config: { ...EXAMPLE.config, ...config } },
});

describe('the gallery held to the cards', () => {
  it('takes an example a person could have written, with a line for every other layout', () => {
    expect(checkGallery([lamp()], gallery({ readouts: ['sensor.desk_power'] }))).toEqual([]);
  });

  it('names a card without an example, and an example of no card', () => {
    expect(checkGallery([lamp()], {})).toEqual([
      'fluvy-lamp-card: no example in tools/docs/src/gallery.ts',
    ]);
    expect(checkGallery([], gallery({}))).toEqual([
      'fluvy-lamp-card: an example for a card the catalogue does not have',
    ]);
  });

  it('refuses an older name, a test hook, a key of no editor and a default written out', () => {
    const found = checkGallery(
      [lamp()],
      gallery({ layout: 'full', _now: '2026-09-17T19:50:00Z', colour: 'red', show_icon: true }),
    );
    expect(found).toEqual([
      'fluvy-lamp-card: `layout` is an older name: write the one it is read as',
      "fluvy-lamp-card: `_now` is a test's hook, not a key",
      'fluvy-lamp-card: `colour` is no key of its editor',
      "fluvy-lamp-card: `show_icon: true` is the card's default: leave it out",
    ]);
  });

  it('holds a list’s items to the fields its editor shows', () => {
    expect(
      checkGallery(
        [lamp()],
        gallery({ readouts: [{ entity: 'sensor.desk_power', label: 'Power' }] }),
      ),
    ).toEqual(['fluvy-lamp-card: readouts[0].label is no field of its items']);
  });

  it('wants a line for every value of the layout select, and none for the base’s', () => {
    expect(checkGallery([lamp()], gallery({}, { variants: {} }))).toEqual([
      'fluvy-lamp-card: no example for `variant: compact`',
    ]);
    expect(checkGallery([lamp()], gallery({}, { variants: { full: {}, compact: {} } }))).toEqual([
      'fluvy-lamp-card: an example for `variant: full`, which is the base',
    ]);
    expect(checkGallery([lamp()], gallery({ variant: 'compact' }))).toEqual([
      "fluvy-lamp-card: its example names `variant`: the base is the card's own layout",
    ]);
  });
});

describe('the pictures held to the gallery', () => {
  const card = lamp();
  const [base] = card.drawn;
  const manifest: Manifest = {
    lamp: { example: digest(mounted(base as NonNullable<typeof base>)), width: 784, height: 400 },
  };

  it('takes a picture in light and in dark of the example as it stands', () => {
    expect(checkPictures([card], ['lamp-light.webp', 'lamp-dark.webp'], manifest)).toEqual([]);
  });

  it('names a missing picture, one of another example and one of no card, and says how to take them', () => {
    expect(
      checkPictures([card], ['lamp-light.webp', 'kettle-light.webp'], {
        lamp: { example: 'a0b1c2d3e4f5', width: 784, height: 400 },
      }),
    ).toEqual([
      'docs/images/cards/lamp-dark.webp is missing',
      "fluvy-lamp-card: its picture is of another example than the gallery's",
      'docs/images/cards/kettle-light.webp is the picture of no card',
      'run `pnpm docs:images` (the playground running) for the pictures',
    ]);
  });
});

describe('what the docs say of every key', () => {
  it('wants every select and switch to say what the card does without it', () => {
    const card = lamp();
    const silent = { ...card, keys: [...card.keys, key({ key: 'look', type: 'choice' })] };
    expect(checkDefaults([card])).toEqual([]);
    expect(checkDefaults([silent])).toEqual([
      "fluvy-lamp-card: `look` declares no default: say it in the card's `defaults`, or in words in UNDECLARED (tools/docs/src/cards.ts)",
    ]);
  });

  it('wants a sentence for every key, every list and every field, and no sentence of no key', () => {
    const card = lamp();
    const meanings = Object.fromEntries(
      [...card.keys, ...card.lists, ...card.lists.flatMap((list) => list.item)].map((one) => [
        one.meaningOf,
        'said',
      ]),
    );
    expect(checkMeanings([card], meanings)).toEqual([]);
    const glow: Key = { key: 'glow', label: 'Glow', type: 'boolean', required: false, values: [] };
    const mute = { ...card, keys: [...card.keys, glow] };
    expect(checkMeanings([mute], { ...meanings, 'lamp.halo': 'said' })).toEqual([
      'fluvy-lamp-card: `glow` does not say what it does: write its sentence in MEANINGS (tools/docs/src/meanings.ts)',
      'MEANINGS: `lamp.halo` is read by no key: take it away',
    ]);
  });
});

describe('a card’s page', () => {
  const page = cardPage(lamp(), { lamp: { example: '', width: 784, height: 400 } });

  it('shows the picture in the reader’s theme, the YAML that draws it and the way to try it', () => {
    expect(page).toContain(
      '<picture><source media="(prefers-color-scheme: dark)" srcset="../images/cards/lamp-dark.webp"><img src="../images/cards/lamp-light.webp" width="392"',
    );
    expect(page).toContain(
      '```yaml\ntype: custom:fluvy-lamp-card\nentity: light.desk\nname: Desk lamp\n```',
    );
    expect(page).toContain(`[Try it live](${demoOf('lamp')})`);
    expect(page).toContain(
      '| `compact` | `variant: compact` | [Try it](https://acosta290.github.io/fluvy/?card=lamp&layout=compact) |',
    );
  });

  it('says of every key the editor’s word, what it does and what the editor adds, its default and its values', () => {
    expect(page).toContain('| `name` | *Name*. What name does. Your own words. | text |  |  |');
    expect(page).toContain(
      '| `variant` | *Style*. What variant does. | choice | `full` | `full`, `compact` |',
    );
    expect(page).toContain(
      '| `entity` | *Entity*. What entity does. | entity (light) | required |  |',
    );
    expect(page).toContain(
      '| `readouts` | *Readouts*. The readouts under the lamp. | list ([its items](#readouts)) |',
    );
    expect(page).toContain('### `readouts`');
    expect(page).toContain('| `layout` | `variant` |');
  });
});
