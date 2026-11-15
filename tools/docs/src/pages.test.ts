import { describe, expect, it } from 'vitest';
import type { CardDoc, Key } from './cards.js';
import { drawn, type Example } from './gallery.js';
import { cardPage, demoOf } from './pages.js';

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
    expect(page).toContain('### `readouts`');
    expect(page).toContain('| `layout` | `variant` |');
  });
});
