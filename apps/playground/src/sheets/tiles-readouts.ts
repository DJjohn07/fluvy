import { FluvyRoomCard } from '../../../../packages/cards/src/room/room-card.js';
import type { FrameSpec, SheetSpec } from '../scenes.js';

// its chunk lands after the page has drawn: the sheet defines the card from its module, as the rooms' does
if (!customElements.get('fluvy-room-card')) customElements.define('fluvy-room-card', FluvyRoomCard);

/*
 * A tile's readouts (#197) on real cards: a compact and a mini tile's line saying the first reading, as it always did,
 * or every one (`line_readouts: all`) — one, two and three of them, the last giving way first as the tile narrows —
 * in a group and in a room's tiles; a compact tile's readouts as columns at its row's end (`readouts_layout: end`), as
 * many as it holds beside its name, the rest on its line, with a lamp's level, a wall rocker and a tile out of reach,
 * and in a group; readouts with names, units and decimals of their own (a NAS's two temperatures told apart, a
 * heater's power in kW), on a line and in a large tile's foot, beside the same sensors as bare ids. Half a section
 * (152, 172) and a whole one (211, 266, 360) are the measurer's probes; light and dark are the page's (`&mode=dark`).
 */

const TILE = 'custom:fluvy-tile-card';
const TILES = 'custom:fluvy-tiles-card';
const ROOM = 'custom:fluvy-room-card';
const ALL = { line_readouts: 'all' } as const;
const END = { readouts_layout: 'end' } as const;
const WIDTHS = [152, 172, 211, 266];

/** A NAS's readings, two of them temperatures: each says its own name. */
const CPU = { entity: 'sensor.rd_nas_cpu', name: 'CPU' };
const DISK = { entity: 'sensor.rd_nas_disk', name: 'Disk' };
const LOAD = { entity: 'sensor.rd_nas_load', name: 'Load' };
const NAS = [CPU, DISK, LOAD];
/** A heater's power and its energy today, as Home Assistant writes them and in a unit and decimals of their own. */
const HEATER = ['sensor.rd_heater_power', 'sensor.rd_heater_energy'];
const HEATER_OWN = [
  { entity: 'sensor.rd_heater_power', unit: 'kW', decimals: 2 },
  { entity: 'sensor.rd_heater_energy', decimals: 0 },
];
/** A plug's power, its energy today and what it cost: named by their measures. */
const POWER = 'sensor.rd_washer_power';
const ENERGY = 'sensor.rd_washer_energy';
const COST = 'sensor.rd_washer_cost';
const WASHER = [POWER, ENERGY, COST];
/** A lamp on a metering dimmer: its level leads its line, its readings follow. */
const LAMP = ['sensor.rd_lamp_power', 'sensor.rd_lamp_energy'];

type More = Record<string, unknown>;
/** A compact tile across the section, and one in half of it. */
const whole = (entity: string, more: More = {}) => ({
  type: TILE,
  entity,
  size: 'compact',
  ...more,
});
const half = (entity: string, more: More = {}) => ({ ...whole(entity, more), cols: 6 });
/** One, two and three of a list's readouts, a tile each. */
const upTo = (
  entity: string,
  readouts: readonly unknown[],
  more: More = {},
): ReturnType<typeof whole>[] =>
  [1, 2, 3].map((count) => whole(entity, { readouts: readouts.slice(0, count), ...more }));
const frame = (title: string, cards: FrameSpec['cards'], more: Partial<FrameSpec> = {}) => ({
  title,
  heights: WIDTHS,
  cards,
  ...more,
});
const temperature = (name: string) => ({
  friendly_name: name,
  unit_of_measurement: '°C',
  device_class: 'temperature',
});
const power = (name: string) => ({
  friendly_name: name,
  unit_of_measurement: 'W',
  device_class: 'power',
});
const energy = (name: string) => ({
  friendly_name: name,
  unit_of_measurement: 'kWh',
  device_class: 'energy',
});

