// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { CustomCardEntry } from '../ha/types.js';
import { addEnglish, languageOf, pageLanguage, wordsIn, type KeyOf } from '../i18n/index.js';
import about from '../i18n/locales/en/cards-about.json';
import { announceCard, cardKey, describeCards } from '../register.js';

/**
 * #193 (@waphbs): Home Assistant's card picker, its card editor's title and Customise's list of Fluvy's cards named and
 * described every card in English on any dashboard. The words are the catalogue's now (`cards`, `cards-about`), and
 * Fluvy's entries of the picker's list say them in the page's language, rewritten in place as the language changes or
 * its words land: Home Assistant keeps the array and reads it whenever its picker opens.
 */
const cards = (): CustomCardEntry[] => window.customCards ?? [];
const entry = (tag: string): CustomCardEntry | undefined =>
  cards().find((card) => card.type === tag);

// someone else's card, already in the list
window.customCards = [{ type: 'other-card', name: 'Other', description: 'Not ours' }];
const list = window.customCards;
announceCard('fluvy-tile-card');
announceCard('fluvy-energy-flow-card');
const tile = entry('fluvy-tile-card');

describe('the card picker’s list', () => {
  it('names a card by its key in English', () => {
    expect(cardKey('fluvy-energy-flow-card')).toBe('energy-flow');
    expect(tile).toEqual({
      type: 'fluvy-tile-card',
      name: 'Fluvy · Tile',
      preview: true,
    });
    expect(entry('fluvy-energy-flow-card')?.name).toBe('Fluvy · Energy flow');
  });

  it('describes every card once `about` has landed', () => {
    addEnglish(about);
    describeCards((code, card) => wordsIn(code)(`cards-about.${card as KeyOf<'cards-about'>}`));
    expect(tile?.description).toBe(about['cards-about'].tile);
    expect(entry('fluvy-energy-flow-card')?.description).toBe(about['cards-about']['energy-flow']);
  });

  it('rewrites the same entries of the same array as the page’s language changes', () => {
    languageOf({ language: 'de' });
    expect(pageLanguage()).toBe('de');
    expect(window.customCards).toBe(list);
    expect(entry('fluvy-tile-card')).toBe(tile);
    // a word asked without Home Assistant's language leaves the page's alone
    languageOf(undefined);
    expect(pageLanguage()).toBe('de');
    languageOf({ language: 'en' });
    expect(tile?.name).toBe('Fluvy · Tile');
  });

  it('leaves the entries of other cards alone, and lists each card once', () => {
    announceCard('fluvy-tile-card');
    expect(cards().filter((card) => card.type === 'fluvy-tile-card')).toHaveLength(1);
    expect(entry('other-card')).toEqual({
      type: 'other-card',
      name: 'Other',
      description: 'Not ours',
    });
  });
});
