// @vitest-environment happy-dom
import type { HomeAssistant, LovelaceCardConfig } from '@fluvy/core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';
import { FluvyRoomCard } from '../room/room-card.js';
import {
  cardForm,
  drawEditor,
  listTitles,
  nextConfig,
  shownNames,
  type FormStub,
} from '../shared/fixtures/editor.js';
import { readoutWidths, stateLineWidths } from '../shared/fixtures/widths.js';
import type { FluvyRowsEditor } from '../shared/rows-editor.js';
import { FluvyTilesCard } from '../tiles/tiles-card.js';
import { FluvyTileCard } from './tile-card.js';

// the index fetches the lazy families: they land before this file's page goes
afterAll(() => familiesDefined);

/**
 * A small tile's readouts (#197): its line says the first after its state, as it always did, or every one that can be
 * read where its card asks (`line_readouts: all`), the last giving way first; a readout may be a sensor with a name,
 * a unit and decimals of its own, as the Grid card's are; and a compact tile may stand them at its row's end as
 * columns under their labels (`readouts_layout: end`), as many as it holds, the rest on its line. Its height never
 * changes, and nothing changes where the config asks for none of it.
 */

const STAMP = '2026-09-17T19:00:00+00:00';
const state = (id: string, value: string, attributes: Record<string, unknown> = {}) => ({
  entity_id: id,
  state: value,
  attributes,
  last_changed: STAMP,
  last_updated: STAMP,
});
const sensor = (id: string, value: string, name: string, unit: string, kind?: string) =>
  state(id, value, {
    friendly_name: name,
    unit_of_measurement: unit,
    ...(kind ? { device_class: kind } : {}),
  });

const LIVE = {
  'switch.washer': state('switch.washer', 'on', { friendly_name: 'Washing machine' }),
  'sensor.washer_power': sensor(
    'sensor.washer_power',
    '142',
    'Washing machine power',
    'W',
    'power',
  ),
  'sensor.washer_energy': sensor(
    'sensor.washer_energy',
    '0.8',
    'Washing machine energy',
    'kWh',
    'energy',
  ),
  'sensor.washer_drum': sensor(
    'sensor.washer_drum',
    '40',
    'Washing machine drum',
    '°C',
    'temperature',
  ),
  'light.desk': state('light.desk', 'on', {
    friendly_name: 'Desk lamp',
    brightness: 128,
    supported_color_modes: ['brightness'],
  }),
  'switch.nas': state('switch.nas', 'on', { friendly_name: 'NAS' }),
  'sensor.nas_cpu': sensor('sensor.nas_cpu', '55', 'NAS CPU temperature', '°C', 'temperature'),
  'sensor.nas_disk': sensor('sensor.nas_disk', '41', 'NAS disk temperature', '°C', 'temperature'),
  'switch.heater': state('switch.heater', 'on', { friendly_name: 'Heater' }),
  'sensor.heater_power': sensor('sensor.heater_power', '1840', 'Heater power', 'W', 'power'),
  'sensor.heater_energy': sensor('sensor.heater_energy', '6.4', 'Heater energy', 'kWh', 'energy'),
  'sensor.gone': state('sensor.gone', 'unavailable', {
    friendly_name: 'Washing machine power',
    unit_of_measurement: 'W',
    device_class: 'power',
  }),
};
/** The same house where nothing can be read, each keeping its name and its unit, as Home Assistant keeps them. */
const DEAD = Object.fromEntries(
  Object.entries(LIVE).map(([id, s]) => [
    id,
    { ...s, state: 'unavailable', attributes: { ...s.attributes, brightness: undefined } },
  ]),
);

const house = (states: Record<string, unknown> = LIVE): HomeAssistant =>
  ({
    language: 'en',
    locale: { language: 'en', number_format: 'language', time_format: '24' },
    states,
    entities: Object.fromEntries(
      Object.keys(LIVE).map((id) => [id, { entity_id: id, area_id: 'utility', device_id: null }]),
    ),
    devices: {},
    areas: { utility: { area_id: 'utility', name: 'Utility room', picture: null, icon: null } },
    user: { id: 'u', is_admin: true },
    config: { unit_system: { temperature: '°C', length: 'km' } },
    localize: (key: string) => key,
    formatEntityState: (s: { state: string }) => s.state,
    hassUrl: (path: string) => path,
    callService: () => Promise.resolve(),
  }) as unknown as HomeAssistant;

