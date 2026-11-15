import type { EntityView } from '@fluvy/core';
import { describe, expect, it } from 'vitest';
import { thresholdsOf, type ThresholdHost, type ThresholdItem } from './thresholds.js';

/** A house of sensors (their reading and unit), templates' answers, and the colours a card's sheet would key. */
function host(
  sensors: Readonly<Record<string, readonly [number | null, string]>> = {},
  answers: Readonly<Record<string, string>> = {},
): ThresholdHost & { readonly asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    accents: {
      item: (choice) => (typeof choice === 'string' && choice.startsWith('#') ? choice : undefined),
      ink: (source) => `ink:${source}`,
    },
    entity: (id) => {
      const [number, unit] = sensors[id] ?? [null, ''];
      return { id, number, unit } as unknown as EntityView;
    },
    template: (text) => {
      asked.push(text);
      return answers[text] ?? '';
    },
  };
}

const read = (list: readonly ThresholdItem[], unit = 'V', house = host()) =>
  thresholdsOf(list, unit, house);
const tone = (list: readonly ThresholdItem[], reading: number | null): string | undefined =>
  read(list).band(reading)?.tone;

describe('a reading’s band (1.22, #204)', () => {
  const VOLTAGE: ThresholdItem[] = [
    { value: 230, tone: 'warning' },
    { value: 250, tone: 'danger' },
  ];

  it('upward: the highest it reaches, from its value on, none under the lowest: the Chart card’s rule', () => {
    expect(tone(VOLTAGE, 229.9)).toBeUndefined();
    expect(tone(VOLTAGE, 230)).toBe('warning');
    expect(tone(VOLTAGE, 249.9)).toBe('warning');
    expect(tone(VOLTAGE, 250)).toBe('danger');
    expect(tone(VOLTAGE, 400)).toBe('danger');
    // in any order: the list is read by value
    expect(tone([...VOLTAGE].reverse(), 240)).toBe('warning');
  });

  it('under its value with `below`: the lowest it is under, never at the value itself', () => {
    const battery: ThresholdItem[] = [
      { value: 20, below: true, tone: 'danger' },
      { value: 50, below: true, tone: 'warning' },
    ];
    expect(tone(battery, 5)).toBe('danger');
    expect(tone(battery, 20)).toBe('warning');
    expect(tone(battery, 49)).toBe('warning');
    expect(tone(battery, 50)).toBeUndefined();
  });

  it('one of each claiming it: the nearer, the one above it on an even split', () => {
    const both: ThresholdItem[] = [
      { value: 10, tone: 'ok' },
      { value: 30, below: true, tone: 'warning' },
    ];
    expect(tone(both, 12)).toBe('ok');
    expect(tone(both, 19.9)).toBe('ok');
    expect(tone(both, 20)).toBe('warning');
    expect(tone(both, 28)).toBe('warning');
    expect(tone(both, 5)).toBe('warning');
    expect(tone(both, 35)).toBe('ok');
  });

  it('a threshold in no colour ends a band; one that says no colour at all is left out', () => {
    const ended: ThresholdItem[] = [...VOLTAGE, { value: 260, tone: 'none' }];
    expect(tone(ended, 255)).toBe('danger');
    expect(tone(ended, 270)).toBeUndefined();
    // a Chart card's threshold with no tone was never drawn, nor did it end one; the information's it might name is drawn
    expect(tone([...VOLTAGE, { value: 260 }], 270)).toBe('danger');
    expect(tone([{ value: 230, tone: 'notice' }], 240)).toBe('notice');
    expect(tone([{ value: 230, tone: 'red' as never }], 240)).toBeUndefined();
  });

  it('a colour of the person’s own is the accent inside the card, its figure’s ink that colour’s', () => {
    const band = read([{ value: 230, color: '#8844ff', tone: 'warning' }]).band(240);
    expect(band).toMatchObject({ tone: 'accent', accent: '#8844ff', ink: 'ink:#8844ff' });
    // a colour no one can read keeps the tone
    expect(read([{ value: 230, color: 'nope', tone: 'warning' }]).band(240)?.tone).toBe('warning');
  });

  it('says its words and its icon where they are given, and its figure’s ink but in the neutral', () => {
    const list: ThresholdItem[] = [
      { value: 230, tone: 'warning', label: 'High', icon: 'mdi:flash-alert' },
      { value: 250, tone: 'neutral', label: '  ' },
    ];
    expect(read(list).band(240)).toEqual({
      tone: 'warning',
      ink: 'ink:warning',
      label: 'High',
      icon: 'mdi:flash-alert',
    });
    expect(read(list).band(260)).toEqual({
      tone: 'neutral',
      ink: undefined,
      label: undefined,
      icon: undefined,
    });
    expect(read(list).band(null)).toBeUndefined();
  });
});

