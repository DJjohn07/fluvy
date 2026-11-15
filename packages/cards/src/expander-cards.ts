// the card's words first: they are here before it speaks
import './expander/english.js';
import { registerCard } from '@fluvy/core';
import { EXPANDER_FAMILY } from './expander-family.js';
import { FluvyExpanderCard } from './expander/expander-card.js';

/**
 * The Expander card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `expander-family.ts`, which every page carries.
 */
export const CARDS = EXPANDER_FAMILY.map(
  ([tag]) => [tag, FluvyExpanderCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
