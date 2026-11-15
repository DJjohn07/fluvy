import type { LovelaceCardConfig } from '@fluvy/core';
import type { FrameSpec, SheetSpec } from '../scenes.js';

/**
 * A reading past a threshold (1.22, #204): the reporter's grid voltage on a Gauge, normal, high and too high, the whole
 * dial in the band's tone and its badge saying the band; a phone under 20 % (`below`); a Sensor chart whose curve
 * crosses two bands, and its tiles; a Readouts row, a stat tile and a tile lit by a band; the card itself in the band
 * (`tint: on`) as a wash and at its edge; a limit read from an entity and from a template, a failing template beside
 * them left out; and the narrow columns, 152 to 266.
 */

const GAUGE = 'custom:fluvy-gauge-card';
const SENSOR = 'custom:fluvy-sensor-card';
const READOUTS = 'custom:fluvy-readouts-card';
const STATS = 'custom:fluvy-stat-tiles-card';
const TILE = 'custom:fluvy-tile-card';
const TILES = 'custom:fluvy-tiles-card';

/** The reporter's bands: high from 230 V, too high from 250 V, each named and the worse with its icon. */
const VOLTAGE = [
  { value: 230, tone: 'warning', label: 'High' },
  { value: 250, tone: 'danger', label: 'Too high', icon: 'mdi:flash-alert' },
];
/** A battery's: low under 20 %, in the danger's. */
const BATTERY = [
  { value: 20, below: true, tone: 'danger', label: 'Low', icon: 'mdi:battery-alert' },
];
/** A room's air: fresh under 800 ppm, stuffy from 1 000, bad from 1 500. */
const AIR = [
  { value: 800, below: true, tone: 'ok', label: 'Fresh' },
  { value: 1000, tone: 'warning', label: 'Stuffy' },
  { value: 1500, tone: 'danger', label: 'Open a window' },
];
/** A freezer too warm from −15 °C, a rain tank low under 25 %. */
const FREEZER = [{ value: -15, tone: 'danger', label: 'Too warm', icon: 'mdi:snowflake-alert' }];
const TANK = [{ value: 25, below: true, tone: 'warning', label: 'Low' }];

/** A day of the second phase: a quiet morning, the panels pushing it past 230 at noon and past 250 for a while. */
const PHASE = [
  227.4, 227.1, 226.8, 226.6, 226.9, 227.3, 227.8, 228.4, 229.1, 229.8, 230.6, 231.9, 233.4, 235.2,
  237.6, 240.1, 242.9, 245.6, 248.2, 250.7, 252.4, 253.1, 252.6, 251.2, 249.4, 247.3, 245.1, 243.0,
  241.2, 239.6, 238.1, 236.9, 235.6, 234.8, 234.0, 233.6, 233.9, 234.7, 235.9, 237.2, 238.4, 239.3,
  240.0, 240.6, 241.0, 241.2, 241.3, 241.4,
];

/** A phase of the house's supply on the reporter's gauge, 200 to 260 V. */
const phase = (id: string, name: string): LovelaceCardConfig => ({
  type: GAUGE,
  entity: id,
  name,
  min: 200,
  max: 260,
  thresholds: VOLTAGE,
});

/** Cards on a line, each its share of the section. */
const share = (cards: readonly LovelaceCardConfig[]): FrameSpec['cards'] =>
  cards.map((card) => ({ ...card, cols: 12 / cards.length }));

/** What a narrow column holds: a readout row, a stat tile and a lit tile, half a section each, or whole at `cols`. */
const narrow = (cols: number): FrameSpec['cards'] => [
  {
    type: READOUTS,
    rows: [
      { entity: 'sensor.th_phone_battery', name: 'Phone', thresholds: BATTERY },
      { entity: 'sensor.th_study_co2', name: 'Study air', thresholds: AIR },
    ],
    cols,
  },
  {
    type: STATS,
    title: 'Batteries',
    tiles: [
      { entity: 'sensor.th_phone_battery', name: 'Phone', thresholds: BATTERY },
      { entity: 'sensor.th_tablet_battery', name: 'Tablet', thresholds: BATTERY },
    ],
    tint: 'on',
    cols,
  },
  {
    type: TILE,
    entity: 'sensor.th_grid_l2',
    name: 'Grid voltage',
    size: 'compact',
    thresholds: VOLTAGE,
    cols,
  },
  {
    type: SENSOR,
    entity: 'sensor.th_phone_battery',
    name: 'Phone',
    variant: 'tile',
    thresholds: BATTERY,
    cols,
  },
];