type CardElement = HTMLElement & {
  setConfig(config: LovelaceCardConfig): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
};

/** The card's tiles as drawn at `width`. */
async function drawn(
  config: Record<string, unknown>,
  width = 360,
  states: Record<string, unknown> = LIVE,
): Promise<HTMLElement[]> {
  const type = String(config['type'] ?? 'custom:fluvy-tile-card');
  const card = document.createElement(type.replace('custom:', '')) as CardElement;
  card.setConfig({ type, ...config } as LovelaceCardConfig);
  card.hass = house(states);
  (card as unknown as { width: number }).width = width;
  document.body.append(card);
  await card.updateComplete;
  return [...card.shadowRoot!.querySelectorAll<HTMLElement>('.fv-tile')];
}

const line = (tile: HTMLElement): string =>
  tile.querySelector('.fv-tile__state')?.textContent?.trim() ?? '';
/**
 * A tile's readouts under their labels (a large tile's foot, a compact one's columns at its end): each one's label,
 * and its figure with its unit as they read ("142 W").
 */
const cells = (tile: HTMLElement, where: string): string[][] =>
  [...tile.querySelectorAll(`${where} .fv-readout`)].map((cell) => [
    cell.querySelector('.fv-readout__label')?.textContent?.trim() ?? '',
    [...(cell.querySelector('.fv-readout__value')?.children ?? [])]
      .map((part) => part.textContent?.trim())
      .filter(Boolean)
      .join(' '),
  ]);
const lineOf = async (config: Record<string, unknown>, width?: number): Promise<string> =>
  line((await drawn(config, width))[0]!);

const WASHER = ['sensor.washer_power', 'sensor.washer_energy', 'sensor.washer_drum'];
const washer = (more: Record<string, unknown> = {}) => ({
  entity: 'switch.washer',
  size: 'compact',
  readouts: WASHER,
  ...more,
});

describe('a small tile’s line says its first readout, or every one where asked (`line_readouts`, #197)', () => {
  afterEach(() => document.body.replaceChildren());

  it('the first alone, as it always did, compact or mini', async () => {
    expect(await lineOf(washer())).toBe('On · 142 W');
    expect(await lineOf(washer({ line_readouts: 'first' }))).toBe('On · 142 W');
    expect(await lineOf(washer({ size: 'mini' }))).toBe('On · 142 W');
  });

  it('every one in their order after the state and the level, compact or mini', async () => {
    expect(await lineOf(washer({ line_readouts: 'all' }))).toBe('On · 142 W · 0.8 kWh · 40 °C');
    expect(await lineOf(washer({ size: 'mini', line_readouts: 'all' }))).toBe(
      'On · 142 W · 0.8 kWh · 40 °C',
    );
    const lamp = { entity: 'light.desk', size: 'compact', line_readouts: 'all' };
    expect(await lineOf({ ...lamp, readouts: WASHER.slice(0, 2) })).toBe(
      'On · 50 % · 142 W · 0.8 kWh',
    );
  });

  it('a reading that cannot be read is left out; a tile that cannot be read says none', async () => {
    const readouts = ['sensor.gone', 'sensor.washer_energy'];
    expect(await lineOf(washer({ readouts, line_readouts: 'all' }))).toBe('On · 0.8 kWh');
    const [dead] = await drawn(washer({ line_readouts: 'all' }), 360, DEAD);
    expect(line(dead!)).toBe('Unavailable');
  });

  it('a group says it for its tiles, a room for its own', async () => {
    const tiles = [
      { entity: 'switch.washer', readouts: WASHER.slice(0, 2) },
      { entity: 'switch.heater', readouts: ['sensor.heater_power'] },
    ];
    const group = await drawn({ type: 'custom:fluvy-tiles-card', line_readouts: 'all', tiles });
    expect(group.map(line)).toEqual(['On · 142 W · 0.8 kWh', 'On · 1.84 kW']);
    expect((await drawn({ type: 'custom:fluvy-tiles-card', tiles })).map(line)).toEqual([
      'On · 142 W',
      'On · 1.84 kW',
    ]);
    const room = await drawn({
      type: 'custom:fluvy-room-card',
      area: 'utility',
      variant: 'tile',
      controls: 'tiles',
      line_readouts: 'all',
      tiles,
    });
    expect(room.map(line)).toEqual(['On · 142 W · 0.8 kWh', 'On · 1.84 kW']);
    expect(customElements.get('fluvy-room-card')).toBe(FluvyRoomCard);
  });

  describe('as wide as the tile is', () => {
    let restore: () => void;
    beforeAll(() => {
      restore = stateLineWidths();
    });
    afterAll(() => restore());

    it('the last gives way first, each reading whole or not at all', async () => {
      const all = washer({ line_readouts: 'all' });
      // a compact tile's words have its width less its 16 sides and its circle's 56
      expect(await lineOf(all, 360)).toBe('On · 142 W · 0.8 kWh · 40 °C');
      expect(await lineOf(all, 260)).toBe('On · 142 W · 0.8 kWh');
      expect(await lineOf(all, 200)).toBe('On · 142 W');
    });
  });
});

