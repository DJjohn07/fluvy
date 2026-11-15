import { addEnglish } from '@fluvy/core';
import words from '@fluvy/core/locales/en/cover.json';

/**
 * The Cover card's own English (#203: the slats' states, a position counted as it comes down), in its chunk:
 * `cover-cards.ts` imports it first, so it is here before the card speaks; what the details sheet and a tile say of a
 * cover too (`cover`) is core's.
 */
addEnglish(words);
