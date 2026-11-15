import type { FrameSpec, SheetSpec } from '../scenes.js';

/*
 * A tile's readouts (#197) on real cards: readouts with names, units and decimals of their own (a NAS's two
 * temperatures told apart, a heater's power in kW), on a compact tile's line and in a large tile's foot, beside the
 * same sensors as bare ids. Half a section (152, 172) and a whole one (211, 266, 360) are the measurer's probes; light
 * and dark are the page's (`&mode=dark`).
 */

const TILE = 'custom:fluvy-tile-card';
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
type More = Record<string, unknown>;
/** A compact tile across the section. */
const whole = (entity: string, more: More = {}) => ({
  type: TILE,
  entity,
  size: 'compact',
  ...more,
});
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
  ],
  frames: [
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
