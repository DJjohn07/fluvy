// the card's own words first: they are here before it speaks
import './cover/english.js';
import { registerCard } from '@fluvy/core';
import { COVER_FAMILY } from './cover-family.js';
import { FluvyCoverCard } from './cover/cover-card.js';

/**
 * The Cover card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `cover-family.ts`, which every page carries; its words are core's.
 */
export const CARDS = COVER_FAMILY.map(
  ([tag]) => [tag, FluvyCoverCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
