// the card's words first: they are here before it speaks
import './remote/english.js';
import { registerCard } from '@fluvy/core';
import { REMOTE_FAMILY } from './remote-family.js';
import { FluvyRemoteCard } from './remote/remote-card.js';

/**
 * The TV remote card's element: this module is its own chunk, fetched at start (`index.ts`) and defined as it lands.
 * Its heights live in `remote-family.ts`, which every page carries.
 */
export const CARDS = REMOTE_FAMILY.map(
  ([tag]) => [tag, FluvyRemoteCard as CustomElementConstructor] as const,
);

for (const [tag, element] of CARDS) registerCard(tag, element);
