// @vitest-environment happy-dom
import type { HassEntity, HomeAssistant, LovelaceCardConfig } from '@fluvy/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../index.js';
import { scenesHeight } from '../scenes/scenes-card.js';
import { tilesHeight } from '../tiles/tiles-card.js';

/*
 * A card of tiles or of scenes in groups (#189) before what lays them out has landed (the `groups` chunk): a box as
 * tall as the card declares, never a card of no height that pushes what stands under it down as the chunk lands.
 */

/** The chunk lands when the test says so. */
let land = (): void => undefined;
const landed = new Promise<void>((resolve) => (land = resolve));
vi.mock('./groups.js', async (original) => {
  await landed;
  return original();
});

const entity = (entity_id: string, state: string, name: string): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name: name },
  last_changed: '2026-11-15T08:00:00Z',
  last_updated: '2026-11-15T08:00:00Z',
});

const hass = {
  language: 'en',
  locale: { language: 'en', number_format: 'language', time_format: '24' },
  states: Object.fromEntries(
    [
      entity('light.island', 'on', 'Island'),
      entity('light.pendant', 'off', 'Pendant'),
      entity('light.sofa', 'off', 'Sofa lamp'),
      entity('scene.cooking', '2026-11-15T07:00:00Z', 'Cooking'),
      entity('scene.dinner', '2026-11-14T19:00:00Z', 'Dinner'),
      entity('scene.reading', '2026-11-14T21:00:00Z', 'Reading'),
    ].map((state) => [state.entity_id, state]),
  ),
  entities: {
    'light.island': { entity_id: 'light.island', area_id: 'kitchen' },
    'light.pendant': { entity_id: 'light.pendant', area_id: 'kitchen' },
    'light.sofa': { entity_id: 'light.sofa', area_id: 'living' },
  },
  devices: {},
  areas: {
    kitchen: { area_id: 'kitchen', name: 'Kitchen' },
    living: { area_id: 'living', name: 'Living room' },
  },
  config: { unit_system: { temperature: '°C' } },
  user: { id: 'u1', name: 'Ana', is_admin: true },
  localize: (key: string) => key,
  formatEntityState: (s: { state: string }) => s.state,
  hassUrl: (path: string) => path,
  callWS: async () => ({}),
} as unknown as HomeAssistant;

type Mounted = HTMLElement & {
  setConfig(config: LovelaceCardConfig): void;
  hass: HomeAssistant;
  updateComplete: Promise<boolean>;
};

async function mount(config: LovelaceCardConfig): Promise<Mounted> {
  const card = document.createElement(config.type.replace('custom:', '')) as Mounted;
  card.setConfig(config);
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

/** The card's box as it stands: its height, and how many tiles, scenes or chips it draws. */
const drawn = (card: Mounted): { height: string; things: number } => ({
  height: card.shadowRoot?.querySelector<HTMLElement>('[data-card]')?.style.height ?? '',
  things: card.shadowRoot?.querySelectorAll('.fv-tile, .fv-chip').length ?? 0,
});

const TILES: LovelaceCardConfig = {
  type: 'custom:fluvy-tiles-card',
  group_by: 'area',
  entities: ['light.island', 'light.pendant', 'light.sofa'],
};
const SECTIONS: LovelaceCardConfig = {
  type: 'custom:fluvy-scenes-card',
  title: 'Scenes',
  scenes: [
    { section: 'Kitchen' },
    'scene.cooking',
    'scene.dinner',
    { section: 'Evening' },
    'scene.reading',
  ],
};
const CHIPS: LovelaceCardConfig = {
  type: 'custom:fluvy-scenes-card',
  variant: 'chips',
  scenes: ['scene.cooking', 'scene.dinner', 'scene.reading'],
};

describe('a list in groups before its groups have landed', () => {
  afterEach(() => document.body.replaceChildren());

  it('is a box as tall as the card declares, and its tiles, scenes or chips as they land', async () => {
    const cards = [await mount(TILES), await mount(SECTIONS), await mount(CHIPS)];
    expect(cards.map(drawn)).toEqual([
      { height: `${tilesHeight(TILES)}px`, things: 0 },
      { height: `${scenesHeight(SECTIONS)}px`, things: 0 },
      { height: `${scenesHeight(CHIPS)}px`, things: 0 },
    ]);
    land();
    await vi.dynamicImportSettled();
    await Promise.all(cards.map((card) => card.updateComplete));
    expect(cards.map((card) => drawn(card).things)).toEqual([3, 3, 3]);
    expect(cards.map((card) => drawn(card).height)).toEqual(['', '', '']);
  });
});