describe('a readout says what it is of its own: a name, a unit, decimals (#197)', () => {
  afterEach(() => document.body.replaceChildren());

  const NAS = [
    { entity: 'sensor.nas_cpu', name: 'CPU' },
    { entity: 'sensor.nas_disk', name: 'Disk' },
  ];

  it('its name before its figure on a line, and over it in a large tile’s foot', async () => {
    expect(
      await lineOf({ entity: 'switch.nas', size: 'compact', readouts: NAS, line_readouts: 'all' }),
    ).toBe('On · CPU 55 °C · Disk 41 °C');
    const [large] = await drawn({ entity: 'switch.nas', readouts: NAS });
    expect(cells(large!, '.fv-tile__foot')).toEqual([
      ['CPU', '55 °C'],
      ['Disk', '41 °C'],
    ]);
    // a name is the person's: it may end in an ellipsis, where a measure's word never does
    expect(
      [...large!.querySelectorAll('.fv-tile__foot .fv-readout__label')].map((label) =>
        label.hasAttribute('data-name'),
      ),
    ).toEqual([true, true]);
  });

  it('the unit and the decimals its figure reads in', async () => {
    const readouts = [
      { entity: 'sensor.heater_power', unit: 'kW', decimals: 2 },
      { entity: 'sensor.heater_energy', decimals: '0' },
    ];
    expect(
      await lineOf({ entity: 'switch.heater', size: 'compact', readouts, line_readouts: 'all' }),
    ).toBe('On · 1.84 kW · 6 kWh');
    const [large] = await drawn({ entity: 'switch.heater', readouts });
    expect(cells(large!, '.fv-tile__foot')).toEqual([
      ['Power', '1.84 kW'],
      ['Today', '6 kWh'],
    ]);
  });

  it('a bare id reads as it did: its measure’s word, else its sensor’s name beyond the tile’s', async () => {
    const [large] = await drawn({
      entity: 'switch.washer',
      readouts: ['sensor.washer_power', 'sensor.washer_drum'],
    });
    expect(cells(large!, '.fv-tile__foot')).toEqual([
      ['Power', '142 W'],
      ['drum', '40 °C'],
    ]);
    expect(
      [...large!.querySelectorAll('.fv-tile__foot .fv-readout__label')].map((label) =>
        label.hasAttribute('data-name'),
      ),
    ).toEqual([false, true]);
  });
});