describe('a threshold’s value (#204)', () => {
  it('a figure, or one written as words; anything else is left out', () => {
    expect(tone([{ value: '230', tone: 'warning' }], 231)).toBe('warning');
    expect(tone([{ value: ' -5.5 ', tone: 'warning' }], -5)).toBe('warning');
    for (const value of ['230 V', '', 'high', Number.NaN, null])
      expect(
        tone([{ value: value as never, tone: 'warning' }], 1e6),
        String(value),
      ).toBeUndefined();
  });

  it('an entity: its reading now, a reading of another unit of its family converted, any other left out', () => {
    const house = host({
      'sensor.max_voltage': [245, 'V'],
      'sensor.limit_kw': [1.5, 'kW'],
      'sensor.limit_mw': [1_500_000, 'mW'],
      'sensor.humidity': [60, '%'],
      'sensor.gone': [null, 'V'],
      'input_number.bare': [240, ''],
    });
    const at = (value: string, reading: number, unit = 'V') =>
      read([{ value, tone: 'danger' }], unit, house).band(reading)?.tone;
    expect(at('sensor.max_voltage', 244)).toBeUndefined();
    expect(at('sensor.max_voltage', 245)).toBe('danger');
    // 1.5 kW is 1 500 W, 1 500 000 mW too
    expect(at('sensor.limit_kw', 1499, 'W')).toBeUndefined();
    expect(at('sensor.limit_kw', 1500, 'W')).toBe('danger');
    expect(at('sensor.limit_mw', 1500, 'W')).toBe('danger');
    // a percentage is no voltage, a reading gone is none, a number without a unit is the reading's
    expect(at('sensor.humidity', 1e6)).toBeUndefined();
    expect(at('sensor.gone', 1e6)).toBeUndefined();
    expect(at('input_number.bare', 240)).toBe('danger');
  });

  it('a template: its answer while it is a figure — never while pending, failed, empty or words — each asked every time', () => {
    const LIMIT = "{{ states('sensor.max_voltage') | float(0) }}";
    const house = host({}, { [LIMIT]: '250.0', '{{ "high" }}': 'high', '{{ unit }}': '250 V' });
    const list: ThresholdItem[] = [
      { value: 230, tone: 'warning' },
      { value: LIMIT, tone: 'danger' },
      { value: '{{ pending }}', tone: 'ok' },
      { value: '{{ "high" }}', tone: 'ok' },
      { value: '{{ unit }}', tone: 'ok' },
    ];
    const thresholds = read(list, 'V', house);
    expect(thresholds.band(240)?.tone).toBe('warning');
    expect(thresholds.band(251)?.tone).toBe('danger');
    // every template asked as the list was read, whatever claims the reading
    expect(house.asked).toEqual([LIMIT, '{{ pending }}', '{{ "high" }}', '{{ unit }}']);
  });
});

describe('the stretches a chart colours (#204)', () => {
  it('upward: from each value up to the next, the highest open above', () => {
    expect(
      read([
        { value: 250, tone: 'danger' },
        { value: 230, tone: 'warning' },
      ]).bands(),
    ).toEqual([
      { from: 230, to: 250, colour: 'warning', accent: undefined, unit: 'V' },
      { from: 250, to: null, colour: 'danger', accent: undefined, unit: 'V' },
    ]);
  });

  it('under a value, a band ended by none, and the nearer of two halfway between them', () => {
    expect(read([{ value: 20, below: true, tone: 'danger' }], '%').bands()).toEqual([
      { from: null, to: 20, colour: 'danger', accent: undefined, unit: '%' },
    ]);
    expect(
      read([
        { value: 230, tone: 'warning' },
        { value: 260, tone: 'none' },
      ]).bands(),
    ).toEqual([{ from: 230, to: 260, colour: 'warning', accent: undefined, unit: 'V' }]);
    expect(
      read(
        [
          { value: 10, tone: 'ok' },
          { value: 30, below: true, color: '#ff8800' },
        ],
        '',
      ).bands(),
    ).toEqual([
      { from: null, to: 10, colour: 'accent', accent: '#ff8800' },
      { from: 10, to: 20, colour: 'ok', accent: undefined },
      { from: 20, to: 30, colour: 'accent', accent: '#ff8800' },
      { from: 30, to: null, colour: 'ok', accent: undefined },
    ]);
  });

  it('none where no value can be read', () => {
    expect(read([{ value: 'sensor.gone', tone: 'danger' }]).bands()).toEqual([]);
    expect(read([]).bands()).toEqual([]);
  });
});
