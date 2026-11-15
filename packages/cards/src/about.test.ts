// @vitest-environment happy-dom
import {
  cardKey,
  english,
  languageOf,
  preloadLanguages,
  setLanguageOverride,
  type CustomCardEntry,
} from '@fluvy/core';
import about from '@fluvy/core/locales/en/cards-about.json';
import { describe, expect, it } from 'vitest';
import { catalogue, familiesDefined } from './index.js';

/**
 * #193 (@waphbs): every card's name and what it is are the catalogue's words (`cards` in core's English, `cards-about`
 * in its own chunk), so Home Assistant's card picker, its card editor and Customise list Fluvy's cards in the
 * dashboard's language; the Chinese are his.
 */
const CATALOGUE = await catalogue();
await Promise.all([familiesDefined, preloadLanguages()]);
const tags = CATALOGUE.map(([tag]) => tag);
const ours = (): CustomCardEntry[] =>
  (window.customCards ?? []).filter((card) => tags.includes(card.type));

describe('the cards’ names and what they are', () => {
  it('are one each in English for every card of the catalogue, and none for a card it lacks', () => {
    const keys = tags.map(cardKey);
    expect(Object.keys(english.cards).sort()).toEqual([...keys].sort());
    expect(Object.keys(about['cards-about']).sort()).toEqual([...keys].sort());
  });

  it('are what the card picker lists, every card once', () => {
    expect(ours().map((card) => card.type)).toEqual(tags);
    for (const card of ours()) {
      const key = cardKey(card.type) as keyof typeof english.cards;
      expect(card).toEqual({
        type: card.type,
        name: `Fluvy · ${english.cards[key]}`,
        description: about['cards-about'][key],
        preview: true,
      });
    }
  });

  it('speak the dashboard’s language, Simplified Chinese in @waphbs’s words', () => {
    setLanguageOverride('zh-Hans');
    const tile = ours().find((card) => card.type === 'fluvy-tile-card');
    expect(tile?.name).toBe('Fluvy · 磁贴');
    expect(tile?.description).toMatch(/^灯、开关、窗帘、风扇/);
    expect(ours().find((card) => card.type === 'fluvy-energy-flow-card')?.name).toBe(
      'Fluvy · 能量流',
    );
    setLanguageOverride(undefined);
    languageOf({ language: 'en' });
    expect(tile?.name).toBe('Fluvy · Tile');
  });
});