describe('a compact tile’s readouts at its row’s end (`readouts_layout: end`, #197)', () => {
  let restore: () => void;
  beforeAll(() => {
    restore = readoutWidths();
  });
  afterAll(() => restore());
  afterEach(() => document.body.replaceChildren());

  const END = washer({ readouts_layout: 'end' });
  const at = async (width: number, states?: Record<string, unknown>) => {
    const [tile] = await drawn(END, width, states);
    return { line: line(tile!), columns: cells(tile!, '.fv-tile__end') };
  };

  it('as many as hold whole beside the name and the line, from the first; the rest on the line', async () => {
    // a column is as wide as its label or its figure, 16 from the next; the words keep the name's 96 and the state
    expect(await at(360)).toEqual({
      line: 'On',
      columns: [
        ['Power', '142 W'],
        ['Today', '0.8 kWh'],
        ['drum', '40 °C'],
      ],
    });
    expect(await at(300)).toEqual({
      line: 'On · 40 °C',
      columns: [
        ['Power', '142 W'],
        ['Today', '0.8 kWh'],
      ],
    });
    // too narrow for the first: every reading is the line's, the last giving way first
    expect(await at(200)).toEqual({ line: 'On · 142 W', columns: [] });
  });

  it('out of reach the columns keep their places, each a dash', async () => {
    const { line: said, columns } = await at(360, DEAD);
    expect(said).toBe('Unavailable');
    expect(columns.map(([label, value]) => [label, value])).toEqual([
      ['Power', '—'],
      ['Today', '—'],
      ['drum', '—'],
    ]);
  });

  it('a mini tile and a large one keep theirs: the line, the foot', async () => {
    const [mini] = await drawn({ ...END, size: 'mini' });
    expect(mini!.querySelector('.fv-tile__end')).toBeNull();
    expect(line(mini!)).toBe('On · 142 W');
    const [large] = await drawn({ ...END, size: 'large' });
    expect(large!.querySelector('.fv-tile__end')).toBeNull();
    expect(cells(large!, '.fv-tile__foot').length).toBeGreaterThan(0);
  });
});

describe('a tile’s height is its config’s, whatever its readouts say (#197)', () => {
  it.each(['compact', 'mini', 'large'] as const)('%s', (size) => {
    const plain = { type: 'custom:fluvy-tile-card', entity: 'switch.washer', size };
    const asked = {
      ...plain,
      readouts: WASHER,
      line_readouts: 'all',
      readouts_layout: 'end',
    } as const;
    expect(FluvyTileCard.layoutHeight(asked)).toBe(FluvyTileCard.layoutHeight(plain));
    const group = { type: 'custom:fluvy-tiles-card', size, tiles: [{ entity: 'switch.washer' }] };
    expect(
      FluvyTilesCard.layoutHeight({
        ...group,
        line_readouts: 'all',
        readouts_layout: 'end',
        tiles: [{ entity: 'switch.washer', readouts: WASHER }],
      }),
    ).toBe(FluvyTilesCard.layoutHeight(group));
  });
});

