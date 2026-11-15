import { addEnglish, describeCards, wordsIn, type KeyOf } from '@fluvy/core';
import words from '@fluvy/core/locales/en/cards-about.json';

/*
 * What each card is, in a line (`cards-about`): what the card picker's search reads, and what Customise's list of
 * Fluvy's cards says under each name. Its own small chunk, fetched as the bundle starts with the families: every page
 * that never opens a picker pays for it after its cards, never before. Every other language's catalogue carries it.
 */
addEnglish(words);
describeCards((code, card) => wordsIn(code)(`cards-about.${card as KeyOf<'cards-about'>}`));