export const sheet: SheetSpec = {
  states: [
    [
      'sensor.th_grid_l1',
      '226.8',
      {
        friendly_name: 'Grid voltage L1',
        unit_of_measurement: 'V',
        device_class: 'voltage',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_grid_l2',
      '241.4',
      {
        friendly_name: 'Grid voltage L2',
        unit_of_measurement: 'V',
        device_class: 'voltage',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_grid_l3',
      '252.6',
      {
        friendly_name: 'Grid voltage L3',
        unit_of_measurement: 'V',
        device_class: 'voltage',
        state_class: 'measurement',
      },
    ],
    [
      'input_number.th_voltage_limit',
      '248',
      { friendly_name: 'Voltage limit', unit_of_measurement: 'V', min: 220, max: 260, step: 1 },
    ],
    [
      'sensor.th_phone_battery',
      '12',
      {
        friendly_name: 'Marta’s phone battery',
        unit_of_measurement: '%',
        device_class: 'battery',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_tablet_battery',
      '64',
      {
        friendly_name: 'Kitchen tablet battery',
        unit_of_measurement: '%',
        device_class: 'battery',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_study_co2',
      '1240',
      {
        friendly_name: 'Study CO₂',
        unit_of_measurement: 'ppm',
        device_class: 'carbon_dioxide',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_bedroom_co2',
      '640',
      {
        friendly_name: 'Bedroom CO₂',
        unit_of_measurement: 'ppm',
        device_class: 'carbon_dioxide',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_freezer',
      '-12.4',
      {
        friendly_name: 'Garage freezer',
        unit_of_measurement: '°C',
        device_class: 'temperature',
        state_class: 'measurement',
      },
    ],
    [
      'sensor.th_rain_tank',
      '18',
      { friendly_name: 'Rain tank', unit_of_measurement: '%', state_class: 'measurement' },
    ],
  ],
  history: {
    // the three phases of one day: the first a little under the second, the third a little over it
    'sensor.th_grid_l1': PHASE.map((v) => Math.round((v - 14.6) * 10) / 10),
    'sensor.th_grid_l2': PHASE,
    'sensor.th_grid_l3': PHASE.map((v) => Math.round((v + 6.8) * 10) / 10),
  },
  frames: [
    // the reporter's case: the whole dial in the band's tone, the badge its words
    {
      title: 'Gauge · past 230 V, high',
      cards: [{ ...phase('sensor.th_grid_l2', 'Grid voltage L2'), cols: 12 }],
    },
    {
      title: 'Gauge · past 250 V, too high, its band named and its icon',
      cards: [{ ...phase('sensor.th_grid_l3', 'Grid voltage L3'), cols: 12 }],
    },
    {
      title: 'Gauge · the bar, normal and high',
      cards: share([
        { ...phase('sensor.th_grid_l1', 'Grid voltage L1'), variant: 'bar', show_stats: false },
        { ...phase('sensor.th_grid_l2', 'Grid voltage L2'), variant: 'bar', show_stats: false },
      ]),
    },
    {
      title: 'Gauge · a phone under 20 %, as a bar and as a battery',
      cards: share([
        {
          type: GAUGE,
          entity: 'sensor.th_phone_battery',
          name: 'Marta’s phone',
          variant: 'bar',
          max: 100,
          show_stats: false,
          thresholds: BATTERY,
        },
        {
          type: GAUGE,
          entity: 'sensor.th_phone_battery',
          name: 'Marta’s phone',
          gauge: 'battery',
          max: 100,
          show_stats: false,
          thresholds: BATTERY,
        },
      ]),
    },
    {
      title: 'Gauge · the card in its band, as a wash and at its edge',
      cards: share([
        {
          ...phase('sensor.th_grid_l3', 'Grid voltage L3'),
          variant: 'bar',
          show_stats: false,
          tint: 'on',
        },
        {
          ...phase('sensor.th_grid_l2', 'Grid voltage L2'),
          variant: 'bar',
          show_stats: false,
          tint: 'on',
          tint_style: 'edge',
        },
      ]),
    },
    // the curve in each band it runs through, the bubble in the band of its reading
    {
      title: 'Sensor · a day crossing two bands',
      cards: [
        {
          type: SENSOR,
          entity: 'sensor.th_grid_l2',
          name: 'Grid voltage L2',
          hours: 24,
          thresholds: VOLTAGE,
          cols: 12,
        },
      ],
    },
    {
      title: 'Sensor · the chart in its band, as a wash',
      cards: [
        {
          type: SENSOR,
          entity: 'sensor.th_grid_l2',
          name: 'Grid voltage L2',
          hours: 24,
          show_stats: false,
          thresholds: VOLTAGE,
          tint: 'on',
          cols: 12,
        },
      ],
    },
    {
      title: 'Sensor · a tile under 20 %, a tile past none',
      cards: share([
        {
          type: SENSOR,
          entity: 'sensor.th_phone_battery',
          name: 'Phone',
          variant: 'tile',
          thresholds: BATTERY,
        },
        {
          type: SENSOR,
          entity: 'sensor.th_tablet_battery',
          name: 'Tablet',
          variant: 'tile',
          thresholds: BATTERY,
        },
      ]),
    },
    // a row each of its own, beside one that names none
    {
      title: 'Readouts · a battery low, the air stuffy',
      cards: [
        {
          type: READOUTS,
          rows: [
            { entity: 'sensor.th_phone_battery', name: 'Phone', thresholds: BATTERY },
            { entity: 'sensor.th_study_co2', name: 'Study', thresholds: AIR },
          ],
          cols: 12,
        },
      ],
    },
    {
      title: 'Stat tiles · past a threshold, filled in its band',
      cards: [
        {
          type: STATS,
          title: 'Around the house',
          tiles: [
            { entity: 'sensor.th_freezer', name: 'Freezer', thresholds: FREEZER },
            {
              entity: 'sensor.th_rain_tank',
              name: 'Rain tank',
              icon: 'mdi:water',
              thresholds: TANK,
            },
            {
              entity: 'sensor.th_study_co2',
              name: 'Study air',
              icon: 'mdi:molecule-co2',
              thresholds: AIR,
            },
            {
              entity: 'sensor.th_bedroom_co2',
              name: 'Bedroom air',
              icon: 'mdi:molecule-co2',
              thresholds: AIR,
            },
          ],
          rows: [{ entity: 'sensor.th_phone_battery', name: 'Marta’s phone', thresholds: BATTERY }],
          tint: 'on',
          cols: 12,
        },
      ],
    },
    {
      title: 'Tile · lit by its band, compact and large',
      cards: share([
        {
          type: TILE,
          entity: 'sensor.th_grid_l3',
          name: 'Grid voltage',
          size: 'compact',
          thresholds: VOLTAGE,
        },
        { type: TILE, entity: 'sensor.th_freezer', name: 'Garage freezer', thresholds: FREEZER },
      ]),
    },
    {
      title: 'Tiles · a group, each tile its own',
      cards: [
        {
          type: TILES,
          size: 'compact',
          tiles: [
            { entity: 'sensor.th_grid_l1', name: 'L1', thresholds: VOLTAGE },
            { entity: 'sensor.th_grid_l2', name: 'L2', thresholds: VOLTAGE },
            { entity: 'sensor.th_grid_l3', name: 'L3', thresholds: VOLTAGE },
            { entity: 'sensor.th_rain_tank', name: 'Rain tank', thresholds: TANK },
          ],
          cols: 12,
        },
      ],
    },
    // the limit read live: from an entity, from a template; a template that fails is left out, never a colour
    {
      title: 'A limit from an entity and from a template, a failing one left out',
      cards: share([
        {
          ...phase('sensor.th_grid_l3', 'Grid voltage L3'),
          subtitle: 'Sensor limit',
          variant: 'bar',
          show_stats: false,
          thresholds: [
            { value: 230, tone: 'warning', label: 'High' },
            { value: 'input_number.th_voltage_limit', tone: 'danger', label: 'Over the limit' },
          ],
        },
        {
          ...phase('sensor.th_grid_l3', 'Grid voltage L3'),
          subtitle: 'Template limit',
          variant: 'bar',
          show_stats: false,
          thresholds: [
            { value: 230, tone: 'warning', label: 'High' },
            {
              value: "{{ states('input_number.th_voltage_limit') | float(0) }}",
              tone: 'danger',
              label: 'Over the limit',
            },
            {
              value: "{{ states('input_number.th_voltage_limit' }}",
              tone: 'ok',
              label: 'Never shown',
            },
          ],
        },
      ]),
    },
    // narrow columns: the band's words stay whole, the names give way
    { title: 'Narrow · at 152', width: 320, cards: narrow(6) },
    { title: 'Narrow · at 172', cards: narrow(6) },
    { title: 'Narrow · at 211', width: 211, cards: narrow(12) },
    { title: 'Narrow · at 266', width: 266, cards: narrow(12) },
  ],
};
