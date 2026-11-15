// the card's words first: they are here before it speaks
import './items/english.js';
import { registerCard } from '@fluvy/core';
import { ITEMS_FAMILY } from './items-family.js';
import { FluvyItemsCard } from './items/items-card.js';

/**
 * The Items card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands. Its
 * height lives in `items-family.ts`, which every page carries.
 */
export const CARDS = ITEMS_FAMILY.map(
  ([tag]) => [tag, FluvyItemsCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
