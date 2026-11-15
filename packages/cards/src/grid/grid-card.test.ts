// @vitest-environment happy-dom
import { preloadLanguages, type HomeAssistant } from '@fluvy/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { familiesDefined } from '../index.js';

// the energy family lands with the index: the cards' tags are defined before a page needs them
await familiesDefined;

/*
 * The price row of a price that cannot be read says so where its sensor's name stood, in the state's word, never cut:
 * the circle gives way to the word where the row holds it so, else the line says the dash. A grid with three phases
 * out of reach and a price gone from the house (the playground's "a phase unreadable"), drawn on a stub ruler, 8 px a
 * glyph: the layout that happy-dom has none of.
 */

const house = (language: string) =>
  ({
    language,
    locale: { language, number_format: 'language', time_format: '24' },
    config: { time_zone: 'UTC', unit_system: { temperature: '°C', length: 'km' } },
    states: {},
    entities: {},
    devices: {},
    areas: {},
    localize: (key: string) => key,
    formatEntityState: (s: { state: string }) => s.state,
    // the Energy dashboard never answers: the card draws what it was given
    callWS: () => new Promise(() => undefined),
  }) as unknown as HomeAssistant;

type CardElement = HTMLElement & {
  setConfig(config: Record<string, unknown>): void;
  hass: HomeAssistant;
  width: number;
  updateComplete: Promise<boolean>;
  head: { ruler: unknown };
};

async function draw(language: string, width: number) {
  const card = document.createElement('fluvy-grid-card') as CardElement;
  Object.assign(card.head, {
    ruler: {
      width: (...args: [string, string, string?, string?]) =>
        (args[1].length + (args[3] ?? '').length) * 8,
      pill: (_cls: string, text: string, sides: number) => text.length * 8 + sides,
      clear() {},
    },
  });
  card.setConfig({
    type: 'custom:fluvy-grid-card',
    phases: ['sensor.down_l1', 'sensor.down_l2', 'sensor.down_l3'],
    price: 'sensor.nowhere_price',
  });
  card.hass = house(language);
  card.width = width;
  document.body.append(card);
  await card.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await card.updateComplete;
  return card;
}

/** The price row as drawn: whether it keeps its circle, its title and the line under it. */
const priceRow = (card: CardElement) => {
  const row = card.shadowRoot!.querySelector('.ef-rows .fv-row')!;
  return {
    circle: row.querySelector('.fv-ico') !== null && !row.classList.contains('fv-row--bare'),
    title: row.querySelector('.fv-row__title')?.textContent?.trim(),
    sub: row.querySelector('.fv-row__sub')?.textContent?.trim(),
  };
};

beforeAll(() => preloadLanguages());
afterEach(() => document.body.replaceChildren());

describe('a price that cannot be read', () => {
  it('says the state’s word beside its circle where the row holds both (360, and English at 211)', async () => {
    // 320 of content: 244 beside the circle and the dash holds "Nicht verfügbar" (120)
    expect(priceRow(await draw('de', 360))).toEqual({
      circle: true,
      title: 'Preis jetzt',
      sub: 'Nicht verfügbar',
    });
    // 171: 95 beside the circle holds "Unavailable" (88)
    expect(priceRow(await draw('en', 211))).toEqual({
      circle: true,
      title: 'Price now',
      sub: 'Unavailable',
    });
  });

  it('gives its circle to a longer word where that makes the row hold it, never "Nicht verfüg…" (211)', async () => {
    // 171: 95 beside the circle does not hold "Nicht verfügbar" (120); 151 without it does
    expect(priceRow(await draw('de', 211))).toEqual({
      circle: false,
      title: 'Preis jetzt',
      sub: 'Nicht verfügbar',
    });
  });

  it('says the dash where not even the row without its circle holds the word, its two lines kept (152)', async () => {
    // 112: 92 without the circle does not hold "Nicht verfügbar" (120); the title (88) still stands beside the dash
    expect(priceRow(await draw('de', 152))).toEqual({
      circle: false,
      title: 'Preis jetzt',
      sub: '—',
    });
  });
});