export const sheet: SheetSpec = {
  states: [
    ['switch.rd_nas', 'on', { friendly_name: 'NAS' }],
    ['sensor.rd_nas_cpu', '55', temperature('NAS CPU temperature')],
    ['sensor.rd_nas_disk', '41', temperature('NAS Disk temperature')],
    ['sensor.rd_nas_load', '12', { friendly_name: 'NAS Load', unit_of_measurement: '%' }],
    ['switch.rd_heater', 'on', { friendly_name: 'Heater', device_class: 'outlet' }],
    ['sensor.rd_heater_power', '1840', power('Heater Power')],
    ['sensor.rd_heater_energy', '6.4', energy('Heater Energy')],
    ['switch.rd_washer', 'on', { friendly_name: 'Washer', device_class: 'outlet' }],
    [POWER, '142', power('Washer Power')],
    [ENERGY, '0.8', energy('Washer Energy')],
    [
      COST,
      '0.24',
      { friendly_name: 'Washer Cost', unit_of_measurement: '€', device_class: 'monetary' },
    ],
    [
      'light.rd_lamp',
      'on',
      {
        friendly_name: 'Desk lamp',
        brightness: 178,
        supported_color_modes: ['brightness'],
        color_mode: 'brightness',
      },
    ],
    ['sensor.rd_lamp_power', '12', power('Desk lamp Power')],
    ['sensor.rd_lamp_energy', '0.4', energy('Desk lamp Energy')],
    ['switch.rd_dryer', 'off', { friendly_name: 'Dryer', device_class: 'outlet' }],
    ['sensor.rd_dryer_power', '0', power('Dryer Power')],
    ['sensor.rd_dryer_energy', '2.1', energy('Dryer Energy')],
    ['switch.rd_freezer', 'unavailable', { friendly_name: 'Freezer', device_class: 'outlet' }],
    ['sensor.rd_freezer_power', 'unavailable', power('Freezer Power')],
    ['sensor.rd_freezer_energy', 'unavailable', energy('Freezer Energy')],
  ],
  registry: {
    // a cost keeps its cents, as Home Assistant's monetary sensors do
    entities: Object.fromEntries(
      ['switch.rd_washer', 'switch.rd_dryer', POWER, ENERGY, COST].map((id) => [
        id,
        { entity_id: id, area_id: 'rd_utility', ...(id === COST ? { display_precision: 2 } : {}) },
      ]),
    ),
    areas: {
      rd_utility: { area_id: 'rd_utility', name: 'Utility room', icon: 'mdi:washing-machine' },
    },
  },
  frames: [
    // the first reading, as a small tile always said it, beside every one: half a section holds one
    frame('Compact · the first, and all', [
      half('switch.rd_washer', { readouts: WASHER }),
      half('switch.rd_washer', { readouts: WASHER, ...ALL }),
      half('light.rd_lamp', { readouts: LAMP }),
      half('light.rd_lamp', { readouts: LAMP, ...ALL }),
    ]),
    // one, two and three readings across the section: the last gives way first
    frame('Compact · one, two, three', upTo('switch.rd_washer', WASHER, ALL)),
    // a lamp's level leads, its readings follow
    frame('Compact · after the level', [
      whole('light.rd_lamp', { readouts: LAMP }),
      whole('light.rd_lamp', { readouts: LAMP, ...ALL }),
    ]),
    // readings named by the person: two temperatures told apart
    frame('Compact · named', upTo('switch.rd_nas', NAS, ALL)),
    frame('Compact · names on and off', [
      half('switch.rd_nas', { readouts: NAS, ...ALL }),
      half('switch.rd_nas', { readouts: NAS.map(({ entity }) => entity), ...ALL }),
    ]),
    // a unit and decimals of the reading's own: a heater's power in kW, its energy without decimals
    frame('Compact · unit and decimals', [
      whole('switch.rd_heater', { readouts: HEATER, ...ALL }),
      whole('switch.rd_heater', { readouts: HEATER_OWN, ...ALL }),
    ]),
    // a mini tile's line: half a section holds two
    frame(
      'Mini · one, two, three',
      upTo('switch.rd_washer', WASHER, { size: 'mini', ...ALL }).map((card) => ({
        ...card,
        cols: 6,
      })),
    ),
    frame(
      'Mini · named',
      upTo('switch.rd_nas', NAS, { size: 'mini', ...ALL }).map((card) => ({ ...card, cols: 6 })),
    ),
    // three minis a row, as a group lays them out: each says what it holds
    frame('Mini · three a row', [
      {
        type: TILES,
        size: 'mini',
        ...ALL,
        tiles: [
          { entity: 'switch.rd_washer', readouts: WASHER },
          { entity: 'light.rd_lamp', readouts: LAMP },
          { entity: 'switch.rd_nas', readouts: NAS },
        ],
      },
    ]),
    // a group says it for its tiles, two a row on their lines
    frame('A group · all on the line', [
      {
        type: TILES,
        columns: 2,
        ...ALL,
        tiles: [
          { entity: 'switch.rd_washer', readouts: WASHER },
          { entity: 'switch.rd_dryer', readouts: ['sensor.rd_dryer_power'] },
          { entity: 'switch.rd_nas', readouts: NAS },
          { entity: 'light.rd_lamp', readouts: LAMP },
        ],
      },
    ]),
    // a room's tiles say theirs too
    frame('Room card', [
      {
        type: ROOM,
        area: 'rd_utility',
        variant: 'tile',
        controls: 'tiles',
        ...ALL,
        tiles: [
          { entity: 'switch.rd_washer', readouts: WASHER },
          { entity: 'switch.rd_dryer', readouts: ['sensor.rd_dryer_power'] },
        ],
      },
    ]),
    // the readings at the row's end, each under its label: as many as hold beside the name, the rest on the line
    frame('At the end · one, two, three', upTo('switch.rd_washer', WASHER, END)),
    frame('At the end · named', upTo('switch.rd_nas', NAS, END)),
    // a lamp's level stays on its line; a wall rocker stands after the columns; out of reach, the columns keep
    // their places
    frame('At the end · a level, a rocker, out of reach', [
      whole('light.rd_lamp', { readouts: LAMP, ...END }),
      whole('switch.rd_dryer', {
        readouts: ['sensor.rd_dryer_power', 'sensor.rd_dryer_energy'],
        switch_style: 'rocker',
        ...END,
      }),
      whole('switch.rd_freezer', {
        readouts: ['sensor.rd_freezer_power', 'sensor.rd_freezer_energy'],
        ...END,
      }),
    ]),
    // half a section holds a column only beside a short name: else the readings are the line's
    frame('At the end · two a row', [
      half('switch.rd_washer', { readouts: WASHER, ...END }),
      half('switch.rd_nas', { readouts: NAS, ...END }),
    ]),
    // a group says it for its tiles, one a row
    frame('A group · at the end', [
      {
        type: TILES,
        columns: 1,
        ...END,
        tiles: [
          { entity: 'switch.rd_washer', readouts: WASHER },
          { entity: 'switch.rd_heater', readouts: ['sensor.rd_heater_power'] },
          { entity: 'switch.rd_nas', readouts: NAS },
        ],
      },
    ]),
    // a reading's own name before its figure on a compact tile's line, beside the same sensors as bare ids
    frame('A name of its own', [
      whole('switch.rd_nas', { readouts: NAS }),
      whole('switch.rd_nas', { readouts: NAS.map(({ entity }) => entity) }),
    ]),
    // a large tile's foot under the readings' own names, and under their sensors' names beyond the tile's
    frame('Large · the foot named', [
      { type: TILE, entity: 'switch.rd_nas', readouts: [CPU, DISK], cols: 6 },
      {
        type: TILE,
        entity: 'switch.rd_nas',
        readouts: [CPU, DISK].map(({ entity }) => entity),
        cols: 6,
      },
    ]),
    // a large tile's figures as Home Assistant writes them, and in the unit and the decimals they ask for
    frame('Large · unit and decimals', [
      { type: TILE, entity: 'switch.rd_heater', readouts: HEATER, cols: 6 },
      { type: TILE, entity: 'switch.rd_heater', readouts: HEATER_OWN, cols: 6 },
    ]),
  ],
};
