// @vitest-environment happy-dom
import type { HomeAssistant, LovelaceCardConfig } from '@fluvy/core';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';
import {
  cardForm,
  drawEditor,
  listTitles,
  nextConfig,
  shownNames,
  type FormStub,
} from '../shared/fixtures/editor.js';
import type { FluvyRowsEditor } from '../shared/rows-editor.js';
import { FluvyTilesCard } from '../tiles/tiles-card.js';
import { FluvyTileCard } from './tile-card.js';

// the index fetches the lazy families: they land before this file's page goes
afterAll(() => familiesDefined);

/**
 * A tile's readouts (#197) may each be a sensor with a name, a unit and decimals of its own, as the Grid card's are:
 * its name before its figure on a small tile's line and over it in a large tile's foot, its figure in the unit and the
 * decimals it asks for; a bare id reads as it always did. The editors list them item by item.
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
  'switch.nas': state('switch.nas', 'on', { friendly_name: 'NAS' }),
  'sensor.nas_cpu': sensor('sensor.nas_cpu', '55', 'NAS CPU temperature', '°C', 'temperature'),
  'sensor.nas_disk': sensor('sensor.nas_disk', '41', 'NAS disk temperature', '°C', 'temperature'),
  'switch.heater': state('switch.heater', 'on', { friendly_name: 'Heater' }),
  'sensor.heater_power': sensor('sensor.heater_power', '1840', 'Heater power', 'W', 'power'),
  'sensor.heater_energy': sensor('sensor.heater_energy', '6.4', 'Heater energy', 'kWh', 'energy'),
};

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

describe('a readout says what it is of its own: a name, a unit, decimals (#197)', () => {
  afterEach(() => document.body.replaceChildren());

  const NAS = [
    { entity: 'sensor.nas_cpu', name: 'CPU' },
    { entity: 'sensor.nas_disk', name: 'Disk' },
  ];

  it('its name before its figure on a line, and over it in a large tile’s foot', async () => {
    expect(await lineOf({ entity: 'switch.nas', size: 'compact', readouts: NAS })).toBe(
      'On · CPU 55 °C',
    );
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
    expect(await lineOf({ entity: 'switch.heater', size: 'compact', readouts })).toBe(
      'On · 1.84 kW',
    );
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

describe('the editors list a tile’s readouts one by one (#197)', () => {
  afterEach(() => document.body.replaceChildren());

  const editorOf = async (
    card: { getConfigElement(): Promise<HTMLElement> },
    config: Record<string, unknown>,
  ): Promise<FluvyRowsEditor> => {
    const editor = await card.getConfigElement();
    (editor as HTMLElement & { hass: HomeAssistant }).hass = house();
    return drawEditor(editor, config as LovelaceCardConfig);
  };
  const items = (editor: FluvyRowsEditor): FormStub[] => [
    ...editor.shadowRoot!.querySelectorAll<FormStub>('.item ha-form'),
  ];
  const tile = (more: Record<string, unknown>) =>
    editorOf(FluvyTileCard, { type: 'custom:fluvy-tile-card', entity: 'switch.washer', ...more });

  it('the tile’s readouts item by item, out of its own form', async () => {
    const two = WASHER.slice(0, 2);
    expect(listTitles(await tile({ size: 'compact', readouts: two }))).toEqual(['Readouts']);
    expect(
      shownNames(cardForm(await tile({ size: 'compact', readouts: two })).schema),
    ).not.toContain('readouts');
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

  it('a group has no readouts of its own: each of its tiles has its own', async () => {
    const editor = await editorOf(FluvyTilesCard, {
      type: 'custom:fluvy-tiles-card',
      tiles: [{ entity: 'switch.washer', readouts: WASHER }],
    });
    expect(shownNames(cardForm(editor).schema)).not.toContain('readouts');
    expect(shownNames(items(editor)[0]!.schema)).toContain('readouts');
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
