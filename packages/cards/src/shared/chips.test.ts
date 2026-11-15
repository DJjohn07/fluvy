// @vitest-environment happy-dom
import { options } from '@fluvy/ui';
import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { chipRow, fittedColumns, inForce } from './chips.js';
import type { TextRuler } from './fit.js';

/** A stand-in for the card's ruler: a chip's label at 7 a letter (its pill adds 16 each side's 8). */
const ruler = { width: (_cls: string, text: string) => text.length * 7 } as unknown as TextRuler;

/** A thermostat's three modes in German: "Automatisch" is the widest chip, 77 + 16. */
const MODES = [
  { key: 'off', label: 'Aus' },
  { key: 'heat', label: 'Heizen' },
  { key: 'auto', label: 'Automatisch' },
];

describe('a row of three chips', () => {
  it('stands in one line while the widest holds a third of it', () => {
    // 3 × 93 and two 8 gaps: 295
    expect(fittedColumns(MODES, { ruler, width: 295 })).toBe(3);
  });

  it('goes two and one before a label is cut, the last chip taking the whole line', () => {
    expect(fittedColumns(MODES, { ruler, width: 294 })).toBe(2);
    expect(fittedColumns(MODES, { ruler, width: 194 })).toBe(2);
    const host = document.createElement('div');
    render(
      chipRow(MODES, () => undefined, 'full', { ruler, width: 200 }),
      host,
    );
    const chips = [...host.querySelectorAll<HTMLElement>('.fv-chip')];
    expect(host.querySelector<HTMLElement>('.fv-chips')?.style.gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(chips.map((chip) => chip.style.gridColumn)).toEqual(['', '', 'span 2']);
  });

  it('stands one a line only where not even two hold', () => {
    expect(fittedColumns(MODES, { ruler, width: 193 })).toBe(1);
  });

  it('gives its glyphs up where not even a chip of its own line holds the widest word beside one, never a word', () => {
    // a dehumidifier's mode in Portuguese, half a section: 91 + 16 holds 112, not beside its glyph's 24
    const modes = [
      { key: 'cool', label: 'Resfriar', glyph: 'snow' },
      { key: 'dry', label: 'Desumidificar', glyph: 'humid' },
    ];
    const glyphs = (width: number): number => {
      const host = document.createElement('div');
      render(
        chipRow(modes, () => undefined, 'full', { ruler, width }),
        host,
      );
      return host.querySelectorAll('.fv-chip svg').length;
    };
    expect(glyphs(131)).toBe(2);
    expect(glyphs(112)).toBe(0);
  });
});

describe('a word of Home Assistant’s no chip of a whole row holds', () => {
  /** A fan's speeds in Home Assistant's Russian, with Fluvy's own word for the two it names. */
  const speeds = [
    { key: 'auto', label: 'Автоматический', own: 'Авто' },
    { key: 'low', label: 'Низкий', own: 'Низкая' },
    { key: 'natural', label: 'Естественный ветер' },
  ];
  const said = (style: 'full' | 'chips', width: number): string[] => {
    const host = document.createElement('div');
    render(
      chipRow(speeds, () => undefined, style, { ruler, width }),
      host,
    );
    return [...host.querySelectorAll('.fv-chip')].map((chip) => chip.textContent?.trim() ?? '');
  };

  it('says Fluvy’s own where it has one, filled or content-sized, and Home Assistant’s wherever it holds', () => {
    // "Автоматический" is 98 + 16 filled, 98 + 28 content-sized; "Естественный ветер" has no word of Fluvy's
    expect(said('full', 113)).toEqual(['Авто', 'Низкий', 'Естественный ветер']);
    expect(said('chips', 125)).toEqual(['Авто', 'Низкий', 'Естественный ветер']);
    expect(said('full', 126)).toEqual(['Автоматический', 'Низкий', 'Естественный ветер']);
    expect(said('chips', 126)).toEqual(['Автоматический', 'Низкий', 'Естественный ветер']);
  });
});

describe('the value in force, offered or not (#202)', () => {
  /** A hall air conditioner's speeds, as its firmware lists them. */
  const SPEEDS = ['low', 'high'].map((key) => ({ key, label: key, active: false }));
  const chip = (key: string) => ({ key, label: `${key}!`, active: false });
  const keys = (items: readonly { key: string }[]): string[] => items.map((item) => item.key);

  it('leaves a row that offers it as it is', () => {
    expect(inForce(SPEEDS, 'high', chip)).toBe(SPEEDS);
  });

  it('stands first where the row does not offer it, in its words, chosen and inert', () => {
    const shown = inForce(SPEEDS, 'middle', chip);
    expect(shown).toEqual([
      { key: 'middle', label: 'middle!', active: true, inert: true },
      ...SPEEDS,
    ]);
  });

  it('takes the place of the last a full row offers, and is one more under its cap', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map(chip);
    expect(keys(inForce(six, 'g', chip, 6))).toEqual(['g', 'a', 'b', 'c', 'd', 'e']);
    expect(keys(inForce(six.slice(0, 2), 'g', chip, 6))).toEqual(['g', 'a', 'b']);
    expect(keys(inForce(six, 'g', chip))).toEqual(['g', 'a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('marks nothing for none, empty, a state that cannot be read, or one with no words, nor in a row of none', () => {
    for (const value of ['none', '', 'unknown', 'unavailable', null, undefined, 3])
      expect(inForce(SPEEDS, value, chip), String(value)).toBe(SPEEDS);
    expect(inForce(SPEEDS, 'middle', () => undefined)).toBe(SPEEDS);
    expect(inForce([], 'middle', chip)).toEqual([]);
  });

  it('is drawn as chosen at full strength, never the dashed look, and takes no tap', () => {
    const host = document.createElement('div');
    const onSelect = vi.fn();
    render(chipRow(inForce(SPEEDS, 'middle', chip), onSelect, 'full', { ruler, width: 320 }), host);
    const [held, low] = [...host.querySelectorAll<HTMLButtonElement>('.fv-chip')];
    expect(held?.classList.contains('is-active')).toBe(true);
    expect(held?.classList.contains('is-unavailable')).toBe(false);
    expect(held?.disabled).toBe(false);
    expect(held?.getAttribute('aria-pressed')).toBe('true');
    expect(held?.getAttribute('aria-disabled')).toBe('true');
    held?.click();
    expect(onSelect).not.toHaveBeenCalled();
    low?.click();
    expect(onSelect).toHaveBeenCalledWith('low');
    expect(low?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('is an option tile chosen and inert alike', () => {
    const host = document.createElement('div');
    const onSelect = vi.fn();
    const modes = [
      { key: 'heat', label: 'Heat', glyph: 'flame' },
      { key: 'cool', label: 'Cool', glyph: 'snow' },
    ];
    render(
      options(
        inForce(modes, 'off', (key) => ({ key, label: 'Off' })),
        onSelect,
      ),
      host,
    );
    const [off, heat] = [...host.querySelectorAll<HTMLButtonElement>('.fv-option')];
    expect(off?.classList.contains('is-active')).toBe(true);
    expect(off?.classList.contains('is-unavailable')).toBe(false);
    expect(off?.getAttribute('aria-pressed')).toBe('true');
    expect(off?.getAttribute('aria-disabled')).toBe('true');
    off?.click();
    expect(onSelect).not.toHaveBeenCalled();
    heat?.click();
    expect(onSelect).toHaveBeenCalledWith('heat');
  });
});