describe('the editors offer each where it acts (#197)', () => {
  afterEach(() => document.body.replaceChildren());

  const editorOf = async (
    card: { getConfigElement(): Promise<HTMLElement> },
    config: Record<string, unknown>,
  ): Promise<FluvyRowsEditor> => {
    const editor = await card.getConfigElement();
    (editor as HTMLElement & { hass: HomeAssistant }).hass = house();
    return drawEditor(editor, config as LovelaceCardConfig);
  };
  /** The fields drawn over a list's items: the tile's own, over its readouts. */
  const head = (editor: FluvyRowsEditor): string[] =>
    shownNames(editor.shadowRoot!.querySelector<FormStub>('.list__fields')?.schema ?? []);
  const items = (editor: FluvyRowsEditor): FormStub[] => [
    ...editor.shadowRoot!.querySelectorAll<FormStub>('.item ha-form'),
  ];
  const tile = (more: Record<string, unknown>) =>
    editorOf(FluvyTileCard, { type: 'custom:fluvy-tile-card', entity: 'switch.washer', ...more });

  it('the tile’s readouts item by item, and over them how they stand: the end on a compact tile, the line’s with two or more', async () => {
    const two = WASHER.slice(0, 2);
    expect(listTitles(await tile({ size: 'compact', readouts: two }))).toEqual(['Readouts']);
    expect(head(await tile({ size: 'compact', readouts: two }))).toEqual([
      'readouts_layout',
      'line_readouts',
    ]);
    expect(head(await tile({ size: 'compact', readouts: two.slice(0, 1) }))).toEqual([
      'readouts_layout',
    ]);
    // at the end, the line says what the end does not hold: nothing to choose there
    expect(head(await tile({ size: 'compact', readouts: two, readouts_layout: 'end' }))).toEqual([
      'readouts_layout',
    ]);
    expect(head(await tile({ size: 'mini', readouts: two }))).toEqual(['line_readouts']);
    expect(head(await tile({ size: 'mini', readouts: two.slice(0, 1) }))).toEqual([]);
    // a large tile's foot draws them: neither
    expect(head(await tile({ readouts: two }))).toEqual([]);
    // nor are they in the tile's own form
    const form = shownNames(cardForm(await tile({ size: 'compact', readouts: two })).schema);
    expect(form).not.toContain('readouts');
    expect(form).not.toContain('line_readouts');
  });

  it('each readout with its name, its unit and its decimals, and one with nothing of its own goes back as its id', async () => {
    const editor = await tile({
      size: 'compact',
      readouts: ['sensor.washer_power', { entity: 'sensor.nas_cpu', name: 'CPU', decimals: 1 }],
    });
    const [power, cpu] = items(editor);
    expect(shownNames(power!.schema)).toEqual(['entity', 'name', 'unit', 'decimals']);
    // a power's figure in the units of its class, a temperature's in none
    const units = (form: FormStub): unknown =>
      (
        form.schema
          .flatMap((field) => field.schema ?? [field])
          .find((field) => field.name === 'unit')?.selector?.['select'] as {
          options: { value: string }[];
        }
      ).options.map(({ value }) => value);
    expect(units(power!)).toEqual(['auto', 'W', 'kW', 'MW']);
    expect(units(cpu!)).toEqual(['auto']);
    let next = nextConfig(editor);
    power!.change('name', 'Now');
    expect((await next)['readouts']).toEqual([
      { entity: 'sensor.washer_power', name: 'Now' },
      { entity: 'sensor.nas_cpu', name: 'CPU', decimals: 1 },
    ]);
    await editor.updateComplete;
    next = nextConfig(editor);
    items(editor)[0]!.change('name', '');
    expect((await next)['readouts']).toEqual([
      'sensor.washer_power',
      { entity: 'sensor.nas_cpu', name: 'CPU', decimals: 1 },
    ]);
  });

  it('a group’s and a room’s by the most readouts one of its tiles has; a group has no readouts of its own', async () => {
    const group = (tiles: unknown[], more: Record<string, unknown> = {}) =>
      editorOf(FluvyTilesCard, { type: 'custom:fluvy-tiles-card', tiles, ...more });
    const shown = async (editor: Promise<FluvyRowsEditor>): Promise<string[]> =>
      shownNames(cardForm(await editor).schema).filter((name) => name.includes('readouts'));
    expect(await shown(group(['switch.washer']))).toEqual([]);
    expect(
      await shown(group(['switch.heater', { entity: 'switch.washer', readouts: WASHER }])),
    ).toEqual(['readouts_layout', 'line_readouts']);
    expect(
      await shown(group([{ entity: 'switch.washer', readouts: WASHER }], { size: 'mini' })),
    ).toEqual(['line_readouts']);
    const room = (more: Record<string, unknown>) =>
      editorOf(FluvyRoomCard, {
        type: 'custom:fluvy-room-card',
        area: 'utility',
        tiles: [{ entity: 'switch.washer', readouts: WASHER.slice(0, 1) }],
        ...more,
      });
    expect(await shown(room({ controls: 'tiles' }))).toEqual(['readouts_layout']);
    expect(await shown(room({ controls: 'rows' }))).toEqual([]);
  });

  it('a group’s tile edits its readouts as a list of objects, each sensor alone back as its id', async () => {
    const editor = await editorOf(FluvyTilesCard, {
      type: 'custom:fluvy-tiles-card',
      tiles: [
        {
          entity: 'switch.nas',
          readouts: ['sensor.nas_cpu', { entity: 'sensor.nas_disk', name: 'Disk', decimals: 1 }],
        },
      ],
    });
    const [nas] = items(editor);
    // the dialog's select reads the YAML's number as its word
    expect(nas!.data['readouts']).toEqual([
      { entity: 'sensor.nas_cpu' },
      { entity: 'sensor.nas_disk', name: 'Disk', decimals: '1' },
    ]);
    const next = nextConfig(editor);
    nas!.change('readouts', [
      { entity: 'sensor.nas_disk', name: '', unit: 'auto', decimals: 'auto' },
      { entity: 'sensor.nas_cpu', name: 'CPU' },
    ]);
    expect((await next)['tiles']).toEqual([
      {
        entity: 'switch.nas',
        readouts: ['sensor.nas_disk', { entity: 'sensor.nas_cpu', name: 'CPU' }],
      },
    ]);
  });
});
