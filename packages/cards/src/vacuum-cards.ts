// the drive pad's words first: they are here before the card speaks
import './vacuum/english.js';
import { registerCard } from '@fluvy/core';
import { VACUUM_FAMILY } from './vacuum-family.js';
import { FluvyVacuumCard } from './vacuum/vacuum-card.js';

/**
 * The Vacuum card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its height lives in `vacuum-family.ts`, which every page carries.
 */
export const CARDS = VACUUM_FAMILY.map(
  ([tag]) => [tag, FluvyVacuumCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
