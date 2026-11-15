// the card's words first: they are here before it speaks
import './swipe/english.js';
import { registerCard } from '@fluvy/core';
import { SWIPE_FAMILY } from './swipe-family.js';
import { FluvySwipeCard } from './swipe/swipe-card.js';

/**
 * The Swipe card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands. Its
 * height lives in `swipe-family.ts`, which every page carries.
 */
export const CARDS = SWIPE_FAMILY.map(
  ([tag]) => [tag, FluvySwipeCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
